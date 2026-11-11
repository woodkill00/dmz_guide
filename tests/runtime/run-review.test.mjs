import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyRunReview,
  addReviewEntry,
  rejectReviewEntry,
  receiptForSavedEntry,
  markReviewUncertain,
  reconcileUncertainEntry,
  commitReviewedOwner,
  validateRunReview,
} from "../../src/domain/run-review.mjs";

const entry = (id, owner = "inventory") => ({
  id,
  owner,
  label: id,
  expectedRevision: 3,
  payload: owner === "boss" ? {bossId:"fixture:target",event:"attempt",date:"2026-11-11",notes:""} : {itemId:"fixture:wire",pool:"stash",mode:"delta",quantity:1},
});
test("partial owner success keeps remaining work staged and prevents replay", () => {
  let review = emptyRunReview("fixture:pack");
  review = addReviewEntry(review, entry("loot"));
  review = addReviewEntry(review, entry("boss", "boss"));
  const saved = receiptForSavedEntry(review, "loot", 4, "2026-11-11T12:00:00Z");
  assert.deepEqual(
    saved.entries.map((row) => row.state),
    ["saved", "staged"],
  );
  assert.equal(saved.receipts.length, 1);
  assert.throws(
    () => receiptForSavedEntry(saved, "loot", 5, "2026-11-11T12:01:00Z"),
    /already handled/,
  );
  assert.equal(review.entries[0].state, "staged");
});
test("rejected entry cannot be saved and forged receipts fail validation", () => {
  const review = rejectReviewEntry(
    addReviewEntry(emptyRunReview("fixture:pack"), entry("loot")),
    "loot",
  );
  assert.throws(
    () => receiptForSavedEntry(review, "loot", 4, "2026-11-11T12:00:00Z"),
    /already handled/,
  );
  assert.throws(
    () =>
      validateRunReview({
        ...review,
        receipts: [
          {
            entryId: "loot",
            owner: "inventory",
            ownerRevision: 4,
            savedAt: "2026-11-11T12:00:00Z",
          },
        ],
      }),
    /Receipt without saved/,
  );
});
test("review bounds and owner allowlist reject unsafe drafts", () => {
  assert.throws(
    () =>
      addReviewEntry(emptyRunReview("fixture:pack"), entry("bad", "account")),
    /Invalid run review (entry|report)/,
  );
  let review = emptyRunReview("fixture:pack");
  for (let index = 0; index < 64; index++)
    review = addReviewEntry(review, entry(`row-${index}`));
  assert.throws(
    () => addReviewEntry(review, entry("overflow")),
    /Invalid run review/,
  );
  assert.throws(
    () =>
      addReviewEntry(emptyRunReview("fixture:pack"), {
        ...entry("secret"),
        payload: { token: "not allowed" },
      }),
    /Invalid run review report/,
  );
});
test("interrupted owner save cannot replay until its actual outcome is reconciled", () => {
  const staged = addReviewEntry(emptyRunReview("fixture:pack"), entry("loot"));
  const uncertain = markReviewUncertain(staged, "loot");
  assert.throws(
    () => receiptForSavedEntry(uncertain, "loot", 4, "2026-11-11T12:00:00Z"),
    /already handled/,
  );
  assert.throws(
    () =>
      reconcileUncertainEntry(uncertain, "loot", "saved", {
        ownerRevision: 3,
        savedAt: "2026-11-11T12:00:00Z",
      }),
    /revision required/,
  );
  const saved = reconcileUncertainEntry(uncertain, "loot", "saved", {
    ownerRevision: 4,
    savedAt: "2026-11-11T12:00:00Z",
  });
  assert.equal(saved.entries[0].state, "saved");
  assert.equal(saved.receipts[0].ownerRevision, 4);
  assert.equal(
    reconcileUncertainEntry(uncertain, "loot", "not-saved").entries[0].state,
    "staged",
  );
  assert.throws(
    () => receiptForSavedEntry(staged, "loot", 3, "2026-11-11T12:00:00Z"),
    /did not advance/,
  );
});
test("owner write is fenced durably first and a failed receipt cannot authorize replay", async () => {
  const staged = addReviewEntry(emptyRunReview("fixture:pack"), entry("loot"));
  let durable = staged;
  const order = [];
  const save = async (doc, revision) => {
    assert.equal(durable.revision, revision);
    order.push(`review:${doc.entries[0].state}`);
    if (doc.entries[0].state === "saved") throw Error("receipt disk full");
    durable = { ...doc, revision: revision + 1 };
    return durable;
  };
  await assert.rejects(
    commitReviewedOwner(
      staged,
      "loot",
      async () => {
        order.push("owner");
        return 4;
      },
      save,
    ),
    /receipt disk full/,
  );
  assert.deepEqual(order, ["review:uncertain", "owner", "review:saved"]);
  assert.equal(durable.entries[0].state, "uncertain");
  await assert.rejects(
    commitReviewedOwner(durable, "loot", async () => 5, save),
    /already handled/,
  );
});
