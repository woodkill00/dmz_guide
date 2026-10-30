# Field command tools

Open `http://127.0.0.1:5175/`, choose **My workspace → Planner**, and use the **Planner section** selector. Download a private backup before substantial edits.

**Match mode** adds active journal objectives to the existing collapsible, movable waypoint tracker. Show or reach the next stop manually and open the journal for observations. No live position is recorded. Disable compact mode for the full waypoint list.

**Map presets** save layer masks, search, gameplay settings, viewport and menu positions. Applying commits workspace settings first, then moves the display. A failed save leaves the display unchanged. Unavailable layers are skipped with a notice; centers outside the image are clamped to its boundary.

**Accuracy dashboard** lists stale/missing references, missing coordinates and unreviewed duplicate candidates. Scanning is read-only. The issue count is not a measure of map completeness.

**Route suggestions** previews nearest-neighbor order anchored at the first stop. Apply explicitly or cancel. Scores use straight-line image pixels, not road distance, ETA or a guaranteed optimum. Reached state remains tied to stop identity. Road-mode avoid rectangles reject crossing edges and connectors; network changes require an explicit reset. Existing edge exclusions compose with them. Inspect gaps and direct lines; no route safety claim is made.

**Relationships** connects exact locations with your own entrance, exit, floor, key or objective label. Source changes leave stale links visible rather than silently moving them. Delete explicitly.

**Session playback** steps through captured routes, entries, objectives and marks. It reviews recorded events, not a movement trail. Promote manual marks once, including protection for marks promoted when ending a session. Export promotion receipts or remove one with an explicit warning that repeat promotion can create a duplicate.

**Reference library** provides researched sources, local collection, refresh previews and independent task progress. See the [reference guide](reference-library.md). Use the [gameplay worksheet](gameplay-verification.md) during actual play; automated checks do not certify real gameplay, physical devices or screen reader usability.
