"""Bounded, explicit, local reference capture. Does not crawl links or execute scripts."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import time
import subprocess
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'tools/hajin-map/src/workspace/source-registry.json'
MAX_BYTES = 2 * 1024 * 1024


def canonical(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode()).hexdigest()


def admitted(source, url):
    u, origin = urlsplit(url), urlsplit(source['url'])
    return (u.scheme == 'https' and u.netloc == origin.netloc and not u.username
            and not u.password and not u.query and len(url) <= 2048
            and (u.path == origin.path or any(u.path == p or u.path.startswith(p + '/')
                 for p in source['candidatePaths'])))


def kind_for(source, text, url):
    value = (url + ' ' + text).lower()
    for hints, kind in [(['attachment', 'gunsmith'], 'attachment'), (['story', 'operation '], 'story'),
                        (['order'], 'order'), (['mission', 'quest'], 'mission'),
                        (['upgrade', 'stash', 'bank'], 'upgrade'), (['recipe', 'craft'], 'recipe'),
                        (['ingredient', 'material', 'synthetic', 'alloy', 'chemical'], 'material'),
                        (['weapon', 'loadout'], 'weapon'), (['item', 'loot'], 'item')]:
        if any(h in value for h in hints):
            return kind
    return 'reference'


class Candidates(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source, self.stack, self.active, self.rows = source, [], [], {}

    def handle_starttag(self, tag, attrs):
        if len(self.stack) > 64:
            raise ValueError('HTML nesting exceeds64 levels.')
        attrs = dict(attrs)
        if tag not in ('meta', 'link', 'img', 'input', 'br', 'hr', 'source', 'wbr', 'area', 'base', 'embed', 'param', 'track', 'col'):
            self.stack.append(tag)
        if any(t in self.stack for t in ('script', 'style', 'nav', 'header', 'footer', 'noscript', 'template')):
            return
        if tag in ('h2', 'h3', 'h4', 'a', 'tr'):
            self.active.append({'tag': tag, 'text': [], 'href': attrs.get('href'), 'anchor': attrs.get('id')})

    def handle_data(self, data):
        if any(t in self.stack for t in ('script', 'style', 'nav', 'header', 'footer', 'noscript', 'template')):
            return
        for row in self.active:
            if sum(map(len, row['text'])) < 1000:
                row['text'].append(data[:1000])

    def handle_endtag(self, tag):
        for row in self.active[:]:
            if row['tag'] == tag:
                self.active.remove(row)
                self.add(row)
        if tag in self.stack:
            self.stack = self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]

    def add(self, row):
        text = ' '.join(' '.join(row['text']).split())
        if not 3 <= len(text) <= 600 or len(self.rows) >= 2000:
            return
        base = self.source['url']
        if row['tag'] == 'a':
            if not row['href']:
                return
            raw = urlsplit(urljoin(base, row['href']))
            url = urlunsplit((raw.scheme, raw.netloc, raw.path, '', raw.fragment))
            if not admitted(self.source, url) or url == base:
                return
            identity = url
        else:
            url = base + ('#' + row['anchor'] if row['anchor'] else '')
            identity = url if row['anchor'] else base + 'heading:' + text.casefold()
        kind = kind_for(self.source, text, url)
        # Narrative paragraphs/assets are deliberately not extracted.
        title = text[:200]
        summary = text if row['tag'] == 'tr' else ''
        identifier = sha(canonical([identity, kind, None]))
        spoiler = kind in ('story', 'mission', 'order')
        values = [identifier, kind, title, summary, url, None, spoiler]
        self.rows[identifier] = dict(zip(['id', 'kind', 'title', 'summary', 'url', 'build', 'spoiler'], values), digest=sha(canonical(values)))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirect refused; review and register the canonical endpoint explicitly.')


def fetch_raw(url):
    """Parent kills isolated fetch process at15s, including DNS/header/slow-body time."""
    result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--fetch-child', url],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15, check=False)
    if result.returncode:
        raise ValueError(result.stderr.decode('utf8', errors='replace')[-300:])
    if len(result.stdout) > MAX_BYTES:
        raise ValueError('Page exceeds 2MiB.')
    return result.stdout


def fetch_child(url):
    registry = json.loads(REGISTRY.read_text(encoding='utf8'))
    if url not in [s['url'] for s in registry['sources']]:
        raise ValueError('Unregistered URL refused.')
    opener = build_opener(NoRedirect())
    request = Request(url, headers={'User-Agent': 'DMZLocalReference/1.0 (owner-authorized local research)', 'Accept': 'text/html', 'Accept-Encoding': 'identity'})
    with opener.open(request, timeout=15) as response:
        if response.status != 200 or 'text/html' not in response.headers.get('Content-Type', ''):
            raise ValueError('Expected a public HTML200 page.')
        raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError('Page exceeds 2MiB.')
    sys.stdout.buffer.write(raw)


def capture(source, raw, now=None):
    if len(raw) > MAX_BYTES:
        raise ValueError('Page exceeds 2MiB.')
    parser = Candidates(source)
    parser.feed(raw.decode('utf-8', errors='replace'))
    if not parser.rows:
        raise ValueError('No admitted candidates; specialized adapter/manual reference needed. Prior capture retained.')
    pack = {'kind': 'dmz-reference-capture', 'version': 1, 'sourceId': source['id'],
            'sourceURL': source['url'], 'capturedAt': now or datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
            'digest': sha(raw), 'extractor': 'html-candidates-v1', 'records': list(parser.rows.values())}
    if len(canonical(pack).encode()) > MAX_BYTES:
        raise ValueError('Candidate pack exceeds 2MiB.')
    return pack


def run(ids, output):
    registry = json.loads(REGISTRY.read_text(encoding='utf8'))
    sources = {s['id']: s for s in registry['sources']}
    if not 1 <= len(ids) <= 12 or len(set(ids)) != len(ids) or any(i not in sources for i in ids):
        raise ValueError('Choose 1–12 distinct registry IDs. No arbitrary URLs are accepted.')
    output.mkdir(parents=True, exist_ok=True)
    receipt = []
    for i, identifier in enumerate(ids):
        if i:
            time.sleep(1)
        source = sources[identifier]
        try:
            raw = fetch_raw(source['url'])
            pack = capture(source, raw)
            folder = output / identifier
            folder.mkdir(exist_ok=True)
            stem = folder / pack['digest']
            if not stem.with_suffix('.json').exists():
                stem.with_suffix('.html').write_bytes(raw)
                stem.with_suffix('.json').write_text(json.dumps(pack, ensure_ascii=False, indent=2), encoding='utf8')
            receipt.append({'sourceId': identifier, 'url': source['url'], 'status': 'captured', 'digest': pack['digest'], 'candidates': len(pack['records']), 'pack': str(stem.with_suffix('.json')), 'at': pack['capturedAt']})
        except Exception as error:
            receipt.append({'sourceId': identifier, 'url': source['url'], 'status': 'failed', 'error': str(error)[:300]})
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    (output / ('receipt-' + stamp + '.json')).write_text(json.dumps(receipt, indent=2), encoding='utf8')
    print(json.dumps(receipt, indent=2))
    return receipt


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--fetch-child':
        fetch_child(sys.argv[2])
        raise SystemExit(0)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', nargs='+', required=True, help='1–12 IDs from source-registry.json')
    args = parser.parse_args()
    run(args.sources, ROOT / '.local/reference-captures')
