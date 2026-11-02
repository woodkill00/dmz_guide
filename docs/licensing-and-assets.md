# Licensing, assets and attribution

## Original project code: MIT

The owner approved MIT for original project code. See [LICENSE](../LICENSE). The MIT grant does not cover game artwork, maps, third-party datasets or other assets unless their rights holder explicitly licenses them on those terms. Record separate rights below; do not relabel third-party material as project-original.

Upstream Spec Kit material retains its original license and copyright notice. The bootstrap's third-party notices should identify the pinned upstream source and retained license. A tooling license does not license game artwork, map databases, screenshots or community contributions.

## Asset acceptance

Before merging an image, map, icon, dataset or quotation, record: stable asset ID/path, creator, original source URL, exact license or written permission, permitted uses, required attribution, modifications, review date and reviewer. If permission is unknown, do not redistribute it. Prefer original work and clearly licensed resources.

Private user reference screenshots are design references only. Do not upload them, expose player details, or treat them as a grant of redistribution rights. A screenshot of a fact is not sufficient permission to distribute its artwork. Links to other guides do not license their text or data.

Maintain an asset register with fields such as:

| Asset ID/path | Creator/source | License/permission evidence | Attribution | Changes | Reviewer/date |
| --- | --- | --- | --- | --- | --- |
| No project assets approved yet | — | — | — | — | — |

This empty register makes no claim that future assets are cleared. Add approved assets as they arrive. Remove or quarantine disputed assets, review dependent packs, and record the reason. Do not overwrite history to conceal attribution.

## Public credits

Publish human-readable credits alongside the asset pack or product that uses the asset, preserving notices required by its actual license. Game names and trademarks identify the subject; do not imply endorsement. Ask the owner for a decision where rights remain uncertain rather than inventing legal clearance.


## Local weapon-intelligence dataset048

`content/weapon-intel.json` and the added native weapon observations contain factual identity/stat reports from Activision's official launch overview/patch notes and the COD Loadout structured community snapshots (upstream CODMunity, ggranked, DMZ Codex and others recorded in the document). Local collection/use is covered by the owner's earlier explicit additional-provider permission confirmation in this session, recorded in feature036's source registry. This is not an MIT grant or a public redistribution license. No weapon/attachment artwork or long provider descriptions are included. Attribution URLs, dates, mode and status remain in the dataset and reader. Reviewed scope/date: local feature048,2026-11-01; independent review receipt lives in its checklist. Source data transformation: normalized identities/compatibility/multipliers, separate dated patch reports and explicit missing/uncertain values. No public publication is authorized by this entry.


## Local weapon figures050

Feature050's official base-weapon artwork is used only in the authorized local checkout. `src/ui/weapon-figures.json` records fixed publisher URLs, SHA256, dimensions and display crops for all33 weapons; ignored `.local/weapon-art/` holds the files and local collection receipt. Figure collection is explicit, hash-bound and separate from public static builds. No private reference screenshots are copied or committed. The visual skin is original HTML/CSS inspired by the user's references. Source artwork is neither project-original/MIT nor cleared for public redistribution. The two initially uncertain image captions were resolved by inspecting the actual official Cronen Squall and PM-40 Anvil figures. Reviewed source/date: feature050,2026-11-01; final review in its checklist.


## Local CODMunity reports051

The owner explicitly selected CODMunity MW4 as the preferred source and previously authorized local provider collection. `content/codmunity-stats.json` retains structured factual numeric reports, mode/date/hash/coverage and untested flags from the two fixed comparator URLs; no provider scripts, long descriptions or artwork are bundled. Local permission is not an MIT grant or public distribution license. See [baseline guide](codmunity-baseline.md) and feature051 reviewer receipt.

## Local Game8 key guide 053

The owner’s earlier explicit permission for additional provider collection plus the direct 2026-11-02 request covers local facts/screenshots from Game8 article 634455. The factual data in `src/ui/keys.json` is a structured source report with short original access summaries; article prose, ads and scripts are not copied. `src/ui/key-images.json` registers 18 fixed modal image URLs, SHA256, MIME, decoded dimensions and alt text; each maps to its actual source heading. Creators: Game8 editorial location annotations/collages, underlying Activision game artwork. Source https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/634455, provider date 2026-10-28, local review 2026-11-02. Modifications: none to image bytes, responsive display only. Actual original WebPs total 742,904 bytes; stored solely in ignored `.local/key-images/`, excluded from static output and Git. Game8/Activision attribution and exact article/image links appear beside each image. No MIT asset grant or public redistribution license is inferred; no publication is authorized. Independent review and exact factual/media verification are in feature053’s checklist and acceptance.

## Local key-item icons054

The same Game8 article’s overview supplies18key-to-icon mappings to5shared original72x72WebP item images. `src/ui/key-icons.json` records exact URLs/SHA/dimensions, independently joined to the captured source rows. The user explicitly requested these images inside the key links; existing local provider permission applies. Original bytes are unmodified in ignored `.local/key-images/icon-{id}.webp`, served only through the fixed local image allowlist, never bundled or committed. Directory credit is Game8/Activision, with the existing exact source link. No rarity/mechanic inference, MIT asset grant, public redistribution or publication is implied. Reviewer/date: independent feature054 checklist,2026-11-02.

## Supplemental access reports055

Feature055 retains the original18Game8key/media records and adds two short factual hospital reports from https://www.modern-warfare4.wiki/guide/mw4-dmz-irradiated-container (updated2026-11-01) and https://codcentral.net/blog/mw4-dmz-keys/ (updated2026-10-28), checked2026-11-02. Existing owneradditional-provider permission covers local factual collection. No new provider artwork was copied: src/key-generic.svg is an original generic indicator, not an inventory-item depiction. The lab-to-named-locker identity is unconfirmed and remains a possible link rather than an externally verified required chain. Exact source URLs/dates/notes remain in key-supplemental.json/key-access.json and detail pages; no public redistribution license or publication is inferred.

## Supplemental key facts and private planning (057)

The existing owner permission for additional providers covers this local factual expansion. The public DMZTracker key index (`https://dmztracker.com/keys/`, JSON-LD modified2026-11-01, checked2026-11-02) supplied60 compared rows. Forty-two new identities were added alongside the existing20; matched names, grid disagreements and the unresolved hospital identity remain explicitly recorded. `src/ui/key-room-details.json` contains concise original factual summaries and source references; no new provider article prose, scripts or artwork were copied. A separate `https://dmztracker.gg/guides/keys-guide/` report is identified as conflicting context where applicable, not the same provider identity. Collection does not assert factual verification, an asset license or permission to publish artwork. Local raw captures and private progress/exports remain ignored. Independent review and exact evidence belong to feature057.
