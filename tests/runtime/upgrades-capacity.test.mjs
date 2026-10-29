import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import { capacityUpgradeFixture } from "../helpers/upgrades-capacity.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeAdvice } from "../../src/domain/upgrade-advice.mjs";
const schema = JSON.parse(await readFile("schemas/pack.schema.json"));
test("maximum valid synthetic root shape: joint cap, 50 warmed runs and common stock pool", async () => {
  let low = 1,
    high = 20000;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    try {
      validatePack(capacityUpgradeFixture(mid), schema);
      low = mid;
    } catch {
      high = mid - 1;
    }
  }
  const pack = capacityUpgradeFixture(low);
  validatePack(pack, schema);
  assert.throws(() => validatePack(capacityUpgradeFixture(low + 1), schema));
  assert(low > 100);
  const profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 17;
  profile.reserves[pack.items[0].id] = 5;
  for (let i = 0; i < 5; i++) upgradeAdvice(pack, profile);
  const timings = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now(),
      result = upgradeAdvice(pack, profile);
    timings.push(performance.now() - start);
    assert.equal(result.status, "ok");
    assert.equal(result.rows[0].required, low * 5);
    assert.equal(result.rows[0].keep, 12);
    assert.equal(result.rows[0].search, low * 5 - 12);
    assert.equal(profile.goals.length, 0);
  }
  timings.sort((a, b) => a - b);
  const p95 = timings[Math.ceil(timings.length * 0.95) - 1];
  assert(p95 <= 250, `p95 ${p95}ms exceeds250ms`);
  assert.equal(
    upgradeAdvice(pack, profile, { workLimit: 10 }).status,
    "blocked",
  );
  await mkdir("test-results/upgrade023-independent", { recursive: true });
  await writeFile(
    "test-results/upgrade023-independent/runtime-capacity.json",
    JSON.stringify(
      {
        runtime: process.version,
        os: os.platform(),
        release: os.release(),
        architecture: os.arch(),
        cpu: os.cpus()[0]?.model,
        logicalCPUs: os.cpus().length,
        roots: low,
        packBytes: Buffer.byteLength(JSON.stringify(pack)),
        warmups: 5,
        runs: 50,
        p95ms: p95,
        maxms: timings.at(-1),
        timings,
      },
      null,
      2,
    ),
  );
});
test("claim-heavy validated scope is indexed once, not objectives × claims", () => {
  const pack = capacityUpgradeFixture(2500);
  pack.claims = Array.from({ length: 5000 }, (_, i) => ({
    id: `test:claim-${i}`,
    entityId: pack.items[1].id,
    field: "synthetic",
    value: null,
    sourceId: pack.sources[0].id,
    locator: "Synthetic fixture only",
    status: "fictional",
  }));
  validatePack(pack, schema);
  const profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 0;
  let reads = 0;
  for (const claim of pack.claims) {
    const id = claim.entityId;
    Object.defineProperty(claim, "entityId", {
      enumerable: true,
      get() {
        reads++;
        return id;
      },
    });
  }
  const result = upgradeAdvice(pack, profile);
  assert.equal(result.status, "ok");
  assert(reads <= 5000, `Unbounded claims scan: ${reads}`);
  assert(result.work < 500000);
  assert.equal(result.rows[0].required, 12500);
});
