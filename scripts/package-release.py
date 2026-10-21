"""Package a freshly rebuilt, public-only static runtime without dev dependencies."""
from pathlib import Path
import hashlib
import json
import zipfile
from release_paths import is_author_only

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
if not (dist / 'index.html').is_file():
    raise SystemExit('Run npm run build first.')
files = sorted(path for path in dist.rglob('*') if path.is_file())
for path in files:
    relative = path.relative_to(dist).as_posix()
    if any(part.startswith('.') or part in ('test-results', 'node_modules', 'tests') for part in path.relative_to(dist).parts) or '__test' in relative:
        raise SystemExit(f'Refusing test/private artifact: {relative}')
    if is_author_only(relative):
        raise SystemExit(f'Refusing author-only artifact: {relative}')
    if path.suffix.lower() not in ('.html', '.css', '.mjs', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp'):
        raise SystemExit(f'Unexpected production file: {relative}')
manifest = {path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in files}
output = root / 'release'
output.mkdir(exist_ok=True)
archive = output / 'dmz-guide-static.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in files:
        bundle.write(path, path.relative_to(root))
    for relative in ('scripts/serve.mjs', 'LICENSE', 'docs/release.md', 'docs/content-studio.md', 'specs/009-repository-content-studio/acceptance.md'):
        bundle.write(root / relative, relative)
    bundle.writestr('PRODUCTION-MANIFEST.json', json.dumps(manifest, indent=2) + '\n')
    bundle.writestr('START-HERE.txt', 'Install Node.js 22 or newer. Extract this archive, then run: node scripts/serve.mjs\nOpen http://127.0.0.1:4173 . Keep the server running. No npm install is needed.\nHost-root static output only. Read docs/release.md for backups, rights and limits.\n')
print(f'Packaged {len(files)} public production files: {archive}')
