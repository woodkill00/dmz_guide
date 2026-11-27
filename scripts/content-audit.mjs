import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { readCatalog, readCatalogFile } from "./catalog.mjs";
import { featurePages } from "../src/ui/site-experience-page.mjs";
import { validateQualityIndex } from "../src/domain/site-quality.mjs";
import {
  spoilerGuard,
  ordersPageCoverage,
} from "../src/domain/progression.mjs";
import { readWeaponCamos } from "../src/content/weapon-camos.mjs";
import { validCamoImage, CAMO_IMAGE_BYTES } from "./camo-images.mjs";
import { hajinOrderSequence } from "../src/content/hajin-order-sequence.mjs";

export function summarizeContent(packs, index) {
  validateQualityIndex(index);
  const counts = {},
    missions = [];
  let excludedPacks = 0;
  for (const pack of packs) {
    const guard = spoilerGuard(pack);
    if (
      pack.id.startsWith("fixture:") ||
      pack.sources?.some((s) => s.type === "original-fixture") ||
      guard.limited
    ) {
      excludedPacks++;
      continue;
    }
    const visible = (record) =>
      !record.spoiler && !guard.contains(JSON.stringify(record));
    for (const kind of [
      "items",
      "recipes",
      "objectives",
      "locations",
      "guides",
    ])
      counts[kind] =
        (counts[kind] || 0) + (pack[kind] || []).filter(visible).length;
    if (pack.objectives?.some((r) => r.track === "dmz-order" && visible(r))) {
      const publicPack = {
        ...pack,
        objectives: pack.objectives.filter(visible),
      };
      missions.push({
        packId: pack.id,
        auditURL: `/missions/audit/?${new URLSearchParams({ pack: pack.id })}`,
        maps: ["hajin", "x01"].map((map) => {
          const pages = ordersPageCoverage(
            publicPack,
            map === "hajin" ? 24 : 5,
            map,
          );
          const visibleIds = new Set(
            publicPack.objectives
              .filter(
                (record) =>
                  record.track === "dmz-order" &&
                  (record.orderSet || "hajin") === map,
              )
              .map((record) => record.id),
          );
          const navigation = map === "hajin" ? hajinOrderSequence.pages : pages;
          return {
            map,
            slots: pages.length,
            sourceFixedPages: pages.filter((r) => r.state === "recorded")
              .length,
            sourceUnassignedSlots: pages
              .filter((r) => r.state !== "recorded")
              .map((r) => r.page),
            navigationPagesWithRoster: navigation.filter((r) =>
              r.objectiveIds.some((id) => visibleIds.has(id)),
            ).length,
            note: "Reported chapter sequence can provide navigation where fixed source page placement is unrecorded; these are not missing mission pages.",
          };
        }),
      });
    }
  }
  const gaps = {},
    gapFields = {};
  for (const row of index.entries) {
    gaps[row.kind] = (gaps[row.kind] || 0) + 1;
    gapFields[row.field] = (gapFields[row.field] || 0) + 1;
  }
  return {
    counts,
    excludedPacks,
    missions,
    gaps,
    gapFields,
    indexedGaps: index.indexedCount,
    eligibleGaps: index.eligibleCount,
    limited: index.limited,
  };
}

export async function auditContent() {
  const root = process.cwd();
  const schema = JSON.parse(
    await readFile(join(root, "schemas/pack.schema.json"), "utf8"),
  );
  const catalog = await readCatalog({ root, schema });
  const packs = catalog.entries.map((entry) => entry.pack);
  const pages = await featurePages(packs, { catalog });
  const quality = pages.find((page) => page.path === "/quality/");
  const index = validateQualityIndex(
    JSON.parse(quality.body.match(/id="quality-data">([\s\S]*?)<\/script>/)[1]),
  );
  const camos = await readWeaponCamos();
  const rows = camos.weapons.flatMap((w) =>
    w.rows.map((row) => ({ weapon: w.id, row })),
  );
  let available = 0;
  for (let offset = 0; offset < rows.length; offset += 8) {
    const checks = await Promise.all(
      rows.slice(offset, offset + 8).map(async ({ weapon, row }) => {
        try {
          return validCamoImage(
            await readCatalogFile(
              root,
              `.local/camo-images/${weapon}--${row.id}.webp`,
              CAMO_IMAGE_BYTES,
            ),
            row.image,
          );
        } catch {
          return false;
        }
      }),
    );
    available += checks.filter(Boolean).length;
  }
  const report = {
    format: "dmz-content-audit",
    version: 1,
    checkedAt: new Date().toISOString(),
    scope:
      "Admitted repository reference only; not complete-game or current-build verification. Protected records and fictional packs excluded.",
    ...summarizeContent(packs, index),
    camoImages: {
      declared: rows.length,
      locallyValid: available,
      unavailable: rows.length - available,
      note: "Optional local files; absence does not mean missing challenge metadata. Nothing downloaded.",
    },
    links: { quality: "/quality/", missions: "/missions/audit/" },
    findings: index.entries,
  };
  const directory = resolve(root, "test-results/reliability");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "content-audit.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        ...report,
        findings: `${index.entries.length} exact reader/editor rows in test-results/reliability/content-audit.json`,
      },
      null,
      2,
    ),
  );
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await auditContent();
