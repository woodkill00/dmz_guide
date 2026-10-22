"""Verify the extracted static distributable without npm dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import subprocess
import tempfile
import re
import zipfile

root = Path(__file__).resolve().parent.parent

def verify_server(target, *, timeout=22, cleanup_timeout=5):
    """Bound the helper independently, including portable cancellation/cleanup.

    Normal readiness remains <=15 seconds plus <=4 seconds owned-child cleanup.
    The outer watchdog also catches a stalled/broken helper. It cannot claim a
    grandchild was stopped if that helper fails to process cancellation.
    """
    command = [
        'node', str(root / 'scripts/server-readiness.mjs'), str(target), '/maps/',
        str(target / 'dist/maps/index.html'),
    ]
    helper = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        try:
            code = helper.wait(timeout=timeout)
        except (subprocess.TimeoutExpired, KeyboardInterrupt) as primary:
            try:
                # A private stdin pipe works on Windows too, where terminate()
                # does not deliver Node's JavaScript SIGTERM handler.
                helper.communicate(input=b'cancel\n', timeout=cleanup_timeout)
            except subprocess.TimeoutExpired:
                helper.terminate()
                try:
                    helper.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    helper.kill()
                    try:
                        helper.wait(timeout=1)
                    except subprocess.TimeoutExpired:
                        raise RuntimeError(
                            'Readiness helper did not stop; owned server cleanup could not be confirmed'
                        ) from primary
                raise RuntimeError(
                    'Readiness helper required forced termination; owned server cleanup could not be confirmed'
                ) from primary
            if isinstance(primary, KeyboardInterrupt):
                raise
            raise RuntimeError(
                f'Readiness helper exceeded the {timeout}s outer watchdog; cancellation sent and helper exited'
            ) from primary
        if code:
            raise subprocess.CalledProcessError(code, command)
    finally:
        if helper.stdin:
            helper.stdin.close()


def verify_archive(archive):
    """Validate bounds, exact inventory and all bytes before extracting/executing."""
    infos = archive.infolist()
    if len(infos) > 50000 or sum(info.file_size for info in infos) > 512 * 1024 * 1024:
        raise RuntimeError('Archive resource limit exceeded')
    names, folded = set(), set()
    for info in infos:
        name = info.filename
        mode = (info.external_attr >> 16) & 0o170000
        if (not name or name.startswith('/') or ':' in name or '\\' in name or '\x00' in name
                or '\x00' in info.orig_filename
                or any(part in ('', '.', '..') or part != part.rstrip(' .') or re.match(r'^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)', part, re.I) for part in name.split('/'))
                or name in names or name.casefold() in folded or mode not in (0, 0o100000)
                or info.is_dir() or info.flag_bits & 1 or info.file_size > 64 * 1024 * 1024):
            raise RuntimeError('Unsafe, duplicate or excessive archive member')
        names.add(name)
        folded.add(name.casefold())
    manifest_name = 'PRODUCTION-MANIFEST.json'
    if manifest_name not in names or archive.getinfo(manifest_name).file_size > 16 * 1024 * 1024:
        raise RuntimeError('Missing or excessive production manifest')
    manifest = json.loads(archive.read(manifest_name))
    files = manifest.get('files')
    if (manifest.get('format') != 'dmz-production-manifest' or manifest.get('version') != 2
            or not isinstance(files, dict) or manifest.get('archiveMembers') != sorted(names)
            or set(files) != names - {manifest_name} or not manifest.get('manifestSelfDigestExcluded')):
        raise RuntimeError('Archive inventory mismatch')
    for relative, evidence in files.items():
        data = archive.read(relative)
        if not isinstance(evidence, dict) or evidence.get('bytes') != len(data) or evidence.get('sha256') != hashlib.sha256(data).hexdigest():
            raise RuntimeError(f'Production hash mismatch: {relative}')
    identity_name = 'dist/assets/build-identity.json'
    if identity_name not in files:
        raise RuntimeError('Missing build identity')
    identity = json.loads(archive.read(identity_name))
    build_id = identity.pop('buildId', None)
    encoded = json.dumps(identity, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    if identity.get('format') != 'dmz-build-identity' or identity.get('version') != 1 or hashlib.sha256(encoded).hexdigest() != build_id or manifest.get('identity', {}).get('buildId') != build_id:
        raise RuntimeError('Build identity mismatch')
    output = {name.removeprefix('dist/'): evidence['sha256'] for name, evidence in files.items() if name.startswith('dist/') and name != identity_name}
    if identity.get('outputFiles') != output or identity.get('schemaHash') != manifest.get('identity', {}).get('schemaHash'):
        raise RuntimeError('Captured build output mismatch')
    return manifest


def verify_release():
    with tempfile.TemporaryDirectory(prefix='dmz-release-check-') as directory:
        target = Path(directory)
        with zipfile.ZipFile(root / 'release/dmz-guide-static.zip') as archive:
            manifest = verify_archive(archive)
            archive.extractall(target)
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
        # The same Node lifecycle as browser verification owns the child, bind marker,
        # exact extracted bytes, deadlines, output tails and awaited child-only cleanup.
        # It uses only Node built-ins, not npm dependencies from the checkout/package.
        verify_server(target)
        print(f"Clean extraction verified: {len(manifest['files'])} file hashes, native links, owned Node child and exact content.")


if __name__ == '__main__':
    verify_release()
