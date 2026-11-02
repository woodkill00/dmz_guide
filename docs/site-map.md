# Site map and visual review

Open [the interactive site map](http://127.0.0.1:4173/sitemap/), also available under **Manage → Site map** and the footer. This is generated from the current checkout, not a hand-maintained list of planned features.

The complete directory includes the guide workspaces, bundled record details, key and weapon detail pages, contribution instructions and the 404 page. The map, Content Studio and weapon update manager remain separate applications with separate storage. Private saved records, notes, stock quantities and source captures are not scanned.

## Read the mindmap

- The root branches group pages by Map, Prepare, Track, Reference and Manage, plus record pages and authoring guidance. Choose a branch to expand its pages; choose it again to return to all pages.
- Search page names, paths, section headings and control labels, or filter by service/page family. The complete result set is paginated, with up to 40 mounted node buttons.
- Select a page to inspect its incoming and outgoing connections. **Page links**, **Shared menu** and **Directory** are different relationship types. A directory listing does not establish a useful contextual path.
- **Show connections on mindmap** focuses the chosen relationship neighborhood. Solid lines show grouping. Dashed gold lines show connections involving the selected node; the inspector identifies their direction and exact destination.
- Expand **Sections** or **Static menus, tabs and controls** for the page structure. Field names are included; current/default values and select-option payloads are omitted. Spoiler-reveal subtrees are excluded from searchable labels.
- Reset view clears only this display. Nothing is persisted or changed in your inventory, missions, keys or map workspace.
- **Download inventory JSON** exports the public build snapshot. The original readable catalog sitemap and a complete route directory work without JavaScript.

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

Open `.local/site-topology-audit/report.html` for the readable runtime report; `audit.json` includes the source build identity and observations. These are ignored local receipts, not public assets. Dynamic dialogs and data-dependent controls can differ with saved state; reachability is not a claim that every action has been exhaustively tested. External provider links and non-page resources are inventoried but not certified by the route/fragment audit.

Run `npm run test:sitemap` for the three-engine interactive/no-JS/navigation regression, 24 responsive/theme/text cases and 24 axe scans. Functional browser health is checked independently of axe’s SVG measurement helpers, which can themselves trigger CSP diagnostics. WebKit functional/layout/accessibility checks run; screenshots follow the repository’s Chromium/Firefox policy because WebKit screenshots inject a CSP-blocked style. Neither the server policy nor functional health checks are relaxed.

The snapshot is a bounded review tool. Builds refuse oversized graph admission rather than silently omitting pages. Current limits and exact acceptance evidence are in `specs/059-site-topology/`.
