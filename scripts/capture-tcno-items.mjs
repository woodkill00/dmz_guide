import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseTcnoBundle } from "./lib/tcno-data.mjs";
const page = "https://tools.tcno.co/dmz/fob";
async function fetchText(url) {
  const u = new URL(url);
  if (u.origin !== "https://tools.tcno.co")
    throw Error("Unexpected provider origin");
  const r = await fetch(u, {
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (!r.ok) throw Error("Provider response " + r.status);
  let result = "",
    bytes = 0;
  const decoder = new TextDecoder();
  for await (const chunk of r.body) {
    bytes += chunk.length;
    if (bytes > 2_000_000) throw Error("Provider response limit");
    result += decoder.decode(chunk, { stream: true });
  }
  return result + decoder.decode();
}
const html = await fetchText(page);
const links = [
  ...new Set(
    [...html.matchAll(/href="([^"]+\.js)"/g)].map(
      (m) => new URL(m[1], page).href,
    ),
  ),
];
if (links.length > 60) throw Error("Provider script discovery limit");
let snapshot;
for (const url of links) {
  if (!new URL(url).pathname.startsWith("/_app/immutable/chunks/")) continue;
  const text = await fetchText(url);
  if (!text.includes("fobUpgrades") || !text.includes("lootSources")) continue;
  const data = parseTcnoBundle(text);
  snapshot = {
    source: page,
    bundleURL: url,
    reviewed: new Date().toISOString().slice(0, 10),
    sha256: createHash("sha256").update(text).digest("hex"),
    ...data,
  };
  break;
}
if (!snapshot)
  throw Error("Provider dataset not found; previous snapshot retained");
console.log(
  JSON.stringify({
    items: Object.keys(snapshot.items).length,
    unlocks: snapshot.unlocks.length,
    upgrades: snapshot.fobUpgrades.length,
    sha256: snapshot.sha256,
    mode: process.argv.includes("--write") ? "write" : "preview",
  }),
);
if (process.argv.includes("--write"))
  await writeFile(
    new URL("../content/references/tcno-items-20261110.json", import.meta.url),
    JSON.stringify(snapshot, null, 2) + "\n",
  );
