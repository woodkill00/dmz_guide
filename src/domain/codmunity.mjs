import { assert, boundedWalk, parseBounded } from "../content/limits.mjs";
export const COD_URLS = {
  mw4: "https://codmunity.gg/weapon-stats/mw4",
  dmz: "https://codmunity.gg/weapon-stats/dmz",
};
export const COD_BADGE = "*WZ";
export const COD_LEGEND =
  "*WZ — CODMunity MW4 Multiplayer base values; not tested in DMZ. WZ is this guide's marker, not Warzone mode.";
export const REGIONS = [
  "head",
  "neck",
  "chest",
  "stomach",
  "upperarm",
  "upperleg",
  "lowerarm",
  "lowerleg",
];
export const emptyCodmunity = () => ({
  version: 1,
  preferredSource: "codmunity-mw4",
  badge: COD_BADGE,
  modes: { mw4: null, dmz: null },
});
export function validateMonitor(value) {
  exact(value, "latestAttempt error lastSuccess");
  stamp(value.latestAttempt);
  assert(
    value.error === null ||
      (typeof value.error === "string" && value.error.length <= 500),
    "Invalid probe error",
  );
  if (value.lastSuccess !== null) {
    const s = value.lastSuccess;
    exact(s, "time result");
    stamp(s.time);
    exact(s.result, "coverage sourceDate sourceHash warning");
    assert(
      /^[a-f0-9]{64}$/.test(s.result.sourceHash) &&
        typeof s.result.warning === "string" &&
        s.result.warning.length <= 500,
      "Invalid probe metadata",
    );
    assert(
      s.result.sourceDate === null ||
        /^\d{4}-\d{2}-\d{2}$/.test(s.result.sourceDate),
      "Invalid probe date",
    );
    const c = s.result.coverage;
    exact(c, "weapons damage total status reviewAvailable");
    assert(
      [c.weapons, c.damage, c.total].every(
        (n) => Number.isSafeInteger(n) && n >= 0 && n <= 256,
      ) &&
        c.total > 0 &&
        c.damage <= c.weapons &&
        c.weapons <= c.total,
      "Invalid probe coverage",
    );
    const expected = s.result.warning
      ? "reachable-untested"
      : c.damage === 0
        ? "no-damage"
        : c.damage === c.total
          ? "full-source-data"
          : "partial-source-data";
    assert(
      c.status === expected &&
        c.reviewAvailable === (!s.result.warning && c.damage > 0),
      "Invalid readiness state",
    );
  }
  return value;
}
const exact = (v, keys) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === keys.split(" ").sort().join(),
    "Unexpected CODMunity fields",
  );
const finite = (v, max = 1e9) =>
  assert(
    typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max,
    "Invalid source number",
  );
const stamp = (v) =>
  assert(
    typeof v === "string" &&
      v.length <= 30 &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString() === v,
    "Invalid source timestamp",
  );
export function validateCodmunity(value, db, definitions) {
  boundedWalk(value, { depth: 16, nodes: 50000, string: 1000 });
  exact(value, "version preferredSource badge modes");
  assert(
    value.version === 1 &&
      value.preferredSource === "codmunity-mw4" &&
      value.badge === COD_BADGE,
    "Unsupported CODMunity document",
  );
  exact(value.modes, "mw4 dmz");
  for (const [mode, s] of Object.entries(value.modes)) {
    if (s === null) continue;
    exact(
      s,
      "sourceURL mode fetchedAt sourceDate sourceHash warning weapons unknownCount",
    );
    assert(
      s.sourceURL === COD_URLS[mode] &&
        s.mode === (mode === "mw4" ? "multiplayer" : "dmz"),
      "Source mode mismatch",
    );
    stamp(s.fetchedAt);
    assert(
      s.sourceDate === null ||
        (/^\d{4}-\d{2}-\d{2}$/.test(s.sourceDate) &&
          new Date(s.sourceDate).toISOString().slice(0, 10) === s.sourceDate),
      "Invalid source date",
    );
    assert(/^[a-f0-9]{64}$/.test(s.sourceHash), "Invalid source fingerprint");
    assert(
      typeof s.warning === "string" && s.warning.length <= 500,
      "Invalid warning",
    );
    assert(
      Number.isSafeInteger(s.unknownCount) &&
        s.unknownCount >= 0 &&
        s.unknownCount <= 256,
      "Invalid unknown count",
    );
    assert(
      s.weapons &&
        typeof s.weapons === "object" &&
        !Array.isArray(s.weapons) &&
        Object.keys(s.weapons).length > 0 &&
        Object.keys(s.weapons).length <= 256,
      "Empty or invalid source roster",
    );
    for (const [id, w] of Object.entries(s.weapons)) {
      assert(
        db.weapons.some((w) => w.id === id),
        "Unknown accepted weapon",
      );
      exact(w, "name sourceUpdated stats damage");
      assert(
        typeof w.name === "string" && w.name.length <= 100,
        "Invalid source name",
      );
      if (w.sourceUpdated !== null) stamp(w.sourceUpdated);
      assert(
        w.stats && typeof w.stats === "object" && !Array.isArray(w.stats),
        "Invalid source stats",
      );
      for (const [key, v] of Object.entries(w.stats)) {
        const definition = definitions.find((m) => m.id === key);
        assert(definition, "Unknown source metric");
        finite(v);
        assert(definition.signed || v >= 0, "Negative source metric");
      }
      assert(
        Array.isArray(w.damage) && w.damage.length <= 16,
        "Invalid damage bands",
      );
      let previous = -1;
      for (const [i, b] of w.damage.entries()) {
        exact(b, "from to unit values providerTTK shotsToKill");
        finite(b.from);
        assert(
          b.from >= 0 && b.from > previous && (i !== 0 || b.from === 0),
          "Invalid ascending damage ranges",
        );
        previous = b.from;
        assert(
          b.unit === "source-unspecified",
          "Unestablished damage range unit",
        );
        assert(
          b.to === (w.damage[i + 1]?.from ?? null),
          "Inconsistent damage band end",
        );
        exact(b.values, REGIONS.join(" "));
        assert(
          Object.values(b.values).some((v) => v !== null),
          "Empty damage band",
        );
        for (const v of Object.values(b.values)) {
          if (v !== null) {
            finite(v, 1e6);
            assert(v >= 0, "Negative damage");
          }
        }
        if (b.providerTTK !== null) {
          finite(b.providerTTK);
          assert(b.providerTTK >= 0, "Invalid TTK");
        }
        assert(
          b.shotsToKill === null ||
            (Number.isSafeInteger(b.shotsToKill) &&
              b.shotsToKill > 0 &&
              b.shotsToKill <= 100000),
          "Invalid shot count",
        );
      }
    }
  }
  return value;
}
export function parseCodmunityJSON(raw, db, definitions) {
  return validateCodmunity(
    parseBounded(raw, 2 * 1024 * 1024, {
      depth: 16,
      nodes: 50000,
      string: 1000,
    }),
    db,
    definitions,
  );
}
export function codFacts(value) {
  const result = structuredClone(value);
  for (const s of Object.values(result.modes)) {
    if (!s) continue;
    delete s.fetchedAt;
    delete s.sourceHash;
    for (const w of Object.values(s.weapons)) delete w.sourceUpdated;
  }
  const stable = (v) =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, stable(v[k])]),
          )
        : v;
  return JSON.stringify(stable(result));
}
export function codCoverage(snapshot, db) {
  const weapons = Object.keys(snapshot?.weapons || {}).length,
    damage = Object.values(snapshot?.weapons || {}).filter(
      (w) => w.damage.length > 0,
    ).length,
    total = db.weapons.length;
  const status = !snapshot
    ? "not-checked"
    : snapshot.warning
      ? "reachable-untested"
      : damage === 0
        ? "no-damage"
        : damage === total
          ? "full-source-data"
          : "partial-source-data";
  return {
    weapons,
    damage,
    total,
    status,
    reviewAvailable: !!snapshot && !snapshot.warning && damage > 0,
  };
}
export function codDiff(before, after, db) {
  const result = {};
  for (const mode of ["mw4", "dmz"]) {
    const a = before.modes[mode]?.weapons || {},
      b = after.modes[mode]?.weapons || {};
    const plain = (w) =>
      w && JSON.stringify({ name: w.name, stats: w.stats, damage: w.damage });
    result[mode] = {
      added: Object.keys(b).filter((id) => !a[id]),
      removed: Object.keys(a).filter((id) => !b[id]),
      changed: Object.keys(b).filter(
        (id) => a[id] && plain(a[id]) !== plain(b[id]),
      ),
      coverageBefore: codCoverage(before.modes[mode], db),
      coverageAfter: codCoverage(after.modes[mode], db),
    };
  }
  return result;
}
