# Pointer activation repair

Actual CI on the initial feature implementation failed the detail URL assertion in Chromium and the WebKit engine phase. An explicit exact-URL navigation wait was added without weakening the assertion. Subsequent Chromium runs on Ubuntu and Windows still timed out, proving that synchronization alone did not repair the interaction.

## Cause and bounded fix
The catalog filter ran on both input and change events and unconditionally appended every sorted row back to its container. A dirty search field emits change when a pointer press on a row link blurs it. Reparenting that pressed link before its click activation can cancel native navigation, even when the sort order is unchanged. The URL's filter replacement was observable, but no detail navigation occurred.

The filter now compares row identity/order before touching the DOM and only reparents when the requested sort actually changes the sequence. It retains input/change handlers, exact filtering, native pointer activation, keyboard activation and strict destination assertions. No forced click, direct-goto substitute, blanket timeout increase or removal of a failing case was used.

## Evidence
- New deterministic DOM/event regression against the previous catalog source: FAIL, because an already ordered directory was reparented.
- Same regression against the repair plus navigation, author-target and reader-flow tests: 24 PASS, zero failed/skipped.
- Build: 216 routes PASS in this isolated baseline worktree.
- Browser scenarios now explicitly exercise first pointer activation after dirty search for detail/Edit/Remove, exact owning catalog, Back navigation, sort/search focus retention, and Tab/Enter activation with hidden-row exclusion.
- Actual cross-browser verification of this repair is pending integration CI. Local browser launch remains blocked by the previously recorded environment restriction.
