# Verify the work

Select feature112 with `py -3 scripts/select-feature.py 112-content-verification`. Start from the existing site at http://127.0.0.1:4173/; use `npm run local` if unavailable. Keep the live VS Code profile and ignored private backups unchanged.

Capture a baseline using `npm run audit:content`; preserve the identity-bound report under ignored test-results/content112 before content edits. Run focused source/parser and quality tests first, then the documented source comparison, full runtime/build checks and affected browser/map suites. Use the current content and Orders audits to follow reader/editor targets. Actual commands/results and outstanding source/device facts belong in verification.md.

Android: connect Chrome through USB remote debugging and forward phone localhost4173 to the desktop loopback4173. Use a separate test browser/profile with synthetic quantities; do not restore/export the real inventory or enable local authoring on the network. See the device guide delivered by this feature for exact checks. Physical-device and TalkBack results remain pending until actually performed.
