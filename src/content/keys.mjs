import data from "../ui/keys.json" with { type: "json" };
import images from "../ui/key-images.json" with { type: "json" };
export const KEY_SOURCE =
  "https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/634455";
export const KEY_TYPES = {
  story: "Story mission",
  level: "Level reward",
  local: "Specific location",
  loot: "Random loot",
};
const requireValue = (ok) => {
  if (!ok) throw new Error("Invalid key guide or image register");
};
const exact = (v, fields) =>
  requireValue(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === fields.split(" ").sort().join(),
  );
const text = (v, max) =>
  typeof v === "string" && v.length > 0 && v.length <= max && v.trim() === v;
const date = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
export function validateKeyGuide(value, registry) {
  requireValue(Buffer.byteLength(JSON.stringify(value)) <= 128 * 1024);
  exact(value, "version sourceURL sourceName sourceDate checkedAt status keys");
  requireValue(
    value.version === 1 &&
      value.sourceURL === KEY_SOURCE &&
      text(value.sourceName, 160) &&
      date(value.sourceDate) &&
      date(value.checkedAt) &&
      value.status === "source-reported-unverified" &&
      Array.isArray(value.keys) &&
      value.keys.length > 0 &&
      value.keys.length <= 128,
  );
  const ids = new Set(),
    names = new Set(),
    anchors = new Set();
  for (const k of value.keys) {
    exact(
      k,
      "id name aliases category acquisition locations steps requirements sourceAnchor",
    );
    requireValue(
      text(k.id, 100) &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k.id) &&
        !ids.has(k.id) &&
        text(k.name, 120) &&
        !names.has(k.name.toLowerCase()) &&
        Object.hasOwn(KEY_TYPES, k.category) &&
        text(k.acquisition, 400) &&
        /^hm_[1-9]\d{0,2}$/.test(k.sourceAnchor) &&
        !anchors.has(k.sourceAnchor),
    );
    ids.add(k.id);
    names.add(k.name.toLowerCase());
    anchors.add(k.sourceAnchor);
    for (const [field, max, min, len] of [
      ["aliases", 4, 0, 120],
      ["steps", 12, 1, 400],
      ["requirements", 8, 0, 400],
    ])
      requireValue(
        Array.isArray(k[field]) &&
          k[field].length >= min &&
          k[field].length <= max &&
          k[field].every((s) => text(s, len)),
      );
    requireValue(
      Array.isArray(k.locations) &&
        k.locations.length > 0 &&
        k.locations.length <= 8,
    );
    for (const l of k.locations) {
      exact(l, "name grid");
      requireValue(text(l.name, 160) && text(l.grid, 16));
    }
  }
  requireValue(
    registry &&
      typeof registry === "object" &&
      !Array.isArray(registry) &&
      Object.keys(registry).length === ids.size,
  );
  for (const [id, image] of Object.entries(registry)) {
    requireValue(ids.has(id));
    exact(image, "url alt mime width height sha256");
    requireValue(
      /^https:\/\/img\.game8\.co\/[a-z0-9]+$/.test(image.url) &&
        text(image.alt, 200) &&
        image.mime === "image/webp" &&
        [image.width, image.height].every(
          (n) => Number.isInteger(n) && n > 0 && n <= 2048,
        ) &&
        /^[a-f0-9]{64}$/.test(image.sha256),
    );
  }
  return value;
}
export const keyGuide = validateKeyGuide(data, images);
export const keyImages = images;
export { keyMatches } from "../domain/key-search.mjs";
