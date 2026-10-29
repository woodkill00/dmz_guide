# Owner-local source capture and right-click follow-up

2026-10-26. User requested visible provider POIs/icons and right-click creation, then explicitly confirmed permission to collect all three providers. T021/T022 were added to the owning spec/plan/tasks before final acceptance. Prior reports remain historical checkpoints.

## Behavior and verification

- Right-click opens an unsaved POI at canonical coordinates; no auto-save, ownership assumption or loss of an existing draft. Explicit pick-position mode reuses the draft. Busy transaction/processing locks and destruction cleanup are respected. Numeric/keyboard paths remain.
- Default checkout keeps providers reference-only. Explicit machine-local configuration enables bounded same-origin captures, owner authorization, canonical-image identity, reviewed registration version and exact snapshot/evidence SHA256 binding. No remote URL import or runtime provider fetch. Source bytes/icons/raw evidence/config stay ignored.
- Every loaded source has independent website masters at the top of Map key, categories/icons, Layers controls, global selection, search, counts and reload persistence. No official-only mask reuse remains for new sites.
- Every provider has a staged promotion action into immutable review snapshots; unknown lineage is retained as unknown rather than labelled official or independent. Known supplied floor and provider notes survive adaptation. Source icons remain available after promotion.
- Actual private smoke:543 raw records, four website masters,39 provider-category icons plus21 official categories; hiding CODMunity leaves440 markers and does not change other sites. Provider images decoded successfully;0 page errors/provider HTTP requests. Local blob resources are not external requests.
- Unit40/40 and strict production build passed. Browser32 groups passed,0 runtime errors/0 external requests, including actual right-button draft/pick/cancel behavior, four-source selection/persistence, digest mismatch failure/retry and all-three-provider review promotion. A test initially waited for a retry button in a closed Layers dialog; corrected the test to attach then open the actual panel. No assertion was weakened.

## Independent review and repairs

Independent UI reviewer found LPR1 (registration not bound to marker bytes) and LPR2 (loaded providers display-only). Exact marker/evidence digests and reviewed frame/version binding resolved LPR1; per-source bounded staged promotion and source-preserving adapter resolved LPR2. Focused re-review explicitly found both resolved, with no remaining findings. Right-click guards/reuse/cleanup were also reviewed as sound.

## Artifact analysis and convergence

Explicit Spec Kit context resolves specs/020-map-source-fusion. Follow-up analysis assessed FR001-005/008/010/012/013, existing13FR/6SC coverage, the two added tasks and retained privacy/rights constraints against actual code and tests. Scope now distinguishes default reference-only installs from this explicitly authorized owner-local configuration. No remaining actionable artifact inconsistency or implementation gap found. Existing reviewer-owned checklists were not edited. No further convergence task is required for the specified follow-up.

No native application code, public game dataset, assets or deployment changed. Prior physical-device limitations remain. Public export stays disabled and private-export permission stays false. Measurements of image alignment are not factual map accuracy claims.

Follow-up production capacity rerun passed (2026-10-26T20:44:54Z): toggle first-paint p95=203.7ms, search p95=115ms, five20,000-record worker comparisons157–393.9ms. Same four-core affinity/512MiB renderer limit on64GiB host; no physical8GiB claim. All32 browser groups passed at20:43:49Z, including capture digest rejection/retry and provider promotion.
