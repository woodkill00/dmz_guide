# Local acceptance — complete shared navigation
2026-10-31. FR001–003 implemented: direct Boss checklist primary link on guide/map/help/Studio; grouped More covers guide pages/Home/local authoring plus18maptools and27plannersections. Site map includes the same45fixedtool destinations. Public record pages remain linked through the site map, not private boss IDs.

One original authored JSON registry supplies tool labels and planner destinations; strict parser admits one exact tool target and maps existing navigation-only section opens. Exact registry/parser equality and uniqueness tests prevent drift. Native tool/crossapp links open new tabs with noopener/noreferrer and no current-query/hash/private-state copying. Catalog forwarding remains the existing bounded guide-only behavior. Requested destination active state follows the actual opened tool, including mixedicons/boss negativecase.

Verification:
- Full guide/runtime suite636passed,0failed. Finalfocused navigation10tests passed after final markup accessibility change.
- Full map suite176passed,0failed. TypeScript/Vite and guide production builds passed; existing Vite chunk advisory remains.
- FinalChromium/Firefox/WebKit each passed sharednavigation2groups and extendedhelp2groups. Every45tool destination opened its correct pane; exact saved data/original unsaved draft retained, no auto update mutations/externalrequests/runtimeerrors, invalid/duplicate tool targets refused, missingterrain/storagefailure behavior retained. NormalTab/Enter reaches help skip link in all engines; sharednav/skip explicit tabindex0 avoids testedWebKitport skipping inferredlinks.
- Actual generatedHTML scan: all735HTML files (734routes+404) have one sharednav and everytoolhref once. ActualHTTP/browser12guidepages+404 and liveContentStudio pass native-noJS320px/200%text/lastlinkonscreen/nohorizontaloverflow. Guide/Studio mobileMore in-flow bounded accordion repairs absolute dropdown offscreenplacement. Map/help retain bounded overlays; the shared map navigation passed configured axe checks.
- Boss directory regression7groups passed after registry/deep-link integration (041grouping/threshold/legacy data plus038–040guard/order/history cases).
- FullPrettier check passed; repository checker0failures; gitdiff whitespace check passed (lineending normalization advisories only).

Independent definition/source/privacy/mobile/keyboard and final evidence receipts in checklists/requirements.md. Early devserver-changing/backgroundFirefox harness stalls and WebKit keyboard assumptions were diagnosed in analysis, not converted into passes. Final stable reruns use original-tab foreground return before asserting the retained draft, realTab/Enter, bounded waits and all original assertions. No engine skips.

Services remain local: map5175,guide4173,Studio4174. Studio restarted against new sharedmarkup; no repository content/draft save was performed. Raw syntheticlogs/screenshots ignored under .local/nav-repair/navigation-* and tools/hajin-map/.local/browser-checks/. No deployment/push/merge, no newprovidercollection, no physicaldevice/screenreader certification. No unrelatedmapworker capacity rerun: baseline retained because navigation is not that hotpath. Feature041sharedstarterorder remains pending owner sequence, outside this navigation completion.

Final live HTTP verification:5175/4173/4174 each returned200 with the directBosslink and all45toolhrefs present in sharedMainnav. Workingtree contains only reviewed code/docs/tests/artifacts; no owner data bundled.
