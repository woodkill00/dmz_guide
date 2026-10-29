import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coverage,
  type ExplorerRecord,
} from "../src/workspace/explorer-index.ts";
import { captureIdentity } from "../src/workspace/usability.ts";
const row = (
  sourceId: string,
  id: string,
  title: string,
  x: number,
  category = "police",
): ExplorerRecord => ({
  key: sourceId + id,
  identity: captureIdentity(sourceId, "capture", "a".repeat(64), id),
  id,
  kind: "source",
  sourceId,
  sourceName: sourceId,
  title,
  category,
  categoryId: category,
  notes: "",
  x,
  y: 100,
  floor: 'surface',
  build: 'fixture-v1',
  visible: true,
  status: "unknown",
  capturedAt: null,
  url: null,
});
test("completeness distinguishes loaded matches, name/location conflicts, absent categories and missing official input", () => {
  const o = row("official", "o", "Station", 100),
    same = row("codcentral", "a", "Station", 101),
    near = row("codcentral", "b", "Different", 102),
    far = row("codcentral", "c", "Station", 500),
    missing = row("wzstats", "d", "Key", 400, "key");
  const c = coverage([o, same, near, far, missing]);
  assert.equal(c.available, true);
  assert.deepEqual(
    c.rows.map((r) => r.state),
    ["matched", "uncertain", "uncertain", "not-found"],
  );
  assert.equal(coverage([missing]).available, false);
  assert.equal(coverage([o,{...same,floor:null}]).rows[0].state,'uncertain');
  assert.equal(coverage([{...o,build:null},same]).rows[0].state,'uncertain');
  assert.equal(
    coverage([o, { ...same, x: null, y: null }]).rows[0].state,
    "unplaced",
  );
  assert.equal(
    coverage([
      { ...o, floor: "1" },
      { ...same, floor: "2" },
    ]).rows[0].state,
    "uncertain",
  );
  assert.equal(
    coverage([o, same], [{ a: o.identity!, b: same.identity! }]).rows[0].state,
    "kept-separate",
  );
});
test("unexamined coverage after bounded work is incomplete, never missing", () => {
  const records = [
    row("official", "1", "First", 100),
    row("official", "2", "Second", 101),
    row("codcentral", "3", "Other", 100),
    row("wzstats", "4", "Key", 500, "key"),
  ];
  const result = coverage(records, [], 1);
  assert.equal(result.truncated, true);
  assert.ok(result.rows.every((r) => r.state === "incomplete"));
});
