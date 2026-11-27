# Agent helper CLI contract

- npm run skills:check: offline read-only checks rooted at this repository; exit 0 only if every check passes, else 1 with actionable sorted diagnostics. No network/downloads/process launches/mutation.
- npm run skills:list: validated twelve-helper inventory, names and paths; malformed installation fails.
- npm run test:skills: meaningful runtime negative tests on disposable checkouts.
- npm run skills:pilots: create a fresh OS-temp fictional bundle and print its path. No production files/profiles read or modified. Repeated runs use distinct directories. Setup alone never claims agent acceptance.

Actual helpers are agent instructions such as $dmz-diagnose, not shell commands. A fresh session may be needed for discovery; direct-path execution must be labeled. These CLIs do not commit, merge, publish issues or link accounts.
