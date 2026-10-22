#!/usr/bin/env python3
"""Bounded, synthetic assessment reproducer. No build or browser suite runs.

Expected to PASS only while the assessed readiness defects remain present.
All executable fixture files, release archives, and server processes are temporary.
"""
from hashlib import sha256
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import errno
import json
import os
import resource
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import zipfile

ROOT = Path(__file__).resolve().parents[3]
LIMIT = 65536
NODE = shutil.which("node")
assert NODE, "Node is required; this harness does not install dependencies."


def output_limit():
    resource.setrlimit(resource.RLIMIT_FSIZE, (LIMIT, LIMIT))


def run_bounded(command, cwd, env=None, timeout=15):
    """Bound wall time, logs, and cleanup to this harness's own process group."""
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        child = subprocess.Popen(
            command, cwd=cwd, env=env, stdout=out, stderr=err,
            start_new_session=True, preexec_fn=output_limit,
        )
        try:
            code = child.wait(timeout=timeout)
        finally:
            # Includes a verifier's child if the verifier times out or exits early.
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait(timeout=2)
        out.seek(0)
        err.seek(0)
        return code, out.read(LIMIT).decode(), err.read(LIMIT).decode()


def release_case(tmp):
    observer = tmp / "node-observer.json"
    requests = []

    class UnrelatedServer(BaseHTTPRequestHandler):
        def do_GET(self):
            deadline = time.monotonic() + 6
            while not observer.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            report = json.loads(observer.read_text()) if observer.exists() else {}
            failed = report.get("returncode") == 1 and report.get("eaddrinuse") is True
            requests.append({"path": self.path, "child_failed_before_response": failed})
            # A 200 is impossible until the real Node process has exited with
            # EADDRINUSE. This removes the startup/response timing race.
            body = b"SYNTHETIC UNRELATED SERVICE: not the DMZ guide"
            self.send_response(200 if failed else 503)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    # Binding itself is the free-port check and reservation. Never contact or
    # terminate an existing listener. If occupied, change only the test port
    # value in the temporary verifier copy (both occurrences, same value).
    try:
        unrelated = ThreadingHTTPServer(("127.0.0.1", 4189), UnrelatedServer)
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise
        unrelated = ThreadingHTTPServer(("127.0.0.1", 0), UnrelatedServer)
    unrelated.daemon_threads = True
    port = unrelated.server_address[1]
    thread = threading.Thread(target=unrelated.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
    thread.start()
    try:
        (tmp / "scripts").mkdir()
        (tmp / "release").mkdir()
        (tmp / "bin").mkdir()
        original = (ROOT / "scripts/verify-release.py").read_text()
        assert original.count("4189") == 2, "Reassess fixture after verifier changes."
        verifier = original.replace("4189", str(port))
        (tmp / "scripts/verify-release.py").write_text(verifier)
        serve = (ROOT / "scripts/serve.mjs").read_bytes()
        files = {
            "scripts/serve.mjs": serve,
            "dist/maps/index.html": b"<!doctype html><title>SYNTHETIC guide fixture</title><h1>SYNTHETIC maps</h1>",
        }
        manifest = {name: sha256(body).hexdigest() for name, body in files.items()}
        with zipfile.ZipFile(tmp / "release/dmz-guide-static.zip", "w") as archive:
            for name, body in files.items():
                archive.writestr(name, body)
            archive.writestr("PRODUCTION-MANIFEST.json", json.dumps(manifest))
        # Observation shim only: execute the unchanged, real serve.mjs with
        # the real Node binary; record its exit/stderr before relaying them.
        shim = tmp / "bin/node"
        shim.write_text(f"#!{sys.executable}\n" + '''import json, os, subprocess, sys, tempfile
from pathlib import Path
with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
    child = subprocess.Popen([os.environ["READINESS_REAL_NODE"], *sys.argv[1:]], stdout=out, stderr=err)
    try:
        code = child.wait(timeout=8)
    finally:
        if child.poll() is None:
            child.kill()
        child.wait(timeout=2)
    out.seek(0)
    err.seek(0)
    stdout, stderr = out.read(65536), err.read(65536)
report = {"returncode": code, "eaddrinuse": b"EADDRINUSE" in stderr,
          "stderr": stderr.decode(), "actual_child_pid": child.pid}
destination = Path(os.environ["READINESS_OBSERVER"])
stage = destination.with_suffix(".tmp")
stage.write_text(json.dumps(report))
stage.replace(destination)
sys.stdout.buffer.write(stdout)
sys.stderr.buffer.write(stderr)
sys.exit(code)
''')
        shim.chmod(0o700)
        env = {
            **os.environ,
            "PATH": str(tmp / "bin") + os.pathsep + os.environ.get("PATH", ""),
            "READINESS_REAL_NODE": NODE,
            "READINESS_OBSERVER": str(observer),
            "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost",
            "TMPDIR": str(tmp),
        }
        code, stdout, stderr = run_bounded([sys.executable, "scripts/verify-release.py"], tmp, env)
        report = json.loads(observer.read_text())
        assert report["returncode"] == 1 and report["eaddrinuse"], report
        assert requests and all(row["child_failed_before_response"] for row in requests), requests
        assert requests[0]["path"] == "/maps/", requests
        assert code == 0 and "Clean extraction verified:" in stdout, (code, stdout, stderr)
        return {
            "case": "release-verifier-unrelated-http200",
            "port": port,
            "test_local_port_substitution": None if port == 4189 else f"4189 -> {port} (two references to one port)",
            "verifier_source_unchanged": verifier == original,
            "serve_source_sha256": sha256(serve).hexdigest(),
            "actual_serve_exit": report["returncode"],
            "actual_serve_error": "EADDRINUSE",
            "child_failed_before_http200": True,
            "verifier_exit": code,
            "verifier_stdout": stdout.strip(),
            "request_count": len(requests),
        }
    finally:
        unrelated.shutdown()
        unrelated.server_close()
        thread.join(timeout=2)
        assert not thread.is_alive(), "Owned HTTP server did not stop."


def browser_loop_cases(tmp):
    fixtures = []
    for name, continuation, limit in (
        ("run.mjs", "  browser = await chromium.launch(", 80),
        ("engines.mjs", '  await mkdir("test-results"', 100),
    ):
        source = (ROOT / "tests/browser" / name).read_text()
        start = source.index("  for (let n = 0;")
        end = source.index(continuation, start)
        fixtures.append({"name": name, "loop": source[start:end], "attempts": limit})
    (tmp / "loops.json").write_text(json.dumps(fixtures))
    runner = tmp / "loop-observer.mjs"
    runner.write_text('''import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
for (const fixture of JSON.parse(readFileSync("loops.json", "utf8"))) {
  for (const mode of ["HTTP503", "connection-rejected", "unrelated-HTTP200"]) {
    let attempts = 0, delays = 0;
    const fetch = async () => {
      attempts++;
      if (mode === "connection-rejected") throw new Error("synthetic refused connection");
      return { ok: mode === "unrelated-HTTP200", status: mode === "HTTP503" ? 503 : 200 };
    };
    const setTimeout = (callback, milliseconds) => {
      assert.equal(milliseconds, 100);
      delays++;
      callback(); // Synthetic clock: no browser or real HTTP call is made.
    };
    const execute = new AsyncFunction("fetch", "setTimeout", "base", fixture.loop + "return 'POST_READINESS_CONTINUATION';");
    assert.equal(await execute(fetch, setTimeout, "http://synthetic.invalid"), "POST_READINESS_CONTINUATION");
    assert.equal(attempts, mode === "unrelated-HTTP200" ? 1 : fixture.attempts);
    assert.equal(delays, mode === "unrelated-HTTP200" ? 0 : fixture.attempts);
    console.log(JSON.stringify({ case: fixture.name, mode, attempts, continued_without_asserted_readiness: true }));
  }
}
''')
    code, stdout, stderr = run_bounded([NODE, str(runner)], tmp, timeout=5)
    assert code == 0, (code, stdout, stderr)
    return [json.loads(line) for line in stdout.splitlines()]


def main():
    start = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="dmz-readiness-synthetic-") as directory:
        tmp = Path(directory)
        results = [release_case(tmp), *browser_loop_cases(tmp)]
    for result in results:
        print(json.dumps(result, sort_keys=True))
    print(json.dumps({"assessment": "defects reproduced", "cases": len(results),
                      "elapsed_seconds": round(time.monotonic() - start, 3),
                      "full_browser_suites_run": False, "temporary_fixture_removed": True}))


if __name__ == "__main__":
    main()
