# Integrated CI findings, 2026-10-29

These records preserve failed runs; later passing runs do not erase them.

- `bf494817`, quality run `40948873912`: Chromium and WebKit stopped on the new directory's immediate post-click pathname assertion (actual `/items/`, expected exact item detail). Firefox completed navigation and source catalog journeys. Windows runtime stopped in the existing delayed-bootstrap occupied-port fixture at its unchanged 700 ms adversarial deadline; owned-child cleanup succeeded. Map run `40948873905` passed all three jobs.
- `7e720497`, quality run `40950148013`: retaining the strict pathname assertion and waiting for the exact detail URL exposed a real interaction failure on Ubuntu and Windows Chromium: no detail navigation occurred before 30 seconds. The wait was diagnostic, not accepted as a fix. Windows runtime passed with unchanged deadlines. Map run `40950148068` passed all three jobs.
- Source investigation identified that every filter/change unconditionally re-appended directory rows. A search input's blur/change between pointer down and activation could detach the clicked link even when sort order was unchanged. The repair must preserve already ordered nodes and exercise real first-click detail/edit/remove after dirty search, without synthetic force clicks or direct navigation substituting for the link.

Actual final browser/visual acceptance remains pending until a repaired exact head passes.
