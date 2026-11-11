# Pre-implementation analysis

- Hajin's map renderer uses `official-marker`/`official-pin`: a rotated pin shape with a 20px image inside a 28×34 Leaflet icon. The X01 views currently use circular source icons or letters.
- Current Hajin captures include exact category icons for official `dmz_exfil` and `dmz_ammoCache`, COD Central `safe`, `bounty` and `key`, and MapGenie `mapgenie-28409` (Spawn Point). These are local generation assets referenced by `current-captures.local.json` and should not be copied into Git.
- DMZHub's Key Room is a locked-room location, distinct from a key pickup. Its source icon stays. Weapon Locker, stairs, ascenders, 3D printer and other X01-only types also stay source-specific.
- This change touches icon display only. Both X01 source images and marker coordinate frames remain unchanged.

## Convergence

- The first browser fixture assertion referred to a nonexistent fixture key (`exfil`); the fixture keys are actual Hajin category IDs (`dmz_exfil`). The assertion was corrected to check the real mapped icon path. The production mapping was unchanged.
- Live desktop screenshots of both X01 views show the same Hajin pin shape and symbols for matched categories. Source-only markers and labels remain distinct. The X01 category controls use the same matched icon as their map pins.
- A missing shared Hajin image is tested in the browser: the pin falls back to its X01 source image and the marker count remains intact. A missing current-capture pointer returns no shared icons and retains source symbols.
