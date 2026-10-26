# Data model

All persistent entities carry schemaVersion, createdAt, updatedAt and revision where mutable. IDs are opaque bounded strings; imported IDs are never object property paths or executable HTML. Display text uses text nodes. URLs are HTTPS source links only, never automatic fetch targets.

| Entity | Identity and required fields | Invariants |
|---|---|---|
| Source | sourceId; name; page; capabilities; acquisitionStatus; exportStatus; permissionEvidence | Registry-owned capability/rights values cannot be upgraded by imported JSON |
| SourceSnapshot | snapshotId; sourceId; digest; capturedAt; sourceRevision; frameId; applicability; rightsEvidence; records | Immutable. IDs unique within source; digest binds exact imported bytes. New refresh is a new snapshot |
| SourceRecord | (sourceId,snapshotId,recordId); originalCategoryPath; title; rawGeometry; applicability; activityClaim; upstreamRefs; evidence | Preserve raw source claims and unknowns; source badge is a claim, not verification |
| CoordinateFrame | frameId; mapId; coordinateVersion; width/height; units; origin/axes; crop; imageDigest | Unknown fields prevent placement; no earth-coordinate inference |
| Registration | registrationId/version; frameId; canonicalFrameId; transform; control/holdout anchors; residuals; reviewer/time; state | Binds imageDigest/frame revision. pending -> validated -> accepted; any frame change invalidates it |
| TaxonomyMapping | sourceId; snapshotId; mappingVersion; originalPath -> canonicalCategory | Unmapped retained; changing mappings invalidates dependent candidate runs |
| CanonicalEntity | entityId; point; applicability; fieldChoices; evidenceRefs; decisionId; acceptance; freshness | acceptance=pending/accepted/withdrawn, freshness=current/stale; accepted stale entities remain visible with badge; pending/withdrawn unplotted; raw snapshots never overwritten |
| BasemapAsset | assetId; sourceId; frameId; digest; sanitized raster; permissionEvidence; description | Authorized local input only; unregistered image visible only in registration preview; accepted registration required for canonical overlay |
| ReviewDecision | decisionId; parentDecisionId; action; entityIds; selected/rejected field refs; authored evidence; upstream lineages; reviewer/time | Append-only; undo adds inverse decision. split retains ancestry. Refresh flags stale rather than applying silently |
| Annotation | annotationId; kind POI/location/mark; title; category; point; applicability; notes; evidence; verificationState; iconId? | Private, mutable revision; user observation is not automatically verified; no line/polygon geometry in v1 |
| IconAsset | iconId=SHA256(sanitized PNG); bytes; dimensions; description; rightsDeclaration | Sanitized only; deduplicate bytes; references checked transactionally on removal |
| VisibilityState | workspaceId; sourceEnabled; categoryMask; curatedEnabled; customEnabled; query | Remember category masks when source master is off; map key and layers subscribe to same state |
| WorkspaceBackup | version; workspace; resources; omittedDependencies; digests | Private transfer; complete custom data; source bytes only with explicit private export permission |

Applicability is `{mapId, coordinateVersion, gameBuild: known value or unknown, floor: known ID or unknown}`. Unknown must not be interpreted as equal to every known value. Activity claim is possible-spawn, observed-active (with observation time) or unknown; the viewer never claims live activity.

Private IndexedDB `dmz-map-workspace`, version1, stores metadata/revision, snapshots, basemap resources, registrations, taxonomy, canonical entities, decisions, annotations, icons and visibility. All mutation commits check workspace revision in the same transaction and update a previous-state recovery manifest. A failed transaction leaves current and previous valid state unchanged. Keep one previous logical revision; immutable shared blobs are reference-counted only after both states no longer reference them. Save failures retain an in-memory draft and offer draft export. On versionchange, close the old connection and require reload; no forced overwrite from another tab.

Migration reads feature019 source/category masks, previews mapping by stable IDs, then commits migration marker and state atomically. Unknown categories default visible but are labelled new; retain legacy localStorage unchanged for rollback. No access to native `dmz-guide-local` data is needed.
