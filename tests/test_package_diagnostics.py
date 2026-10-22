"""Mutation diagnostics must retain, not weaken, the packaging rejection."""
import ast
import json
import os
import platform
import sys
import time
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/package-release.py'


class PackageDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='dmz-package-diagnostics-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.path = self.root / 'payload.txt'
        self.path.write_bytes(b'fixture')
        # Compile actual helper definitions, without invoking the packaging CLI.
        tree = ast.parse(SOURCE.read_text())
        helpers = ast.Module(body=[node for node in tree.body
                                   if isinstance(node, ast.FunctionDef)], type_ignores=[])
        self.os = SimpleNamespace(**vars(os))
        self.os.name = 'posix'  # Deterministic policy fixtures, independent of runner.
        self.scope = {'Path': Path, 'os': self.os, 'stat': stat, 'json': json, 'root': self.root}
        exec(compile(helpers, str(SOURCE), 'exec'), self.scope)
        self.before = self.path.stat()
        self.changed = SimpleNamespace(**{name: getattr(self.before, name) for name in
            ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns', 'st_mode')})
        self.changed.st_ctime_ns += 1

    def reject(self, observations, point):
        budget = [100]
        with patch.object(self.os, 'fstat', side_effect=observations):
            with self.assertRaises(SystemExit) as raised:
                self.scope['bounded_read'](self.path, budget, phase='identity')
        message = str(raised.exception)
        self.assertIn('File changed during packaging.', message)
        detail = json.loads(message.split(' ', 4)[4])
        self.assertEqual(detail['path'], 'payload.txt')
        self.assertEqual(detail['phase'], 'identity')
        self.assertEqual(detail['point'], point)
        self.assertEqual(detail['before'][4], self.before.st_ctime_ns)
        self.assertNotIn(str(self.root), message)
        self.assertLessEqual(len(message), 4031)
        self.assertEqual(budget, [100], 'rejected reads do not consume successful payload budget')
        return detail

    def test_open_identity_mismatch_still_rejects(self):
        detail = self.reject([self.changed], 'open')
        self.assertNotEqual(detail['before'], detail['open'])
        self.assertIsNone(detail['after'])
        self.assertIsNone(detail['readBytes'])

    def test_post_read_identity_mismatch_still_rejects(self):
        detail = self.reject([self.before, self.changed], 'read')
        self.assertEqual(detail['before'], detail['open'])
        self.assertNotEqual(detail['before'], detail['after'])
        self.assertEqual(detail['readBytes'], 7)


    def test_diagnostic_path_is_bounded_and_escaped(self):
        relative = 'nested/' + '\u2603\n' * 400
        fake_path = SimpleNamespace(relative_to=lambda root: SimpleNamespace(as_posix=lambda: relative))
        with patch.dict(self.scope, {'safe_stat': lambda path: self.before}), \
             patch.object(self.os, 'open', return_value=123), \
             patch.object(self.os, 'fdopen') as opened, \
             patch.object(self.os, 'fstat', return_value=self.changed):
            opened.return_value.__enter__.return_value.fileno.return_value = 123
            with self.assertRaises(SystemExit) as raised:
                self.scope['bounded_read'](fake_path, [100], phase='output')
        message = str(raised.exception)
        self.assertNotIn('\n', message)
        self.assertLessEqual(len(message), 4031)
        detail = json.loads(message.split(' ', 4)[4])
        self.assertEqual(detail['path'], relative[:256])
        self.assertEqual(detail['phase'], 'output')


    def test_captured_windows_interface_difference_is_not_a_mutation(self):
        self.os.name = 'nt'
        self.path.write_bytes(b'x' * 23)
        names = ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
        path_info = SimpleNamespace(st_mode=stat.S_IFREG, **dict(zip(names, (
            13276750692006899310, 281474976714124, 23,
            1792674709404639800, 1792675151211346100))))
        fd_info = SimpleNamespace(**vars(path_info))
        fd_info.st_ctime_ns = 1792674709404639800
        with patch.dict(self.scope, {'safe_stat': lambda path: path_info}), \
             patch.object(self.os, 'fstat', return_value=fd_info):
            self.assertEqual(self.scope['bounded_read'](self.path, [100]), b'x' * 23)

    def test_windows_cross_interface_identity_size_mtime_still_reject(self):
        self.os.name = 'nt'
        for name in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns'):
            with self.subTest(field=name):
                changed = SimpleNamespace(**vars(self.changed))
                setattr(changed, name, getattr(self.before, name) + 1)
                self.reject([changed], 'open')

    def test_windows_fd_ctime_only_change_still_rejects(self):
        self.os.name = 'nt'
        self.reject([self.before, self.changed], 'read')

    def test_path_ctime_only_changes_still_reject(self):
        for platform_name in ('nt', 'posix'):
            self.os.name = platform_name
            for point, observations in (
                ('path-open', [self.before, self.changed]),
                ('path-read', [self.before, self.before, self.changed]),
            ):
                with self.subTest(platform=platform_name, point=point), \
                     patch.dict(self.scope, {'safe_stat': Mock(side_effect=observations)}):
                    self.reject([self.before, self.before], point)

    def test_path_replacement_after_open_rejects(self):
        changed = SimpleNamespace(**vars(self.changed))
        changed.st_ino += 1
        with patch.dict(self.scope, {'safe_stat': Mock(side_effect=[self.before, changed])}):
            self.reject([self.before, self.before], 'path-open')

    def test_path_recheck_keeps_symlink_rejection(self):
        check = Mock(side_effect=[self.before, SystemExit('Refusing symlink: payload.txt')])
        with patch.dict(self.scope, {'safe_stat': check}), \
             patch.object(self.os, 'fstat', return_value=self.before):
            with self.assertRaisesRegex(SystemExit, 'Refusing symlink'):
                self.scope['bounded_read'](self.path, [100])

    def test_native_stable_and_mutated_file_probe(self):
        self.os.name = os.name
        self.path.write_bytes(b'initial')
        time.sleep(0.02)
        self.path.write_bytes(b'fixture')
        os.utime(self.path, ns=(1577836800000000000, 1577836800000000000))
        fields = ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
        signature = lambda info: [getattr(info, name) for name in fields]
        with self.path.open('rb') as stream:
            by_path = self.path.lstat()
            by_fd = os.fstat(stream.fileno())
            self.assertEqual(stream.read(), b'fixture')
            fd_after = os.fstat(stream.fileno())
            path_after = self.path.lstat()
        print('Native package stat probe: ' + json.dumps({
            'python': sys.version[:200], 'executable': sys.executable[:300],
            'platform': platform.platform()[:200], 'osName': os.name,
            'fields': fields, 'pathBefore': signature(by_path), 'fdOpen': signature(by_fd),
            'fdAfter': signature(fd_after), 'pathAfter': signature(path_after),
            'oldCrossApiEqual': signature(by_path) == signature(by_fd),
        }), flush=True)
        self.assertEqual(signature(by_path), signature(path_after))
        self.assertEqual(signature(by_fd), signature(fd_after))
        self.assertEqual(self.scope['bounded_read'](self.path, [100]), b'fixture')
        count = 0
        def mutate_before_post_read_stat(fd):
            nonlocal count
            count += 1
            if count == 2:
                with self.path.open('ab') as output:
                    output.write(b'!')
            return os.fstat(fd)
        with patch.object(self.os, 'fstat', side_effect=mutate_before_post_read_stat):
            with self.assertRaisesRegex(SystemExit, 'File changed during packaging') as raised:
                self.scope['bounded_read'](self.path, [100])
        self.assertEqual(json.loads(str(raised.exception).split(' ', 4)[4])['point'], 'read')
        print('Native package stat probe: stable read accepted; controlled in-read mutation rejected.', flush=True)


if __name__ == '__main__':
    unittest.main()
