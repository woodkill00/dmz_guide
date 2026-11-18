# Page document v1: exact identity and storage

## Target and path

Target has exactly `{adapter, scope, recordId}`. Adapter is one of `catalog`, `weapon-intel`, `weapon-acquisition`, `weapon-camos`, `boss-reference`, `key-reference`, `loot-type-reference`, `mission-chapter`. Catalog scope has exactly `{packKey, packId}` using current author-target grammar; catalog recordId uses the existing namespaced ID grammar. Specialized scope is exactly `{game:"mw4", mode:"dmz", catalogId}` with catalogId a registered lowercase slug<=100; recordId is the adapter's validated stable namespaced ID or lowercase slug<=100. Adapter registration, not user input, defines which catalogId/recordId pairs exist. Unsupported registration fails resolution; no synthesized records or changed IDs.

Canonical target JSON uses fixed field order adapter,scope,recordId; scope fields use the order written above. Key is lowercase SHA256 of its UTF8 bytes. Managed path is exactly `content/page-documents/<key[0:2]>/<key>.json`; no target string is interpolated as a path. A key/target/path mismatch fails. Files must be regular, non-symlink managed files under this root. Derived public manifest paths are fixed by build, never supplied by imported documents.

## Manifest and document

Source manifest `content/page-documents/manifest.json` has exactly `{version:1, documents:[{target,key,sha256}]}`. Entries sorted by key; keys and resolved targets unique; sha256 binds exact document bytes. Manifest<=1MiB/20000JSONnodes/depth8/2000chars per string and<=2000documents. Reader build resolves against registered current source identities and rejects missing/unlisted/foreign assets, duplicate targets, hash mismatch and orphaned source references. Runtime manifest version1 is compiled separately from pack-v1, sorted with fixed public document paths. Ordinary pack imports cannot add page documents.

Document has exactly `{version:1,target,revision,baseFingerprint,sections,deletedAnchors}`. Revision is a nonnegative safe integer, incremented only on confirmed repository commit. baseFingerprint is lowercase SHA256 of the adapter's canonical semantic projection; it excludes layout and private progress. Document<=256KiB/12000JSONnodes/depth10/2000chars per string,32sections and128total blocks (including group children). All page documents plus compiled catalog metadata must fit the proposed8MiB build admission ceiling; existing per-pack/media/transaction limits also apply. Capacity conflicts fail explicitly and require a reviewed follow-up, never implicit widening.

Section has exactly `{id,title,kind,slot,layout,collapsed,blocks}`. id=`s-`+32lowercasehex; title<=120chars; kind=`custom|managed`; slot=null for custom or adapter-registered slot for managed; layout=`stacked|two-column`; collapsed boolean; ordered blocks array. IDs unique within document. Required identity/evidence sections cannot be removed from the resulting reader. A separate stable-anchor mapping is derived from IDs; deleted linked custom sections produce a visible removed-section notice at the old anchor rather than silently redirect to different content. Renames retain IDs.

Blocks have id=`b-`+32hex, unique across document, and exactly the fields of their type:

| type | Remaining fields |
| --- | --- |
| paragraph | text (plain inert text<=2000) |
| heading | text<=120, level=2 or3 within valid hierarchy |
| list | ordered:boolean, entries:<=50 plain strings, each<=2000 |
| steps | entries:<=50 `{id,text}` with unique stable step IDs (`t-` plus32lowercasehex) and text<=2000 |
| callout | tone=`info|tip|warning`, text<=2000 |
| image | assetId, alt<=2000, decorative:boolean, caption<=2000, fit=`contain|cover`, focalX/focalY numbers0..1 |
| gallery | entries:<=9 image placements using image fields without nested id/type |
| table | columns:<=8 names<=120, rows:<=50 arrays of matching-width strings<=500 |
| reference | target:validated registered record/map-location target, label<=120 |
| group | columns=2, children:non-group blocks; no recursive groups |
| managed | projection:adapter-registered canonical projection name; no duplicated factual values |

No unknown fields, nonfinite numbers, unsafe prototype keys or raw HTML. A document references<=9distinct attached asset IDs already admitted by its record/adapter media scope. Meaningful images require nonempty alt; decorative images require empty alt. Rights remain on shared asset metadata; each placement supplies context. All linked targets must resolve within the allowed scope. Source links are projected from validated source records; imported arbitrary href/return paths are not accepted.

## Version impact

An adapter computes canonical semantic projection before/after. A changed semantic fingerprint requires the existing factual content-version/rebind workflow; layout-only changes increment document revision without changing factual version. Pure document reordering/text placement leaves pack bytes unchanged. New asset attachment metadata can change canonical pack bytes, so it follows existing version/binding validation and explicit rebind where required; no image-only compatibility bypass is assumed. Changed recipe costs, rarity, mission steps, rewards, unlocks or source verification are semantic. No adapter may classify arbitrary changed JSON as presentation to bypass rebind. Compound fields on rendered pages must have an explicit owner: chapter rewards edit the chapter record, not a copied reward on each mission. Fields from joined catalogs show their owning editor or a read-only explanation.

Absent document preserves legacy default rendering. A present corrupt/unsupported document is not treated as absent: author blocks saving that target and offers retained-source recovery; build fails with old runtime preserved. Reader reports unavailable custom content instead of silently claiming the broken document was restored. Reference blocks are nonrecursive links/cards, not transclusion: navigation cycles are allowed, composition cycles/recursive groups are rejected. Unknown managed projections and duplicate block/section identities fail. Deleted linked section IDs remain in a document field deletedAnchors (unique s-32hex values, max256, disjoint from active IDs); this is a required v1 field with an empty default for newly created documents. Restore preview unions required historical anchors, reactivates explicitly restored IDs and fails on capacity instead of truncating.

Asset/image transfer follows page-bundle.md; no ignored-cache promotion is implied.

A fingerprint is not a merge base. Field-level three-way comparison requires a retained semantic base snapshot whose hash matches baseFingerprint. If unavailable, show whole-record/current-versus-proposed comparison and require explicit review; do not guess which fields were unchanged or auto-merge. Custom sections remain retained until an explicit decision. Saving a stale semantic patch is blocked until refreshed validation against the current canonical source.
