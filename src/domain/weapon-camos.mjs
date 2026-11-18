import { assert, boundedWalk, parseBounded } from "../content/limits.mjs";
export const CAMO_MAX_BYTES = 2 * 1024 * 1024;
export const CAMO_HUB = "https://codcentral.net/blog/mw4-dmz-camo-challenges/";
export const camoGroups = Object.freeze({
  military: "Military",
  special: "Special",
  completionist: "Completionist",
  prestige: "Weapon Prestige",
  modeMastery: "Mode mastery · shared reference",
});
const counts = {
  military: 8,
  special: 3,
  completionist: 4,
  prestige: 4,
  modeMastery: 6,
};
const exact = (v, keys) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === keys.split(" ").sort().join(),
    "Unexpected camo fields",
  );
const text = (v, max) =>
  assert(
    typeof v === "string" &&
      v.length > 0 &&
      v.length <= max &&
      !/[\u0000-\u001f\u007f]/.test(v),
    "Invalid camo text",
  );
const slug = (v) => {
  text(v, 100);
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) &&
      !["constructor", "prototype"].includes(v),
    "Invalid camo identity",
  );
};
const date = (v) => {
  assert(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid camo date",
  );
};
export function validateCamoCatalog(value, roster) {
  boundedWalk(value, { depth: 8, nodes: 40000, string: 2000 });
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= CAMO_MAX_BYTES,
    "Camo byte limit",
  );
  exact(value, "version checkedAt provider coverage weapons");
  assert(value.version === 1, "Unsupported camo version");
  date(value.checkedAt);
  exact(value.provider, "url date status");
  assert(
    value.provider.url === CAMO_HUB && value.provider.status === "reported",
    "Invalid camo provider",
  );
  date(value.provider.date);
  text(value.coverage, 1000);
  assert(
    Array.isArray(value.weapons) && value.weapons.length === 35,
    "Camo snapshot roster drift",
  );
  const known = new Map(roster.map((w) => [w.id, w]));
  assert(
    known.size === 35,
    "Review released camo coverage before roster change",
  );
  const seen = new Set();
  let total = 0;
  for (const w of value.weapons) {
    exact(w, "id name category sourceURL rows");
    slug(w.id);
    text(w.name, 100);
    const expected = known.get(w.id);
    assert(
      expected &&
        !seen.has(w.id) &&
        w.name === expected.name &&
        w.category === expected.category,
      "Camo weapon mismatch",
    );
    seen.add(w.id);
    assert(w.sourceURL === CAMO_HUB + w.id + "/", "Invalid camo weapon source");
    assert(
      Array.isArray(w.rows) && w.rows.length === 25,
      "Camo row coverage drift",
    );
    const ids = new Set(),
      groups = {};
    w.rows.forEach((r, i) => {
      exact(r, "id name group order requirement sourceURL image");
      slug(r.id);
      text(r.name, 100);
      text(r.requirement, 1000);
      assert(!ids.has(r.id), "Duplicate camo identity");
      ids.add(r.id);
      assert(
        Object.hasOwn(camoGroups, r.group) && r.order === i + 1,
        "Invalid camo group/order",
      );
      groups[r.group] = (groups[r.group] || 0) + 1;
      assert(
        r.sourceURL === w.sourceURL + "#" + r.id,
        "Invalid camo challenge source",
      );
      exact(r.image, "sourceURL sha256 mime width height");
      assert(
        r.image.sourceURL ===
          `https://codcentral.net/assets/library/mw4/dmz/camos/${w.id}/swatch-${r.id}.webp`,
        "Invalid camo image source",
      );
      assert(
        typeof r.image.sha256 === "string" &&
          /^[a-f0-9]{64}$/.test(r.image.sha256) &&
          r.image.mime === "image/webp" &&
          r.image.width === 128 &&
          r.image.height === 128,
        "Invalid camo image registry",
      );
    });
    assert(
      Object.entries(counts).every(([g, n]) => groups[g] === n),
      "Camo group coverage drift",
    );
    total += w.rows.length;
  }
  assert(total === 875, "Camo snapshot total drift");
  return value;
}
export const parseCamoCatalog = (raw, roster) =>
  validateCamoCatalog(
    parseBounded(raw, CAMO_MAX_BYTES, { depth: 8, nodes: 40000, string: 2000 }),
    roster,
  );
export const camoImagePath = (weapon, camo) =>
  `/local-camo-images/${weapon}/${camo}.webp`;
