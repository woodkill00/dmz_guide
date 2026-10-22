"""Exercise the real extraction verifier's owned-server success barrier."""
from pathlib import Path
import hashlib
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
import zipfile
import json
import importlib.util
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
PAGE = b'<!doctype html><title>Synthetic release readiness</title>exact fixture bytes'


class ReleaseServerTests(unittest.TestCase):
    def run_verifier(self, server_source):
        with tempfile.TemporaryDirectory(prefix='dmz-release-readiness-') as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'release').mkdir()
            for name in ('verify-release.py', 'server-readiness.mjs'):
                shutil.copyfile(ROOT / 'scripts' / name, root / 'scripts' / name)
            files = {'dist/maps/index.html': PAGE, 'scripts/serve.mjs': server_source}
            manifest = {name: hashlib.sha256(body).hexdigest() for name, body in files.items()}
            with zipfile.ZipFile(root / 'release/dmz-guide-static.zip', 'w') as archive:
                for name, body in files.items():
                    archive.writestr(name, body)
                archive.writestr('PRODUCTION-MANIFEST.json', json.dumps(manifest))
            started = time.monotonic()
            result = subprocess.run([sys.executable, str(root / 'scripts/verify-release.py')],
                                    capture_output=True, text=True, timeout=22)
            self.assertLess(time.monotonic() - started, 20)
            return result

    def test_actual_server_exact_content_can_report_success(self):
        result = self.run_verifier((ROOT / 'scripts/serve.mjs').read_bytes())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('owned Node child and exact content', result.stdout)

    def test_exited_child_cannot_report_release_success(self):
        result = self.run_verifier(b'console.error("synthetic release exit"); process.exit(7);')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Clean extraction verified', result.stdout)
        self.assertIn('synthetic release exit', result.stderr)

    def test_wrong_content_cannot_report_release_success(self):
        result = self.run_verifier(b'''
import { createServer } from 'node:http';
createServer((req, res) => { res.writeHead(200, {'Content-Type': 'text/html'}); res.end('wrong build'); })
.listen(Number(process.env.PORT), '127.0.0.1', () => console.log(`DMZ Guide: http://127.0.0.1:${process.env.PORT}`));
''')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Clean extraction verified', result.stdout)
        self.assertIn('content mismatch', result.stderr)

    def test_default_startup_deadline_cannot_fall_through_to_release_success(self):
        result = self.run_verifier(b'setInterval(() => {}, 1000);')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Clean extraction verified', result.stdout)
        self.assertIn('deadline', result.stderr)


class ReleaseWatchdogTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('verify_release', ROOT / 'scripts/verify-release.py')
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.directory = tempfile.TemporaryDirectory(prefix='dmz-release-watchdog-')
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / 'scripts').mkdir()
        (self.root / 'dist/maps').mkdir(parents=True)
        (self.root / 'dist/maps/index.html').write_bytes(PAGE)
        shutil.copyfile(ROOT / 'scripts/server-readiness.mjs', self.root / 'scripts/server-readiness.mjs')
        (self.root / 'scripts/serve.mjs').write_text(
            "import {writeFileSync} from 'node:fs'; writeFileSync('child.pid', String(process.pid)); setInterval(() => {}, 1000);"
        )
        self.module.root = self.root

    def assert_child_gone(self):
        pid = int((self.root / 'child.pid').read_text())
        # Node's signal-0 liveness probe is portable. Python os.kill(pid, 0) is
        # deliberately avoided because its Windows semantics differ.
        result = subprocess.run(['node', '-e',
            f'try {{process.kill({pid}, 0); process.exit(1)}} catch (e) {{process.exit(e.code === "ESRCH" ? 0 : 2)}}'],
            timeout=3)
        self.assertEqual(result.returncode, 0)

    def test_outer_watchdog_cancels_real_helper_and_awaits_its_child_cleanup(self):
        with self.assertRaisesRegex(RuntimeError, 'outer watchdog; cancellation sent and helper exited'):
            self.module.verify_server(self.root, timeout=1, cleanup_timeout=5)
        self.assert_child_gone()

    def test_interrupt_cancels_real_helper_before_reraising(self):
        real_popen = subprocess.Popen
        class InterruptOnce:
            def __init__(self, *args, **kwargs):
                self.process = real_popen(*args, **kwargs)
                self.stdin = self.process.stdin
            def wait(self, **kwargs):
                time.sleep(1)
                raise KeyboardInterrupt()
            def communicate(self, **kwargs):
                return self.process.communicate(**kwargs)
        with patch.object(self.module.subprocess, 'Popen', InterruptOnce):
            with self.assertRaises(KeyboardInterrupt):
                self.module.verify_server(self.root)
        self.assert_child_gone()

    def test_unresponsive_helper_fails_bounded_and_does_not_claim_child_cleanup(self):
        # No grandchild is spawned by this synthetic hung helper. It deliberately
        # ignores the cancellation pipe so the portable fallback is exercised.
        (self.root / 'scripts/server-readiness.mjs').write_text('setInterval(() => {}, 1000);')
        started = time.monotonic()
        with self.assertRaisesRegex(RuntimeError, 'forced termination; owned server cleanup could not be confirmed'):
            self.module.verify_server(self.root, timeout=.3, cleanup_timeout=.3)
        self.assertLess(time.monotonic() - started, 3)

    def test_packager_does_not_include_verification_helper(self):
        # Execute the unchanged packager in an isolated synthetic fixture. The
        # helper is present in scripts but must never enter the static ZIP.
        for name in ('package-release.py', 'release_paths.py'):
            shutil.copyfile(ROOT / 'scripts' / name, self.root / 'scripts' / name)
        (self.root / 'dist/index.html').write_bytes(PAGE)
        for name in ('LICENSE', 'docs/release.md', 'docs/content-studio.md',
                     'specs/009-repository-content-studio/acceptance.md'):
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('Explicitly synthetic packaging fixture.')
        result = subprocess.run([sys.executable, str(self.root / 'scripts/package-release.py')],
                                capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        with zipfile.ZipFile(self.root / 'release/dmz-guide-static.zip') as archive:
            self.assertIn('scripts/serve.mjs', archive.namelist())
            self.assertFalse(any('server-readiness' in name for name in archive.namelist()))
