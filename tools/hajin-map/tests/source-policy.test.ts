import { test } from "node:test";
import assert from "node:assert/strict";
import { sourcePolicies, requireCapability } from "../src/workspace/policy.ts";
import { stageSnapshot, consumePreview } from "../src/workspace/import.ts";
import { syntheticSnapshot } from "./fixtures/workspace.ts";

test("new providers are reference-only and cannot grant themselves permission", async () => {
  for (const id of ["codmunity", "wzstats", "codcentral"]) {
    assert.equal(sourcePolicies[id].capability, "referenceOnly");
    assert.throws(() => requireCapability(id, "snapshot"));
    await assert.rejects(
      stageSnapshot(JSON.stringify(syntheticSnapshot(id)), id, 0),
    );
  }
});
test("preview binds bytes, revision, parser/policy version, expires and is single-use", async () => {
  const json = JSON.stringify(syntheticSnapshot("official"));
  const preview = await stageSnapshot(json, "official", 2);
  assert.equal(preview.snapshot.sourceId, "official");
  assert.throws(() => consumePreview(preview, 3), /changed/i);
  const valid = await stageSnapshot(json, "official", 2);
  assert.equal(consumePreview(valid, 2).records.length, 1);
  assert.throws(() => consumePreview(valid, 2), /preview/i);
  assert.throws(() => consumePreview(structuredClone(preview), 2), /preview/i);
});
