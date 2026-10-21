import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { planCatalogMigration, readCatalog } from "./catalog.mjs";
import { isDeepStrictEqual } from "node:util";

export async function migrateCatalog({
  root,
  schema,
  apply = false,
  failpoint,
} = {}) {
  root = resolve(root || dirname(fileURLToPath(import.meta.url)) + "/..");
  schema ||= JSON.parse(
    await readFile(resolve(root, "schemas/pack.schema.json"), "utf8"),
  );
  const plan = await planCatalogMigration({ root, schema });
  const report = {
    packs: plan.entries.map(({ key, pack }) => ({ key, id: pack.id })),
    paths: [...plan.after.keys()].sort(),
    sourceRevision: plan.sourceRevision,
    applied: false,
  };
  if (!apply) return report;
  const { applyFilePlan } = await import("./author-store.mjs");
  await applyFilePlan({
    root,
    before: plan.before,
    after: plan.after,
    markerPath: plan.markerPath,
    failpoint,
  });
  const actual = await readCatalog({ root, schema });
  if (!isDeepStrictEqual(actual.packs, plan.packs))
    throw new Error(
      "Migration verification failed; preserve recovery evidence and do not publish",
    );
  return { ...report, applied: true, revision: actual.revision };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply"))
    throw new Error("Usage: node scripts/migrate-catalog.mjs [--apply]");
  console.log(
    JSON.stringify(
      await migrateCatalog({ apply: args.includes("--apply") }),
      null,
      2,
    ),
  );
}
