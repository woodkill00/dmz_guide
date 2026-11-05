# Plan, tasks and consistency analysis

- [x] T001 reviewed definition (FR001–005).
- [x] T002 disclosure/combined controls and sidebar polish (FR001–002).
- [x] T003 disable popup auto-pan, minimize initial summary, defer movement redraw while selected (FR003–004).
- [x] T004 synthetic browser regression, units/build/check; repair and converge (FR005).
- [x] T005 independent final review and acceptance (FR005).

Keep source IDs, checkbox IDs, duplicate logic, visibility transactions and private state intact. Preserve disclosure openness and pane scroll across renderKey. Combined categories match normalized display names only for UI selection; this never changes location identity/deduplication. Leaflet popupopen/close controls transient redraw deferral with cleanup. Existing tests must expand disclosures before operating hidden controls, preserving assertions/fixtures.

Initial analysis: source controls are repeated as flat key cards; workspace renderMarkers is subscribed to moveend/zoomend and clears layers, explaining disappearing popups. Shared popup options currently enable automatic panning. Existing close/open already expands map; opener unnecessarily resets list scroll. No remote research needed for repository-local behavior.

Convergence: FR001–005 implemented and traced to acceptance.md. Definition/interim review findings repaired, new synthetic tests added without weakening fixtures. Combined defaults collapsed to keep websites visible at first glance. Final independent implementation and receipt review passed; all nine source hashes match.
