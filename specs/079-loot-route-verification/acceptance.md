# Acceptance evidence

LV-01–LV-05 are implemented and verified with synthetic fixtures and the current local Hajin capture. The full selected set remains saved when a shorter or clinic-priority route is calculated. Source-reported access restrictions can be filtered; unknown access is still described as unknown. Gameplay checks are explicitly player-entered and locally exportable. An imported road network must pass the Hajin graph validator; malformed input retains the prior network.

Executed checks: map unit suite 243/243; guide runtime suite 995/995; Safe Run browser suite passed Chromium, Firefox and WebKit; Loot Run browser suite passed Chromium with accessibility scan; map and guide production builds passed. See `analysis.md` for route counts and the exact evidence boundary.

Live-match verification is pending actual gameplay. No safe, clinic, access requirement, or road segment was marked verified by these automated checks.
