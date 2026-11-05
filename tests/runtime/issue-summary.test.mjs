import test from "node:test";
import assert from "node:assert/strict";
import { createIssueSummary } from "../../src/ui/issue-summary.mjs";
test("071 issue summary retains failed writes ahead of ready and deduplicates owner/cause", () => {
  const s = createIssueSummary();
  s.report({
    owner: "route",
    cause: "roads",
    message: "Road graph unavailable",
    severity: "warning",
    target: "route-status",
  });
  s.report({
    owner: "editor",
    cause: "save",
    message: "Save not confirmed",
    severity: "error",
    blocking: true,
    target: "save-error",
  });
  s.status("Ready");
  s.report({
    owner: "route",
    cause: "roads",
    message: "Road graph still unavailable",
    severity: "warning",
    target: "route-status",
  });
  const a = s.snapshot();
  assert.equal(a.count, 2);
  assert.equal(a.severity, "error");
  assert.equal(a.issues[0].owner, "editor");
  assert.equal(a.status, "Ready");
  assert.match(a.label, /2 issues/);
  s.clear("editor", "save");
  assert.equal(s.snapshot().severity, "warning");
});
test("071 issue summary rejects injected/invalid identities and returns isolated text data", () => {
  const s = createIssueSummary();
  assert.throws(() => s.report({ owner: "x", cause: "", message: "bad" }));
  s.report({
    owner: "source",
    cause: "load",
    message: "<img onerror=alert(1)>",
    severity: "error",
  });
  const a = s.snapshot();
  a.issues[0].message = "changed";
  assert.match(s.snapshot().issues[0].message, /<img/);
  assert.equal(s.clear("source", "missing"), false);
  s.clear("source", "load");
  assert.equal(s.snapshot().count, 0);
});
