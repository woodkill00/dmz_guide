import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

export const SOURCE = "https://codcentral.net/blog/mw4-dmz-map/";
export const FLOORS = [
  { id: 1, name: "Data Center floor", url: "https://codcentral.net/assets/library/mw4/dmz/map/x01-floor-1-v4.webp", sha256: "7c928152f8552195b75ba6a0fbb0518bbf8f696b505ad882e194e4964ef7b2d4" },
  { id: 2, name: "Main Warehouse floor", url: "https://codcentral.net/assets/library/mw4/dmz/map/x01-floor-2-v4.webp", sha256: "01074c7bbc2bec9e7438d073bd9efbef8580a03460a57b1f8f5b8cc7a47679b0" },
];
const layers = new Set(["poi", "spawn", "exfil", "key", "stash", "printer", "encoder", "ammo", "conn", "bounty"]);
const root = fileURLToPath(new URL("../", import.meta.url));
const snapshotPath = fileURLToPath(new URL("../src/x01/codcentral-snapshot.json", import.meta.url));
const assetDirectory = fileURLToPath(new URL("../public/maps/x01/codcentral/", import.meta.url));
const decode = (value) => value.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, (match) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'" })[match]);
const attr = (tag, key) => { const match = tag.match(new RegExp(`(?:^|\\s)${key}="([^"]*)"`)); return match ? decode(match[1]) : null; };
const text = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max && !/[<>\u0000-\u001f]/.test(value);

export function parseX01(html, capturedAt = new Date().toISOString()) {
  if (typeof html !== "string" || Buffer.byteLength(html) > 2_000_000) throw Error("X01 source HTML size invalid");
  const tags = [...html.matchAll(/<button\b[^>]*class="dmzm-pin[^>]*>/g)].map((match) => match[0]);
  const markers = [], seen = new Set();
  for (const tag of tags) {
    const floor = Number(attr(tag, "data-floor"));
    if (floor !== 1 && floor !== 2) continue;
    const id = attr(tag, "data-slug"), name = attr(tag, "data-name"), layer = attr(tag, "data-layer");
    const grid = attr(tag, "data-grid") || "", description = attr(tag, "data-text") || "";
    const style = attr(tag, "style") || "";
    const x = Number(style.match(/(?:^|;)left:([\d.]+)%/)?.[1]) / 100;
    const y = Number(style.match(/(?:^|;)top:([\d.]+)%/)?.[1]) / 100;
    if (!id || !/^x01-[a-z0-9-]{1,80}$/.test(id) || !text(name, 120) || !layers.has(layer) || !text(grid, 40) || description.length > 700 || /[<>\u0000-\u001f]/.test(description) || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1 || seen.has(id)) throw Error(`Invalid X01 source marker ${id || "unknown"}`);
    seen.add(id);
    markers.push({ id, name, floor, layer, grid, x, y, description });
  }
  if (markers.length < 1 || markers.length > 500) throw Error("Unexpected X01 marker count");
  return { schemaVersion: 1, mapId: "x01", coordinateVersion: "codcentral-x01-v4", source: SOURCE, capturedAt, floors: FLOORS, markers };
}

async function fetchExact(url, limit) {
  const response = await fetch(url, { headers: { "User-Agent": "DMZGuide-X01-local-research/1.0" } });
  if (!response.ok || new URL(response.url).origin !== "https://codcentral.net") throw Error(`Source unavailable: ${url}`);
  const length = Number(response.headers.get("content-length") || 0);
  if (length > limit) throw Error("Source exceeds size limit");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > limit) throw Error("Source exceeds size limit");
  return { response, bytes };
}

export async function capture({ assets = false } = {}) {
  const { bytes } = await fetchExact(SOURCE, 2_000_000);
  const snapshot = parseX01(bytes.toString("utf8"));
  const assetHashes = {};
  const assetBytes = [];
  if (assets) {
    for (const floor of FLOORS) {
      const { response, bytes: image } = await fetchExact(floor.url, 8_000_000);
      if (!response.headers.get("content-type")?.startsWith("image/webp") || image.subarray(0, 4).toString() !== "RIFF" || image.subarray(8, 12).toString() !== "WEBP") throw Error(`Invalid WebP floor ${floor.id}`);
      const digest = createHash("sha256").update(image).digest("hex");
      if (digest !== floor.sha256) throw Error(`X01 floor ${floor.id} changed at the pinned URL. Review the new source before updating the hash.`);
      assetBytes.push([floor.id, image]);
      assetHashes[floor.id] = digest;
    }
  }
  await mkdir(fileURLToPath(new URL("../src/x01/", import.meta.url)), { recursive: true });
  if (assets) {
    await mkdir(assetDirectory, { recursive: true });
    for (const [id, image] of assetBytes) await writeFile(fileURLToPath(new URL(`../public/maps/x01/codcentral/floor-${id}.webp`, import.meta.url)), image);
  }
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
  return { root, markers: snapshot.markers.length, byFloor: Object.fromEntries(FLOORS.map((floor) => [floor.id, snapshot.markers.filter((row) => row.floor === floor.id).length])), assetHashes };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  capture({ assets: process.argv.includes("--assets") }).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
