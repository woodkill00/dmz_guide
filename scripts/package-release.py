"""Package a freshly rebuilt, public-only static runtime without dev dependencies."""
from pathlib import Path
import hashlib
import os
import platform
import sys
import stat
import json
import zipfile
from release_paths import is_author_only

print('Package runtime: ' + json.dumps({
    'python': sys.version[:200], 'executable': sys.executable[:300],
    'platform': platform.platform()[:200], 'osName': os.name,
}, ensure_ascii=True), flush=True)

root = Path(__file__).resolve().parent.parent
def safe_stat(path):
    for part in [path, *path.parents]:
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode):
            raise SystemExit(f'Refusing symlink: {path.relative_to(root)}')
        if part == root:
            break
    return path.lstat()


def bounded_files(folder, *, caches=False):
    found = []
    count = 0
    def walk(path, depth=0):
        nonlocal count
        if caches and ('__pycache__' in path.parts or path.suffix in ('.pyc', '.pyo')):
            return
        count += 1
        if count > 50000 or depth > 16:
            raise SystemExit('File inventory safety limit exceeded.')
        info = safe_stat(path)
        if stat.S_ISDIR(info.st_mode):
            with os.scandir(path) as entries:
                for entry in entries:
                    walk(Path(entry.path), depth + 1)
        elif stat.S_ISREG(info.st_mode):
            found.append(path)
        else:
            raise SystemExit('Refusing nonregular file.')
    walk(folder)
    return sorted(found)


def bounded_read(path, budget, limit=64 * 1024 * 1024, *, phase="unspecified"):
    info = safe_stat(path)
    if not stat.S_ISREG(info.st_mode) or info.st_size > limit or info.st_size > budget[0]:
        raise SystemExit('File byte safety limit exceeded.')
    signature = lambda value: (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns)
    fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    path_open = None
    path_after = None
    def changed(point, opened, after=None, read_bytes=None):
        detail = {
            'path': path.relative_to(root).as_posix()[:256],
            'phase': phase, 'point': point,
            'signatureFields': ['dev', 'ino', 'size', 'mtime_ns', 'ctime_ns'],
            'before': signature(info), 'open': signature(opened),
            'after': signature(after) if after is not None else None,
            'readBytes': read_bytes,
            'pathOpen': signature(path_open) if path_open is not None else None,
            'pathAfter': signature(path_after) if path_after is not None else None,
        }
        raise SystemExit('File changed during packaging. ' + json.dumps(detail, ensure_ascii=True)[:4000])
    with os.fdopen(fd, 'rb') as stream:
        opened = os.fstat(stream.fileno())
        # CPython Windows path and fd APIs can assign different meanings to ctime.
        # Compare compatible fields across APIs; retain full ctime checks within each.
        cross_fields = 4 if os.name == 'nt' else 5
        if signature(opened)[:cross_fields] != signature(info)[:cross_fields]:
            changed('open', opened)
        path_open = safe_stat(path)
        if signature(path_open) != signature(info):
            changed('path-open', opened)
        data = stream.read(info.st_size + 1)
        after = os.fstat(stream.fileno())
        if len(data) != info.st_size or signature(after) != signature(opened):
            changed('read', opened, after, len(data))
        path_after = safe_stat(path)
        if signature(path_after) != signature(info):
            changed('path-read', opened, after, len(data))
    budget[0] -= len(data)
    return data


dist = root / 'dist'
if not (dist / 'index.html').is_file():
    raise SystemExit('Run npm run build first.')
files = bounded_files(dist)
for path in files:
    relative = path.relative_to(dist).as_posix()
    if any(part.startswith('.') or part in ('test-results', 'node_modules', 'tests') for part in path.relative_to(dist).parts) or '__test' in relative:
        raise SystemExit(f'Refusing test/private artifact: {relative}')
    if is_author_only(relative):
        raise SystemExit(f'Refusing author-only artifact: {relative}')
    if path.suffix.lower() not in ('.html', '.css', '.mjs', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp'):
        raise SystemExit(f'Unexpected production file: {relative}')
identity_path = dist / 'assets/build-identity.json'
if identity_path not in files:
    raise SystemExit('Build identity missing; rebuild before packaging.')
identity_bytes = bounded_read(identity_path, [16 * 1024 * 1024], 16 * 1024 * 1024, phase="identity")
identity = json.loads(identity_bytes)
build_id = identity.pop('buildId', None)
encoded = json.dumps(identity, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
if identity.get('format') != 'dmz-build-identity' or identity.get('version') != 1 or hashlib.sha256(encoded).hexdigest() != build_id:
    raise SystemExit('Invalid build identity; rebuild before packaging.')
identity['buildId'] = build_id
budget = [496 * 1024 * 1024]
payload = {path.relative_to(root).as_posix(): bounded_read(path, budget, phase="output") for path in files}
if payload['dist/assets/build-identity.json'] != identity_bytes:
    raise SystemExit('Build identity changed during packaging.')
actual_output = {name.removeprefix('dist/'): hashlib.sha256(data).hexdigest() for name, data in payload.items() if name != 'dist/assets/build-identity.json'}
if actual_output != identity.get('outputFiles'):
    raise SystemExit('Build output missing, extra or changed; rebuild before packaging.')
source_paths = [root / name for name in ('content/site.json', 'package.json', 'package-lock.json')]
for name in ('src', 'schemas', 'scripts'):
    source_paths.extend(bounded_files(root / name, caches=True))
if len(source_paths) > 50000 or {path.relative_to(root).as_posix() for path in source_paths} != set(identity.get('sourceFiles', {})):
    raise SystemExit('Build source inventory changed; rebuild before packaging.')
source_budget = [128 * 1024 * 1024]
for path in source_paths:
    if hashlib.sha256(bounded_read(path, source_budget, phase="source")).hexdigest() != identity['sourceFiles'][path.relative_to(root).as_posix()]:
        raise SystemExit('Build source changed; rebuild before packaging.')
for relative in ('scripts/serve.mjs', 'LICENSE', 'docs/release.md', 'docs/content-studio.md', 'specs/009-repository-content-studio/acceptance.md'):
    payload[relative] = bounded_read(root / relative, budget, phase="auxiliary")
payload['START-HERE.txt'] = b'Install Node.js 22.x or 24.x. Extract this archive, then run: node scripts/serve.mjs\nOpen http://127.0.0.1:4173 . Keep the server running. No npm install is needed.\nHost-root static output only. Read docs/release.md for backups, rights and limits.\nHashes show internal consistency, not authorship or authenticity.\n'
if len(payload) > 49999 or sum(map(len, payload.values())) > 496 * 1024 * 1024 or any(len(data) > 64 * 1024 * 1024 for data in payload.values()):
    raise SystemExit('Release payload safety limit exceeded.')
manifest = {
    'format': 'dmz-production-manifest', 'version': 2,
    'files': {name: {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)} for name, data in sorted(payload.items())},
    'archiveMembers': sorted([*payload, 'PRODUCTION-MANIFEST.json']),
    'manifestSelfDigestExcluded': 'PRODUCTION-MANIFEST.json is listed but has no self digest to avoid circular hashing.',
    'identity': {'buildId': build_id, 'path': 'dist/assets/build-identity.json', 'schemaHash': identity['schemaHash'], 'git': identity['git']},
    'evidenceScope': 'Hashes establish internal consistency, not authorship, signatures or authenticity.'
}
output = root / 'release'
output.mkdir(exist_ok=True)
archive = output / 'dmz-guide-static.zip'
manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
if len(manifest_bytes) > 16 * 1024 * 1024:
    raise SystemExit('Manifest safety limit exceeded.')
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name, data in sorted(payload.items()):
        bundle.writestr(name, data)
    bundle.writestr('PRODUCTION-MANIFEST.json', manifest_bytes)
print(f'Packaged {len(payload)} fully inventoried payload files: {archive}')
