# Contracts

Only fixed HTTPS `https://codmunity.gg/weapon-stats/mw4` and `/dmz`; no query/redirect/custom input. Fetch ≤2MiB response,4MiB/check,20s/request and45s total; abort stream on limits, MIME text/html, UTF8 fatal. No eval/newFunction/VM/browser execution of source scripts. Locate one `weaponStats:$R[n]=[...]` data literal within valid comparator HTML; parse subset object/array/finite number/JSON string/null/bool and bounded assignment/reference only. Reject functions/calls/getters/prototype keys/duplicates/forward or circular refs. Limits:50k nodes,depth12,4096 refs,512chars/string,256 rawweapon rows. HTML headings must match selected game, each row.game matches selected comparator, sourceGame matchesmw4, identities match current weapon name/ID by exact compact spelling (no prefix/fuzzy). Unknown identities are counted/warned, duplicates fail. Missing profiles retained as empty, never zero.

Version1 exact source document: preferredSource `codmunity-mw4`, badge `*WZ`, modes `{mw4:null|snapshot,dmz:null|snapshot}`. Snapshot exact fields sourceURL/mode/fetchedAt/sourceDate/sourceHash/warning/weapons/unknownCount; row exact fields name/sourceUpdated/stats/damage. Stats only authored metric keys/units, finite values (signed only when definition permits); damage≤16 strictly increasing bands, from/to in source units (m only when established), body keys head/neck/chest/stomach/upperarm/upperleg/lowerarm/lowerleg, optional providerTTK/shotcount with no guaranteed armor/target assumptions. Accepted/proposal ≤2MiB, JSON bounded depth16/nodes50k/strings1000, currentknown identities, no unsafe fields. Empty initial document allowed, malformed existing document fails visibly.

Ignored `.local/codmunity-proposal.json`: exact `{version:1,baseRevision,content}`. Hash binding covers exact proposal bytes; baseRevision is accepted document byteSHA or defined empty-stateSHA if absent. Exclusive `.local/codmunity-writer.lock`, no takeover; recheck hashes under lock, backup `.local/codmunity-backup.json` then atomic temp-write/fsync/rename accepted file, retain previous on failure. Semantic repeat check excludes fetchedAt-only changes from accepted replacement; refresh status still records actual new check. No source disappearance deletion without explicit review. No automatic apply/rollback or content mutation during probes.

Ignored `.local/codmunity-monitor.json`: latestAttempt/time/error plus lastSuccess/time/result; bounded source-only data. Ready means valid supported DMZ rows with nonempty damage and no explicit untested warning, and still source-reported not verified. Distinguish reachable untested/no damage, available partial/full data, malformed and network failure; retain last success on failure. Manager startup plus6h interval, unref timer, one job shared busy flag, probes skip busy/pending lock; teardown clears timer and aborts owned fetch before close. No writer lock removal. Existing Host/Origin/token/body/CSP restrictions apply to new manual actions.

## Exact fact schema and readiness

`weapons` is an object keyed by current weapon ID, at most256 entries. Every row is exactly `{name,sourceUpdated,stats,damage}`; dates are ISO timestamps or null. `stats` contains only finite numeric keys in the authored table below; negative values are refused except explicitly signed keys. Missing keys are unknown. Source average-TTK zeros with empty damage are placeholders and omitted. Damage is an array of at most16 exact `{from,to,unit,values,providerTTK,shotsToKill}` rows. `from` is nonnegative, first0; `to` is next band.from or null for final. Unit is `source-unspecified` until an explicit unit contract is established; do not infer meters from official ranges or unrelated stats. Values is an object with exactly the eight region keys listed above, each nonnegative finite damage or null. TTK nullable nonnegative ms and shotsToKill nullable positive integer; both provider-reported with unknown target/armor assumptions, not DMZ predictions. Reject nonascending bands, empty-valued bands, absent damage arrays or invalid numeric fields. Empty arrays explicitly mean no damage reported. Only literal `!0` and `!1` unary encodings are accepted, never other executable unary expressions.

Coverage uses known weapons in accepted weapon-intel roster as denominator (currently33): reported-row count and weapons-with-nonempty-damage count shown separately. Unknown provider identities do not inflate either. DMZ status is `reachable-untested` while warning present; otherwise `no-damage`, `partial-source-data` (1..denominator-1 damage profiles), or `full-source-data` (all). All statuses remain source-reported/unverified. Readiness for review requires no explicit untested warning and at least one valid damage profile, never HTTP200 alone. Separate DMZ panels identify actual DMZ source and warning, never the Multiplayer legend.

Idempotence compares normalized facts: mode/sourceURL/sourceDate/warning/unknownCount plus known weapon names/stats/damage, excluding fetchedAt, raw sourceHash and per-row sourceUpdated. New fetch hashes/times remain status/probe receipts. Proposal previews show added/changed/removed weapon IDs, field changes, damage-profile count changes and coverage reductions. Any disappearance/removal remains pending explicit reviewed replacement; no implicit delete. Failed checks preserve accepted/proposal bytes and record latest failure separately from last successful status. Network/parse failure never becomes valid empty content.

### Authored stat keys, raw units and sign

- `movement`: `m/s`, nonnegative.
- `ads_movement`: `m/s`, nonnegative.
- `sprint`: `m/s`, nonnegative.
- `tac_sprint`: `m/s`, nonnegative.
- `crouch_movement`: `m/s`, nonnegative.
- `strafe_movement`: `m/s`, nonnegative.
- `firing_movement`: `m/s`, nonnegative.
- `ads`: `ms`, nonnegative.
- `ads_out`: `ms`, nonnegative.
- `stf`: `ms`, nonnegative.
- `reload`: `ms`, nonnegative.
- `raise_speed`: `ms`, nonnegative.
- `drop_speed`: `ms`, nonnegative.
- `vert_recoil`: `source-unspecified`, nonnegative.
- `horiz_recoil`: `source-unspecified`, nonnegative.
- `vert_gun_kick`: `source-unspecified`, nonnegative.
- `horiz_gun_kick`: `source-unspecified`, nonnegative.
- `ads_idle_sway`: `°`, nonnegative.
- `ads_gun_bob`: `°`, nonnegative.
- `bv`: `m/s`, nonnegative.
- `range`: `%`, nonnegative.
- `bullet_penetration`: `in`, nonnegative.
- `hip_idle_sway`: `°`, nonnegative.
- `hip_gun_bob`: `°`, nonnegative.
- `hip_turn_sway`: `°`, nonnegative.
- `flinch_received`: `x`, nonnegative.
- `rpm`: `rpm`, nonnegative.
- `mag_size`: `rounds`, nonnegative.
- `reserve_ammo`: `rounds`, nonnegative.
- `head_multiplier`: `x`, nonnegative.
- `hip_strafe_accuracy`: `degrees`, signed.
- `hitscan_range`: `m`, nonnegative.
- `pre_fire_delay`: `ms`, nonnegative.
- `burst_size`: `rounds`, nonnegative.
- `burst_rpm`: `RPM`, nonnegative.
- `burst_delay_ms`: `ms`, nonnegative.
- `tac_sprint_duration`: `s`, nonnegative.
- `avgTtk1`: `ms; provider bucket1, range/target assumptions unspecified`, nonnegative.
- `avgTtk2`: `ms; provider bucket2, range/target assumptions unspecified`, nonnegative.
- `avgTtk3`: `ms; provider bucket3, range/target assumptions unspecified`, nonnegative.
- `avgTtk4`: `ms; provider bucket4, range/target assumptions unspecified`, nonnegative.
