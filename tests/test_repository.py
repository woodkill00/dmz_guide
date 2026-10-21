"""Deterministic positive and negative repository-contract fixtures; no game data."""
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

validator = load('validator', 'check.py')
selector = load('selector', 'select-feature.py')

class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'repo'
        shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns('.git', '__pycache__', '.venv'))

    def test_repository_passes(self):
        self.assertEqual(validator.check(self.root), [])

    def test_workflow_runtime_state_does_not_break_provenance(self):
        state = self.root / '.specify/workflows/runs/example/state.json'
        state.parent.mkdir(parents=True)
        state.write_text('{}', encoding='utf-8')
        self.assertEqual(validator.check(self.root), [])

    def test_upstream_mutation_fails(self):
        (self.root / '.agents/skills/speckit-plan/SKILL.md').write_text('tampered')
        self.assertTrue(any('Modified upstream' in e for e in validator.check(self.root)))

    def test_missing_skill_fails(self):
        (self.root / '.agents/skills/speckit-plan/SKILL.md').unlink()
        self.assertTrue(any('ten official' in e for e in validator.check(self.root)))

    def test_corrupt_metadata_fails(self):
        (self.root / 'speckit.lock.json').write_text('{')
        self.assertTrue(any('Invalid metadata' in e for e in validator.check(self.root)))

    def test_changed_pin_fails(self):
        path = self.root / 'speckit.lock.json'
        data = json.loads(path.read_text(encoding="utf-8")); data['commit'] = 'main'
        path.write_text(json.dumps(data))
        self.assertTrue(any('Unreviewed' in e for e in validator.check(self.root)))

    def test_empty_upstream_manifest_fails(self):
        path = self.root / 'speckit.lock.json'
        data = json.loads(path.read_text(encoding="utf-8")); data['files'] = {}
        path.write_text(json.dumps(data), encoding="utf-8")
        self.assertTrue(any('coverage' in e for e in validator.check(self.root)))

    def test_dangling_task_fails(self):
        path = self.root / 'specs/002-repository-bootstrap/traceability.json'
        data = json.loads(path.read_text(encoding="utf-8")); data['BOOT-001']['tasks'] = ['T999']
        path.write_text(json.dumps(data), encoding="utf-8")
        self.assertTrue(any('missing task' in e for e in validator.check(self.root)))

    def test_missing_requirement_fails(self):
        path = self.root / 'specs/002-repository-bootstrap/traceability.json'
        data = json.loads(path.read_text(encoding="utf-8")); del data['BOOT-001']
        path.write_text(json.dumps(data))
        self.assertTrue(any('coverage' in e for e in validator.check(self.root)))

    def test_missing_evidence_fails(self):
        (self.root / 'third_party/spec-kit/LICENSE').unlink()
        self.assertTrue(any('missing evidence' in e for e in validator.check(self.root)))

    def test_broken_relative_link_fails(self):
        (self.root / 'test-link.md').write_text('[missing](no-such-file.md)')
        self.assertTrue(any('broken relative link' in e for e in validator.check(self.root)))

    def test_external_links_and_examples_not_fetched(self):
        (self.root / 'test-link.md').write_text('[external](https://example.invalid)\n```\n[example](not-a-real-file.md)\n```')
        self.assertEqual(validator.check(self.root), [])

    def test_feature_selection(self):
        selector.select_feature('002-repository-bootstrap', self.root)
        data = json.loads((self.root / '.specify/feature.json').read_text(encoding="utf-8"))
        self.assertEqual(data, {'feature_directory': 'specs/002-repository-bootstrap'})

    def test_missing_feature_rejected(self):
        with self.assertRaises(ValueError):
            selector.select_feature('999-missing-feature', self.root)

    def test_path_traversal_rejected(self):
        for name in ('../README.md', '/tmp', '002-repository-bootstrap/../../', ''):
            with self.subTest(name=name), self.assertRaises(ValueError):
                selector.select_feature(name, self.root)

if __name__ == '__main__':
    unittest.main()
