# Validation quickstart
Prerequisite Node22+, npm ci, integrated parent build hook for editor-page.
Run npm test, npm run build, npm start, then node tests/browser/editor.mjs (browser test starts or uses documented local server as implemented).
Open /editor/?pack=demo:training, edit a labeled item and content version, preview/cancel then preview/apply and reload. Export content-only JSON and verify no profile data. Add original PNG with full rights and privacy attestations, export picture bundle, import in clean browser, apply and reload; compare pixel dimensions/hash and semantic edit. Stage prior snapshot for rollback and confirm. Test malformed/unsupported/oversized uploads and stale revision; current snapshot unchanged.
Exact evidence and limitations will be recorded in acceptance.md after tests, not inferred from this plan.
