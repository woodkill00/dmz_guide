"""Explicit local weapon data and official patch workflow. No network on import."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
import math
import os
from pathlib import Path
import re
import time
import tempfile
import subprocess
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parents[1]
DB = 'content/weapon-intel.json'
PROPOSAL = '.local/weapon-patch-proposal.json'
INDEX = 'https://www.callofduty.com/patchnotes'
PATCH = INDEX + '/2026/10/call-of-duty-modern-warfare-4-launch-patch-notes'
LAUNCH = 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class'
ATTACHMENTS = 'https://codloadout.gitlab.io/data/mw4-community-attachments.json'
STATS = 'https://codloadout.gitlab.io/data/mw4-community-stats.json'
MAX_DB = 8 * 1024 * 1024
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')
ARTICLE = re.compile(r'/patchnotes/20[0-9]{2}/(?:0[1-9]|1[0-2])/call-of-duty-modern-warfare-4-[a-z0-9-]+\Z')


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + '\n').encode('utf-8')


def sha(value):
    return hashlib.sha256(value).hexdigest()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def exact(value, keys):
    require(isinstance(value, dict) and set(value) == set(keys), 'Unexpected/missing object fields')


def text(value, limit=500):
    require(isinstance(value, str) and len(value) <= limit and '\x00' not in value, 'Invalid text')


def validate_date(value):
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', value), 'Invalid date format')
    datetime.strptime(value, '%Y-%m-%d')


def slug(value):
    require(isinstance(value, str) and len(value) <= 100 and SLUG.fullmatch(value), 'Invalid identity')


def finite(value):
    require(type(value) in (int, float) and math.isfinite(value) and value >= 0, 'Invalid numeric observation')


def allowed_article(url):
    if not isinstance(url, str) or len(url) > 500:
        return False
    u = urlsplit(url)
    return (u.scheme == 'https' and u.netloc == 'www.callofduty.com' and not u.query
            and not u.fragment and bool(ARTICLE.fullmatch(u.path)))


def safe_path(root, relative, create=False):
    root = Path(root).absolute()
    def linked(p):
        return p.is_symlink() or (hasattr(p, 'is_junction') and p.is_junction())
    require(not any(linked(p) for p in [root, *root.parents]), 'Unsafe root')
    current = root
    for i, part in enumerate(Path(relative).parts):
        require(part not in ('..', '.', '') and not Path(part).is_absolute(), 'Unsafe path')
        current = current / part
        require(not linked(current), 'Refusing symlink/reparse path')
        if current.exists():
            require(current.is_file() if i == len(Path(relative).parts)-1 else current.is_dir(), 'Unexpected path type')
        elif create and i < len(Path(relative).parts)-1:
            current.mkdir()
    return current


def read_json(path, limit=MAX_DB):
    require(path.is_file() and not path.is_symlink() and path.stat().st_size <= limit, 'Unsafe/oversize JSON file')
    raw = path.read_bytes()
    require(len(raw) <= limit, 'JSON byte limit exceeded')
    def pairs(items):
        out = {}
        for key, val in items:
            require(key not in out, 'Duplicate JSON key')
            out[key] = val
        return out
    value = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))
    bounded_tree(value)
    return value, raw


def bounded_tree(value):
    nodes = 0
    def walk(v, depth=0):
        nonlocal nodes
        nodes += 1
        require(nodes <= 150000, 'JSON node limit exceeded')
        require(depth <= 20, 'JSON nesting limit exceeded')
        if isinstance(v, dict):
            require(len(v) <= 10000, 'JSON map limit')
            for k, child in v.items():
                require(k not in ('__proto__', 'constructor', 'prototype'), 'Unsafe JSON key')
                text(k); walk(child, depth+1)
        elif isinstance(v, list):
            require(len(v) <= 10000, 'JSON array limit')
            for child in v: walk(child, depth+1)
        elif isinstance(v, str): text(v)
        elif type(v) is float: require(math.isfinite(v), 'Nonfinite JSON')
    walk(value)

def atomic(path, data):
    require(not path.is_symlink(), 'Refusing symlink destination')
    fd, name = tempfile.mkstemp(prefix='.weapon-', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirect refused; review the source URL')


class Fetcher:
    def __init__(self):
        self.started, self.total = time.monotonic(), 0

    def get(self, url):
        require(url in (INDEX, LAUNCH, ATTACHMENTS, STATS) or allowed_article(url), 'Source URL not allowed')
        remaining = 120-(time.monotonic()-self.started)
        require(remaining > 0, 'Overall fetch deadline exceeded')
        try:
            result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '_fetch', url],
                                    capture_output=True, timeout=min(12, remaining), check=False)
        except subprocess.TimeoutExpired as error:
            raise ValueError('Hard fetch deadline exceeded; child terminated') from error
        require(result.returncode == 0, 'Fetch worker failed: ' + result.stderr.decode('utf-8', errors='replace')[:200])
        require(len(result.stdout) <= 2*1024*1024, 'Fetch byte limit exceeded')
        self.total += len(result.stdout)
        require(self.total <= 16*1024*1024, 'Aggregate fetch byte limit exceeded')
        return result.stdout

    def _get(self, url):
        require(url in (INDEX, LAUNCH, ATTACHMENTS, STATS) or allowed_article(url), 'Source URL not allowed')
        require(time.monotonic()-self.started < 120, 'Overall fetch deadline exceeded')
        kind = 'application/json' if url in (ATTACHMENTS, STATS) else 'text/html'
        started = time.monotonic()
        with build_opener(NoRedirect()).open(Request(url, headers={
            'User-Agent': 'DMZGuide-local-data/1.0', 'Accept': kind, 'Accept-Encoding': 'identity'}), timeout=12) as response:
            require(response.headers.get_content_type() == kind, 'Unexpected response content type')
            require(response.headers.get('Content-Encoding', 'identity') == 'identity', 'Compressed response refused')
            chunks, size = [], 0
            while True:
                require(time.monotonic()-started < 12 and time.monotonic()-self.started < 120, 'Fetch deadline exceeded')
                remaining = min(12-(time.monotonic()-started), 120-(time.monotonic()-self.started))
                sock = getattr(getattr(getattr(response, 'fp', None), 'raw', None), '_sock', None)
                if sock is not None: sock.settimeout(max(0.001, remaining))
                block = response.read1(65536)
                if not block:
                    break
                size += len(block)
                self.total += len(block)
                require(size <= 2*1024*1024 and self.total <= 16*1024*1024, 'Fetch byte limit exceeded')
                chunks.append(block)
        raw = b''.join(chunks)
        raw.decode('utf-8')
        return raw


class Blocks(HTMLParser):
    """Only headings, short text, table cells and anchor URLs; scripts stay inert."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.active = None
        self.buffer = []
        self.blocks, self.links = [], []
        self.cells = None

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'template'):
            self.skip += 1
        if self.skip:
            return
        if tag == 'a':
            self.links.extend(v for k, v in attrs if k == 'href' and v)
        if tag == 'tr':
            self.cells = []
        if tag in ('h1', 'h2', 'h3', 'h4', 'p', 'li', 'td', 'th'):
            self.active, self.buffer = tag, []

    def handle_data(self, data):
        if self.active and not self.skip:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'template'):
            self.skip = max(0, self.skip-1)
        if tag == self.active and not self.skip:
            value = ' '.join(''.join(self.buffer).split())
            if tag in ('td', 'th') and self.cells is not None:
                self.cells.append(value)
            else:
                self.blocks.append((tag, value))
            self.active = None
        if tag == 'tr' and self.cells is not None:
            self.blocks.append(('tr', self.cells))
            self.cells = None


def parse_html(raw):
    require(len(raw) <= 2*1024*1024, 'HTML byte limit exceeded')
    p = Blocks()
    p.feed(raw.decode('utf-8'))
    require(len(p.blocks) <= 30000 and len(p.links) <= 10000, 'HTML complexity limit exceeded')
    return p


def event_id(row):
    fields = ('sourceURL', 'date', 'mode', 'weapon', 'variant', 'metric')
    return sha(json.dumps([row[k] for k in fields], ensure_ascii=False, separators=(',', ':')).encode())


def match_subject(subject, db):
    folded = subject.casefold().strip()
    compact = lambda value: re.sub(r'[^a-z0-9]', '', value.casefold())
    for weapon in db['weapons']:
        base, separator, tail = folded.partition(' - ')
        if compact(base) != compact(weapon['id']): continue
        if not separator: return weapon
        suffix = re.sub(r'\s*\([^)]*\)\s*$', '', tail).strip()
        if suffix.endswith(' apex attachment'):
            apex = compact(weapon['apex'])
            variant = compact(suffix[:-len(' apex attachment')])
            aliases = {apex}
            prefix = compact(weapon['id'])
            if apex.startswith(prefix): aliases.add(apex[len(prefix):])
            reviewed = {'hyeon-burst': 'hyperburst', 'oden': 'sentinel', 'type-73': 'assault', 'x-58-nyx': 'void'}
            if weapon['id'] in reviewed: aliases.add(reviewed[weapon['id']])
            if variant and variant in aliases: return weapon
        elif any(a['name'].casefold() == suffix and weapon['id'] in a['weapons'] for a in db['attachments']):
            return weapon
        elif weapon['id'] == 'warlord' and suffix == '12g slug rounds':
            return weapon  # Reviewed exact publisher alias for the reported 12 Gauge Slug.
    return None


def validate_event(row, db):
    exact(row, ('id', 'sourceURL', 'date', 'mode', 'weapon', 'variant', 'metric', 'before', 'after', 'unit', 'status'))
    require(allowed_article(row['sourceURL']), 'Unapproved patch source')
    validate_date(row['date'])
    require(row['mode'] in ('multiplayer', 'dmz', 'global', 'unknown'), 'Invalid patch mode')
    text(row['variant'])
    matched = match_subject(row['variant'], db)
    require(matched is not None and row['weapon'] == matched['id'], 'Unknown patch weapon/variant')
    for key in ('variant', 'metric', 'before', 'after', 'unit'):
        text(row[key])
    require(row['metric'] and row['after'] and row['status'] == 'official-reported', 'Invalid patch report')
    require(row['id'] == event_id(row), 'Patch identity mismatch')


def validate_database(db):
    bounded_tree(db)
    exact(db, ('version', 'importedAt', 'sources', 'metrics', 'weapons', 'attachments', 'communityStats', 'patches', 'patchHistory'))
    require(type(db['version']) in (int, float) and db['version'] == 1, 'Unsupported intelligence version')
    validate_date(db['importedAt'])
    require(isinstance(db['sources'], dict) and len(db['sources']) <= 256, 'Source limit')
    for key, row in db['sources'].items():
        slug(key)
        exact(row, ('url', 'date', 'mode', 'status', 'upstream'))
        require(isinstance(row['upstream'], list) and len(row['upstream']) <= 256, 'Invalid upstream sources')
        for url in [row['url'], *row['upstream']]:
            text(url)
            u = urlsplit(url)
            require(u.scheme == 'https' and u.netloc and not u.username and not u.password, 'Unsafe source URL')
        validate_date(row['date'])
        text(row['mode']); text(row['status'])
    require(isinstance(db['metrics'], list) and len(db['metrics']) <= 64, 'Metric limit')
    metrics = set()
    for m in db['metrics']:
        exact(m, ('id', 'name', 'group', 'unit', 'better'))
        for key in m:
            text(m[key])
        require(m['id'] not in metrics and m['better'] in ('higher', 'lower'), 'Invalid metric')
        metrics.add(m['id'])
    require(isinstance(db['weapons'], list) and 0 < len(db['weapons']) <= 256, 'Weapon limit')
    weapons = set()
    for w in db['weapons']:
        exact(w, ('id', 'name', 'category', 'official', 'slots', 'apex', 'blockedSlots', 'unlockReports'))
        slug(w['id']); text(w['name']); text(w['category']); text(w['apex'])
        require(w['id'] not in weapons, 'Duplicate weapon')
        weapons.add(w['id'])
        for values in (w['slots'], w['blockedSlots'], w['unlockReports']):
            require(isinstance(values, list) and len(values) <= 64, 'Invalid weapon collection')
            for value in values: text(value)
        exact(w['official'], ('rpm', 'magazine', 'reserve', 'levels'))
        for v in w['official'].values():
            exact(v, ('value', 'unit', 'applicability'))
            text(v['unit'])
            require(v['applicability'] in ('reported', 'unknown', 'not-applicable'), 'Unknown applicability')
            if v['applicability'] == 'reported': finite(v['value'])
            else: require(v['value'] is None, 'Unknown/inapplicable cannot have value')
    require(isinstance(db['communityStats'], dict) and set(db['communityStats']) <= weapons, 'Unknown stat weapon')
    for values in db['communityStats'].values():
        require(isinstance(values, dict) and set(values) <= metrics, 'Unknown metric')
        for v in values.values(): finite(v)
    ids = set()
    require(isinstance(db['attachments'], list) and len(db['attachments']) <= 2000, 'Attachment limit')
    for a in db['attachments']:
        exact(a, ('id', 'name', 'slot', 'kind', 'weapons', 'effects', 'operation', 'sources', 'unlock', 'about'))
        slug(a['id']); text(a['name']); text(a['slot']); text(a['unlock']); text(a['about'])
        require(a['id'] not in ids and a['kind'] in ('standard', 'apex'), 'Duplicate/invalid attachment')
        ids.add(a['id'])
        require(isinstance(a['weapons'], list) and len(a['weapons']) == len(set(a['weapons'])) and set(a['weapons']) <= weapons, 'Unknown/duplicate compatibility')
        require(a['operation'] == 'multiply' and isinstance(a['effects'], dict) and set(a['effects']) <= set(a['weapons']), 'Invalid effect compatibility')
        require(isinstance(a['sources'], list) and 0 < len(a['sources']) <= 256 and set(a['sources']) <= set(db['sources']), 'Unknown attachment source')
        for values in a['effects'].values():
            require(isinstance(values, dict) and set(values) <= metrics, 'Unknown effect metric')
            for v in values.values(): finite(v)
    require(isinstance(db['patches'], list) and isinstance(db['patchHistory'], list) and len(db['patches']) <= 10000 and len(db['patchHistory']) <= 1000, 'Patch/history capacity exceeded')
    ids = set()
    for row in db['patches']:
        validate_event(row, db)
        require(row['id'] not in ids, 'Duplicate patch identity')
        ids.add(row['id'])
    for old in db['patchHistory']:
        exact(old, ('previousHash', 'report'))
        validate_event(old['report'], db)
        require(old['previousHash'] == sha(encoded(old['report'])), 'History hash mismatch')
    require(len(encoded(db)) <= MAX_DB, 'Database byte limit exceeded')
    return db


def parse_patches(raw, url, db):
    require(allowed_article(url), 'Unapproved article')
    blocks = parse_html(raw).blocks
    require(any(t == 'h1' and 'modern warfare 4' in s.lower() for t, s in blocks), 'Not an MW4 patch article')
    date, mode, subject, mode_level = None, 'unknown', '', 0
    rows, warnings, dated, adjustments, tables, data_rows = [], [], 0, False, 0, 0

    for tag, value in blocks:
        if tag in ('h2', 'h3', 'h4'):
            if value: subject = ''
            try:
                date = datetime.strptime(value, '%B %d, %Y').date().isoformat()
                mode, subject, mode_level = 'unknown', '', 0
                dated += 1
            except ValueError:
                upper = value.upper()
                level = int(tag[1])
                if value and mode_level and level <= mode_level:
                    mode, mode_level = 'unknown', 0
                if upper in ('MULTIPLAYER', 'DMZ', 'GLOBAL', 'PLAYLIST', 'MULTIPLAYER CONTENT'):
                    mode = {'MULTIPLAYER': 'multiplayer', 'MULTIPLAYER CONTENT': 'multiplayer', 'DMZ': 'dmz', 'GLOBAL': 'global'}.get(upper, 'unknown')
                    subject = ''
                    mode_level = level
                if 'weapon adjustments' in value.lower(): adjustments = True
        if tag != 'tr':
            if tag in ('p', 'li') and date and mode != 'unknown':
                mentioned = [w['id'] for w in db['weapons'] if re.search(r'(?<![a-z0-9])'+re.escape(w['name'])+r'(?![a-z0-9])', value, re.I)]
                if mentioned:
                    warnings.append('Qualitative weapon note requires manual review (' + date + '/' + mode + '/' + ','.join(mentioned) + '): ' + url)
            continue
        cells = [x for x in value if x and not re.fullmatch(r'[\s\u3164\u2190-\u21ff]+', x)]
        if 'Pre' in cells and 'Post' in cells:
            subject = cells[0]
            tables += 1
            continue
        if not subject or len(cells) < 3:
            warnings.append('Unrecognized table row; review source structure')
            continue
        data_rows += 1
        weapon = match_subject(subject, db)
        if not date or not weapon or mode == 'unknown':
            warnings.append('Unresolved date/mode/weapon table: ' + subject[:150])
            continue
        before, after = cells[1], cells[2]
        row = {'sourceURL': url, 'date': date, 'mode': mode, 'weapon': weapon['id'],
               'variant': subject, 'metric': cells[0], 'before': before, 'after': after,
               'unit': 'unspecified', 'status': 'official-reported'}
        row['id'] = event_id(row)
        validate_event(row, db)
        rows.append(row)
    require(dated > 0 and (not adjustments or tables > 0) and (not tables or data_rows > 0), 'Unrecognized/partial dated weapon notes')
    require(not any('Unrecognized table' in w for w in warnings), 'Malformed patch table; no proposal written')
    if not tables:
        warnings.append('No structured weapon change tables; qualitative notes require source review: ' + url)
    return rows, warnings


def preview(db, proposal):
    exact(proposal, ('version', 'baseRevision', 'articles', 'observations', 'warnings'))
    require(type(proposal['version']) in (int, float) and proposal['version'] == 1 and re.fullmatch('[a-f0-9]{64}', proposal['baseRevision']), 'Invalid proposal version/revision')
    require(isinstance(proposal['articles'], list) and len(proposal['articles']) <= 12 and proposal['articles'] == sorted(set(proposal['articles'])) and all(allowed_article(u) for u in proposal['articles']), 'Invalid proposal articles')
    require(isinstance(proposal['observations'], list) and len(proposal['observations']) <= 5000, 'Proposal row limit')
    require(isinstance(proposal['warnings'], list) and len(proposal['warnings']) <= 1000, 'Warning limit')
    for warning in proposal['warnings']: text(warning)
    require(len(encoded(proposal)) <= 4*1024*1024, 'Proposal byte limit')
    old = {r['id']: r for r in db['patches']}
    seen, changes = {}, {'added': [], 'changed': [], 'unchanged': []}
    for row in proposal['observations']:
        validate_event(row, db)
        require(row['sourceURL'] in proposal['articles'], 'Report source absent from proposal')
        require(row['id'] not in seen or seen[row['id']] == row, 'Conflicting duplicate reports')
        if row['id'] in seen: continue
        seen[row['id']] = row
        changes['added' if row['id'] not in old else 'unchanged' if old[row['id']] == row else 'changed'].append(row)
    return changes


def check(root=ROOT, fetch=None):
    require(not safe_path(root, '.local/weapon-updates/rollback-pending.json').exists(), 'Interrupted rollback needs recovery before check')
    db, raw = read_json(safe_path(root, DB))
    validate_database(db)
    fetch = fetch or Fetcher().get
    index = parse_html(fetch(INDEX))
    require(any(t == 'h1' and 'patch' in s.lower() for t, s in index.blocks), 'Unrecognized patch index')
    urls = {PATCH}
    discovery_warnings = []
    for href in index.links:
        url = urljoin(INDEX, href).split('#')[0].split('?')[0]
        if allowed_article(url):
            if '-beta-' in url:
                discovery_warnings.append('Historical beta article excluded from launch checks: ' + url)
            else: urls.add(url)
    require(len(urls) <= 12, 'More than12 MW4 articles: review discovery before continuing')
    rows, warnings = [], discovery_warnings
    for url in sorted(urls):
        try:
            reports, notes = parse_patches(fetch(url), url, db)
        except ValueError as error:
            raise ValueError(url + ': ' + str(error)) from error
        rows.extend(reports); warnings.extend(notes)
    present = {row['id'] for row in rows}
    if any(row['id'] not in present for row in db['patches']):
        warnings.append('Previously retained reports not found; they will not be deleted')
    proposal = {'version': 1, 'baseRevision': sha(raw), 'articles': sorted(urls),
                'observations': sorted(rows, key=lambda r: r['id']), 'warnings': sorted(set(warnings))}
    changes = preview(db, proposal)
    atomic(safe_path(root, PROPOSAL, create=True), encoded(proposal))
    return proposal, changes


def apply(root=ROOT, proposal_hash=None):
    lock = safe_path(root, '.local/weapon-updates/writer.lock', create=True)
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise ValueError('Writer lock exists. Confirm no writer is alive before inspecting/removing it.') from exc
    try:
        with os.fdopen(fd, 'w') as stream: stream.write(str(os.getpid()))
        target = safe_path(root, DB)
        db, raw = read_json(target)
        validate_database(db)
        proposal, proposal_raw = read_json(safe_path(root, PROPOSAL), 4*1024*1024)
        if proposal_hash is not None:
            require(re.fullmatch('[a-f0-9]{64}', proposal_hash) and proposal_hash == sha(proposal_raw), 'Reviewed proposal changed; check and review again')
        require(not safe_path(root, '.local/weapon-updates/rollback-pending.json').exists(), 'Interrupted rollback needs explicit recovery before apply')
        changes = preview(db, proposal)
        if not changes['added'] and not changes['changed']: return changes
        require(proposal['baseRevision'] == sha(raw), 'Database changed since check; run weapons:check again')
        by_id = {r['id']: r for r in db['patches']}
        for row in changes['changed']:
            old = by_id[row['id']]
            db['patchHistory'].append({'previousHash': sha(encoded(old)), 'report': old})
        for row in changes['added'] + changes['changed']: by_id[row['id']] = row
        db['patches'] = sorted(by_id.values(), key=lambda r: r['id'])
        validate_database(db)
        atomic(safe_path(root, '.local/weapon-updates/backup.json', create=True), raw)
        require(sha(target.read_bytes()) == sha(raw), 'Database changed during apply; recheck before retry')
        atomic(target, encoded(db))
        return changes
    finally:
        lock.unlink()


def rollback(root=ROOT, expected_revision=None):
    require(isinstance(expected_revision, str) and re.fullmatch('[a-f0-9]{64}', expected_revision), 'Rollback requires the reviewed current revision')
    lock = safe_path(root, '.local/weapon-updates/writer.lock', create=True)
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as error:
        raise ValueError('Writer lock exists; inspect before retrying rollback') from error
    try:
        with os.fdopen(fd, 'w') as stream: stream.write(str(os.getpid()))
        target = safe_path(root, DB)
        current, current_raw = read_json(target)
        validate_database(current)
        require(sha(current_raw) == expected_revision, 'Database changed since rollback review')
        candidate = safe_path(root, '.local/weapon-updates/rollback-target.json', create=True)
        journal = safe_path(root, '.local/weapon-updates/rollback-pending.json', create=True)
        backup = safe_path(root, '.local/weapon-updates/backup.json', create=True)
        if journal.exists():
            intent, _ = read_json(journal, 4096)
            exact(intent, ('version', 'beforeHash', 'targetHash'))
            require(type(intent['version']) is int and intent['version'] == 1 and all(isinstance(intent[k], str) and re.fullmatch('[a-f0-9]{64}', intent[k]) for k in ('beforeHash', 'targetHash')), 'Invalid rollback journal')
            previous, previous_raw = read_json(candidate)
            validate_database(previous)
            require(sha(previous_raw) == intent['targetHash'], 'Rollback candidate hash mismatch')
            require(expected_revision in (intent['beforeHash'], intent['targetHash']), 'Owner changes conflict with interrupted rollback')
            if expected_revision == intent['targetHash']:
                journal.unlink(); candidate.unlink()
                return {'restored': False, 'completedInterrupted': True}
        else:
            previous, previous_raw = read_json(backup)
            validate_database(previous)
            intent = {'version': 1, 'beforeHash': sha(current_raw), 'targetHash': sha(previous_raw)}
            atomic(candidate, previous_raw)
            atomic(journal, encoded(intent))
        atomic(backup, current_raw)
        require(sha(target.read_bytes()) == expected_revision, 'Database changed during rollback; inspect retained candidate')
        atomic(target, previous_raw)
        journal.unlink(); candidate.unlink()
        return {'restored': True, 'completedInterrupted': False}
    finally:
        lock.unlink()


def manager_state(root=ROOT):
    db, raw = read_json(safe_path(root, DB))
    validate_database(db)
    state = {'revision': sha(raw), 'weapons': len(db['weapons']), 'attachments': len(db['attachments']),
             'reports': len(db['patches']), 'sourceDates': {key: value['date'] for key, value in db['sources'].items()},
             'backupAvailable': False, 'pendingRollback': False, 'locked': False, 'proposal': None}
    backup = safe_path(root, '.local/weapon-updates/backup.json')
    if backup.exists():
        validate_database(read_json(backup)[0]); state['backupAvailable'] = True
    journal = safe_path(root, '.local/weapon-updates/rollback-pending.json')
    if journal.exists():
        intent, _ = read_json(journal, 4096)
        exact(intent, ('version', 'beforeHash', 'targetHash'))
        state['pendingRollback'] = True
    state['locked'] = safe_path(root, '.local/weapon-updates/writer.lock').exists()
    staged = safe_path(root, PROPOSAL)
    if staged.exists():
        proposal, proposal_raw = read_json(staged, 4*1024*1024)
        changes = preview(db, proposal)
        state['proposal'] = {'hash': sha(proposal_raw), 'baseRevision': proposal['baseRevision'], 'articles': proposal['articles'],
                             'added': changes['added'], 'changed': changes['changed'], 'unchanged': len(changes['unchanged']), 'warnings': proposal['warnings']}
    return state


def main(root=ROOT):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('check', 'apply', 'validate', 'rollback', 'status'))
    parser.add_argument('--fail-on-new', action='store_true', help='check exits2 when reports need review')
    parser.add_argument('--proposal-hash')
    parser.add_argument('--expected-revision')
    args = parser.parse_args()
    if args.action == 'validate':
        validate_database(read_json(safe_path(root, DB))[0])
        print('Weapon intelligence valid')
        return 0
    if args.action == 'check':
        proposal, changes = check(root)
        print(json.dumps({'articles': len(proposal['articles']), **{k: len(v) for k, v in changes.items()}, 'warnings': proposal['warnings']}))
        print('Review .local/weapon-patch-proposal.json, then npm run weapons:apply. No baseline stats changed.')
        return 2 if args.fail_on_new and (changes['added'] or changes['changed']) else 0
    if args.action == 'status':
        print(json.dumps(manager_state(root)))
        return 0
    if args.action == 'rollback':
        print(json.dumps(rollback(root, args.expected_revision)))
        return 0
    changes = apply(root, args.proposal_hash)
    print(json.dumps({k: len(v) for k, v in changes.items()}))
    print('Patch ledger applied; baseline measurements retained. Run npm run build to refresh pages. Prior database: .local/weapon-updates/backup.json')
    return 0


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '_fetch':
        try:
            sys.stdout.buffer.write(Fetcher()._get(sys.argv[2]))
        except Exception as error:
            print(str(error), file=sys.stderr)
            raise SystemExit(1)
        raise SystemExit(0)
    try:
        raise SystemExit(main())
    except (ValueError, OSError, TimeoutError) as error:
        print('Weapon update failed: ' + str(error))
        raise SystemExit(1)
