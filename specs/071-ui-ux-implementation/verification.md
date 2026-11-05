# Implementation verification — in progress

Candidate branch: feat/071-ui-ux-implementation. No push, merge, deployment or default promotion is claimed.

Latest completed checks:

| Check | Result | Local receipt |
|---|---|---|
| Repository validator | 0 failures | .local/071-static-final-2.log |
| Root runtime | 834 passed, 0 failed/skipped | .local/071-runtime-final-2.log |
| Map runtime | 207 passed, 0 failed/skipped | tools/hajin-map/.local/071-map-runtime-final-2.log |
| Map TypeScript | Pass | tools/hajin-map/.local/071-typecheck-final-2.log |
| Guide modern build | 899 routes plus 404 | .local/071-guide-build-final-2.log |
| Map modern production build | Pass; existing bundle-size advisory retained | tools/hajin-map/.local/071-map-build-final-2.log |
| Historical legacy Map full aggregate | 114 checks passed; no runtime errors/external requests | .local/071-map-browser-aggregate-03.log |
| Main Map information pane | Original-node task/Back, no modal; all three engines | tools/hajin-map/.local/071-map-state-info-final.log |

The integrated modern Map serial runner passed all its owning suites (.local/071-map-modern-integrated-final-2.log). Guide suites passed through authoring in the integrated run; recovery subsequently passed all three engines after the proven fixture readiness repair (.local/071-recovery-final.log). The new T032 pane modes additionally pass the original21 cases and focused three-engine tests in isolation; final integrated follow-up is pending after the quiet benchmark window. Its first final attempt exposed a real catalog outgoing-history Back defect. Repair d133058 removes the outgoing pagehide history mutation and redundant unchanged blur writes; new incoming clean/edited Back-and-Forward regressions pass all three engines. The first failed log is preserved; it is not counted as a pass.

Earlier full Studio WebKit exposed a native keyboard skip-link defect. A focused reproduction proved explicit tabindex=0 makes the original Shift+Tab sequence reach the existing anchor. The original full suite now passes WebKit with assertions unchanged. Chromium and Firefox full suites also passed; per-engine receipts retain their exact source boundaries.

All five reload rollback surfaces pass in all three engines: Main/Safe receipt tools/hajin-map/.local/071-ui-rollback.json and Guide/Studio/Manager receipt .local/071-ui-surface-rollback.json. Exact domain/preference/managed-file hashes remain unchanged. Manager status uses its real read-only owning job; no collection/update/apply job is allowed.

SVG late confirmation while suspended now retains its original hidden editor until same-owner resume; all three engines pass the held-real-write regression without replay (.local/071-svg-suspended-final.log under tools/hajin-map).

Performance20-run matching and full final-source review are pending. Manual actual browser zoom, physical keyboard/touch, screen-reader and real BFCache eligibility are pending; automated root-font and synthetic persisted events are not substitutes.


The first integrated recovery failure was a fixture race: an already-visible content warning satisfied a generic error wait before the injected quota save finished. Waiting for the exact injected error and reenabled submit preserves all original failed-save, stable-focus and quantity assertions. The quantity waiter now uses a synchronous predicate over the live owner state. The original full fixture passed five WebKit repeats and then all three engines.

The first integrated selection failure was a fixture readiness race: IDB readability preceded actual receipt verification/unlock, so a conditional Back click could target a disappearing readonly frame. Waiting for the exact rendered revision plus unlocked owning controls retains every original domain, camera and focus assertion. Three consecutive three-engine matrices pass.

Independent visual review found an actual Manager menu edge clipped beyond320px by a higher-specificity legacy mobile logical-size rule. The modern rule now budgets both gutters with sufficient specificity;48 actual three-engine/theme/root-text rectangle, native-scroll, edge hit-test, focus and Escape cases pass. Document scrollWidth alone would not have caught this defect.


The last independent pane review concern was reproduced before repair: the visible fallback header measured94px but old padding remained69px. Commit b813c59 measures the final visible feedback/control layout before setting scroll padding and choosing in-flow fallback. The original21 geometry cases and new boundary/dirty-guard three-engine cases pass. This resolves REV-PANE-01; the original red receipt remains available.

Production build candidate: Guide899 routes plus404 (.local/071-guide-build-final-3.log); Map TypeScript/build pass (tools/hajin-map/.local/071-map-build-final-candidate.log). The existing >500kB bundle advisory remains visible; its threshold was not raised.

Map issue summaries now show a compact180-character excerpt while deliberate Issue details retains the complete original error. The actual full-app lifecycle fixture verifies a long error in all three engines, in addition to its existing held/failed/unconfirmed write cases (tools/hajin-map/.local/071-compact-issues-final.log).

Performance evidence is in analysis/performance-review.md:600 matched observations have zero geometry/health failures. Sequential timings remain flagged; the balanced120-read diagnostic shows median readiness differences1.8–3.3% and p95 differences−2.4–4.2% for the three sampled scopes. This does not replace the original observations or certify all-page performance. The independent constant structural-node exception assessment is separate from timing acceptance.


Final Guide/Home/key/compact/upgrade suite passes Chromium, Firefox and WebKit with strict browser health (.local/071-home-final-candidate.log). Original site-topology suite also passes all three engines: inventory/search/branches/neighbors/native links/pagination/export/keyboard/no-JS/eight layouts/axe (.local/071-sitemap-final-candidate.log).

The owner accepts the independent constant structural-node exception recommendation for the measured Armory, Inventory and Upgrades fixtures, limited to exactly the identified seven shell/adapter elements per page. It preserves all native feature identities and domain body limits; it does not accept the unresolved sequential timing result or authorize default promotion. See review-armory-dom-budget.md including its separately evidenced page-specific appendix. The original measurement verdict and counts remain unchanged.


Final modern Map serial runner, including the added pane-mode/boundary fixture, passes its15 owning suites (.local/071-map-modern-final-candidate.log). This final run includes21 geometry cases, three-engine mode/state/rollback,12 suspended-write acknowledgements, real full-app lifecycle/compact errors/selection,144 target activations, boss controls,72 theme combinations and atomic route/pane/selection/icon controllers. It does not include physical/manual acceptance or certify the still-open combined-state tasks.
