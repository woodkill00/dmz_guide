"""Same-toolchain reproducibility; real builds, no reused generated output."""
import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def copy_sources(destination):
    for name in ('src', 'scripts', 'schemas', 'content', 'media', 'docs', 'specs'):
        shutil.copytree(ROOT / name, destination / name,
                        ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '*.pyo'))
    for name in ('package.json', 'package-lock.json', 'LICENSE'):
        shutil.copyfile(ROOT / name, destination / name)


def build(root):
    result = subprocess.run(['node', 'scripts/build.mjs'], cwd=root,
                            capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise AssertionError(result.stdout + result.stderr)


def package(root, year):
    # Control the wall clock used by old zipfile.writestr(name, bytes), without
    # editing production code or masking source/build identity checks.
    script = f"""import runpy, sys
from unittest.mock import patch
sys.path.insert(0, 'scripts')
with patch('zipfile.time.localtime', return_value=({year},1,1,0,0,0,2,1,-1)):
    runpy.run_path('scripts/package-release.py', run_name='__main__')
"""
    subprocess.run([sys.executable, '-c', script], cwd=root, check=True,
                   capture_output=True, text=True, timeout=60)
    return (root / 'release/dmz-guide-static.zip').read_bytes()


def members(path):
    with zipfile.ZipFile(path) as archive:
        return {name: hashlib.sha256(archive.read(name)).hexdigest()
                for name in archive.namelist()}


class ReleaseReproducibilityTests(unittest.TestCase):
    def test_independent_builds_and_changed_input(self):
        # Test-owned temporary fixtures only; actual acceptance retains two Git
        # worktree outputs. Neither repository dist nor recovery data is removed.
        with tempfile.TemporaryDirectory(prefix='dmz-repro-') as temporary:
            roots = [Path(temporary) / name for name in ('first', 'second')]
            archives = []
            for index, root in enumerate(roots):
                root.mkdir()
                copy_sources(root)
                self.assertFalse((root / 'dist').exists())
                for path in root.rglob('*'):
                    if path.is_file():
                        os.utime(path, (1577836800 + index * 126230400,) * 2)
                (root / 'LICENSE').chmod(0o600 if index == 0 else 0o644)
                build(root)
                archives.append(package(root, 2020 + index * 4))
            first, second = [root / 'release/dmz-guide-static.zip' for root in roots]
            self.assertEqual(members(first), members(second), 'all payload and manifest hashes')
            self.assertTrue(archives[0] == archives[1], 'whole ZIP bytes differ despite equal member hashes')
            with zipfile.ZipFile(first) as archive:
                self.assertEqual(archive.namelist(), sorted(archive.namelist()))
                self.assertEqual(archive.comment, b'')
                for entry in archive.infolist():
                    self.assertEqual(entry.date_time, (1980, 1, 1, 0, 0, 0))
                    self.assertEqual(entry.create_system, 3)
                    self.assertEqual(entry.external_attr >> 16, stat.S_IFREG | 0o644)
                    self.assertEqual(entry.internal_attr, 0)
                    self.assertEqual(entry.compress_type, zipfile.ZIP_DEFLATED)
                    self.assertEqual(entry.extra, b'')
                    self.assertEqual(entry.comment, b'')
            launcher = roots[1] / 'scripts/serve.mjs'
            launcher.write_bytes(launcher.read_bytes() + b'\n// Reproducibility test change.\n')
            build(roots[1])
            changed = package(roots[1], 2024)
            self.assertNotEqual(archives[0], changed)
            self.assertNotEqual(members(first), members(second))


if __name__ == '__main__':
    unittest.main()
