import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateCorrection,
  parseCorrection,
  validateReview,
  discordURL,
} from "../../src/domain/corrections.mjs";
const correction = {
  schemaVersion: 1,
  packId: "demo:training-pack",
  contentVersion: "1",
  entityId: "demo:wire",
  field: "description",
  currentValue: "Old",
  proposedValue: "New",
  reason: "Observed source discrepancy",
  evidenceUrl: "https://example.com/evidence",
  attribution: "Contributor",
  rights: "Original text, MIT",
};
test("canonical correction and local review preserve inert text", () => {
  assert.equal(validateCorrection(correction), correction);
  assert.equal(
    parseCorrection(JSON.stringify(correction)).proposedValue,
    "New",
  );
  assert.equal(
    validateReview({
      schemaVersion: 1,
      correction,
      decision: "needs-evidence",
      reviewer: "Local reviewer",
      notes: "Check source scope",
    }).decision,
    "needs-evidence",
  );
});
test("correction adversarial boundary rejects unsupported data and private fields", () => {
  for (const patch of [
    { inventory: {} },
    { schemaVersion: 2 },
    { reason: "" },
    { entityId: "a:" + "b".repeat(100) },
    { evidenceUrl: "javascript:alert(1)" },
    { evidenceUrl: "https://user:pass@example.com" },
    { proposedValue: "x".repeat(8001) },
  ])
    assert.throws(() => validateCorrection({ ...correction, ...patch }));
  assert.throws(() => parseCorrection('{"schemaVersion":1,"schemaVersion":1}'));
  assert.throws(() => parseCorrection(" ".repeat(262145)));
  assert.throws(() =>
    validateReview({
      schemaVersion: 1,
      correction,
      decision: "publish",
      reviewer: "a",
      notes: "b",
    }),
  );
});
test("Discord accepts only explicit invite destinations without credentials/query", () => {
  assert.equal(discordURL(null), null);
  assert.equal(
    discordURL("https://discord.gg/validCode"),
    "https://discord.gg/validCode",
  );
  assert.equal(
    discordURL("https://discord.com/invite/validCode"),
    "https://discord.com/invite/validCode",
  );
  for (const v of [
    "https://discord.gg.evil.test/a",
    "http://discord.gg/a",
    "https://discord.com/channels/a",
    "https://discord.gg/a?track=1",
    "https://user@discord.gg/a",
  ])
    assert.throws(() => discordURL(v));
});
