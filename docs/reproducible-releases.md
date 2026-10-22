# Reproducible release archives

The release packager writes every member, including PRODUCTION-MANIFEST.json, in lexical name order. Each ZIP entry uses the timestamp 1980-01-01 00:00:00, Unix regular-file mode 0644, internal attributes 0, empty extra fields/comments and DEFLATE compression level 9. Archive comments are empty. File mtimes, packaging clock and ordinary input permission bits are not provenance and do not enter ZIP metadata. The Node launcher is invoked with `node scripts/serve.mjs`; executable permission is not required.

Payload bytes are never normalized. Existing complete inventory, captured build/output/source checks, bounded reads and archive validation remain mandatory. The manifest remains version 2, lists itself but excludes its self-digest, and covers every other shipped file. A changed source requires rebuilding. A later author save after the build snapshot remains permitted by the existing captured-input contract.

## What equality means

Reproducibility requires identical captured inputs, including descriptive Git revision/dirty state, and the same Node, Python and compression-library versions. Record versions rather than assuming equality between toolchains. Cross-zlib-version or cross-runtime compressed-byte equality is not promised. Equal archives establish repeatability/internal consistency, not authorship, authenticity, signatures, rights, verified game facts, browser acceptance or approval to publish. ZIP timestamps intentionally do not indicate build time.

## Two independent clean builds

Use a committed candidate. Create two new worktrees; do not delete/reuse an existing dist or recovery directory to simulate a clean build. This Bash example works in a compatible contributor shell; use the same executables for both runs.

```sh
revision=$(git rev-parse HEAD)
evidence=$(mktemp -d)
git worktree add --detach "$evidence/first" "$revision"
git worktree add --detach "$evidence/second" "$revision"
node --version > "$evidence/node-version.txt"
python3 -c 'import platform,sys,zlib; print(sys.version); print(platform.platform()); print(zlib.ZLIB_VERSION,zlib.ZLIB_RUNTIME_VERSION)' > "$evidence/python-platform-zlib.txt"
for name in first second; do
  (
    cd "$evidence/$name"
    test -z "$(git status --porcelain)" || exit 1
    test ! -e dist || exit 1
    git rev-parse HEAD
    node scripts/build.mjs
    python3 scripts/package-release.py
    python3 scripts/verify-release.py
  ) > "$evidence/$name.log" 2>&1 || exit 1
done
python3 - "$evidence" <<'PY'
import hashlib, json, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
records = []
for name in ('first', 'second'):
    path = root / name / 'release/dmz-guide-static.zip'
    with zipfile.ZipFile(path) as archive:
        records.append({
            'archiveSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'members': {entry: hashlib.sha256(archive.read(entry)).hexdigest()
                        for entry in archive.namelist()}})
assert records[0]['members'] == records[1]['members'], 'payload/manifest/identity mismatch'
assert records[0]['archiveSha256'] == records[1]['archiveSha256'], 'archive mismatch'
(root / 'comparison.json').write_text(json.dumps(records, indent=2) + '\n')
print('Equal manifests, identities, payload members and archive bytes:', records[0]['archiveSha256'])
PY
```

Retain both worktrees, archives, logs and comparison/version files for review. Do not embed volatile evidence timestamps or absolute checkout paths into shipped payloads. Run `python3 -m unittest discover -s tests -p test_release_reproducibility.py -v` for automated real-build coverage with different clocks/mtimes/permissions and a changed-input negative control. Its disposable fixtures are separate from retained acceptance outputs. Normal repository runtime, integrity, browser and hosted exact-head/main gates still apply.
