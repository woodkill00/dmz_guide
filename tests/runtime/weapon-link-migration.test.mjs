import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalWeaponHref,
  weaponCamoURL,
  weaponURL,
} from "../../src/domain/weapon-routes.mjs";
import { canonicalizeWeaponAnchors } from "../../src/ui/weapon-link-migration.mjs";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import { scanPublicHTML } from "../../src/domain/site-topology.mjs";
import { WORKSPACE_MODULES } from "../../src/domain/workspace-manifest.mjs";
import { renderWeaponManager } from "../../src/ui/weapon-manager-page.mjs";
import { buildUnifiedIndex } from "../../src/content/unified-index.mjs";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import {
  createPageDocument,
  newPageId,
} from "../../src/domain/page-document.mjs";
import { renderPageComposition } from "../../src/ui/page-composition.mjs";
import { SOURCE_ADAPTERS } from "../../scripts/page-adapters.mjs";
const ids = (await readWeaponAcquisition()).weapons.map((w) => w.id);
test("108 R7 legacy routing keeps exact weapon, section, camo and query context", () => {
  for (const [old, target] of [
    ["/weapons/", "/armory/#reference"],
    [
      "/dmz-weapons/?pack=official%3Amw4-dmz-starter",
      "/armory/?pack=official%3Amw4-dmz-starter#acquisition",
    ],
    ["/armory/workbench#backups", "/armory/#backups"],
    ["/armory/workbench/?weapon=m4#builder", "/armory/m4/#builder"],
    [
      "/armory/acquisition/?weapon=cronen-osprey#weapon-cronen-osprey",
      weaponURL("cronen-osprey"),
    ],
    ["/armory/camos/m4/#helio", weaponCamoURL("m4", "helio")],
  ])
    assert.equal(canonicalWeaponHref(old, ids), target);
  for (const input of [
    "/armory/m4/#camos",
    "/items/mw4--m4/",
    "/armory/updates/",
    "/armory/camos/unknown/",
    "/armory/acquisition/?weapon=unknown",
    "//other.example/armory/camos/",
    "/\\other.example/weapons/",
    "/\\weapon.invalid/weapons/",
    "/\t/weapon.invalid/weapons/",
    "/\\user:password@weapon.invalid/weapons/",
    "https://codmunity.gg/weapon-stats/mw4",
    "javascript:alert(1)",
    "/weapons/?q=" + "x".repeat(9000),
  ])
    assert.equal(canonicalWeaponHref(input, ids), input);
});
test("108 R7 published-anchor migration escapes queries and leaves inert text/source content untouched", () => {
  const inert = `<script type="application/json">{"html":"<a href='/weapons/'>sample</a>"}</script><!-- <a href="/weapons/">comment</a> --><textarea><a href="/weapons/">literal</a></textarea>`;
  const input = `<a class="x" href='/armory/workbench/?weapon=m4&amp;pack=x#builder'>Build</a><a href="https://example.com/weapons/">Source</a>${inert}`;
  const output = canonicalizeWeaponAnchors(input, ids);
  assert(output.includes('href="/armory/m4/?pack=x#builder"'));
  assert(output.includes('href="https://example.com/weapons/"'));
  assert(output.endsWith(inert));
  assert.equal(canonicalizeWeaponAnchors(output, ids), output);
  const title = `<a title="sample href='/weapons/'" href="/items/">Item</a>`;
  assert.equal(canonicalizeWeaponAnchors(title, ids), title);
  assert.equal(
    canonicalizeWeaponAnchors(
      `<a data-example="href='/weapons/'" href=/weapons/ title='unchanged'>Weapons</a>`,
      ids,
    ),
    `<a data-example="href='/weapons/'" href="/armory/#reference" title='unchanged'>Weapons</a>`,
  );
});
test("108 R7 backup and companion tool destinations bypass old landing pages", () => {
  assert.equal(WORKSPACE_MODULES.armory.restore, weaponURL("", "backups"));
  const html = renderWeaponManager();
  assert(!html.includes("/armory/workbench/"));
  assert(
    [...html.matchAll(/href="([^"]+)"/g)].some(
      (match) =>
        new URL(match[1], "https://site.invalid").searchParams.get(
          "destination",
        ) === "/armory/#builder",
    ),
  );
});
test("108 R7 reference editors return to their owning tab and composed anchors remain distinct", () => {
  for (const [adapter, section] of [
    ["weapon-intel", "reference"],
    ["weapon-acquisition", "acquisition"],
    ["weapon-camos", "camos"],
  ])
    assert.equal(
      SOURCE_ADAPTERS[adapter].route("m4"),
      weaponURL("m4", section),
    );
  const document = createPageDocument(
    {
      adapter: "weapon-camos",
      scope: { game: "mw4", mode: "dmz", catalogId: "weapon-camos" },
      recordId: "m4",
    },
    "0".repeat(64),
  );
  document.deletedAnchors.push(newPageId("s"));
  const before = structuredClone(document);
  const html = ["weapon-acquisition-", "weapon-camos-"]
    .map((anchorPrefix) =>
      renderPageComposition(document, {
        projections: { details: "<p>Reported context</p>" },
        anchorPrefix,
      }),
    )
    .join("");
  const anchors = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(anchors.length, 4);
  assert.equal(new Set(anchors).size, 4);
  assert.deepEqual(document, before);
  assert.throws(
    () =>
      renderPageComposition(document, { anchorPrefix: '" onmouseover="bad' }),
    /anchor prefix/,
  );
});
test("108 R7 search attachments open an explicitly compatible weapon and exact reference row", async () => {
  const index = await buildUnifiedIndex([]),
    db = await readWeaponIntel();
  const entries = index.entries;
  for (const attachment of db.attachments) {
    const row = entries.find((r) => r.id === "attachment:" + attachment.id);
    assert(row);
    const target = new URL(row.url, "https://site.invalid");
    const weapon = target.pathname.split("/")[2];
    assert(attachment.weapons.includes(weapon));
    assert.equal(target.hash, "#attachment-" + attachment.id);
  }
});
test("108 R7 every emitted HTML anchor bypasses redundant weapon pages; legacy files are aliases", async () => {
  const identity = JSON.parse(
    await readFile("dist/assets/build-identity.json", "utf8"),
  );
  const files = Object.keys(identity.outputFiles).filter((file) =>
    file.endsWith(".html"),
  );
  const stale = [];
  const legacyPath =
    /^\/(?:weapons|dmz-weapons|armory\/(?:workbench|acquisition|camos)(?:\/[^/]*)?)\/?$/;
  for (const file of files) {
    const html = await readFile("dist/" + file, "utf8");
    const scan = scanPublicHTML(html);
    for (const { href } of scan.auditLinks) {
      if (href.startsWith("#")) continue; // Local accessibility/section anchors are valid on a redirect page.
      const target = new URL(href, "https://guide.invalid/" + file);
      if (
        target.origin === "https://guide.invalid" &&
        legacyPath.test(target.pathname)
      )
        stale.push({ file, href });
    }
  }
  assert.deepEqual(stale, []);
  for (const path of [
    "weapons",
    "dmz-weapons",
    "armory/workbench",
    "armory/acquisition",
    "armory/camos",
    ...ids.map((id) => "armory/camos/" + id),
  ]) {
    const html = await readFile(`dist/${path}/index.html`, "utf8");
    assert(html.includes('id="weapon-alias"'), path);
    assert(!html.includes('id="armory-public-data"'), path);
    assert(!html.includes('id="camo-tracker"'), path);
    assert(
      !html.includes("data-compose-source="),
      path + " must not host source editors",
    );
  }
  const weapon = await readFile("dist/armory/m4/index.html", "utf8");
  assert(weapon.includes('data-compose-source="weapon-acquisition"'));
  assert(weapon.includes('data-compose-source="weapon-camos"'));
});
