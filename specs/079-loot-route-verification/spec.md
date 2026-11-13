# 079 · Loot route controls and gameplay verification

## Requirements

- LV-01: Loot Run can exclude source-reported restricted safes without deleting them from the candidate list; unknown-access safes remain explicitly unknown.
- LV-02: Loot Run can prioritize clinics and plan a bounded shorter run from its selected candidates. The effective route and omitted stops are clear, and the original selection remains intact.
- LV-03: Players can record an observed result for a safe or clinic with bounded notes and a date, inspect it on that stop, clear it, and export their observations. Source claims never become verified automatically.
- LV-04: Road-mode gaps and access uncertainty stay disclosed. The existing editor can export an owned road graph and Loot Run can validate/import it as an optional local network. The interface links to the editor and gameplay worksheet; it does not fabricate road coverage, loot availability, or match verification.
- LV-05: Changes are isolated from Safe Run. Local state is validated, survives reload, and corrupt data fails without changing the existing saved plan.

## Acceptance

Synthetic tests cover restricted-safe filtering, clinic priority, a shorter route, persistence and Safe Run isolation. A browser journey checks the controls and observation display. A real-game verification pass remains dependent on player observations and is not counted as completed by synthetic tests.
