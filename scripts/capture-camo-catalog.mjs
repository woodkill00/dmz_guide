// Parse a deliberately saved inert source capture; no network or provider code.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CAMO_HUB } from "../src/domain/weapon-camos.mjs";
import { readWeaponAcquisition } from "../src/content/weapon-acquisition.mjs";
import { readWeaponCamos } from "../src/content/weapon-camos.mjs";
import { readCatalogFile, assertSafePath } from "./catalog.mjs";
const attribute = (s, n) => new RegExp(" " + n + '="([^"]*)"').exec(s)?.[1];
const plain = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) =>
      String.fromCodePoint(
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n),
      ),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ")
    .trim()
    .replace(/\s+/g, " ");
export function captureCamoRows(html, roster, previous) {
  if (typeof html !== "string" || Buffer.byteLength(html) > 5 * 1024 * 1024)
    throw Error("Camo HTML byte limit");
  const sections = [
    ...html.matchAll(
      /<section class="dcm-weapon"([\s\S]*?)(?=<section class="dcm-weapon"|$)/g,
    ),
  ];
  if (sections.length !== 35) throw Error("Review camo source roster drift");
  const seen = new Set();
  return sections.map((section) => {
    const s = section[0],
      id = attribute(s, "data-weapon"),
      weapon = roster.find((w) => w.id === id);
    if (!weapon || seen.has(id))
      throw Error("Unknown or duplicate camo source weapon");
    seen.add(id);
    const rows = [...s.matchAll(/<li class="dcl-row"([\s\S]*?)<\/li>/g)].map(
      (m, i) => {
        const raw = m[0],
          sourceURL = new URL(attribute(raw, "href"), CAMO_HUB).href,
          camo = sourceURL.split("#")[1];
        const name = plain(
          /class="dcl-name"[^>]*>([\s\S]*?)<\/span>/.exec(raw)?.[1] || "",
        );
        const requirement = plain(
          /class="dcl-line[^>]*>([\s\S]*?)<\/span>/.exec(raw)?.[1] || "",
        );
        const img = raw.slice(raw.indexOf("<img ")),
          imageURL = new URL(attribute(img, "src"), CAMO_HUB).href;
        if (
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(camo) ||
          sourceURL !== `${CAMO_HUB}${id}/#${camo}` ||
          imageURL !==
            `https://codcentral.net/assets/library/mw4/dmz/camos/${id}/swatch-${camo}.webp` ||
          !name ||
          !requirement ||
          name.length > 100 ||
          requirement.length > 1000
        )
          throw Error("Unexpected camo source row");
        const old = previous?.weapons
          .find((w) => w.id === id)
          ?.rows.find((r) => r.id === camo)?.image;
        return {
          id: camo,
          name,
          group: attribute(raw, "data-group"),
          order: i + 1,
          requirement,
          sourceURL,
          image:
            old?.sourceURL === imageURL
              ? old
              : { sourceURL: imageURL, reviewRequired: true },
        };
      },
    );
    if (rows.length !== 25 || new Set(rows.map((r) => r.id)).size !== 25)
      throw Error("Review camo row coverage drift");
    return {
      id,
      name: weapon.name,
      category: weapon.category,
      sourceURL: CAMO_HUB + id + "/",
      rows,
    };
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const bytes = await readCatalogFile(
    root,
    ".local/camo-source.html",
    5 * 1024 * 1024,
  );
  const previous = await readWeaponCamos(),
    weapons = captureCamoRows(
      new TextDecoder().decode(bytes),
      (await readWeaponAcquisition()).weapons,
      previous,
    );
  const target = await assertSafePath(root, ".local/camo-proposal.json", {
    optional: true,
  });
  await writeFile(
    target,
    JSON.stringify(
      { reviewRequired: true, previousCheckedAt: previous.checkedAt, weapons },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    "Staged .local/camo-proposal.json; source facts/artwork require review before publication.",
  );
}
