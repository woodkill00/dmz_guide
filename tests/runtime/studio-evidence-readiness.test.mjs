import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { openStudioForEvidence } from "../browser/page-edit.mjs";

function fixture({ status = 200, files = [] } = {}) {
  const calls = [];
  const page = {
    waitForResponse(predicate) {
      calls.push("observe");
      assert(
        predicate({
          url: () => "http://localhost/api/changes",
          request: () => ({ method: () => "GET" }),
        }),
      );
      return Promise.resolve({
        status: () => status,
        finished: async () => null,
        json: async () => ({ files, gitAvailable: true }),
      });
    },
    async waitForFunction(predicate, expected) {
      calls.push("render");
      const check = (note, rows) =>
        runInNewContext(`(${predicate.toString()})(expected)`, {
          expected,
          document: {
            querySelector: () => ({ textContent: note }),
            querySelectorAll: () =>
              rows.map((textContent) => ({ textContent })),
          },
        });
      assert.equal(
        check("", []),
        false,
        "Received response is not a rendered summary",
      );
      if (expected.files.length)
        assert.equal(
          check(expected.note, []),
          false,
          "Note alone cannot conceal a missing file list",
        );
      assert.equal(check(expected.note, expected.files), true);
    },
  };
  return {
    page,
    calls,
    action: async () => {
      calls.push("navigate");
    },
  };
}

test("Studio evidence waits for actual response and exact rendered note/list", async () => {
  const f = fixture({
    files: [{ status: "modified", path: "content/catalog/demo/pack.json" }],
  });
  await openStudioForEvidence(f.page, f.action);
  assert.deepEqual(f.calls, ["observe", "navigate", "render"]);
});
test("Studio evidence accepts a completed empty summary, not an empty loading panel", async () => {
  const f = fixture();
  await openStudioForEvidence(f.page, f.action);
  assert.deepEqual(f.calls, ["observe", "navigate", "render"]);
});
test("Studio evidence refuses HTTP failure before inspecting rendered geometry", async () => {
  const f = fixture({ status: 503 });
  await assert.rejects(openStudioForEvidence(f.page, f.action), /503/);
  assert.deepEqual(f.calls, ["observe", "navigate"]);
});
