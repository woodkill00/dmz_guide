# CODMunity baseline and DMZ checks

The preferred source is [CODMunity's MW4 comparator](https://codmunity.gg/weapon-stats/mw4). Imported base measurements and body-region damage profiles carry **\*WZ — MW4 Multiplayer, not tested in DMZ**. WZ is the requested guide marker, not a claim that these values describe Warzone. Official launch reports, older community reports and private DMZ observations remain separate.

Open [weapon armory](http://127.0.0.1:4173/armory/) or an individual Gunsmith. Stats \*WZ opens imported profiles. Coverage counts identify current catalog weapons with source records and damage; missing values stay unknown. Damage distances retain source-unit uncertainty. TTK/shot counts are provider calculations with unestablished target/armor assumptions. Raw zero TTK with a damage profile remains a source report; empty-profile zero placeholders are omitted. No combined-build predictions or composite game scores are invented.

Initial coverage on 2026-11-01: 19/33 weapons with base stats and 18/33 with damage. The separate [DMZ comparator](https://codmunity.gg/weapon-stats/dmz) supplies 8/33 records, zero damage profiles and an explicit untested warning. Its reports are labelled actual DMZ source data and remain unverified. HTTP 200 alone is not readiness; explicit untested warnings or empty damage keep the status unready. Partial/full status uses the current roster denominator and never certifies in-game testing.

## Updates and monitoring

Run `npm run weapons:manage`, then open [the dashboard](http://127.0.0.1:4176/). Check CODMunity data pulls only the two fixed pages and stages a proposal. Review values, dates, added/removed IDs and coverage changes, tick the checkbox and apply. Rebuild reader pages afterward. Probe DMZ readiness updates status without replacing accepted content or the pending proposal.

The CLI service probes DMZ on startup and every six hours while running. Closing it stops monitoring; no OS/cloud schedule or startup service is installed. Jobs share ownership and last attempt/success/error/readiness remain visible. Accepted numeric updates require review. Availability does not automatically relabel Multiplayer or private observations as verified DMZ data.

CLI checks: `npm run weapons:source-check` and `npm run weapons:source-status`. Use the dashboard for reviewed apply. Reader loads, builds and tests do not fetch providers. Official patch checks retain their existing controls.

## Persistence and failures

`content/codmunity-stats.json` is independent of `weapon-intel.json` and browser profiles. Ignored local files are `.local/codmunity-proposal.json`, `.local/codmunity-monitor.json` and `.local/codmunity-backup.json`. Writer locks are never automatically taken over; inspect abandoned locks only after verifying their process stopped.

Apply binds proposal and accepted-file hashes, validates under ownership, backs up and atomically replaces the document. Identical normalized facts leave accepted bytes unchanged despite HTML/fetch noise. Removals and coverage regressions require review. Failed requests, changed layouts, unsafe syntax or size/deadline errors preserve accepted content and the previous proposal. Older status cannot replace newer attempts/successes.

Only an inert serialized base-data array is parsed; provider scripts are not executed or selected builds imported as base stats. New layouts/metric fields may require maintenance. Existing owner permission covers local collection; no public redistribution license or publication is asserted.

The dashboard review uses coverage tables and expandable weapon rows with current/proposed values. Changed records appear first; unchanged weapons are grouped separately. Source dates, warnings and exact source references remain available in labelled details, without raw JSON blocks.
