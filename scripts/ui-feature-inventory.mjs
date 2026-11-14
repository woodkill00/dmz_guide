import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { features } from "../src/ui/feature-registry.mjs";
const paths = [
  "src/ui/feature-registry.mjs",
  "src/ui/map-destinations.json",
  "specs/071-ui-ux-implementation/feature-coverage.md",
];
const hashes = Object.fromEntries(
  await Promise.all(
    paths.map(async (path) => [
      path,
      createHash("sha256")
        .update(await readFile(new URL("../" + path, import.meta.url)))
        .digest("hex"),
    ]),
  ),
);
const baseline = JSON.parse(
  await readFile(
    new URL(
      "../specs/071-ui-ux-implementation/registry-snapshot.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const prior of baseline.features) {
  const current = features.find((feature) => feature.id === prior.id);
  if (
    !current ||
    JSON.stringify({
      id: current.id,
      label: current.label,
      kind: current.kind,
      path: current.path,
      group: current.group,
    }) !== JSON.stringify(prior)
  )
    throw Error(`Historical feature changed: ${prior.id}`);
}
const metadata = features.map(({ id, label, kind, path, group }) => ({
  id,
  label,
  kind,
  path,
  group,
}));
await writeFile(
  new URL("../tests/fixtures/ui-feature-coverage.json", import.meta.url),
  JSON.stringify(
    {
      source: paths[0],
      head: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      hashes,
      count: metadata.length,
      features: metadata,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Captured ${metadata.length} feature identities and ${paths.length} source hashes; review status is recorded by each owning feature.`,
);
