# Feature021 implementation review and repairs

2026-10-28. All six flows implemented; exact final commands/results are recorded in verification.md after execution.

Independent definition review resolved DEF021-01..03 before implementation: exact reminder mutation/clock semantics, source+snapshot+digest+record capture identity,250,000-work completeness cap with explicit incomplete classification. Reviewer-owned checklist approved independently, unchanged by implementer.

| Finding | Repair and regression |
|---|---|
| USAB-R1 unsaved discrepancy text discarded by status/delete | Guard both actions while detail draft is dirty; browser edits existing text then attempts both actions, proving DB/draft unchanged before explicit save |
| USAB-R2/U021-02 per-source Show visibility counted as edit | Exclude actual emitted All source categories shown label; unit and browser action prove edit count unchanged |
| USAB-R3 stale jump highlight after edit/replacement | Track record key/identity/content signature, revalidate on refresh, clear on undo/replace/new, re-resolve jumps against current records; browser jump→edit/move clears highlight and restore clears it |
| USAB-R4/U021-01 unknown floor/build called matched | Require fully known compatible applicability for matched; otherwise uncertain with source candidates; units cover unknown floor/build, fully known match and known conflicts |
| U021-03 impossible UTC date accepted | Strict calendar/ISO round trip; reject February30 in receipt and portable decisions |
| Main legacy status overwrote workspace totals | After hydration, workspace owns aggregate summaries; browser verifies retained/promoted source totals after reload |
| Presets treated empty categories as missing | Compare declared category lists rather than record-only index; browser preset includes zero-record category and applies without false missing notice |
| External capture metadata lacked explicit backup dependencies | Export source/digest manifests for flag/exception references not present in export, without copying restricted content; unit preserves metadata and asserts omitted dependencies |

Independent focused domain/UI re-reviews reported no remaining findings after their repairs. New offline browser flows cover hidden-result jumps/masks, custom Edit, copy fallback, matching details and persistent exceptions, presets, authored discrepancy CRUD/dirty guards, completeness uncertainty, reminder snooze/receipt/storage failure, old/new backups and inactive omitted references, plus360px keyboard/visual evidence. Source assets and original screenshots remain ignored.

Final U021-04: omitted-dependency deduplication by kind/ID alone could replace digestA with digestB for the same snapshot ID while retaining flagA. Include digest in dependency identity; the regression retains both exact capture manifests and original flag after round trip. Independent re-review clean (8 focused tests independently passed). Receipt validation also bounds snooze to24h and rejects future initiation claims; unit boundary coverage added. Source-load search results refresh without replacing the focused search input. Final local unit count56; full browser40 groups plus post-delta seven-flow rerun passed.
