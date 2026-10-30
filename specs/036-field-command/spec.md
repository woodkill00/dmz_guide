# Feature Specification: Field command and reference library
Created2026-10-30. Branch feat/036-field-command. Status: locally implemented and synthetically verified; external gameplay/device checks pending.
Input: all seven recommendations after035 plus researched refreshable references for items, upgrades, guns, attachments, materials, story and missions.

## User Scenarios & Testing
US1(P1) Compact match controls show/reach next stop, toggle session mission objectives and add observations; save/restore map presets. Test reload/draft/unavailable stops.
US2(P1) Accuracy dashboard jumps to stale/missing references, unreviewed duplicates and unpositioned locations, without inferred completeness.
US3(P1) Preview optional waypoint-order suggestion anchored first, accept or cancel; retain reached identity. Use existing avoided-edge controls and add graph-bound avoid rectangles rejecting crossing edges. Gaps/connectors remain visible warnings, no optimality/safety/ETA claim.
US4(P2) Owner-authored entrance/exit/floor/key/objective relationships between exact locations; browse/jump/delete, no invented game relationships.
US5(P1) Named source/category/query/gameplay/zoom/center/panel-position presets, explicit apply and private backup roundtrip.
US6(P2) Step through recorded session events/routes/marks/objective snapshots with map focus and idempotent captured-manual-mark promotion; historical handles never retargeted, no inferred movement trail.
US7(P1) Broad researched official/editorial/community source registry and authorized public-page collection. Retain URLs,digests,times,build applicability,extractor version and old captures. Review searchable candidates, preview added/changed/missing/no-op, explicit apply, retain independent progress and per-provider provenance. Raw text is not verified fact; spoilers hidden by default. No complete-game/public-redistribution claim.
US8(P1) Actual usability worksheet with not-tested/pass/fail evidence; automate keyboard/axe/mobile/browser/capacity, keep real play/device/screenreader unverified until observed.

## Functional Requirements
FR001 Compact match mode reuses route progress and session missions, accessible collapsible persisted HUD; no live tracking/globalhotkeys, preserve existing positioning.
FR002 Read-only bounded accuracy list, exact navigation, duplicate decisions and unavailable positions disclosed; scanning never mutates.
FR003 Deterministic bounded32stop nearest-neighbor suggestion(firstanchor), preview/cancel/explicitapply, unresolved refusal and reached identity preserved; approximate straight-line score disclosed. Avoid rectangles<=20/route bind graphSHA, crossing-edge rejection and stale-graph refusal in existing route worker path. Existing edge exclusions retained.
FR004 Relationships<=500, typed entrance/exit/floor/key/objective, ownerlabel<=200, validated exact handles; stale/missing remains visible, capture dependencies pinned; explicitdelete.
FR005 Presets<=20,name<=60,viewport0–4096/boundedzoom,cloned validated visibility/gameplay and finitebounded panelpositions; explicit apply/CAS, stale layers safely filtered; no publicview/selectionpack export.
FR006 Playback stable chronological recorded events with manual stepcontrols; promote captured mark once per(sessionID,markID), transactionally; never provider title/geometry copy.
FR007 Registry verified reachable URLs,coverage,credibility rationale/limits, owner-confirmed2026-10-30 local collection permission. Collector HTTPS exacthost/pathallowlist, no arbitrarytargets/redirects/accounts/paywalls/challenges;<=2MiB/page,<=12pages/run,15sectimeout,>=1secdelay,explicitCLItrigger,ignoredlocalcaptures. Failures preserve olddata. Extract short headings/links/table candidates rather than full narratives/assets; inertHTML/noJSexecution. Unknowns never invented.
FR008 Strict optional FieldGuide.command version1: presets,relationships,promotions,restrictions,referencecatalog/progress. Pack<=2MiB,<=2000records: sourceID/URL,stableID,kind,title,summary,nullablebuild,capturetime/digest. Dedup same-provider stableIDs; cross-provider normalizedtitle/kind grouping retains allprovenance, never equates recipe tiers/builds. Preview beforeexplicitapply; repeatedpack no-op; missing records retained and progress separate, changedidentity visiblystale.<=20capture receipts/provider and bounded histories refuseoverflow, no silenttrim. Search/kind/source/spoilerfilters,reference links, taskselection/completion/ownernotes. Private backups only; no implicit native publishedcatalog rewrite.
FR009 Existing20MiBworkspace/backup/CAS/quota/draft/epoch/bounds/privacy/workerguards preserved. Help/sourceassessment/usabilityworksheet, positive/negative/fullregression/threeengines/configuredaxe320px/unchangedcapacity, independentreview and analyze/fix/converge. Real gameplay/device/screenreader remains externalnot-tested.

## Success Criteria
SC001 Eight journeys have usable local entrypoints and executed synthetic tests; actual collection receipts/failures honestlyreported.
SC002 Repeat refresh/promotion causes no duplicates/lostprogress; stale/conflicting/cancelled operations preserve priorstate.
SC003 Regressions/build/checks/performance pass, reviewerfindingsresolved; externalchecks remainnot-tested.

## Key Entities and assumptions
Private commandstate,preset,relationship,promotionreceipt,restriction,sourcecandidate/capture,independentprogress. Providerdisagreements retained. Registry assessment is not factualcertification. Existing nativeguide remains reviewedpublicationpath. Ownerconfirmed permission for additionalproviders in thissession; localcollection only, no publicationauthority. Hardware/gameplay tests require actualobservations; implementtools/worksheet without fabricatedresults.

Convergence clarification: initial captures exceed2000 aggregate occurrences. Pack limit stays2000; history aggregate10000 occurrences, bounded80captures/20perprovider and unchanged20MiBworkspace/JSONnode limits. Read-only local Vite bridge serves registry-ID latest captures after explicit CLI collection; no network collection endpoint.
