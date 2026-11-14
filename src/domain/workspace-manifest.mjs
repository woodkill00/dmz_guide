import { parseBounded } from "../content/limits.mjs";
import { hashBytes } from "../content/portable.mjs";

export const WORKSPACE_MODULES = Object.freeze({
  profile: {
    label: "Guide profile",
    origin: "http://127.0.0.1:4173",
    restore: "/settings/",
  },
  field: {
    label: "Field backup with photos",
    origin: "http://127.0.0.1:4173",
    restore: "/field-desk/#field-backups",
  },
  audit: {
    label: "Mission editorial audit",
    origin: "http://127.0.0.1:4173",
    restore: "/missions/audit/",
  },
  plans: {
    label: "Named run plans",
    origin: "http://127.0.0.1:4173",
    restore: null,
  },
  map: {
    label: "Map private workspace",
    origin: "http://127.0.0.1:5175",
    restore: "/",
  },
  armory: {
    label: "Armory workspace",
    origin: "http://127.0.0.1:4173",
    restore: "/armory/workbench/#backups",
  },
});
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_PART = 20 * 1024 * 1024;
const encoder = new TextEncoder();

export function moduleKind(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Choose a supported JSON workspace export");
  if (value.kind === "dmz-field-backup" && value.version === 1) return "field";
  if (value.kind === "dmz-private-map-workspace" && value.schemaVersion === 1)
    return "map";
  if (value.format === "dmz-armory-backup" && value.version === 1)
    return "armory";
  if (value.kind === "dmz-run-plans" && value.version === 1) return "plans";
  if (
    value.version === 1 &&
    value.pageSet === "hajin-launch" &&
    Array.isArray(value.entries)
  )
    return "audit";
  if (
    Number.isSafeInteger(value.schemaVersion) &&
    value.packId &&
    value.inventory &&
    value.completion
  )
    return "profile";
  throw Error(
    "Unsupported workspace export; keep the original file for its owner tool",
  );
}

const parse = (text, max = MAX_PART) =>
  parseBounded(text, max, {
    depth: 24,
    nodes: 250000,
    string: max,
  });

/** Bundle only files explicitly selected by the owner. No cross-origin reads. */
export async function createWorkspaceManifest(files) {
  if (!Array.isArray(files) || !files.length || files.length > 6)
    throw Error("Choose one to six workspace exports");
  const modules = [],
    seen = new Set();
  let total = 0;
  for (const file of files) {
    if (
      typeof file.name !== "string" ||
      !file.name ||
      file.name.length > 120 ||
      /[\\/\u0000-\u001f]/.test(file.name) ||
      typeof file.text !== "string"
    )
      throw Error("Invalid workspace file");
    const bytes = encoder.encode(file.text);
    if (!bytes.length || bytes.length > MAX_PART)
      throw Error("Workspace module exceeds 20 MiB");
    total += bytes.length;
    if (total > MAX_BYTES) throw Error("Workspace bundle exceeds 32 MiB");
    const payload = parse(file.text);
    const id = moduleKind(payload);
    if (seen.has(id))
      throw Error(`Choose only one ${WORKSPACE_MODULES[id].label} export`);
    seen.add(id);
    modules.push({
      id,
      name: file.name,
      origin: WORKSPACE_MODULES[id].origin,
      bytes: bytes.length,
      sha256: await hashBytes(bytes),
      text: file.text,
    });
  }
  const bundle = {
    kind: "dmz-workspace-manifest",
    version: 1,
    createdAt: new Date().toISOString(),
    modules,
    omitted: Object.keys(WORKSPACE_MODULES).filter((id) => !seen.has(id)),
    notice:
      "Private files. Each owner tool validates and restores its module separately; this bundle does not perform a cross-origin transaction.",
  };
  if (encoder.encode(JSON.stringify(bundle)).length > 36 * 1024 * 1024)
    throw Error("Serialized workspace bundle exceeds 36 MiB");
  return bundle;
}

/** Recompute every digest before offering any module for owner-side restore. */
export async function inspectWorkspaceManifest(bundle) {
  if (
    !bundle ||
    bundle.kind !== "dmz-workspace-manifest" ||
    bundle.version !== 1 ||
    !Array.isArray(bundle.modules) ||
    !bundle.modules.length ||
    bundle.modules.length > 6 ||
    !Array.isArray(bundle.omitted)
  )
    throw Error("Unsupported workspace manifest");
  const seen = new Set();
  let total = 0;
  for (const row of bundle.modules) {
    if (
      !row ||
      !WORKSPACE_MODULES[row.id] ||
      seen.has(row.id) ||
      row.origin !== WORKSPACE_MODULES[row.id].origin ||
      typeof row.name !== "string" ||
      !row.name ||
      row.name.length > 120 ||
      /[\\/\u0000-\u001f]/.test(row.name) ||
      typeof row.text !== "string" ||
      !Number.isSafeInteger(row.bytes) ||
      row.bytes < 1 ||
      row.bytes > MAX_PART ||
      !/^[a-f0-9]{64}$/.test(row.sha256)
    )
      throw Error("Invalid workspace module metadata");
    seen.add(row.id);
    const bytes = encoder.encode(row.text);
    total += bytes.length;
    if (
      total > MAX_BYTES ||
      bytes.length !== row.bytes ||
      (await hashBytes(bytes)) !== row.sha256 ||
      moduleKind(parse(row.text)) !== row.id
    )
      throw Error("Workspace module digest or type changed; nothing restored");
  }
  const expectedOmitted = Object.keys(WORKSPACE_MODULES).filter(
    (id) => !seen.has(id),
  );
  if (JSON.stringify(bundle.omitted) !== JSON.stringify(expectedOmitted))
    throw Error("Workspace omission list does not match bundled files");
  return {
    modules: bundle.modules.map((row) => ({
      id: row.id,
      label: WORKSPACE_MODULES[row.id].label,
      bytes: row.bytes,
      origin: row.origin,
      restore: WORKSPACE_MODULES[row.id].restore,
      requiresOwnerValidation: true,
    })),
    omitted: expectedOmitted,
    totalBytes: total,
  };
}
