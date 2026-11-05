# Presentation rollback — automated rehearsal

All five surfaces passed real modern → legacy → modern reload rehearsals in Chromium, Firefox and WebKit. This is presentation rollback, not a domain restore.

| Owning surface | Actual boundary | Preserved evidence |
|---|---|---|
| Main Map | Trusted Vite HTML resolver, stable origin, real reloads | Exact current/previous point workspace revision and hash |
| Safe runs | Same real resolver and own URL/store | Actual selected-safe/order state hash; no Main workspace contamination |
| Guide | Two actual production builds, whole-build activation, stable real static-server origin | Inventory saved through actual UI, exact private database digest |
| Studio | Real author server/rendered HTML, stable owning origin | Exact managed content/schema SHA hashes |
| Manager | Real manager server/rendered HTML and Python status reader, stable owning origin | Exact managed content/schema SHA hashes; no collection/apply jobs |

Every rehearsal preserves exact invalid071 preference/cache bytes, session bytes and legacy theme preferences. Loaded documents retain their original variant until reload; no client URL or preference changes the trusted rollout choice. No mutating HTTP or external request is accepted. Each service retains its own origin rather than sharing player storage.

Tests: tools/hajin-map/tests/ui-rollback-browser.mjs and tests/browser/ui-surface-rollback.mjs. Detailed synthetic receipts: tools/hajin-map/.local/071-ui-rollback.json and .local/071-ui-surface-rollback.json. The latter builds disposable isolated snapshots and never replaces canonical dist. Initial fixture failures remain in local logs and are not counted as passes.

Held/denied/unconfirmed Map writes have separate owning persistence tests. An uncertain write is not resolved by changing presentation flags. Physical/manual acceptance and final full-source promotion review remain pending; defaults stay legacy.
