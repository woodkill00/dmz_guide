# Local Workspace Contract

- Root commands delegate installation, development, build and tests to `tools/hajin-map`; native commands retain their existing behavior.
- Development server binds loopback 5175 with strict port checking; it never stops an unrelated process to claim the port.
- `public/maps/hajin/v1/background.webp` and `public/maps/hajin/official/` are ignored owner-local inputs. They are absent from the normal public guide build/ZIP.
- Map key always opens directly and repeated opener clicks never hide it. × or Escape within the key closes it with focus return. Desktop initially shows the key; mobile initially hides it.
- Key individual/global selectors and source/category controls share state. Source visibility preserves its mix; selecting one key category from a hidden source reveals that category alone.
- Missing/invalid/timed-out input yields a visible retry path without inventing map pixels or points. Source failure does not prevent a valid background from rendering.
- Browser verification starts and cleans up its own server and uses synthetic requests, not remote game resources.
