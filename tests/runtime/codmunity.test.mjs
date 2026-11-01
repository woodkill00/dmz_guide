import { codFixture } from "../helpers/codmunity.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import {
  codBytes,
  codHash,
  readCodmunity,
} from "../../src/content/codmunity.mjs";
import {
  parseComparator,
  parseWeaponLiteral,
} from "../../scripts/codmunity-parser.mjs";
import {
  checkCodmunity,
  applyCodmunity,
  monitorCodmunity,
  codmunityStatus,
  fetchComparator,
} from "../../scripts/codmunity.mjs";
import {
  codCoverage,
  codFacts,
  validateCodmunity,
  emptyCodmunity,
} from "../../src/domain/codmunity.mjs";
import definitions from "../../src/domain/codmunity-metrics.json" with { type: "json" };
import { createWeaponManager } from "../../scripts/weapon-manager.mjs";
const db = await readWeaponIntel();
test("051 network requests are fixed, bounded, cancellable and abort failed responses", async (t) => {
  let signal;
  const stub = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://codmunity.gg/weapon-stats/mw4");
    assert.equal(options.redirect, "error");
    signal = options.signal;
    return new Response("bad", {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  });
  await assert.rejects(fetchComparator("mw4"), /HTTP/);
  assert(signal.aborted);
  await assert.rejects(fetchComparator("https://evil.invalid"), /Unknown/);
  stub.mock.mockImplementation(
    async () =>
      new Response(new Uint8Array(2097153), {
        headers: { "Content-Type": "text/html" },
      }),
  );
  await assert.rejects(fetchComparator("mw4"), /byte limit/);
  stub.mock.mockImplementation(
    async () =>
      new Response(new Uint8Array([255]), {
        headers: { "Content-Type": "text/html" },
      }),
  );
  await assert.rejects(fetchComparator("mw4"));
});
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "dmz051-"));
  await mkdir(join(root, "content"));
  await writeFile(join(root, "content/weapon-intel.json"), JSON.stringify(db));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
test("051 parses only inert source literals, preserves mode/signed units/body unknowns", () => {
  const s = parseComparator(codFixture(), "mw4", db, definitions);
  assert.equal(s.weapons["han-86"].damage[0].values.chest, 25);
  assert.equal(s.weapons["han-86"].damage[0].values.neck, null);
  assert.equal(s.weapons["han-86"].damage[0].unit, "source-unspecified");
  assert.equal(s.weapons["han-86"].stats.hip_strafe_accuracy, -1.9);
  const rawZero = codFixture().replace("rpm:741", "rpm:741,avgTtk1:0");
  assert.equal(
    parseComparator(rawZero, "mw4", db, definitions).weapons["han-86"].stats
      .avgTtk1,
    0,
  );
  const placeholder = codFixture("dmz").replace("rpm:741", "rpm:741,avgTtk1:0");
  assert(
    !Object.hasOwn(
      parseComparator(placeholder, "dmz", db, definitions).weapons["han-86"]
        .stats,
      "avgTtk1",
    ),
  );
  const dmz = parseComparator(codFixture("dmz"), "dmz", db, definitions);
  assert.equal(codCoverage(dmz, db).status, "reachable-untested");
  assert.equal(codCoverage(dmz, db).damage, 0);
  assert.equal(codCoverage(dmz, db).total, 33);
  assert.equal(
    codCoverage(
      parseComparator(
        codFixture("dmz", { warning: false, damage: true }),
        "dmz",
        db,
        definitions,
      ),
      db,
    ).status,
    "partial-source-data",
  );
  for (const warning of [
    "NOT TESTED",
    "NOT TESTED IN DMZ",
    "NOT <span>TESTED</span> YET IN GAME",
    "NOT&nbsp;TESTED",
    "NOT&#32;TESTED",
    "NOT YET TESTED",
    "UNTESTED",
  ]) {
    const source = codFixture("dmz", { warning: true, damage: true }).replace(
      "NOT TESTED YET IN GAME.",
      warning,
    );
    const coverage = codCoverage(
      parseComparator(source, "dmz", db, definitions),
      db,
    );
    assert.equal(coverage.status, "reachable-untested");
    assert.equal(coverage.reviewAvailable, false);
  }
});
test("051 rejects executable syntax, dangerous keys, refs, duplicate fields, huge/deep inputs", () => {
  for (const replacement of [
    "(()=>{globalThis.pwned=true;return 741})()",
    "741+1",
    "new Number(741)",
    "undefined",
    "!2",
    "$R[999]",
  ])
    assert.throws(() =>
      parseComparator(
        codFixture().replace("rpm:741", `rpm:${replacement}`),
        "mw4",
        db,
        definitions,
      ),
    );
  for (const text of [
    "x={weaponStats:$R[1]=[$R[1]]}",
    "x={weaponStats:[{__proto__:{}}]}",
    "x={weaponStats:[{rpm:1,rpm:2}]}",
    "x={weaponStats:[{get x(){return 1}}]}",
    "x={weaponStats:" + "[".repeat(30) + "0" + "]".repeat(30) + "}",
  ])
    assert.throws(() => parseWeaponLiteral(text));
  assert.equal(globalThis.pwned, undefined);
  assert.throws(() =>
    parseComparator(
      codFixture().replace('game:"mw4"', 'game:"dmz"'),
      "mw4",
      db,
      definitions,
    ),
  );
  assert.throws(() =>
    parseComparator(
      codFixture().replace("chest:25", "chest:-1"),
      "mw4",
      db,
      definitions,
    ),
  );
  assert.throws(() =>
    parseComparator(" ".repeat(2097153), "mw4", db, definitions),
  );
});
test("051 stage/apply is hash and CAS bound, semantic repeat preserves bytes and backup", async (t) => {
  const root = await fixture(t);
  let noise = "first";
  const fetcher = async (mode) => codFixture(mode, { noise });
  await checkCodmunity(root, { fetcher });
  let p = await readFile(join(root, ".local/codmunity-proposal.json"));
  await assert.rejects(
    applyCodmunity(root, { proposalHash: "0".repeat(64) }),
    /proposal changed/,
  );
  await applyCodmunity(root, { proposalHash: codHash(p) });
  const before = (await readCodmunity(root)).bytes,
    backup = await readFile(join(root, ".local/codmunity-backup.json"));
  noise = "changed footer metadata";
  const checked = await checkCodmunity(root, { fetcher });
  assert(checked.unchanged);
  p = await readFile(join(root, ".local/codmunity-proposal.json"));
  assert((await applyCodmunity(root, { proposalHash: codHash(p) })).unchanged);
  assert.deepEqual((await readCodmunity(root)).bytes, before);
  assert.deepEqual(
    await readFile(join(root, ".local/codmunity-backup.json")),
    backup,
  );
  const candidate = JSON.parse(p);
  candidate.content.modes.mw4.weapons["han-86"].stats.rpm = 750;
  await writeFile(
    join(root, "content/codmunity-stats.json"),
    codBytes(candidate.content),
  );
  await assert.rejects(
    applyCodmunity(root, { proposalHash: codHash(p) }),
    /baseline changed/,
  );
});
test("051 failed check/probe retain accepted and proposal data, removals remain reviewed", async (t) => {
  const root = await fixture(t);
  await checkCodmunity(root, {
    fetcher: async (mode) => codFixture(mode, { second: true }),
  });
  let p = await readFile(join(root, ".local/codmunity-proposal.json"));
  await applyCodmunity(root, { proposalHash: codHash(p) });
  const before = (await readCodmunity(root)).bytes;
  const checked = await checkCodmunity(root, {
    fetcher: async (mode) => codFixture(mode),
  });
  assert.deepEqual(checked.diff.mw4.removed, ["m4"]);
  assert.deepEqual((await readCodmunity(root)).bytes, before);
  p = await readFile(join(root, ".local/codmunity-proposal.json"));
  await assert.rejects(
    checkCodmunity(root, {
      fetcher: async () => {
        throw Error("Synthetic source outage");
      },
    }),
    /outage/,
  );
  assert.deepEqual(
    await readFile(join(root, ".local/codmunity-proposal.json")),
    p,
  );
  assert.deepEqual((await readCodmunity(root)).bytes, before);
  const status = await monitorCodmunity(root, {
    fetcher: async () => {
      throw Error("Synthetic probe failure");
    },
  });
  assert.match(status.error, /probe failure/);
  assert(status.lastSuccess);
  assert.equal(
    (await codmunityStatus(root)).monitor.lastSuccess.result.coverage.damage,
    0,
  );
});
test("051 unsafe accepted snapshots and nonascending bands fail; fetch metadata/order do not change facts", () => {
  const value = emptyCodmunity();
  value.modes.mw4 = parseComparator(codFixture(), "mw4", db, definitions);
  const copy = structuredClone(value);
  copy.modes.mw4.sourceHash = "0".repeat(64);
  copy.modes.mw4.fetchedAt = "2026-11-02T00:00:00.000Z";
  copy.modes.mw4.weapons["han-86"].sourceUpdated = null;
  assert.equal(codFacts(value), codFacts(copy));
  for (const mutate of [
    (v) => (v.modes.mw4.mode = "dmz"),
    (v) => (v.modes.mw4.sourceURL = "https://evil.invalid"),
    (v) => (v.modes.mw4.weapons["han-86"].stats.rpm = Infinity),
    (v) => (v.modes.mw4.weapons["han-86"].damage[0].unit = "m"),
    (v) =>
      v.modes.mw4.weapons["han-86"].damage.push({
        ...v.modes.mw4.weapons["han-86"].damage[0],
        from: 0,
      }),
  ]) {
    const bad = structuredClone(value);
    mutate(bad);
    assert.throws(() => validateCodmunity(bad, db, definitions));
  }
});
test("051 CLI checks and probes share ownership; older status cannot replace newer success", async (t) => {
  const root = await fixture(t);
  let release, begin;
  const started = new Promise((r) => (begin = r));
  const held = monitorCodmunity(root, {
    now: "2020-01-01T00:00:00.000Z",
    fetcher: async (mode) => {
      begin();
      await new Promise((r) => (release = r));
      return codFixture(mode);
    },
  });
  await started;
  await assert.rejects(
    checkCodmunity(root, { fetcher: async (mode) => codFixture(mode) }),
    /EEXIST/,
  );
  release();
  await held;
  await checkCodmunity(root, { fetcher: async (mode) => codFixture(mode) });
  const before = await readFile(join(root, ".local/codmunity-monitor.json"));
  await monitorCodmunity(root, {
    now: "2020-01-01T00:00:00.000Z",
    fetcher: async (mode) => codFixture(mode, { damage: true, warning: false }),
  });
  assert.deepEqual(
    await readFile(join(root, ".local/codmunity-monitor.json")),
    before,
  );
});
test("051 owned monitor serializes, rejects manual writes while probing, aborts and stops on close", async (t) => {
  const root = await fixture(t);
  let starts = 0,
    aborted = false,
    begin;
  const started = new Promise((r) => (begin = r));
  const app = await createWeaponManager({
    root,
    port: 0,
    monitor: true,
    monitorMs: 10,
    runner: async () => ({
      revision: "0".repeat(64),
      sourceDates: {},
      weapons: 33,
      attachments: 643,
      reports: 65,
    }),
    probe: async (root, { signal }) => {
      starts++;
      begin();
      await new Promise((r) =>
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            r();
          },
          { once: true },
        ),
      );
    },
  });
  await started;
  const session = await (await fetch(app.url + "/api/session")).json();
  const response = await fetch(app.url + "/api/action", {
    method: "POST",
    headers: {
      Origin: app.url,
      "Content-Type": "application/json",
      "X-Weapon-Token": session.token,
    },
    body: JSON.stringify({ action: "codmunity-check" }),
  });
  assert.equal(response.status, 409);
  await app.close();
  assert(aborted);
  const before = starts;
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(starts, before);
  assert.equal(starts, 1);
});
