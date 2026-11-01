"""Synthetic parser/transaction fixtures; no network or owner database writes."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('weapon_database', Path(__file__).resolve().parents[1] / 'scripts/weapon_database.py')
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class WeaponUpdates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = json.loads((w.ROOT / w.DB).read_text(encoding='utf-8'))

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='dmz-weapon-test-')
        self.root = Path(self.temp.name)
        (self.root / 'content').mkdir()
        (self.root / '.local').mkdir()
        (self.root / w.DB).write_bytes(w.encoded(self.db))
        self.event = {'sourceURL': w.PATCH, 'date': '2026-11-01', 'mode': 'dmz', 'weapon': 'han-86',
                      'variant': 'Han 86', 'metric': 'Synthetic ADS time (ms)', 'before': '250',
                      'after': '240', 'unit': 'unspecified', 'status': 'official-reported'}
        self.event['id'] = w.event_id(self.event)

    def tearDown(self):
        self.temp.cleanup()

    def proposal(self, rows=None):
        p = {'version': 1, 'baseRevision': w.sha((self.root / w.DB).read_bytes()), 'articles': [w.PATCH],
             'observations': [self.event] if rows is None else rows, 'warnings': []}
        (self.root / w.PROPOSAL).write_bytes(w.encoded(p))
        return p

    def test_actual_population_coverage_and_reference_integrity(self):
        w.validate_database(self.db)
        self.assertEqual(len(self.db['weapons']), 33)
        self.assertEqual(len(self.db['attachments']), 643)
        self.assertEqual(sum(bool(v) for a in self.db['attachments'] for v in a['effects'].values()), 991)
        self.assertEqual({a['kind'] for a in self.db['attachments']}, {'standard', 'apex'})
        han = next(x for x in self.db['weapons'] if x['id'] == 'han-86')
        self.assertEqual(han['official']['rpm']['value'], 740)
        self.assertEqual(self.db['communityStats']['han-86']['rpm'], 741)
        melee = next(x for x in self.db['weapons'] if x['category'] == 'melee')
        self.assertEqual(melee['official']['rpm']['applicability'], 'not-applicable')

    def test_duplicate_apply_is_byte_identical_noop(self):
        self.proposal()
        before = (self.root / w.DB).read_bytes()
        self.assertEqual(len(w.apply(self.root)['added']), 1)
        after = (self.root / w.DB).read_bytes()
        self.assertNotEqual(before, after)
        self.assertEqual((self.root / '.local/weapon-updates/backup.json').read_bytes(), before)
        self.assertEqual(len(w.apply(self.root)['unchanged']), 1)
        self.assertEqual((self.root / w.DB).read_bytes(), after)

    def test_actual_revision_correction_history_and_no_base_mutation(self):
        self.proposal(); w.apply(self.root)
        changed = copy.deepcopy(self.event); changed['after'] = '230'
        self.proposal([changed]); w.apply(self.root)
        db = json.loads((self.root / w.DB).read_bytes())
        self.assertEqual(db['patches'][-1] if len(db['patches']) == 1 else next(x for x in db['patches'] if x['id'] == changed['id']), changed)
        self.assertEqual(db['patchHistory'][-1]['report'], self.event)
        for key in ('weapons', 'attachments', 'communityStats', 'sources'):
            self.assertEqual(db[key], self.db[key])

    def test_stale_proposal_rejected_after_manual_edit(self):
        self.proposal()
        db = copy.deepcopy(self.db); db['weapons'][0]['name'] += ' Owner correction'
        raw = w.encoded(db); (self.root / w.DB).write_bytes(raw)
        with self.assertRaisesRegex(ValueError, 'changed since check'): w.apply(self.root)
        self.assertEqual((self.root / w.DB).read_bytes(), raw)
        self.assertFalse((self.root / '.local/weapon-updates/writer.lock').exists())

    def test_writer_lock_blocks_and_is_not_removed_by_other_writer(self):
        self.proposal(); lock = w.safe_path(self.root, '.local/weapon-updates/writer.lock', create=True)
        lock.write_text('synthetic-existing-writer')
        with self.assertRaisesRegex(ValueError, 'Writer lock exists'): w.apply(self.root)
        self.assertEqual(lock.read_text(), 'synthetic-existing-writer')

    def test_backup_failure_retains_database_and_releases_lock(self):
        self.proposal(); before = (self.root / w.DB).read_bytes()
        with patch.object(w, 'atomic', side_effect=OSError('synthetic disk failure')):
            with self.assertRaises(OSError): w.apply(self.root)
        self.assertEqual((self.root / w.DB).read_bytes(), before)
        self.assertFalse((self.root / '.local/weapon-updates/writer.lock').exists())

    def test_replace_failure_retains_exact_backup_and_database(self):
        self.proposal(); before = (self.root / w.DB).read_bytes(); native = w.atomic
        def fail_database(path, data):
            if path.name == 'weapon-intel.json': raise OSError('synthetic replace failure')
            native(path, data)
        with patch.object(w, 'atomic', side_effect=fail_database):
            with self.assertRaises(OSError): w.apply(self.root)
        self.assertEqual((self.root / w.DB).read_bytes(), before)
        self.assertEqual((self.root / '.local/weapon-updates/backup.json').read_bytes(), before)

    def test_symlink_proposal_refused(self):
        outside = self.root / 'outside.json'; outside.write_bytes(b'{}')
        try: (self.root / w.PROPOSAL).symlink_to(outside)
        except OSError: self.skipTest('Host does not permit symlink creation')
        with self.assertRaisesRegex(ValueError, 'symlink'): w.apply(self.root)

    def test_malicious_source_identity_and_fields_rejected(self):
        for mutate in (lambda e: e.update(sourceURL='https://evil.invalid/patch'), lambda e: e.update(id='0'*64),
                       lambda e: e.update(weapon='not-real'), lambda e: e.update(path='../outside'),
                       lambda e: e.update(mode='warzone')):
            bad = copy.deepcopy(self.event); mutate(bad)
            p = self.proposal([bad])
            with self.assertRaises(ValueError): w.preview(self.db, p)

    def test_duplicate_conflicting_reports_rejected_but_identical_rows_deduplicate(self):
        p = self.proposal([self.event, self.event])
        self.assertEqual(len(w.preview(self.db, p)['added']), 1)
        other = copy.deepcopy(self.event); other['after'] = 'different'
        p = self.proposal([self.event, other])
        with self.assertRaisesRegex(ValueError, 'Conflicting duplicate'): w.preview(self.db, p)

    def test_absent_reports_are_not_deleted(self):
        self.proposal(); w.apply(self.root); before = (self.root / w.DB).read_bytes()
        self.proposal([]); w.apply(self.root)
        self.assertEqual((self.root / w.DB).read_bytes(), before)

    def test_nonfinite_unknown_metric_and_incompatible_effect_rejected(self):
        for change in ('nan', 'metric', 'compatibility', 'applicability', 'version', 'date'):
            db = copy.deepcopy(self.db)
            if change == 'version': db['version'] = True
            if change == 'date': db['importedAt'] = '2026-1-1'
            if change == 'nan': db['communityStats']['han-86']['ads'] = float('nan')
            if change == 'metric': db['communityStats']['han-86']['unknown'] = 1
            if change == 'compatibility': db['attachments'][0]['effects']['not-real'] = {}
            if change == 'applicability': db['weapons'][0]['official']['rpm']['applicability'] = 'unknown'
            with self.assertRaises(ValueError): w.validate_database(db)

    def html(self, mode='MULTIPLAYER', metric='Synthetic ADS time (ms)', partial=False):
        return ('<h1>Modern Warfare 4 Patch Notes</h1><h2>November 1, 2026</h2><h2>' + mode +
                '</h2><h3>Weapon Adjustments</h3><table><tr><th>Han 86</th><th>Pre</th><th>Post</th></tr>' +
                ('' if partial else '<tr><td>' + metric + '</td><td>250</td><td>240</td></tr>') + '</table>').encode()

    def test_table_date_mode_raw_units_and_inert_script(self):
        html = self.html() + b'<script>throw new Error("not executed")</script>'
        rows, warnings = w.parse_patches(html, w.PATCH, self.db)
        self.assertEqual(len(rows), 1); self.assertFalse(warnings)
        self.assertEqual(rows[0]['mode'], 'multiplayer')
        self.assertEqual(rows[0]['unit'], 'unspecified')
        self.assertEqual(rows[0]['date'], '2026-11-01')

    def test_qualitative_weapon_notes_remain_review_warnings_alongside_tables(self):
        rows, warnings = w.parse_patches(self.html() + b'<p>Fixed a synthetic Han 86 test issue.</p>', w.PATCH, self.db)
        self.assertEqual(len(rows), 1)
        self.assertTrue(any('Qualitative weapon note' in message for message in warnings))

    def test_manual_edit_during_backup_is_not_overwritten(self):
        self.proposal(); native = w.atomic
        changed = copy.deepcopy(self.db); changed['weapons'][0]['unlockReports'].append('Synthetic owner correction')
        owner_bytes = w.encoded(changed)
        def owner_edit(path, data):
            native(path, data)
            if path.name == 'backup.json': (self.root / w.DB).write_bytes(owner_bytes)
        with patch.object(w, 'atomic', side_effect=owner_edit):
            with self.assertRaisesRegex(ValueError, 'changed during apply'): w.apply(self.root)
        self.assertEqual((self.root / w.DB).read_bytes(), owner_bytes)

    def test_unknown_mode_warns_instead_of_creating_dmz_report(self):
        rows, warnings = w.parse_patches(self.html('SOMETHING NEW'), w.PATCH, self.db)
        self.assertEqual(rows, []); self.assertTrue(warnings)

    def test_unknown_sibling_mode_never_inherits_multiplayer(self):
        html = self.html() + b'<h2>WARZONE</h2><table><tr><th>Han 86</th><th>Pre</th><th>Post</th></tr><tr><td>Range</td><td>10</td><td>12</td></tr></table>'
        rows, warnings = w.parse_patches(html, w.PATCH, self.db)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['mode'], 'multiplayer')
        self.assertTrue(any('Unresolved' in x for x in warnings))

    def test_weapon_prefix_and_unknown_variants_do_not_match(self):
        for subject in ('M4not-a-real-weapon', 'M4 - invented conversion', 'Han 86 unrelated name', 'Han 86 - r Apex Attachment', 'Oden - tinel Apex Attachment'):
            self.assertIsNone(w.match_subject(subject, self.db))
        self.assertEqual(w.match_subject('Oden - Sentinel Apex Attachment', self.db)['id'], 'oden')
        self.assertEqual(w.match_subject('Warlord - 12G Slug Rounds', self.db)['id'], 'warlord')

    def test_hard_network_supervisor_terminates_timeout(self):
        with patch.object(w.subprocess, 'run', side_effect=w.subprocess.TimeoutExpired('synthetic DNS stall', 12)) as run:
            with self.assertRaisesRegex(ValueError, 'Hard fetch deadline'): w.Fetcher().get(w.PATCH)
            self.assertLessEqual(run.call_args.kwargs['timeout'], 12)

    def test_invalid_nested_collection_types_rejected(self):
        for key in ('slots', 'blockedSlots', 'unlockReports'):
            db = copy.deepcopy(self.db); db['weapons'][0][key] = 'Optic'
            with self.assertRaises(ValueError): w.validate_database(db)
        db = copy.deepcopy(self.db); db['sources']['official-launch']['upstream'] = 'https://example.invalid'
        with self.assertRaises(ValueError): w.validate_database(db)

    def test_page_cap_and_oversize_html_fail_before_proposal(self):
        index = ('<h1>Patch Notes</h1>' + ''.join('<a href="'+w.INDEX+'/2026/11/call-of-duty-modern-warfare-4-test-'+str(i)+'">Page</a>' for i in range(13))).encode()
        with self.assertRaisesRegex(ValueError, 'More than12'): w.check(self.root, lambda _: index)
        with self.assertRaisesRegex(ValueError, 'byte limit'): w.parse_html(b'x'*(2*1024*1024+1))

    def test_missing_dates_and_malformed_row_fail(self):
        for html in (b'<h1>Modern Warfare 4</h1>', self.html(partial=True), self.html().replace(b'<td>240</td>', b'')):
            with self.assertRaises(ValueError): w.parse_patches(html, w.PATCH, self.db)

    def test_official_allowlist_denies_host_port_query_credentials_and_other_games(self):
        for url in (w.PATCH+'?x=1',w.PATCH+'#x',w.PATCH.replace('www.', ''),w.PATCH.replace('.com/','.com:443/'),
                    w.PATCH.replace('www.', 'evil@www.'),w.PATCH.replace('warfare-4','warfare-2')):
            self.assertFalse(w.allowed_article(url))

    def test_discovery_repeat_ordering_and_beta_exclusion(self):
        index = b'<h1>Call of Duty Patch Notes</h1><a href="'+w.PATCH.encode()+b'">Current</a><a href="https://evil.invalid/patch">No</a>'
        fetch = lambda url: index if url == w.INDEX else self.html()
        p1, _ = w.check(self.root, fetch); p2, _ = w.check(self.root, fetch)
        self.assertEqual(p1, p2)
        w.apply(self.root)
        _, changes = w.check(self.root, fetch)
        self.assertEqual(len(changes['added']), 0); self.assertEqual(len(changes['unchanged']), 1)

    def test_failed_fetch_does_not_replace_old_proposal_or_database(self):
        self.proposal(); before = (self.root / w.PROPOSAL).read_bytes()
        with self.assertRaises(OSError): w.check(self.root, lambda _: (_ for _ in ()).throw(OSError('offline')))
        self.assertEqual((self.root / w.PROPOSAL).read_bytes(), before)

    def test_duplicate_json_keys_and_deep_import_rejected(self):
        file = self.root / 'invalid.json'
        for raw in (b'{"version":1,"version":2}', b'['*30+b'0'+b']'*30):
            file.write_bytes(raw)
            with self.assertRaises(ValueError): w.read_json(file)

    def test_total_node_budget_matches_runtime_reader(self):
        with self.assertRaisesRegex(ValueError, 'node limit'):
            w.bounded_tree([[0] * 1000 for _ in range(151)])

    def test_049_reviewed_proposal_hash_is_checked_under_lock(self):
        self.proposal(); reviewed = w.sha((self.root / w.PROPOSAL).read_bytes())
        changed = copy.deepcopy(self.event); changed['after'] = 'newer unreviewed report'
        self.proposal([changed]); before = (self.root / w.DB).read_bytes()
        with self.assertRaisesRegex(ValueError, 'Reviewed proposal changed'): w.apply(self.root, reviewed)
        self.assertEqual((self.root / w.DB).read_bytes(), before)

    def test_049_rollback_restores_previous_and_retains_current_as_backup(self):
        original = (self.root / w.DB).read_bytes(); self.proposal(); w.apply(self.root)
        current = (self.root / w.DB).read_bytes()
        self.assertTrue(w.rollback(self.root, w.sha(current))['restored'])
        self.assertEqual((self.root / w.DB).read_bytes(), original)
        self.assertEqual((self.root / '.local/weapon-updates/backup.json').read_bytes(), current)
        self.assertFalse((self.root / '.local/weapon-updates/rollback-pending.json').exists())

    def test_049_interrupted_rollback_retains_target_and_resumes_after_replace_failure(self):
        original = (self.root / w.DB).read_bytes(); self.proposal(); w.apply(self.root)
        current = (self.root / w.DB).read_bytes(); native = w.atomic
        def fail_replace(path, data):
            if path.name == 'weapon-intel.json': raise OSError('synthetic rollback replace failure')
            native(path, data)
        with patch.object(w, 'atomic', side_effect=fail_replace):
            with self.assertRaises(OSError): w.rollback(self.root, w.sha(current))
        self.assertEqual((self.root / w.DB).read_bytes(), current)
        self.assertEqual((self.root / '.local/weapon-updates/rollback-target.json').read_bytes(), original)
        self.assertTrue(w.manager_state(self.root)['pendingRollback'])
        with self.assertRaisesRegex(ValueError, 'Interrupted rollback'): w.apply(self.root)
        w.rollback(self.root, w.sha(current))
        self.assertEqual((self.root / w.DB).read_bytes(), original)

    def test_049_owner_edit_conflicts_with_pending_rollback_and_preserves_candidate(self):
        self.proposal(); w.apply(self.root); current = (self.root / w.DB).read_bytes(); native=w.atomic
        def fail_replace(path,data):
            if path.name=='weapon-intel.json': raise OSError('synthetic failure')
            native(path,data)
        with patch.object(w,'atomic',side_effect=fail_replace):
            with self.assertRaises(OSError): w.rollback(self.root,w.sha(current))
        candidate=(self.root / '.local/weapon-updates/rollback-target.json').read_bytes()
        owner=copy.deepcopy(self.db);owner['weapons'][0]['unlockReports'].append('Synthetic owner edit')
        owner_raw=w.encoded(owner);(self.root / w.DB).write_bytes(owner_raw)
        with self.assertRaisesRegex(ValueError,'Owner changes conflict'):w.rollback(self.root,w.sha(owner_raw))
        self.assertEqual((self.root / w.DB).read_bytes(),owner_raw)
        self.assertEqual((self.root / '.local/weapon-updates/rollback-target.json').read_bytes(),candidate)

    def test_049_invalid_backup_or_stale_rollback_does_not_write(self):
        self.proposal();w.apply(self.root);current=(self.root / w.DB).read_bytes()
        with self.assertRaisesRegex(ValueError,'changed since rollback'):w.rollback(self.root,'0'*64)
        (self.root / '.local/weapon-updates/backup.json').write_text('{}')
        with self.assertRaises(ValueError):w.rollback(self.root,w.sha(current))
        self.assertEqual((self.root / w.DB).read_bytes(),current)

    def test_049_crash_after_promotion_preserves_backup_and_resumes_cleanup(self):
        original=(self.root / w.DB).read_bytes();self.proposal();w.apply(self.root)
        current=(self.root / w.DB).read_bytes()
        native=Path.unlink
        def fail_cleanup(path,*args,**kwargs):
            if path.name=='rollback-pending.json':raise OSError('synthetic cleanup crash')
            return native(path,*args,**kwargs)
        with patch.object(Path,'unlink',fail_cleanup):
            with self.assertRaisesRegex(OSError,'cleanup crash'):w.rollback(self.root,w.sha(current))
        self.assertEqual((self.root / w.DB).read_bytes(),original)
        self.assertEqual((self.root / '.local/weapon-updates/backup.json').read_bytes(),current)
        self.assertTrue(w.rollback(self.root,w.sha(original))['completedInterrupted'])
        self.assertEqual((self.root / '.local/weapon-updates/backup.json').read_bytes(),current)


if __name__ == '__main__':
    unittest.main()
