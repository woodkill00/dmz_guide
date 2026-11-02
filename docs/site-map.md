# Site map and visual review

Open [the interactive site map](http://127.0.0.1:4173/sitemap/), also available under **Manage → Site map** and the footer. This is generated from the current checkout, not a hand-maintained list of planned features.

The complete directory includes the guide workspaces, bundled record details, key and weapon detail pages, contribution instructions and the 404 page. The map, Content Studio and weapon update manager remain separate applications with separate storage. Private saved records, notes, stock quantities and source captures are not scanned.

## Read the Home hierarchy

The primary view is now a connected note canvas rooted at **Home**. Follow Map, Prepare, Track, Reference and Manage to their workspaces, then expand record pages and related edit instructions. Upgrade records nest under Upgrades; DMZ Orders/story records under Missions; other progression stays under Progress. Companion tools nest under the separate interactive map. Source websites have a separate reference branch. Fictional records are explicitly labeled.

- Click a note’s **title** to open its exact page immediately. Companion/source links show ↗ and open a new tab. Standard keyboard, Ctrl/Command-click and context-menu link behavior are retained.
- Click the separate **+/− child control** to expand/collapse; it does not navigate. Large branches show25children at a time with an explicit More note. Every page remains in the full hierarchy; expansion is limited to250mounted notes and refuses excess visibly instead of dropping data.
- Drag empty canvas to pan, or use normal scrolling. Zoom, Fit view and Home view adjust display only; no private records or preferences are saved.
- Search page titles/URLs and source domains. Results include their ancestor path from Home, with40matches per page. Clear search to expand branches normally.
- **Outline view** provides the same visible hierarchy as native linked lists, including keyboard expansion and full enlarged text. Only the active representation mounts notes; logical focus survives expansion and resize.
- **Detailed connection audit** below the canvas retains the original searchable graph inspector, incoming/outgoing page links, shared menus, directory membership, static sections/controls, JSON download and runtime report. Its connections are distinct from the primary browsing hierarchy: one structural parent does not mean it is the page’s only incoming link or that separate services synchronize data.
- The original readable catalog sitemap and complete generated route directory remain below and work without JavaScript. Runtime report delivery is HTTP through the local guide, not a source-file viewer.

## What connects to what

| Area | Main connected workspaces |
|---|---|
| Home | Search, pinned/recent workspaces, grouped tools and read-only progress summaries |
| Prepare | Planner, inventory, collection needs, upgrades, recipes, keys and armory workbench |
| Track | Missions, progression and companion mission/boss/session trackers |
| Reference | Catalog, items, weapons, attachments, guides and private reader entry |
| Map | Native location list and the separate Hajin map’s sources, layers, points, icons, routes and field tools |
| Manage | Settings/backups, private editor, repository Studio, source review, weapon update tools and site map |

These are navigation/workflow connections. They do not imply automatic private-data synchronization across services. The actual page-by-page connections are generated from rendered links and can be inspected in the mindmap.

## Run the audit

Run `npm run build` to refresh the snapshot. Its static page/fragment audit findings appear in the site map; missing targets do not hide the rest of the inventory.

With the four local applications running, run:

```powershell
npm run sitemap:audit
```

This checks the generated static link findings and opens each registered companion target in fresh isolated Chromium contexts. It records visible tab/menu/control labels and headings. It does not click mutation actions, log in, read field values, import data or contact remote providers. Registered loopback targets only; remote browser resources are blocked. Navigation/inspection has an absolute 10-second target budget capped by a 12-minute aggregate budget, with bounded two-second cleanup. Every planned target gets an explicit status. Any static defect or failed/unavailable target produces a nonzero exit status.

Open [the runtime report](http://127.0.0.1:4173/local-site-audit/) in your browser (also linked from the sitemap). The saved `.local/site-topology-audit/report.html` is a file artifact; an editor/file viewer can show its source instead. `audit.json` includes the source build identity and observations. These are ignored local receipts, not public assets. Dynamic dialogs and data-dependent controls can differ with saved state; reachability is not a claim that every action has been exhaustively tested. External provider links and non-page resources are inventoried but not certified by the route/fragment audit.

Run `npm run test:sitemap` for the three-engine interactive/no-JS/navigation regression, 24 responsive/theme/text cases and 24 axe scans. Functional browser health is checked independently of axe’s SVG measurement helpers, which can themselves trigger CSP diagnostics. WebKit functional/layout/accessibility checks run; screenshots follow the repository’s Chromium/Firefox policy because WebKit screenshots inject a CSP-blocked style. Neither the server policy nor functional health checks are relaxed.

The snapshot is a bounded review tool. Builds refuse oversized graph admission rather than silently omitting pages. Current limits and exact acceptance evidence are in `specs/059-site-topology/`.

The primary Home hierarchy tests run with `node tests/browser/home-mindmap.mjs` (three engines, native link navigation, keyboard/resize focus, paging/search, pan/zoom,24layouts and27axe scans including outline). `npm run test:sitemap` retains the prior detailed-audit/navigation regression; it opens the audit disclosure before inspecting those controls.
