import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readCatalogFile } from "./catalog.mjs";
import { validateQualityIndex } from "../src/domain/site-quality.mjs";
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
function findings(report) {
  if (
    !plain(report) ||
    report.format !== "dmz-content-audit" ||
    report.version !== 1
  )
    throw Error("Invalid content audit");
  validateQualityIndex({
    version: 1,
    eligibleCount: report.eligibleGaps,
    indexedCount: report.indexedGaps,
    limited: report.limited,
    entries: report.findings,
  });
  if (report.limited)
    throw Error("Limited audit cannot certify complete finding reconciliation");
  return report.findings;
}
function reason(row) {
  if (row.packId.startsWith("observed:"))
    return "Historical observation catalog: identity/cost/source completeness remains unverified; no quantities are merged with the current catalog.";
  if (row.field === "locations" || row.field === "position")
    return "Calibrated map positions are unrecorded. General container hints do not verify an exact location.";
  if (row.field === "requirements")
    return "Inventory-material quantities or scope remain unverified. Available task instructions do not establish material consumption.";
  if (row.field === "picture")
    return "An exact source-backed item image is still missing; the visible generic fallback is not evidence of game artwork.";
  if (row.field === "rarity")
    return "The cited data does not record a supported rarity; no tier or not-applicable status is guessed.";
  return row.message;
}
/** Evidence accounts for removed findings; it never writes editorial/player state. */
export function reconcileFindings(before, after, resolutions = []) {
  const baseline = findings(before),
    current = findings(after);
  if (!Array.isArray(resolutions) || resolutions.length > baseline.length)
    throw Error("Invalid resolution coverage");
  const old = new Map(baseline.map((r) => [r.id, r])),
    now = new Map(current.map((r) => [r.id, r])),
    proof = new Map();
  for (const entry of resolutions) {
    if (
      !plain(entry) ||
      Object.keys(entry).sort().join() !== "binding,evidence,id,kind,reason" ||
      !old.has(entry.id) ||
      entry.binding !== old.get(entry.id).binding ||
      proof.has(entry.id) ||
      now.has(entry.id) ||
      !["factual-correction", "classification-correction"].includes(
        entry.kind,
      ) ||
      ![entry.evidence, entry.reason].every(
        (v) =>
          typeof v === "string" &&
          v.trim() &&
          v.length <= 1000 &&
          !/[\u0000-\u001f]/.test(v),
      )
    )
      throw Error("Unrelated, stale, duplicate or invalid correction evidence");
    proof.set(entry.id, entry);
  }
  const rows = baseline.map((row) => {
    const present = now.get(row.id),
      evidence = proof.get(row.id);
    if (!present && !evidence)
      throw Error(
        "A finding disappeared without correction evidence: " + row.id,
      );
    return {
      ...(present || row),
      disposition: evidence?.kind || "unresolved-source",
      changedEvidence: !!present && present.binding !== row.binding,
      evidence: evidence?.evidence || null,
      reason: evidence?.reason || reason(present || row),
    };
  });
  const added = current
    .filter((r) => !old.has(r.id))
    .map((r) => ({
      ...r,
      disposition: "unresolved-source",
      reason: reason(r),
    }));
  return {
    format: "dmz-content-reconciliation",
    version: 1,
    scope:
      "Public catalog audit only; a corrected finding is not complete-game or gameplay verification.",
    counts: {
      baseline: rows.length,
      factualCorrections: rows.filter(
        (r) => r.disposition === "factual-correction",
      ).length,
      classificationCorrections: rows.filter(
        (r) => r.disposition === "classification-correction",
      ).length,
      outstandingBaseline: rows.filter(
        (r) => r.disposition === "unresolved-source",
      ).length,
      newFindings: added.length,
      current: current.length,
    },
    baseline: rows,
    newFindings: added,
  };
}
export async function verifyContent(args = process.argv.slice(2)) {
  const allowed = new Set(["--baseline", "--current", "--resolutions"]),
    options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || !args[i + 1] || options.has(args[i]))
      throw Error("Use --baseline PATH --current PATH --resolutions PATH");
    options.set(args[i], args[i + 1]);
  }
  if (options.size !== 3)
    throw Error("Use --baseline PATH --current PATH --resolutions PATH");
  const read = async (flag) =>
    JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await readCatalogFile(
          process.cwd(),
          options.get(flag),
          2 * 1024 * 1024,
        ),
      ),
    );
  const report = reconcileFindings(
    await read("--baseline"),
    await read("--current"),
    await read("--resolutions"),
  );
  await mkdir("test-results/content112", { recursive: true });
  await writeFile(
    "test-results/content112/reconciliation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report.counts));
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await verifyContent();
