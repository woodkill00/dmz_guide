# Plan

Reuse the Safe Run solver, capture loader, map view, and responsive layout. Add an opt-in clinic extraction path and a second HTML entry that configures the shared app for Loot Run. Keep the same 64-stop bound and nearest-neighbor route disclosure. Use a distinct local-storage key, add clinic marker styling and category filters, then register the page in the map build and shared navigation. Verify extraction, planner isolation, and the browser journey with synthetic captures.

Data contract: a clinic is a positioned record whose category maps to the existing `clinic` group. Exact duplicate checks remain within each stop type, so a safe and clinic at the same position are both retained. Capture failures preserve the last valid displayed run. No remote collection is added.
