# 005 verification evidence
2026-10-21, Node v24.19.0. Implementation candidate, not release acceptance.
- npm ci --cache /tmp/dmz-editor-npm-cache succeeded. Default home-cache attempt failed; no security workaround used.
- Initial boundary test run failed because portable.mjs did not yet exist (test-before-code evidence).
- Current npm test: 38/38 passed, including 14 portable tests. Covers strict parser/version/field/duplicate/base64 boundaries, actual original PNG byte roundtrip with injected decoder, metadata/path/rights limits, 20 MiB envelope, nesting/text, aggregate pixel cap, freeze-across-async export, abort, and conflicting raster headers. The injected unit decoder is NOT actual browser decode evidence.
- npm run build: 78 native HTML routes plus404; editor route generated via parent hook.
- python3 scripts/check.py: 0 failures.
- node --check src/client/editor.mjs and tests/browser/editor.mjs: passed.
- Browser tests written in exported runEditorTests({browser,base}), NOT RUN locally: parent confirmed sandbox socket restriction and working hosted Chromium path. Hosted evidence is pending. Cases: guided edits to each major entity and weapon stats; new item/recipe/gun with typed stat/guide additions; original canvas PNG attach/privacy/export/clean-context import/reload with exact byte/semantic equality; actual JPEG/WebP decode; private-reader image/stat/typed relation links and imported inventory/planner visibility; first bundled snapshot retention; invalid import/cancel/stale writer/rollback; delayed decode cancellation and pack switch; five-second decode timeout; denied/quota save with direct recovery export; keyboard focus and320/390px screenshots.
- No WCAG, mobile memory, screenshot or public-launch acceptance claimed. Parent independent release review and actual hosted test outcomes remain required. No game artwork, accounts, uploads or publication performed.

## Review-driven repairs
Independent reviewer identified conflicting per-frame dimensions, dirty draft replacement, atomic-save mutation and imported embedded metadata disclosure. Boundary and UI fixes plus regression tests implemented. Requirements checklist approved15/15 before code; implementation review is separate and pending.
