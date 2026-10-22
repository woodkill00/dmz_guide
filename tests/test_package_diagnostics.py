"""Mutation diagnostics must retain, not weaken, the packaging rejection."""
import ast
import json
import os
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

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
        self.scope = {'Path': Path, 'os': os, 'stat': stat, 'json': json, 'root': self.root}
        exec(compile(helpers, str(SOURCE), 'exec'), self.scope)
        self.before = self.path.stat()
        self.changed = SimpleNamespace(**{name: getattr(self.before, name) for name in
            ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')})
        self.changed.st_ctime_ns += 1

    def reject(self, observations, point):
        budget = [100]
        with patch.object(os, 'fstat', side_effect=observations):
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
             patch.object(os, 'open', return_value=123), \
             patch.object(os, 'fdopen') as opened, \
             patch.object(os, 'fstat', return_value=self.changed):
            opened.return_value.__enter__.return_value.fileno.return_value = 123
            with self.assertRaises(SystemExit) as raised:
                self.scope['bounded_read'](fake_path, [100], phase='output')
        message = str(raised.exception)
        self.assertNotIn('\n', message)
        self.assertLessEqual(len(message), 4031)
        detail = json.loads(message.split(' ', 4)[4])
        self.assertEqual(detail['path'], relative[:256])
        self.assertEqual(detail['phase'], 'output')


if __name__ == '__main__':
    unittest.main()
