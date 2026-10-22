import { LIMITS, assert, boundedWalk, parseBounded, clone } from "./limits.mjs";
import { validatePack } from "./validate.mjs";
import { TRANSFER_LIMITS, validatePayloads } from "./portable.mjs";
const canonical = (value) =>
  JSON.stringify(value, function (_key, item) {
    return item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item;
  });
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function exact(value, keys, label) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    `Invalid ${label}`,
  );
  assert(
    Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Unexpected or missing ${label} fields`,
  );
}
// Only validates and returns a detached candidate. Never reads files, fetches media,
// changes a draft, or trusts an exported revision as current write authority.
export async function parseRecoveryDraft(
  text,
  schema,
  {
    destination,
    key,
    currentPack,
    assetSources = {},
    entries = [],
    decodeRaster,
    signal,
  } = {},
) {
  assert(!signal?.aborted, "Recovery import cancelled");
  const input = parseBounded(text, TRANSFER_LIMITS.envelopeBytes, {
    depth: LIMITS.depth + 2,
    nodes: LIMITS.nodes + 200,
    string: Math.ceil(LIMITS.assetBytes / 3) * 4,
  });
  exact(
    input,
    [
      "format",
      "version",
      "warning",
      "packKey",
      "expectedRevision",
      "pack",
      "uploads",
    ],
    "recovery envelope",
  );
  assert(
    input.format === "dmz-repository-draft-recovery" && input.version === 1,
    "Unsupported recovery format/version. Keep the original export.",
  );
  assert(
    typeof input.warning === "string" && input.warning.length <= LIMITS.string,
    "Invalid recovery warning",
  );
  assert(
    typeof input.packKey === "string" &&
      input.packKey.length <= 100 &&
      keyPattern.test(input.packKey),
    "Invalid recovery catalog key",
  );
  assert(
    typeof input.expectedRevision === "string" &&
      /^[a-f0-9]{64}$/.test(input.expectedRevision),
    "Invalid historical repository revision",
  );
  boundedWalk(input.pack);
  assert(
    new TextEncoder().encode(JSON.stringify(input.pack)).length <=
      LIMITS.packBytes,
    "Recovery catalog exceeds 8 MiB",
  );
  validatePack(input.pack, schema, { profile: "published" });
  assert(
    input.pack.assets.length <= LIMITS.assets,
    "Recovery supports at most 32 pictures",
  );
  assert(
    ["existing", "new"].includes(destination),
    "Choose an explicit recovery destination",
  );
  if (destination === "existing")
    assert(
      currentPack && key === input.packKey && currentPack.id === input.pack.id,
      "Recovery catalog identity/key differs from selected catalog",
    );
  else
    assert(
      !entries.some(
        (entry) =>
          entry.key === input.packKey || entry.pack.id === input.pack.id,
      ),
      "Recovery catalog already exists; select it explicitly",
    );
  assert(
    Array.isArray(input.uploads) && input.uploads.length <= LIMITS.assets,
    "Too many recovery uploads",
  );
  const paths = new Set();
  for (const asset of input.pack.assets) {
    assert(
      !paths.has(asset.path.toLowerCase()),
      "Duplicate recovery picture path",
    );
    paths.add(asset.path.toLowerCase());
    assert(
      asset.redistributionAllowed === true &&
        asset.rightsHolder?.trim() &&
        asset.license?.trim() &&
        asset.attribution?.trim(),
      "Recovery picture rights and attribution required",
    );
  }
  const payloads = input.uploads.map((upload) => {
    exact(upload, ["assetId", "base64", "category"], "recovery upload");
    assert(
      typeof upload.category === "string" &&
        /^(items|weapons|recipes|objectives|guides|maps|locations|other)$/.test(
          upload.category,
        ),
      "Invalid recovery picture category",
    );
    return { assetId: upload.assetId, base64: upload.base64 };
  });
  await validatePayloads(input.pack, payloads, {
    decodeRaster,
    complete: false,
    signal,
  });
  assert(!signal?.aborted, "Recovery import cancelled");
  const sources = {};
  for (const asset of input.pack.assets) {
    if (payloads.some((p) => p.assetId === asset.id)) continue;
    const previous = currentPack?.assets.find((a) => a.id === asset.id);
    assert(
      destination === "existing" &&
        assetSources[asset.id] &&
        previous &&
        canonical(previous) === canonical(asset),
      `Missing matching repository picture bytes for ${asset.id}; preserve original and reattach the picture`,
    );
    sources[asset.id] = clone(assetSources[asset.id]);
  }
  return {
    pack: clone(input.pack),
    payloads,
    sources,
    selfContained: false,
    recovery: true,
    historicalRevision: input.expectedRevision,
  };
}
