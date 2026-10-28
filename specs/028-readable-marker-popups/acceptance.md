# Popup repair acceptance
2026-10-28; branch feat/028-readable-marker-popups; Node24.15.0 on Windows. FR001–003/SC001 implemented and automated verified.

## Result
Source, private/reviewed and selected search-marker popups use one inert DOM layout:17px title,14px/1.55 details, preserved newlines and wrapped long words, a labeled keyboard-focusable independently scrolling region, and separate44px-minimum action controls. Header/actions stay visible while notes scroll. Wheel/touch propagation stays inside the popup; keyboard scroll defaults are retained without panning the map; Escape closes via the standard Leaflet close control. Source links, copy/fallback and Details/Nearby callbacks are retained.

Popup width/height and auto-pan reserve viewport/header/notice space. Open popups update after map resize. Floating map controls/workspace launcher temporarily yield while a readable popup is open and return on close; status appears below it. Map wheel gestures outside remain available. No records, preferences or private-data schema were changed; no update collection ran.

## Executed evidence
- `npm run map:test`:103 passed,0 failed.
- `npm run map:build`: strict TypeScript and Vite production build passed,66modules.
- `npm run map:test:browser`:66 synthetic scenario groups passed at20:08:01UTC; zero runtime errors/external requests. Existing source/private/review/search/backup/geometry/icon/update/grid/Help regressions retained.
- Focused popup reproduction after final obstruction repair passed: long source desktop1440×1000 and mobile360×800, selected owned marker mobile, complete inert markup/newlines/long-word notes, viewport bounds, End and wheel scroll, stationary title/actions, actual elementFromPoint hits on details/scrollbar and Copy action, short nonoverflowing details, source-link safety attributes, copy action, Escape, Details action, unchanged visibility and restored map controls.
- `npm run test:engines`: Chromium156.0.8078.4, Firefox157.0 and WebKit27.2 all passed, including new long-popup keyboard scroll/Escape. Chromium axe4.14.0 scans of existing pages/tabs plus popup reported zero configured WCAG2A/AA/2.1AA violations. Popup is scoped for the popup-specific scan, without disabled rules; existing full-page scans remain.
- `py -3 scripts/check.py`:0failures. `git diff --check` passed.
- Synthetic screenshots remain ignored at tools/hajin-map/.local/browser-checks/synthetic-popup-{source-desktop,source-mobile,owned-mobile}.png. No game imagery or private capture is added to history.

## Independent review / convergence
integration_review approved requirements quality. fusion_research independently reviewed implementation/screenshots, found POP-R1 (floating controls/notice obscuring mobile notes/actions), then confirmed its repair and hit-test coverage, with no remaining focused-review findings. T005/T006 also record actual resize/header and focused-Escape findings and regression fixes. Early test-harness selector/empty-profile assumptions were corrected; product assertions were retained.

Physical touch hardware and actual screenreader sessions were not executed. Synthetic wheel/keyboard and emulated mobile/browser accessibility results are not those observations or certification. Native guide source, search/data engines and persisted contracts are unchanged, so native/capacity suites were not rerun for this isolated DOM/CSS repair; their previous feature027 evidence remains separate. No push/merge/deployment.
