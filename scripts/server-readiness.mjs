// Verification-only lifecycle shared by browser checks and clean-release checks.
// serve.mjs emits the exact address below only after its own successful listen.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { get } from "node:http";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const OUTPUT_LIMIT = 64 * 1024;
const BODY_LIMIT = 1024 * 1024;
const HOST = "127.0.0.1";
function bounded(value, fallback, maximum, name) {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1 || result > maximum)
    throw new Error(`${name} must be an integer from 1 to ${maximum}`);
  return result;
}
function tail() {
  let bytes = Buffer.alloc(0),
    truncated = false;
  return {
    append(chunk) {
      truncated ||= bytes.length + chunk.length > OUTPUT_LIMIT;
      bytes = Buffer.concat([bytes, chunk]).subarray(-OUTPUT_LIMIT);
      // Copy so a small tail never retains a larger backing allocation.
      bytes = Buffer.from(bytes);
    },
    read: () => bytes.toString("utf8"),
    truncated: () => truncated,
  };
}
function listenPort(signal) {
  return new Promise((accept, reject) => {
    const socket = createServer();
    const abort = () => socket.close(() => reject(signal.reason));
    signal.addEventListener("abort", abort, { once: true });
    socket.once("error", (error) => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
    socket.listen(0, HOST, () => {
      const port = socket.address().port;
      socket.close((error) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) reject(signal.reason);
        else if (error) reject(error);
        else accept(port);
      });
    });
  });
}
function probe(url, expectedHash, timeoutMs, signal) {
  return new Promise((accept, reject) => {
    let settled = false,
      response,
      timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error) {
        response?.destroy();
        request.destroy();
        reject(error);
      } else accept();
    };
    const abort = () => finish(signal.reason);
    const request = get(
      url,
      { agent: false, headers: { Connection: "close" } },
      (res) => {
        response = res;
        res.on("error", finish);
        if (res.statusCode !== 200)
          return finish(
            new Error(`HTTP status ${res.statusCode}; expected 200`),
          );
        if (!/^text\/html(?:\s*;|$)/i.test(res.headers["content-type"] || ""))
          return finish(
            Object.assign(
              new Error("Unexpected Content-Type; expected text/html"),
              { fatal: true },
            ),
          );
        const hash = createHash("sha256");
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > BODY_LIMIT)
            finish(
              Object.assign(
                new Error(`Response body exceeds ${BODY_LIMIT}-byte limit`),
                { fatal: true },
              ),
            );
          else hash.update(chunk);
        });
        res.on("end", () => {
          if (settled) return;
          if (hash.digest("hex") !== expectedHash)
            finish(
              Object.assign(new Error("Expected build content mismatch"), {
                fatal: true,
              }),
            );
          else finish();
        });
        res.on("aborted", () => finish(new Error("Response body aborted")));
      },
    );
    request.on("error", finish);
    timer = setTimeout(
      () =>
        finish(
          new Error(`Request timeout after ${timeoutMs}ms (including body)`),
        ),
      timeoutMs,
    );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function startOwnedServer(options) {
  const started = performance.now();
  const timeoutMs = bounded(options.timeoutMs, 15000, 15000, "timeoutMs");
  const requestTimeoutMs = bounded(
    options.requestTimeoutMs,
    1000,
    1000,
    "requestTimeoutMs",
  );
  const cleanupGraceMs = bounded(
    options.cleanupGraceMs,
    2000,
    2000,
    "cleanupGraceMs",
  );
  const cwd = resolve(options.cwd || process.cwd());
  const entrypoint = resolve(
    options.entrypoint || resolve(cwd, "scripts/serve.mjs"),
  );
  const expectedFile = resolve(
    options.expectedFile || resolve(cwd, "dist/index.html"),
  );
  const route = options.route || "/";
  if (!route.startsWith("/") || route.startsWith("//"))
    throw new Error("Readiness route must be a local absolute path");
  const controller = new AbortController(),
    { signal } = controller;
  const deadline = started + timeoutMs;
  let phase = "preparing",
    child,
    base,
    marker = false,
    closed = false,
    stopping = false;
  let childError, lastProbe, stopPromise, closeResolve;
  const closedPromise = new Promise((r) => {
    closeResolve = r;
  });
  const stdout = tail(),
    stderr = tail();
  const fail = (error) => {
    if (!signal.aborted) controller.abort(error);
  };
  const cancel = () =>
    fail(options.signal.reason || new Error("Readiness cancelled"));
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const deadlineTimer = setTimeout(
    () => fail(new Error(`Startup deadline exceeded (${timeoutMs}ms)`)),
    Math.max(1, deadline - performance.now()),
  );
  const diagnostics = () => ({
    phase,
    endpoint: base ? base + route : null,
    elapsedMs: Math.round(performance.now() - started),
    pid: child?.pid ?? null,
    exitCode: child?.exitCode ?? null,
    signal: child?.signalCode ?? null,
    lastProbe: lastProbe?.message ?? null,
    stdout: stdout.read(),
    stderr: stderr.read(),
    stdoutTruncated: stdout.truncated(),
    stderrTruncated: stderr.truncated(),
  });
  const failure = (error) =>
    new Error(
      `Owned server ${phase} failed: ${error.message}\n${JSON.stringify(diagnostics())}`,
      { cause: error },
    );
  const assertAlive = () => {
    if (signal.aborted) throw failure(signal.reason);
    if (
      !child?.pid ||
      closed ||
      child.exitCode !== null ||
      child.signalCode !== null
    )
      throw failure(childError || new Error("Owned child is not alive"));
  };
  const waitClose = async () => {
    let timer;
    try {
      await Promise.race([
        closedPromise,
        new Promise((r) => {
          timer = setTimeout(r, cleanupGraceMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const stop = (primaryError) => {
    stopPromise ??= (async () => {
      const previousFailure = signal.aborted ? signal.reason : null;
      stopping = true;
      clearTimeout(deadlineTimer);
      fail(new Error("Owned server stopped"));
      let cleanupError;
      try {
        if (child && !closed) {
          child.kill("SIGTERM");
          await waitClose();
          if (!closed) {
            child.kill("SIGKILL");
            await waitClose();
          }
          if (!closed)
            throw new Error(
              "Owned child cleanup deadline exceeded (SIGTERM then SIGKILL)",
            );
        }
      } catch (error) {
        cleanupError = error;
      } finally {
        options.signal?.removeEventListener("abort", cancel);
        // A child that cannot be stopped must not keep verification hung forever.
        if (!closed && child) {
          child.stdout.destroy();
          child.stderr.destroy();
          child.unref();
        }
      }
      if (primaryError) {
        if (cleanupError)
          primaryError.message += `; cleanup also failed: ${cleanupError.message}`;
      } else if (cleanupError || previousFailure)
        throw failure(cleanupError || previousFailure);
    })();
    return stopPromise;
  };
  try {
    signal.throwIfAborted();
    if ((await stat(expectedFile)).size > BODY_LIMIT)
      throw new Error(`Expected body exceeds ${BODY_LIMIT}-byte limit`);
    const expected = await readFile(expectedFile, { signal });
    if (expected.length > BODY_LIMIT)
      throw new Error(`Expected body exceeds ${BODY_LIMIT}-byte limit`);
    const expectedHash = createHash("sha256").update(expected).digest("hex");
    signal.throwIfAborted();
    const port =
      options.port == null
        ? await listenPort(signal)
        : bounded(Number(options.port), null, 65535, "port");
    base = `http://${HOST}:${port}`;
    const url = new URL(route, base);
    if (url.origin !== base)
      throw new Error("Readiness route must remain on owned loopback origin");
    signal.throwIfAborted();
    phase = "bind";
    child = spawn(process.execPath, [entrypoint], {
      cwd,
      env: { ...(options.env || process.env), HOST, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.once("error", (error) => {
      childError = error;
      if (!stopping) fail(error);
    });
    child.once("exit", (code, exitSignal) => {
      childError = new Error(
        `Owned child exited (code=${code}, signal=${exitSignal})`,
      );
      if (!stopping) fail(childError);
    });
    child.once("close", () => {
      closed = true;
      closeResolve();
    });
    child.stderr.on("data", (chunk) => stderr.append(chunk));
    let line = Buffer.alloc(0),
      discardedLine = false;
    const expectedMarker = `DMZ Guide: ${base}`;
    child.stdout.on("data", (chunk) => {
      stdout.append(chunk);
      // Strict newline-delimited marker with bounded carry, even for huge lines.
      let offset = 0;
      while (offset < chunk.length) {
        const end = chunk.indexOf(10, offset);
        const fragment = chunk.subarray(offset, end < 0 ? chunk.length : end);
        if (!discardedLine) {
          if (line.length + fragment.length > 256) {
            line = Buffer.alloc(0);
            discardedLine = true;
          } else line = Buffer.concat([line, fragment]);
        }
        if (end < 0) break;
        if (
          !discardedLine &&
          line.toString("utf8").replace(/\r$/, "") === expectedMarker
        )
          marker = true;
        line = Buffer.alloc(0);
        discardedLine = false;
        offset = end + 1;
      }
    });
    // Deliver asynchronous spawn errors before making a liveness assertion.
    await delay(0, undefined, { signal });
    while (!marker) {
      assertAlive();
      await delay(20, undefined, { signal });
    }
    phase = "probe";
    while (true) {
      assertAlive();
      const remaining = deadline - performance.now();
      if (remaining <= 0)
        throw new Error(`Startup deadline exceeded (${timeoutMs}ms)`);
      try {
        await probe(
          url,
          expectedHash,
          Math.min(requestTimeoutMs, Math.max(1, Math.floor(remaining))),
          signal,
        );
        // Yield to pending exit/error events before declaring the child healthy.
        await delay(0, undefined, { signal });
        assertAlive();
        clearTimeout(deadlineTimer);
        phase = "running";
        return { base, assertAlive, diagnostics, stop };
      } catch (error) {
        if (!signal.aborted) lastProbe = error;
        assertAlive();
        if (error.fatal) throw error;
        await delay(
          Math.min(50, Math.max(1, deadline - performance.now())),
          undefined,
          { signal },
        );
      }
    }
  } catch (error) {
    const primary = signal.aborted ? signal.reason : error;
    await stop(primary);
    throw failure(primary);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Verification interrupted"));
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  // The Python watchdog uses this private pipe for portable graceful cancellation.
  // Unlike SIGTERM, stdin cancellation also reaches the handler on Windows.
  process.stdin.once("data", cancel);
  process.stdin.resume();
  let server, primary;
  try {
    const [cwd, route, expectedFile] = process.argv.slice(2);
    if (!cwd || !route || !expectedFile)
      throw new Error(
        "Usage: node server-readiness.mjs CWD ROUTE EXPECTED_FILE",
      );
    server = await startOwnedServer({
      cwd,
      route,
      expectedFile,
      signal: controller.signal,
    });
    server.assertAlive();
  } catch (error) {
    primary = error;
  } finally {
    try {
      await server?.stop(primary);
    } catch (error) {
      primary ||= error;
    }
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
    process.stdin.removeListener("data", cancel);
    process.stdin.pause();
  }
  if (primary) {
    console.error(primary.message);
    process.exitCode = 1;
  }
}
