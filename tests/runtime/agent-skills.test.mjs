import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  copyFile,
  symlink,
  readdir,
  lstat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { validateAgentSkills } from "../../scripts/check-agent-skills.mjs";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const mapping = [
  ["diagnose", "engineering/diagnosing-bugs", "diagnosis"],
  ["test-first", "engineering/tdd", "testing"],
  ["review", "engineering/code-review", "review"],
  ["domain", "engineering/domain-modeling", "domain"],
  ["write-agents", "productivity/writing-for-agents", "writing"],
  ["handoff", "productivity/handoff", "handoff"],
  ["retro", "engineering/retro", "retro"],
  ["research", "engineering/research", "research"],
  ["prototype", "engineering/prototype", "prototype"],
  ["design", "engineering/codebase-design", "design"],
  ["architecture", "engineering/improve-codebase-architecture", "architecture"],
  ["pr", "engineering/pr", "pr"],
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

for (const suffix of [
  "\npolicy:\n  allow_implicit_invocation: false\n",
  '\ninterface:\n  display_name: "Second interface"\n',
  "\nthis is not valid supported metadata\n",
  "\ndependencies:\n  unexpected: true\n",
])
  test(`rejects ambiguous metadata ${JSON.stringify(suffix)}`, async (t) => {
    const f = await fixture(t);
    const path = `${f.lock.helpers[0].path}/agents/openai.yaml`;
    await f.tracked(
      path,
      (await readFile(join(f.root, path), "utf8")) + suffix,
    );
    await f.save();
    assert.ok(
      (await validateAgentSkills(f.root)).some((error) =>
        /metadata/i.test(error),
      ),
    );
  });

test("CLI resolves a spaced checkout from another working directory", async (t) => {
  const f = await fixture(t);
  await f.put(
    "scripts/check-agent-skills.mjs",
    await readFile(join(repository, "scripts/check-agent-skills.mjs")),
  );
  const output = execFileSync(
    process.execPath,
    [join(f.root, "scripts/check-agent-skills.mjs"), "--list"],
    { cwd: tmpdir(), encoding: "utf8", timeout: 30000, windowsHide: true },
  );
  assert.deepEqual(
    output.trim().split(/\r?\n/),
    f.lock.helpers.map((helper) => `${helper.name}\t${helper.path}`),
  );
});
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "agent skills "));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (path, bytes) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  };
  const official = await readFile(join(repository, "speckit.lock.json"));
  await put("speckit.lock.json", official);
  for (const path of Object.keys(JSON.parse(official).files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await copyFile(join(repository, path), join(root, path));
  }
  const lock = {
    schemaVersion: 1,
    upstream: {
      repository: "mattpocock/skills",
      commit: "6f7f7831a625f040a8e06a0e7954826b87ce775a",
      license: "vendor/agent-skills/mattpocock/LICENSE",
    },
    baseline: { speckitLockSha256: sha(official) },
    helpers: mapping.map(([suffix, source, capability]) => ({
      name: `dmz-${suffix}`,
      path: `.agents/skills/dmz-${suffix}`,
      source: `skills/${source}`,
      capability,
    })),
    files: {},
  };
  const tracked = async (path, bytes) => {
    await put(path, bytes);
    lock.files[path] = sha(bytes);
  };
  await tracked(lock.upstream.license, "Synthetic MIT license\n");
  await tracked(
    "vendor/agent-skills/mattpocock/NOTICE.md",
    "Synthetic provenance\n",
  );
  for (const helper of lock.helpers) {
    await tracked(
      `vendor/agent-skills/mattpocock/${posix.basename(helper.source)}/SKILL.md`,
      "Original fixture instructions\n",
    );
    await tracked(
      `${helper.path}/SKILL.md`,
      `---\nname: ${helper.name}\ndescription: Synthetic fixture instructions.\n---\nRead [reference](reference.md).\n`,
    );
    await tracked(`${helper.path}/reference.md`, "Fictional reference.\n");
    await tracked(
      `${helper.path}/agents/openai.yaml`,
      `interface:\n  display_name: "Synthetic helper"\n  short_description: "Synthetic fixture"\n  default_prompt: "Use $${helper.name} for this task."\npolicy:\n  allow_implicit_invocation: true\n`,
    );
  }
  const save = () => put("agent-skills.lock.json", JSON.stringify(lock));
  await save();
  return { root, lock, put, tracked, save };
}

test("valid synthetic install is read only and diagnostics are stable", async (t) => {
  const f = await fixture(t);
  async function snapshot(path = "") {
    const result = {};
    for (const name of await readdir(join(f.root, path))) {
      const relative = path ? `${path}/${name}` : name;
      const info = await lstat(join(f.root, relative));
      if (info.isDirectory()) Object.assign(result, await snapshot(relative));
      else result[relative] = sha(await readFile(join(f.root, relative)));
    }
    return result;
  }
  const before = await snapshot();
  assert.deepEqual(await validateAgentSkills(f.root), []);
  assert.deepEqual(await snapshot(), before);
});

for (const [title, mutate, expected] of [
  [
    "changed bytes",
    (f) => f.put(`${f.lock.helpers[0].path}/reference.md`, "tampered"),
    /digest|sha256/i,
  ],
  [
    "missing license",
    (f) => rm(join(f.root, f.lock.upstream.license)),
    /LICENSE/,
  ],
  [
    "unregistered file",
    (f) => f.put(`${f.lock.helpers[0].path}/extra.md`, "extra"),
    /unregistered|inventory/i,
  ],
  [
    "unregistered helper",
    (f) => f.put(".agents/skills/dmz-extra/SKILL.md", "extra"),
    /unregistered|unexpected/i,
  ],
  [
    "schema",
    async (f) => {
      f.lock.schemaVersion = 2;
      await f.save();
    },
    /schema/i,
  ],
  [
    "upstream pin",
    async (f) => {
      f.lock.upstream.commit = "0".repeat(40);
      await f.save();
    },
    /commit/i,
  ],
  [
    "duplicate name",
    async (f) => {
      f.lock.helpers[1].name = f.lock.helpers[0].name;
      await f.save();
    },
    /helper|duplicate/i,
  ],
  [
    "missing helper",
    async (f) => {
      f.lock.helpers.pop();
      await f.save();
    },
    /helper/i,
  ],
  [
    "case collision",
    async (f) => {
      f.lock.files["VENDOR/agent-skills/mattpocock/LICENSE"] = "0".repeat(64);
      await f.save();
    },
    /case|collision/i,
  ],
  [
    "frontmatter name",
    async (f) => {
      await f.tracked(
        `${f.lock.helpers[0].path}/SKILL.md`,
        "---\nname: wrong\ndescription: fixture\n---\n",
      );
      await f.save();
    },
    /name/,
  ],
  [
    "metadata invocation",
    async (f) => {
      await f.tracked(
        `${f.lock.helpers[0].path}/agents/openai.yaml`,
        "interface:\n  default_prompt: use $dmz-diagnose-extra\npolicy:\n  allow_implicit_invocation: false\n",
      );
      await f.save();
    },
    /invocation|prompt/,
  ],
  [
    "quoted invocation boolean",
    async (f) => {
      const path = `${f.lock.helpers[0].path}/agents/openai.yaml`;
      const text = await readFile(join(f.root, path), "utf8");
      await f.tracked(
        path,
        text.replace(
          "allow_implicit_invocation: true",
          'allow_implicit_invocation: "true"',
        ),
      );
      await f.save();
    },
    /allow_implicit_invocation/,
  ],
  [
    "missing reference",
    async (f) => {
      await f.tracked(
        `${f.lock.helpers[0].path}/SKILL.md`,
        "---\nname: dmz-diagnose\ndescription: fixture\n---\n[missing](absent.md)\n",
      );
      await f.save();
    },
    /absent.md/,
  ],
  [
    "escaping reference",
    async (f) => {
      await f.tracked(
        `${f.lock.helpers[0].path}/SKILL.md`,
        "---\nname: dmz-diagnose\ndescription: fixture\n---\n[escape](../../../../outside.md)\n",
      );
      await f.save();
    },
    /escape|outside.md/,
  ],
  [
    "unknown cross helper",
    async (f) => {
      await f.tracked(
        `${f.lock.helpers[0].path}/SKILL.md`,
        "---\nname: dmz-diagnose\ndescription: fixture\n---\nUse $dmz-unregistered.\n",
      );
      await f.save();
    },
    /dmz-unregistered/,
  ],
  [
    "changed official file",
    (f) => f.put(".agents/skills/speckit-plan/SKILL.md", "tampered"),
    /speckit-plan/,
  ],
  [
    "rewritten baseline",
    async (f) => {
      f.lock.baseline.speckitLockSha256 = "0".repeat(64);
      await f.save();
    },
    /baseline|speckit/i,
  ],
  [
    "extra original companion",
    (f) => f.put("vendor/agent-skills/mattpocock/unknown/README.md", "extra"),
    /unregistered/,
  ],
  [
    "registered unknown source",
    async (f) => {
      await f.tracked(
        "vendor/agent-skills/mattpocock/unknown/SKILL.md",
        "extra",
      );
      await f.save();
    },
    /outside owned/,
  ],
  [
    "reference-style missing target",
    async (f) => {
      await f.tracked(
        `${f.lock.helpers[0].path}/reference.md`,
        "Read [missing][local].\n\n[local]: missing.md\n",
      );
      await f.save();
    },
    /missing.md/,
  ],
  [
    "missing source",
    (f) =>
      rm(
        join(
          f.root,
          `vendor/agent-skills/mattpocock/${posix.basename(f.lock.helpers[0].source)}/SKILL.md`,
        ),
      ),
    /SKILL.md/,
  ],
  [
    "duplicate JSON key",
    async (f) => {
      const json = JSON.stringify(f.lock);
      await f.put(
        "agent-skills.lock.json",
        json.replace(
          '"schemaVersion":1',
          '"schemaVersion":2,"schemaVersion":1',
        ),
      );
    },
    /duplicate/i,
  ],
])
  test(`rejects ${title}`, async (t) => {
    const f = await fixture(t);
    await mutate(f);
    const errors = await validateAgentSkills(f.root);
    assert.ok(
      errors.some((error) => expected.test(error)),
      errors.join("\n"),
    );
    assert.deepEqual(errors, [...errors].sort());
  });

for (const path of [
  "../outside.md",
  "/absolute.md",
  "C:/absolute.md",
  "a\\b.md",
  "a/./b.md",
  "a//b.md",
  "a/../b.md",
  "a/NUL.md",
]) {
  test(`rejects unsafe inventory path ${path}`, async (t) => {
    const f = await fixture(t);
    f.lock.files[path] = "0".repeat(64);
    await f.save();
    assert.ok(
      (await validateAgentSkills(f.root)).some((error) =>
        /unsafe.*path/i.test(error),
      ),
    );
  });
}
test("supports quoted YAML scalars and registered cross-helper links", async (t) => {
  const f = await fixture(t);
  await f.tracked(
    `${f.lock.helpers[0].path}/SKILL.md`,
    "---\nname: \"dmz-diagnose\"\ndescription: 'Synthetic scalar'\n---\nUse $dmz-review and [review](../dmz-review/SKILL.md).\n",
  );
  await f.save();
  assert.deepEqual(await validateAgentSkills(f.root), []);
});
test("rejects symlink ancestor without reading outside the checkout", async (t) => {
  const f = await fixture(t);
  const path = `${f.lock.helpers[0].path}/agents`;
  await rm(join(f.root, path), { recursive: true });
  try {
    await symlink(
      tmpdir(),
      join(f.root, path),
      process.platform === "win32" ? "junction" : "dir",
    );
  } catch (error) {
    if (["EPERM", "EACCES"].includes(error.code)) {
      t.skip("OS denies symlink creation");
      return;
    }
    throw error;
  }
  assert.ok(
    (await validateAgentSkills(f.root)).some((error) => /symlink/i.test(error)),
  );
});
