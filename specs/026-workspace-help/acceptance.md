# Workspace help acceptance
2026-10-28; feat/026-workspace-help on27a92db. Local viewer at5175; no deployment or remote write.

## Delivered
Dedicated help.html with14workflow sections, quick start, contents anchors, source links and16allowlisted tool destinations. Header Help and map information links open a separate tab, preserving current map drafts. Help explains shipped navigation/grid, masks, duplicate names+locations, updates/recovery, custom POIs, SVG icons, Explore/saved views/completeness/discrepancies, source review/calibration/backgrounds, backups, local-data limits and troubleshooting.

Tool links wait for workspace readiness and open/focus existing controls; no update/import/save/toggle/reset action. Unknown/multiple query targets are ignored. Workspace routing retains dirty/detail/process/lock/unsaved guards; failed hydration shows a visible explanation. No data schema or stored-data migration changed. Production multi-page build emits help.html and separate stylesheet; document remains readable without JavaScript or terrain.

## Executed checks
- `npm run map:test`:92passed,0failed; new allowlist test covers all targets, unknown/duplicate/action-like/hostile query text and destination mappings. Existing91tests remain green.
- `node scripts/help.browser.cjs`:two focused offline groups passed before final wording fixes; final full run includes content assertions for those fixes.
- `npm run map:test:browser`:60groups passed,0runtimeerrors/0externalrequests. All16targets, sourceURLs/anchors, no automatic updatePOST or saved-data mutation, originaldraft preserved through Help/newtab, missingterrain, failedstorage explanation, unknownquery, noJS reading and360px keyboard/nooverflow; all prior icon/provider/dedup/update/grid/authoring tests passed.
- `npm run map:build`:strict TypeScript/multi-page build passed; dist/help.html18.07kB, help-BpHeD3Gk.css, map-DiTxtS1_.js. Separate production-preview browser check at5282 confirmed14sections/noJS/360px layout using built files; preview server closed afterwards.
- `py -3 scripts/check.py`:0failures. `git diff --check`:passed.
- Local /help.html returnedHTTP200. Screenshots are synthetic and ignored. Automated Chromium on Windows; no physical mobile device claim. No changed capacity budgets/spatial loops.

## Review and convergence
Independent integration reviewer approved three definition criteria. UI/content reviewer found HELP-R1 Find-search fields and HELP-R2 background sequence mismatches. AppendedT006, repaired handbook and regression assertions, then reviewer independently rechecked clean. Independent navigation/security reviewer passed route test/typecheck and found no issue. Final read-only analysis/convergence: seven requirements/six tasks,100%coverage, no unmapped task or constitution conflict; zero remaining actionable gaps. No empty convergence task phase added. Revert affects documentation/navigation only, no user-data migration.
