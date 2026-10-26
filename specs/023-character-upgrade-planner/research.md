# Research and design decisions

Baseline inspection: current main `407fa56afa43104c3342f4ed73b800f292bacf33`, 2026-10-26. Evidence is actual repository contracts and independent inspection of eight supplied images. No external game-mechanics claim or prior test result is substituted for this review.

| Decision | Rationale | Alternative rejected |
|---|---|---|
| Existing `dmz-upgrade` one-time objectives | Already represents requirements, effects and progress without fabricated output items | New character database or crafting-product upgrades |
| Separate observed pack with unknown build | Official starter is prelaunch/source-backed and contains no photographed upgrade catalog | Silent merge into official starter or assume latest build |
| Typed private observation with nullable URL | Current source URL is mandatory HTTP(S); originals must stay private | Fake URL, screenshot upload, or confusing public transcription with primary evidence |
| V2 adapters at content/profile boundaries | Current schemas reject extra fields; unknown row quantity/consumption and separate progress need truthful representation | Silent optional fields under an unchanged strict contract |
| Explicit completion vs availability | `planShared` currently treats unlocked as done; `planSingle` only suppresses own costs when completed | Overload existing unlocked as newly available/unpurchased |
| Completion metadata only | Existing progression tests require inventory/reserves/goals unchanged | Implicit stock consumption or refunds |
| All-known advice separately from persistent focus | Existing active goals cap is 100; user's wish includes currently unfocused upgrades | Insert every upgrade into goals or sum independently calculated deficits |
| Common direct stock-allocation kernel | Existing planner already deduplicates shared prerequisites and separates retained floors; new advice uses direct requirements only | New arithmetic copy, optimizer, or charging crafted output plus leaf inputs together |
| Unknown is visible and scoped | Unknown amount/consumption/stock blocks affected numbers; missing prerequisite/build proof limits readiness/completeness, not valid known direct-cost arithmetic | Infer mechanics or suppress all useful arithmetic until a full game tree exists |
| Watch pins distinct from reserves | A qualitative reminder is not a quantity and neither is a game fact | Unbounded “always keep” category based on guessed rarity |

## Verified integration findings

- Native app is runnable JavaScript ESM/static HTML with Node22/24 and IndexedDB CAS/prior-snapshot recovery. The separate Hajin workspace is unrelated.
- Profile v1 has strict inventory, reserves, goals, completion, routes and spoiler fields, one profile per pack. `setCompletion` and reset only alter progress; neither buys anything.
- Pack v1 objective requirements require positive quantity and Boolean `consumed`; unknown cannot be safely squeezed into 0/false. Sources currently require an HTTP(S) URL. Scope joins enforce matching game/mode/build. Content records are canonical per-entity JSON with explicit order manifests.
- Official starter has 19 item/weapon identities, six recipes and one disputed printer-access objective, not the historical photographed seven upgrades. Earlier sanitized research is evidence history, not shipped content.
- Existing limits are 100 goals, 20,000 total records, 500,000 planner work steps, quantity <=1,000,000 and aggregate <=10^12. Reuse those bounds, do not silently expand them.

## Unknown game facts retained

Source game/build and capture dates; consumption/retained semantics; prerequisite completeness; missing tiers; vendor purchase options; additive/cumulative discount rules; player state; exact locations and full catalog denominator. “Reviewed 2026-10-26” dates transcription, not gameplay capture. No cumulative benefit arithmetic is performed.

See [source inventory](source-inventory.md) for overlap reconciliation, [clarifications](clarifications.md) for release evidence gates and [data model](data-model.md) for the selected contract. Technical architecture choices are resolved; factual unknowns have explicit blocked behavior.
