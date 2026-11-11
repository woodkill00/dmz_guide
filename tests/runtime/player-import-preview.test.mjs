import { test } from "node:test";
import assert from "node:assert/strict";
import { previewPlayerImport } from "../../src/domain/player-import-preview.mjs";

test("unsupported player export is inert even with familiar IDs", () => {
  const pack = { items: [{ id: "fixture:item" }] };
  const preview = previewPlayerImport(
    JSON.stringify({
      itemIds: ["fixture:item", "fixture:other"],
      token: "private",
    }),
    pack,
  );
  assert.equal(preview.canApply, false);
  assert.deepEqual(preview.knownItemIds, ["fixture:item"]);
  assert.equal(preview.unknownItemCount, 1);
  assert.equal(JSON.stringify(preview).includes("private"), false);
});
test("oversized and malformed exports fail without a candidate", () => {
  assert.throws(
    () => previewPlayerImport("x".repeat(256 * 1024 + 1), {}),
    /size/,
  );
  assert.throws(() => previewPlayerImport("{", {}), /valid UTF-8 JSON/);
  assert.throws(() => previewPlayerImport("[]", {}), /root/);
});
