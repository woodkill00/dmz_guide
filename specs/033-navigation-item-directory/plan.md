# Implementation plan
Static Node22/24 ES modules, existing escaped render/build and client catalog filtering; no dependencies, schema or storage changes.
1. Add navigation entries and sitemap/map-workspace pages at build time. Shared nav retains More disclosure and primary routes; active items page has unique key. Static sitemap groups allRecords by pack and workspaces from actual generated pages.
2. Render compact item directory rows with existing catalog data attributes. Reuse catalog filters; add optional sorting. Server-safe author guidance targets exact catalogkey/packID/itemID. NoJS allrows visible.
3. Add strict remove target intent; local Studio invokes existing requestRemoval after startup, never confirms. Existing references, stagedsave/recovery remain authoritative.
4. Add runtime regressions and shared browser scenarios including narrow/zoom navigation, filter/sort/empty, exact links and removal tests; full aggregate integration at parent.

## Constitution check
Evidence unchanged; spoilers projected; static privacy preserved; unknowns explicit; reversible draft removal; mobile/keyboard and test gates required. No migration or public deployment. No violations.
## Ownership
Own render.mjs, styles.css, catalog.mjs, build.mjs, author-target.mjs, author-actions.mjs, Studio startup removal intent, navigation-directory tests and feature033 records. CI worker owns other Studio repair; cherry-pick conflict reviewed explicitly.
## Risks
Header link growth: keep More disclosure and mobile wrapping. Large sitemap: group content bypack in native details; bounded source catalog limits apply. Removal unsafe inference: explicit intent preview only, existing draft save untouched. No claim sourcecount equals complete gamecatalog.

## Coverage repair
Extract pure renderMainNavigation into src/ui/site-navigation.mjs; native renderLayout delegates with existing dynamic extras/pack state. Studio and saved repository previews render the companion variant and permits only its new fixed stylesheet through the existing asset allowlist. Vite injects that renderer into explicit map/help HTML markers in development and production; main.ts moves the static map navigation below its header. Shared companion CSS is imported via the map tool and served as a fixed Studio asset. Flex layout lets the map fill remaining viewport space with wrapped navigation. No runtime fetch, cross-origin storage access or source-data changes. Retain original drafts and all origin/token guards.

Resize convergence uses Leaflet invalidateSize({pan:true,animate:false}) to counter-pan synchronously before max-bounds move handlers run. This retains the existing overview/minimum-zoom rules and fixes the reproduced key-close drift without changing stored camera/workspace state.
