# Weapon database and official updates

Open the local [Weapon database](http://127.0.0.1:4173/armory/) or choose **More → Weapon database**. **Weapon updates** in the same menu explains the commands. The existing Weapons reference also links to the database. Search/filter by weapon class or attachment slot, open a weapon for per-weapon reports, and use the labelled scrolling tables at small sizes.

## Populated coverage

The current dataset contains 33 official launch weapon identities, 615 provider-reported standard attachments and 28 weapon-specific Apex attachments. Reported effect coverage is 991 weapon/attachment pairs, including 19 Apex pairs. This measures this imported snapshot, not all possible attachments or verified current DMZ mechanics. Native catalog records retain the four existing IDs and add the remaining launch identities. No artwork was imported.

Official launch observations retain their date and distinguish unknown from not-applicable. Publisher BPM remains BPM, not silently converted to RPM. Community base values are labelled Multiplayer/unverified; attachment effects have uncertain mode and no validated stacking simulator. Provider multipliers are per-weapon reports, not universal attachment averages. Missing effects are not zero. Higher duration is worse even when its percentage sign is positive. Damage/armor/TTK are not established for current DMZ.

The official VEL 46 progression table and weapon sheet disagree; both reports are retained. Provider values can also differ from official launch values. Prices and cosmetic artwork are not inferred or imported. The separately versioned intelligence document does not change private profile formats or the portable content-pack contract.

## Explicit patch check

From the project folder with Node 22/24 and Python 3 installed:

```sh
npm run weapons:check
```

The platform launcher uses `py -3` on Windows and `python3` elsewhere. It reads the official patch index and supported MW4 articles with bounded supervised requests. Historical beta articles are excluded with a warning. It stages `.local/weapon-patch-proposal.json` and prints added/changed/unchanged counts plus warnings. It does not mutate the database. Open the proposal and inspect the linked original notes, scope, date, variant, raw before/after and warnings.

Then apply the reviewed proposal and rebuild:

```sh
npm run weapons:apply
npm run build
```

Reload the reader after a successful build. Apply writes source reports into the patch history, retains baseline measurements and stores corrected reports' previous values. It never converts unspecified range units into meters or applies MP changes as DMZ values. The first live import retained 65 official October 28 Multiplayer change reports. A fresh repeated check returned 0 added / 0 changed / 65 unchanged; repeat apply was a no-op.

The checker handles structured weapon-change tables. Other qualitative layouts and unresolved scope/subjects require review; they are not certified complete extraction. It can discover new supported MW4 patch URLs from the official index, but future publisher layout changes may require parser maintenance. Article/byte/deadline/capacity errors fail without replacing the previous database/proposal. Source disappearance never deletes existing reports. A source-linked local proposal is not a cryptographically authenticated publisher statement; manually editing it changes what you are proposing.

## Run with maintenance checks

```sh
npm run weapons:check -- --fail-on-new
npm run weapons:validate
npm run test:weapons
```

With `--fail-on-new`, exit 2 means new/corrected reports need review, 0 means no such changes, 1 means failure. Warnings must still be read. These commands are explicit and can be called by your own local maintenance task. Routine `npm test`, builds and repository checks do not fetch providers; no automatic schedule was created.

## Safety and recovery

The [armory workbench](armory-workbench.md) adds private comparisons, builds, evidence and acquisition tracking. Run `npm run weapons:manage` for the loopback-only browser check/review/apply/rollback dashboard. Existing CLI commands remain supported. Accepted ledger changes require a separate rebuild.

Apply uses an exclusive writer lock and compares the database revision against the staged proposal. If actual changes are pending and the database changed, recheck/review. Applying identical reports again is a byte-identical no-op. Other weapon/attachment/base fields are retained. A validated complete replacement is atomic, with exact prior database bytes at `.local/weapon-updates/backup.json`.

A crash can leave `.local/weapon-updates/writer.lock`; new writers stop instead of taking over. Confirm no updater is running, inspect the proposal/current file/backup, and remove only that stale lock when appropriate. Do not restore over a newer database without reviewing it. Recovery is manual; no operation silently overwrites a newer valid state. Backups/proposals/raw captures stay ignored locally.

The initial reviewed population used `scripts/populate_weapons.py` and captured source inputs; it is intentionally not a repeat updater and refuses to overwrite the intelligence document. Ongoing official patch updates use the commands above. Original source URLs/lineage are retained in `content/weapon-intel.json`; see [research047](weapon-database-research.md) and [feature048 acceptance](../specs/048-weapon-database-updates/acceptance.md).
