"""Verify the extracted static distributable without npm dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import subprocess
import tempfile
import time
import urllib.request
import zipfile

root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='dmz-release-check-') as directory:
    target = Path(directory)
    with zipfile.ZipFile(root / 'release/dmz-guide-static.zip') as archive:
        for info in archive.infolist():
            name = Path(info.filename)
            if name.is_absolute() or '..' in name.parts or '\\' in info.filename or (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise RuntimeError('Unsafe archive member')
        archive.extractall(target)
    manifest = json.loads((target / 'PRODUCTION-MANIFEST.json').read_text())
    for relative, digest in manifest.items():
        if hashlib.sha256((target / relative).read_bytes()).hexdigest() != digest:
            raise RuntimeError(f'Production hash mismatch: {relative}')
    class Links(HTMLParser):
        def handle_starttag(self, tag, attrs):
            for name, value in attrs:
                if name not in ('href', 'src') or not value or not value.startswith('/'):
                    continue
                path = unquote(urlsplit(value).path).lstrip('/')
                file = target / 'dist' / path
                if file.is_dir():
                    file /= 'index.html'
                if not file.is_file():
                    raise RuntimeError(f'Missing native route or asset: {value}')
    for html in (target / 'dist').rglob('*.html'):
        Links().feed(html.read_text(encoding='utf-8'))
    import os
    env = {**os.environ, 'PORT': '4189', 'HOST': '127.0.0.1'}
    server = subprocess.Popen(['node', str(target / 'scripts/serve.mjs')], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for attempt in range(80):
            try:
                with urllib.request.urlopen('http://127.0.0.1:4189/maps/', timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                if attempt == 79:
                    raise
                time.sleep(.1)
        print(f'Clean extraction verified: {len(manifest)} file hashes, native links, Node-only loopback HTTP200.')
    finally:
        server.terminate()
        server.wait(timeout=10)
