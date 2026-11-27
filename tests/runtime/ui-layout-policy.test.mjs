import test from "node:test";
import assert from "node:assert/strict";
import { unapprovedLayoutDeclarations } from "../../scripts/ui-layout-policy.mjs";
test("109 layout guard rejects replacing an approved dimension without increasing the count", () => {
  const approved = {
    file: "owned.css",
    selector: ".quantity",
    property: "width",
    value: "9ch",
  };
  const ledger = { entries: [approved] };
  const sheets = (value) => [
    { file: "owned.css", rawLayoutDeclarations: [{ ...approved, value }] },
  ];
  assert.equal(unapprovedLayoutDeclarations(sheets("9ch"), ledger).length, 0);
  assert.equal(unapprovedLayoutDeclarations(sheets("999px"), ledger).length, 1);
  assert.equal(
    unapprovedLayoutDeclarations(
      sheets("calc(var(--ui-space-unit) * 4)"),
      ledger,
    ).length,
    0,
  );
  assert.equal(
    unapprovedLayoutDeclarations(sheets("calc(999px + 1px)"), ledger).length,
    1,
  );
});
