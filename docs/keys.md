# Hajin keys

Open [Keys](http://127.0.0.1:4173/keys/) or choose **More → Keys** in the shared navigation. The directory lists all 18 keys reported in [Game8 article 634455](https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/634455), updated 2026-10-28 and checked 2026-11-02. This is source coverage, not a verified complete in-game catalog.

Search names, aliases, places, grid labels, acquisition details and access requirements. Multiple words narrow results together. Filter story rewards, level rewards, location-specific drops or random loot, and use Clear filters to reset. The Citadel’s grid accepts either B-C3 or B–C3. Without JavaScript, all 18 native detail links remain usable.

Individual pages show acquisition, all reported use locations/grids, concise original access directions, requirements/hazards and exact Game8 section links. Optional mission spawn suggestions are labelled optional. Random spawns remain random; costs, durability and loot rewards not established by the article stay unknown. Multiple use locations are preserved. No pixel coordinates, map pins, route waypoints, inventory or mission completion are inferred or written.

Each key has Game8’s original location/access collage, with meaningful alt text and a full-size native image link. Images are local-only, credited to Game8 with underlying Activision game art; external source-image links are available if local bytes are missing. Original screenshots are not copied to dist or Git.

## Local images and updates

The user’s existing additional-provider collection permission and explicit request cover this local import. Public redistribution is not authorized. The image register is `src/ui/key-images.json`; factual key reports are `src/ui/keys.json`. Ignored files live under `.local/key-images/`. Source URLs, SHA256, decoded dimensions and format bind each reviewed image. The two user URLs are one article, so they create no duplicate source or key records. Actual heading anchors are used because the article overview links are offset.

To restore registered images, explicitly run `npm run keys:images`. It fetches only those fixed Game8 image URLs, serially, without redirects, under size/deadline limits. Changed bytes fail rather than silently replacing reviewed images. Normal reader/build/test operations never fetch providers. A newer article needs a separate factual/image review; this feature does not add automatic Game8 scraping or a new update button.

The local reader serves only exact registered image paths, checks bytes/hash/dimensions, refuses traversal/query/unregistered requests and gives a safe placeholder for missing or corrupt local images. Static release archives intentionally lack the private image bridge and image bytes; their visible source link still works. This guide is separate from the map’s layer visibility key.
