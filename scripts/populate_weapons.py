"""One-time reviewed population from the locally captured048 source files."""
from pathlib import Path
import json
import re
from weapon_database import ROOT, LAUNCH, ATTACHMENTS, STATS, encoded, atomic, parse_html, validate_database


def identity(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def populate():
    blocks = parse_html((ROOT / '.local/weapon048-launch.html').read_bytes()).blocks
    data = json.loads((ROOT / '.local/weapon048-stats.json').read_text(encoding='utf-8'))
    attachment_data = json.loads((ROOT / '.local/weapon048-attachments.json').read_text(encoding='utf-8'))
    categories = {'Assault Rifles (8)': 'assault-rifle', 'Submachine Guns (SMGs) (5)': 'smg',
                  'Submachine Guns (5)': 'smg', 'Shotguns (2)': 'shotgun', 'Light Machine Guns (3)': 'lmg',
                  'Light Machine Guns (LMGs) (3)': 'lmg', 'Marksman Rifles (3)': 'marksman-rifle', 'Sniper Rifles (3)': 'sniper-rifle',
                  'Pistols (4)': 'pistol', 'Launchers (4)': 'launcher', 'Melee Weapon (1)': 'melee'}
    weapons, category, current, apex_text = [], None, None, False
    for tag, value in blocks:
        if tag == 'h3':
            category = categories.get(value)
            current = None
        if tag == 'h4':
            current = None
            if category:
                current = {'id': identity(value), 'name': value, 'category': category, 'official': {},
                           'slots': [], 'apex': '', 'blockedSlots': [], 'unlockReports': []}
                weapons.append(current)
                apex_text = False
        if not current or tag != 'p': continue
        for label, key, default in [('Levels', 'levels', 'levels'), ('Rounds', 'magazine', 'rounds'),
                                    ('Reserve', 'reserve', 'rounds'), ('Fire Rate', 'rpm', 'RPM')]:
            m = re.fullmatch(label + r': (\d+)(?: (RPM|BPM))?', value)
            if m:
                current['official'][key] = {'value': int(m[1]), 'unit': m[2] or default, 'applicability': 'reported'}
        if value.startswith('Available Criteria:'): current['unlockReports'].append('MP weapon sheet: ' + value.split(':', 1)[1].strip())
        if value.startswith('Attachment Types:'):
            current['slots'] = [] if value.endswith('N/A') else [s.strip() for s in value.split(':', 1)[1].split(',')]
        if value.startswith('Apex Attachment:'):
            current['apex'] = '' if value.endswith('N/A') else value.split(':', 1)[1].strip()
            apex_text = bool(current['apex'])
        elif apex_text and value:
            m = re.search(r'Blocks (.+?) Attachments?\.', value)
            if m: current['blockedSlots'] = [s.strip() for s in re.split(r',\s*and\s+|,\s*|\s+and\s+', m[1])]
    assert len(weapons) == 33, f'Unexpected roster count {len(weapons)}'
    # Preserve conflicting publisher progression-table criteria as separate reports.
    current_category = None
    for tag, value in blocks:
        if tag == 'h4' and 'Unlock Criteria' in value: current_category = 'progression'
        if tag == 'h3': current_category = None
        if current_category and tag == 'p':
            m = re.fullmatch(r'Level (\d+): (.+)', value)
            if m:
                weapon = next((w for w in weapons if w['name'].casefold() == m[2].casefold()), None)
                if weapon: weapon['unlockReports'].append('MP progression table: Level ' + m[1])
    for w in weapons:
        for key, unit in [('rpm', 'RPM'), ('magazine', 'rounds'), ('reserve', 'rounds'), ('levels', 'levels')]:
            if key not in w['official']:
                w['official'][key] = {'value': None, 'unit': unit,
                                     'applicability': 'not-applicable' if w['category'] == 'melee' and key != 'levels' else 'unknown'}
    sources = {'official-launch': {'url': LAUNCH, 'date': '2026-10-19', 'mode': 'shared-launch', 'status': 'official-reported', 'upstream': []},
               'community-stats': {'url': STATS, 'date': data['meta']['updated'], 'mode': 'multiplayer-base; attachment-mode-uncertain',
                                   'status': 'community-unverified', 'upstream': ['https://codmunity.gg/weapon-stats/mw4']},
               'community-attachments': {'url': ATTACHMENTS, 'date': attachment_data['meta']['updated'], 'mode': 'reported-compatibility',
                                         'status': 'community-unverified', 'upstream': [s['url'] for s in attachment_data['meta']['sources']]}}
    attachments = []
    for a in attachment_data['attachments']:
        attachments.append({'id': a['id'], 'name': a['name'], 'slot': a['type'], 'kind': 'standard',
                            'weapons': a['weapons'], 'effects': {w: data['attachments'].get(w, {}).get(a['id'], {}) for w in a['weapons']},
                            'operation': 'multiply', 'sources': ['community-attachments', 'community-stats'],
                            'unlock': '; '.join(w + ': reported weapon level ' + str(level) for w, level in a['unlock'].items()) if a.get('unlock') else 'Not reported', 'about': a.get('about', '')[:100]})
    for w in weapons:
        if w['apex']:
            attachments.append({'id': 'apex-' + w['id'], 'name': w['apex'], 'slot': 'apex', 'kind': 'apex',
                                'weapons': [w['id']], 'effects': {w['id']: data['apex'].get(w['id'], {})},
                                'operation': 'multiply', 'sources': ['official-launch', 'community-stats'],
                                'unlock': 'Full weapon progression; verify current unlock in game',
                                'about': 'Weapon-specific conversion; see official behavior and blocked slots'})
    db = {'version': 1, 'importedAt': '2026-11-01', 'sources': sources,
          'metrics': [{k: s[k] for k in ('id', 'name', 'group', 'unit', 'better')} for s in data['stats']],
          'weapons': weapons, 'attachments': attachments, 'communityStats': data['weapons'], 'patches': [], 'patchHistory': []}
    # Preserve provider raw values: they disagree with launch RPM/total ammo in places.
    validate_database(db)
    assert set(data['weapons']) == {w['id'] for w in weapons}
    target = ROOT / 'content/weapon-intel.json'
    assert not target.exists(), 'Population is one-time; use reviewed patch updates afterwards'
    atomic(target, encoded(db))
    pack_dir = ROOT / 'content/catalog/official-starter'
    pack = json.loads((pack_dir / 'pack.json').read_text(encoding='utf-8'))
    for w in weapons:
        file = pack_dir / 'weapons' / ('mw4_' + w['id'] + '.json')
        record = json.loads(file.read_text(encoding='utf-8')) if file.exists() else {
            'id': 'mw4:' + w['id'], 'name': w['name'], 'kind': 'weapon', 'category': w['category'], 'unit': 'count',
            'aliases': [], 'sourceIds': ['source:weapons'], 'status': 'verified'}
        record['description'] = 'Official launch identity and basic observations (2026-10-19). Current DMZ combat performance is not verified. Attachment reports and later patch history are available in the Weapon database.'
        record['stats'] = []
        for key, metric, label in [('rpm', 'fire-rate', 'Launch fire rate'), ('magazine', 'magazine-capacity', 'Launch magazine capacity'),
                                   ('reserve', 'custom', 'Launch reserve ammunition'), ('levels', 'custom', 'Launch weapon levels')]:
            v = w['official'][key]
            if v['applicability'] != 'reported': continue
            unit = 'rounds/min' if key == 'rpm' and v['unit'] == 'RPM' else 'rounds' if key == 'magazine' else 'custom'
            stat = {'metric': 'custom' if key == 'rpm' and unit == 'custom' else metric, 'label': label, 'value': v['value'], 'unit': unit,
                    'context': {'target': 'not a damage measurement', 'rangeMeters': None, 'attachments': 'publisher launch base sheet',
                                'stance': 'not specified', 'method': 'Official launch observation, not current live DMZ verification'},
                    'status': 'observed', 'sourceIds': ['source:weapons'], 'reviewedAt': '2026-11-01',
                    'scope': {'gameId': 'mw4', 'mode': 'shared-launch', 'build': 'launch-sheet-2026-10-19'}}
            if unit == 'custom': stat['customUnit'] = v['unit']
            record['stats'].append(stat)
        atomic(file, encoded(record))
        if record['id'] not in pack['order']['items']: pack['order']['items'].append(record['id'])
    pack['pack']['contentVersion'] = '2026.11.01.1'
    pack['pack']['coverage']['note'] = 'All33 official launch weapon identities/basic observations; current DMZ combat stats and full non-weapon coverage remain unverified. Other starter records retained.'
    atomic(pack_dir / 'pack.json', encoded(pack))
    source_file = pack_dir / 'sources/source_weapons.json'
    source = json.loads(source_file.read_text(encoding='utf-8'))
    source['supports'] = 'Launch weapon identities/classes and labelled basic launch observations; not current live DMZ numeric performance.'
    source['reviewedAt'] = '2026-11-01'
    atomic(source_file, encoded(source))
    print(json.dumps({'weapons': len(weapons), 'attachments': len(attachments),
                      'effectPairs': sum(bool(v) for a in attachments for v in a['effects'].values())}))


if __name__ == '__main__':
    populate()
