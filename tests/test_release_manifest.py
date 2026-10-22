"""Full payload and inventory rejection happens before extraction/execution."""
import importlib.util
import io
import json
from pathlib import Path
import unittest
import zipfile
from release_fixture import manifest_for
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify_release', ROOT / 'scripts/verify-release.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseManifestTests(unittest.TestCase):
    def archive(self, change=lambda files, manifest: None, extra=None):
        files = {'dist/index.html': b'Synthetic guide', 'scripts/serve.mjs': b'Synthetic launcher', 'LICENSE': b'Synthetic license'}
        manifest = manifest_for(files)
        change(files, manifest)
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as archive:
            for name, body in files.items(): archive.writestr(name, body)
            archive.writestr('PRODUCTION-MANIFEST.json', json.dumps(manifest))
            if extra: archive.writestr(*extra)
        data.seek(0)
        return zipfile.ZipFile(data)

    def test_all_payload_including_launcher_is_covered(self):
        with self.archive() as archive:
            result = module.verify_archive(archive)
            self.assertIn('scripts/serve.mjs', result['files'])
            self.assertIn('LICENSE', result['files'])

    def test_mutated_removed_and_unexpected_files_fail(self):
        mutations = [lambda files, m: files.__setitem__('scripts/serve.mjs', b'changed'),
                     lambda files, m: files.pop('LICENSE'),
                     lambda files, m: files.__setitem__('extra.txt', b'extra')]
        for mutation in mutations:
            with self.subTest(mutation=mutation), self.archive(mutation) as archive:
                with self.assertRaises(RuntimeError): module.verify_archive(archive)

    def test_duplicate_case_collision_unsafe_paths_and_symlink_fail(self):
        for name in ['LICENSE', 'license', '../escape', '/absolute', 'a/./b', 'a//b', 'a\\b', 'C:drive']:
            with self.subTest(name=name), self.archive(extra=(name, b'bad')) as archive:
                with self.assertRaises(RuntimeError): module.verify_archive(archive)
        info=zipfile.ZipInfo('link');info.external_attr=(0o120777 << 16)
        with self.archive(extra=(info,b'target')) as archive:
            with self.assertRaises(RuntimeError): module.verify_archive(archive)

    def test_rehashed_payload_still_must_match_captured_output(self):
        import hashlib
        def change(files, manifest):
            files['dist/index.html']=b'changed after build'
            manifest['files']['dist/index.html']={'sha256':hashlib.sha256(files['dist/index.html']).hexdigest(),'bytes':len(files['dist/index.html'])}
        with self.archive(change) as archive:
            with self.assertRaisesRegex(RuntimeError,'Captured build output'): module.verify_archive(archive)
