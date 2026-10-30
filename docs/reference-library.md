# Reference library

The [Boss checklist](boss-checklist.md) adds a specialized DMZTracker boss-roster endpoint to the original source registry. Its explicit name/type adapter and private kill progress are separate from generic reference completion.

Open **Planner section → Reference library** in the local map. The [research assessment](../specs/036-field-command/research.md) covers 27 endpoints across 18 domains, including official Call of Duty guides, Activision Support, PlayStation Blog, CODMunity, WZStats, DMZHub, DMZTracker, DMZ Codex, DMZMap, OGHub, AzerPug, NOMADS, Gamers Heroes, DETONATED, All Things How, DMZ Wiki, Windows Central and PC Gamer. Each registry entry records coverage, limitations and review date. Owner permission covers local collection; public redistribution is not authorized.

From the repository root, run the displayed source command, for example:

```powershell
py -3 scripts/collect-references.py --sources codmunity codmunity-missions dmzcodex dmzcodex-parts
```

Choose up to 12 registry IDs per run. The collector fetches exact registered public pages, waits at least one second between requests, and imposes a total 15-second deadline per isolated request. It accepts at most 2MiB of HTML, never follows redirects, crawls links, signs in, executes scripts or downloads images. Failed retrieval preserves previous captures. Restricted providers remain reference links; no challenge or paywall bypass is attempted.

Captures and dated receipts stay in ignored `.local/reference-captures/`. In the library expand **researched sources**, then choose **Preview latest local capture**, or import its JSON file. Inspect added, changed, missing and unchanged counts before **Apply reference update**. Cancel saves nothing. Identical repeat imports are no-ops.

These are unverified discovery candidates, not a complete game catalog. The generic parser collects short headings, links and table facts, rather than full narrative articles or assets. It can include section headings or miss dynamic and unlinked records. Detailed recipes and mission steps may need specialized adapters and gameplay verification. Unknown costs, unlocks and builds remain unknown.

Filter by kind, source and text. Story/mission spoilers are hidden by default. Track references, mark completion manually and add private notes. Raw-page digests identify captures; individual candidate digests bind progress to content. A changed page preserves completion for unchanged records. Changed records display **completion needs review**; refresh does not automatically transfer status. Missing records remain accessible through retained history. Matching labels across providers are comparison groups only: kind, build and every source provenance remain distinct. MWII/Al Mazrah data is not MW4 data.

Private backups include references, previous captures and progress; public view links and selection packs omit them. The native published guide still uses its separate reviewed content workflow. Limits: 2MiB/2,000 candidates per capture, 80 captures, 20 per provider, 10,000 total candidate occurrences including history, plus existing 20MiB workspace/structural limits. Nothing is silently trimmed. Export a private backup before explicitly deleting old captures. Remove dependent progress first if it would lose its only provenance.

The read-only local bridge scans at most 64 folder entries and 8MiB within its work budget. Archive older local files manually if necessary; that is separate from browser history. Collection is an explicit CLI action, not a background service or arbitrary URL proxy. Feature acceptance records actual retrieval failures separately from web-index visibility.
