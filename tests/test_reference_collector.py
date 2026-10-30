"""Synthetic collector boundary tests; no remote calls or provider content."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collector', Path(__file__).resolve().parents[1] / 'scripts/collect-references.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.source = {'id': 'synthetic', 'url': 'https://example.test/items', 'candidatePaths': ['/items']}

    def test_inert_dedup_stable_links_and_record_digest(self):
        raw = b'<main><h2 id="parts">SYNTHETIC Materials</h2><a href="/items/a">SYNTHETIC Alloy</a><a href="/items/a">SYNTHETIC Alloy</a><script>steal()</script><a href="javascript:alert(1)">BAD</a><a href="https://evil.test/items/a">BAD</a></main>'
        pack = collector.capture(self.source, raw)
        self.assertEqual(len(pack['records']), 2)
        self.assertNotIn('steal', json.dumps(pack))
        a = next(r for r in pack['records'] if r['url'].endswith('/a'))
        renamed = collector.capture(self.source, raw.replace(b'SYNTHETIC Alloy', b'SYNTHETIC Other Alloy'))
        b = next(r for r in renamed['records'] if r['url'].endswith('/a'))
        self.assertEqual(a['id'], b['id'])
        self.assertNotEqual(a['digest'], b['digest'])

    def test_anchorless_rename_separate_identity_and_narrative_not_copied(self):
        a = collector.capture(self.source, b'<h2>SYNTHETIC one</h2><p>Full narrative must not be extracted.</p>')
        b = collector.capture(self.source, b'<h2>SYNTHETIC two</h2>')
        self.assertNotEqual(a['records'][0]['id'], b['records'][0]['id'])
        self.assertNotIn('narrative', json.dumps(a))

    def test_admission_bytes_depth_and_empty(self):
        for url in ['https://example.test/items-evil/a', 'https://example.test.evil/items', 'https://user:pass@example.test/items', 'http://example.test/items']:
            self.assertFalse(collector.admitted(self.source, url))
        with self.assertRaises(ValueError):
            collector.capture(self.source, b'x' * (collector.MAX_BYTES + 1))
        with self.assertRaises(ValueError):
            collector.capture(self.source, b'<div>' * 70)
        with self.assertRaises(ValueError):
            collector.capture(self.source, b'<script>no candidates</script>')

    def test_request_timeout_is_total_subprocess_deadline(self):
        with patch.object(collector.subprocess, 'run', side_effect=subprocess.TimeoutExpired('synthetic', 15)) as runner:
            with self.assertRaises(subprocess.TimeoutExpired):
                collector.fetch_raw(self.source['url'])
            self.assertEqual(runner.call_args.kwargs['timeout'], 15)
        with self.assertRaises(ValueError):
            collector.fetch_child('http://127.0.0.1/private')
        with self.assertRaises(ValueError):
            collector.NoRedirect().redirect_request(None, None, None, None, None, None)

    def test_boss_adapter_only_accepts_explicit_labelled_linked_cards(self):
        source = {'id': 'dmztracker-bosses', 'url': 'https://www.dmztracker.gg/bosses/', 'candidatePaths': ['/bosses']}
        html = b'''<nav><h3>BAD navigation</h3></nav>
        <article class="tile" data-group="commander"><span class="tile__tag">Commander</span><h3 class="tile__name"><a href="/bosses/synthetic-a/">SYNTHETIC Heavy</a></h3><p>Do not copy rewards or tactics</p></article>
        <article class="tile" data-group="lieutenant"><span class="tile__tag">Lieutenant</span><h3 class="tile__name"><a href="/bosses/synthetic-b/">SYNTHETIC Lieutenant</a></h3></article>
        <article class="tile" data-group="commander"><span class="tile__tag">Lieutenant</span><h3 class="tile__name"><a href="/bosses/mismatch/">BAD mismatch</a></h3></article>
        <article class="tile" data-group="lieutenant"><span class="tile__tag">Lieutenant</span><h3 class="tile__name"><a href="https://evil.test/bosses/x/">BAD external</a></h3></article>
        <article class="tile"><h3 class="tile__name">BAD untyped</h3></article>'''
        pack = collector.capture(source, html)
        self.assertEqual([r['kind'] for r in pack['records']], ['commander', 'lieutenant'])
        self.assertNotIn('BAD', json.dumps(pack))
        self.assertNotIn('rewards', json.dumps(pack))
        self.assertTrue(all(r['summary'] == '' and r['build'] is None for r in pack['records']))
        again = collector.capture(source, html.replace(b'SYNTHETIC Heavy', b'SYNTHETIC Other Heavy'))
        self.assertEqual(pack['records'][0]['id'], again['records'][0]['id'])
        self.assertNotEqual(pack['records'][0]['digest'], again['records'][0]['digest'])

    def test_failed_refresh_preserves_old_capture_and_records_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            existing = root / 'old.json'
            existing.write_text('SYNTHETIC old capture')
            with patch.object(collector, 'fetch_raw', side_effect=ValueError('SYNTHETIC blocked')):
                receipt = collector.run(['codmunity'], root)
            self.assertEqual(existing.read_text(), 'SYNTHETIC old capture')
            self.assertEqual(receipt[0]['status'], 'failed')
            with self.assertRaises(ValueError):
                collector.run(['http://evil.test'], root)


if __name__ == '__main__':
    unittest.main()
