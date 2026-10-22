"""Author-only packaging boundaries do not censor public game slugs."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('release_paths', Path(__file__).resolve().parents[1] / 'scripts/release_paths.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleasePathTests(unittest.TestCase):
    def test_exact_author_sources_are_excluded(self):
        for path in module.AUTHOR_ONLY_PATHS:
            self.assertTrue(module.is_author_only(path), path)
        self.assertTrue(module.is_author_only('.author-state/journal.json'))
        self.assertTrue(module.is_author_only('assets/src/content/studio-recovery.mjs'))

    def test_harmless_public_titles_are_not_excluded(self):
        for path in ('items/studio-key/index.html', 'locations/author-house/index.html',
                     'assets/bundled/demo_studio/author.png', 'assets/src/client/guided-editor.mjs'):
            self.assertFalse(module.is_author_only(path), path)
