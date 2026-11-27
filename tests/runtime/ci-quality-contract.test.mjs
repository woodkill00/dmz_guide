import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertSuiteResults } from "../../scripts/ci-suite-gate.mjs";

const names = ["runtime-core", "browser-acceptance", "studio-acceptance"];
const success = () =>
  Object.fromEntries(names.map((n) => [n, { result: "success" }]));
test("111 aggregate rejects every non-success dependency and malformed/missing results", () => {
  assert.doesNotThrow(() => assertSuiteResults(success()));
  for (const name of names)
    for (const result of ["failure", "cancelled", "skipped", "pending", null]) {
      const value = success();
      value[name].result = result;
      assert.throws(() => assertSuiteResults(value));
    }
  for (const value of [
    null,
    [],
    {},
    { ...success(), extra: { result: "success" } },
  ])
    assert.throws(() => assertSuiteResults(value));
  const missing = success();
  delete missing["runtime-core"];
  assert.throws(() => assertSuiteResults(missing));
});

test("111 workflow isolates suite budgets while retaining pinned coverage and fail-closed names", async () => {
  const yaml = await readFile(".github/workflows/quality.yml", "utf8");
  const sections = new Map(
    [
      ...yaml.matchAll(
        /^  ([a-z][a-z-]+):\n([\s\S]*?)(?=^  [a-z][a-z-]+:|$(?![\s\S]))/gm,
      ),
    ].map((m) => [m[1], m[2]]),
  );
  for (const name of names) {
    const job = sections.get(name);
    assert.ok(job, `missing ${name}`);
    assert.match(job, /os: \[ubuntu-latest, windows-latest\]/);
    assert.match(job, /fail-fast: false/);
    assert.match(job, /timeout-minutes: 45/);
    assert.match(job, /npm ci --ignore-scripts/);
    assert.match(job, /npm run build/);
  }
  const core = sections.get("runtime-core");
  for (const command of [
    "npm test",
    "npm run skills:check",
    "npm run format:check",
    "npm run ui:audit",
    "python -m unittest discover -s tests -p test_package_diagnostics.py -v",
    "npm run package && python scripts/verify-release.py",
  ])
    assert.ok(core.includes(`run: ${command}\n`), command);
  const browser = sections.get("browser-acceptance");
  for (const command of [
    "node tests/browser/measured-scale-runner.mjs",
    "node tests/browser/contributor-workflows.mjs",
    "npm run test:browser",
    "node tests/browser/reliability.mjs",
  ])
    assert.ok(browser.includes(`run: ${command}\n`), command);
  assert.ok(
    sections.get("studio-acceptance").includes("run: npm run test:studio\n"),
  );
  assert.ok(
    !core.includes("run: npm run test:browser\n") &&
      !core.includes("run: npm run test:studio\n"),
  );
  const gate = sections.get("runtime-checks");
  assert.match(gate, /name: runtime-checks \(\$\{\{ matrix.os \}\}\)/);
  assert.match(gate, /if: \$\{\{ always\(\) \}\}/);
  assert.match(
    gate,
    /needs: \[runtime-core, browser-acceptance, studio-acceptance\]/,
  );
  assert.match(gate, /DMZ_SUITE_RESULTS: \$\{\{ toJSON\(needs\) \}\}/);
  assert.match(gate, /run: node scripts\/ci-suite-gate.mjs/);
  assert.ok(!/continue-on-error: true/.test(yaml));
  for (const match of yaml.matchAll(/uses: ([^\s]+)/g))
    assert.match(match[1], /@[a-f0-9]{40}$/, "immutable action pin");
  for (const owner of [
    "repository-checks",
    "runtime-compatibility",
    "page-editor",
    "browser-engines",
  ])
    assert.ok(sections.has(owner), `retained ${owner}`);
});
