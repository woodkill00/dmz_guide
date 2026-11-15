# Acceptance evidence

- `npm run check`: passed, 1,031 runtime tests, repository check, and 2,042-route build.
- `node tests/browser/upgrade-dashboard.mjs`: passed in Chromium, Firefox, and WebKit. Includes enabled checkbox click → confirm → save, legacy disabled guidance, and old content-binding guidance.
- `npx prettier --check src/client/progression.mjs src/ui/progression-page.mjs tests/browser/upgrade-dashboard.mjs`: passed.
- Independent reviewer found two test gaps; both were added before browser verification. The reviewer then approved the scoped requirements checklist with no remaining actionable findings.

The fix does not alter stored progress or bypass migration. A player with an older profile must review the Settings recovery flow to enable editing.
