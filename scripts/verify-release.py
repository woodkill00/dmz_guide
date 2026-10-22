"""Verify the extracted static distributable without npm dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import subprocess
import tempfile
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


def verify_release():
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
        # The same Node lifecycle as browser verification owns the child, bind marker,
        # exact extracted bytes, deadlines, output tails and awaited child-only cleanup.
        # It uses only Node built-ins, not npm dependencies from the checkout/package.
        verify_server(target)
        print(f'Clean extraction verified: {len(manifest)} file hashes, native links, owned Node child and exact content.')


if __name__ == '__main__':
    verify_release()
