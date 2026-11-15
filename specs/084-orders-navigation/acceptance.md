# Acceptance evidence

- `npm run check`: passed; 1,031 runtime tests, repository checks and 2,042-route build.
- `node tests/browser/orders-navigation.mjs`: passed in Chromium, Firefox and WebKit against final build. Covers main Orders entry, 24 Hajin links, five X01 links, real destinations, selected-pack change, menu search, mobile keyboard and companion link semantics.
- `node --test tests/runtime/site-topology.test.mjs`: 8/8 passed on final build; no broken internal targets.
- `npm run format:check` and `git diff --check`: passed.
- Compact UI targeted browser matrix: 96 cases passed after scoping outer menu selectors. Actual running Map companion at `127.0.0.1:5175` exposed five X01 Orders links.
- Broad browser suite progressed through navigation, Orders, compact UI, upgrades, progression, editor and reader setup. It was stopped during long reader reload experiments; no complete broad-suite pass is claimed.
- Independent reviewer confirmed no remaining scoped blockers after two repair cycles. See reviewer-owned checklist for evidence limits.

The existing `/missions/` route, mission records, profile data and audit actions remain unchanged. Historical registry identity remains “Missions”; visible navigation and destination page say “Orders”.
