import { lstat, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HELPER_DEFINITIONS = Object.freeze(
  [
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
    [
      "architecture",
      "engineering/improve-codebase-architecture",
      "architecture",
    ],
    ["pr", "engineering/pr", "pr"],
  ].map(([suffix, source, capability]) =>
    Object.freeze({
      name: `dmz-${suffix}`,
      path: `.agents/skills/dmz-${suffix}`,
      source: `skills/${source}`,
      capability,
    }),
  ),
);
const VENDOR = "vendor/agent-skills/mattpocock";
const BASELINE =
  "5c9d28e2c6e89ad554dd958252fc9592ad8d81c3d9b4b8bf1396e6556f8b0251";
const SHA256 = /^[a-f0-9]{64}$/;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safePath = (value) =>
  typeof value === "string" &&
  value.length <= 500 &&
  !/[\\:\x00-\x1f]/.test(value) &&
  !value.startsWith("/") &&
  value
    .split("/")
    .every(
      (part) =>
        part &&
        part !== "." &&
        part !== ".." &&
        !/[. ]$/.test(part) &&
        !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    );
const ownedRoots = HELPER_DEFINITIONS.map((helper) => helper.path);
const sourceRoots = HELPER_DEFINITIONS.map(
  (helper) => `${VENDOR}/${posix.basename(helper.source)}`,
);
const owned = (path) =>
  [`${VENDOR}/LICENSE`, `${VENDOR}/NOTICE.md`].includes(path) ||
  [...sourceRoots, ...ownedRoots].some((root) => path.startsWith(`${root}/`));

// Deliberately a bounded scalar subset, not a general YAML interpreter.
function scalar(value) {
  const text = value.trim();
  if (text.startsWith('"')) {
    try {
      const result = JSON.parse(text);
      return typeof result === "string" ? result : null;
    } catch {
      return null;
    }
  }
  if (text.startsWith("'"))
    return /^'(?:[^']|'')*'$/.test(text)
      ? text.slice(1, -1).replaceAll("''", "'")
      : null;
  return text && !/^[\[\]{}&*!|>]/.test(text)
    ? text.replace(/\s+#.*$/, "")
    : null;
}
function fields(text, indent = "") {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(new RegExp(`^${indent}([a-z_]+):\\s*(.*)$`));
    if (match)
      values.set(match[1], values.has(match[1]) ? null : scalar(match[2]));
  }
  return values;
}

// Local UI files deliberately use two unique sections and quoted string fields.
// Reject unknown syntax instead of pretending a partial regex parse is YAML.
function uiFields(text, path, fail) {
  const sections = new Map();
  const allowed = {
    interface: new Set(["display_name", "short_description", "default_prompt"]),
    policy: new Set(["allow_implicit_invocation"]),
  };
  let current;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const heading = line.match(/^(interface|policy):\s*$/);
    if (heading) {
      current = heading[1];
      if (sections.has(current))
        fail(`${path}: duplicate metadata section ${current}`);
      else sections.set(current, new Map());
      continue;
    }
    const entry = line.match(/^  ([a-z_]+):\s*(.+)$/);
    if (!entry || !current || !allowed[current].has(entry[1])) {
      fail(`${path}: unsupported or malformed metadata line`);
      continue;
    }
    const values = sections.get(current);
    if (values.has(entry[1]))
      fail(`${path}: duplicate metadata field ${entry[1]}`);
    const value = entry[2];
    if (current === "policy") {
      if (!/^true *(?:#.*)?$/.test(value))
        fail(`${path}: metadata allow_implicit_invocation must be true`);
      values.set(entry[1], value.replace(/\s+#.*$/, ""));
    } else {
      const parsed = /^["']/.test(value) ? scalar(value) : null;
      if (!parsed)
        fail(`${path}: metadata ${entry[1]} must be a quoted string`);
      values.set(entry[1], parsed);
    }
  }
  return sections;
}

// JSON.parse silently discards duplicate properties. Reject them before trusting a lock.
function duplicateJsonKeys(text) {
  const tokens =
    text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|[^\s{}\[\]:,]+/g) ?? [];
  const stack = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === "{") stack.push(new Set());
    else if (token === "[") stack.push(null);
    else if (token === "}" || token === "]") stack.pop();
    else if (
      token.startsWith('"') &&
      tokens[index + 1] === ":" &&
      stack.at(-1)
    ) {
      const key = JSON.parse(token);
      if (stack.at(-1).has(key)) return true;
      stack.at(-1).add(key);
    }
  }
  return false;
}

/** Offline structural validation only; does not execute or prove agent behavior. */
export async function validateAgentSkills(root) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const base = resolve(root);
  let operations = 0;
  async function inspect(path) {
    if (!safePath(path)) {
      fail(`Unsafe path: ${String(path)}`);
      return null;
    }
    let current = base;
    try {
      for (const part of path.split("/")) {
        current = resolve(current, part);
        const info = await lstat(current);
        if (info.isSymbolicLink()) {
          fail(`Symlink forbidden: ${path}`);
          return null;
        }
      }
      return await lstat(current);
    } catch (error) {
      fail(`${path}: ${error.code ?? error.message}`);
      return null;
    }
  }
  async function bytes(path) {
    const info = await inspect(path);
    if (!info) return null;
    if (!info.isFile() || info.size > 2_000_000) {
      fail(`${path}: expected regular file of at most 2000000 bytes`);
      return null;
    }
    return readFile(resolve(base, path));
  }
  async function json(path) {
    const data = await bytes(path);
    if (!data) return null;
    try {
      const text = data.toString("utf8");
      const value = JSON.parse(text);
      if (duplicateJsonKeys(text)) {
        fail(`${path}: duplicate JSON property`);
        return null;
      }
      return value;
    } catch {
      fail(`${path}: invalid JSON`);
      return null;
    }
  }
  async function walk(path, depth = 0) {
    if (++operations > 4096 || depth > 16) {
      fail(`${path}: inventory limit exceeded`);
      return [];
    }
    const info = await inspect(path);
    if (!info) return [];
    if (info.isFile()) return [path];
    if (!info.isDirectory()) {
      fail(`${path}: expected regular file or directory`);
      return [];
    }
    const entries = await readdir(resolve(base, path));
    if (entries.length > 4096) {
      fail(`${path}: inventory limit exceeded`);
      return [];
    }
    const files = [];
    for (const entry of entries.sort())
      files.push(...(await walk(`${path}/${entry}`, depth + 1)));
    return files;
  }
  const lock = await json("agent-skills.lock.json");
  if (!record(lock))
    return [...errors, "agent-skills.lock.json: expected object"].sort();
  if (lock.schemaVersion !== 1)
    fail("agent-skills.lock.json: schemaVersion must be 1");
  if (lock.upstream?.repository !== "mattpocock/skills")
    fail("upstream.repository: expected mattpocock/skills");
  if (lock.upstream?.commit !== "6f7f7831a625f040a8e06a0e7954826b87ce775a")
    fail("upstream.commit: unexpected source commit");
  if (lock.upstream?.license !== `${VENDOR}/LICENSE`)
    fail("upstream.license: expected vendored LICENSE");
  if (lock.baseline?.speckitLockSha256 !== BASELINE)
    fail("baseline.speckitLockSha256: unexpected official lock digest");
  if (!Array.isArray(lock.helpers) || lock.helpers.length !== 12)
    fail("helpers: expected exactly twelve approved helpers");
  const helpers = Array.isArray(lock.helpers) ? lock.helpers : [];
  for (const expected of HELPER_DEFINITIONS) {
    const matches = helpers.filter((helper) => helper?.name === expected.name);
    if (
      matches.length !== 1 ||
      Object.entries(expected).some(
        ([key, value]) => matches[0]?.[key] !== value,
      )
    )
      fail(`helpers: invalid or missing mapping for ${expected.name}`);
  }
  const inventory = record(lock.files) ? lock.files : {};
  if (!record(lock.files) || Object.keys(inventory).length > 4096) {
    fail("files: expected bounded SHA256 inventory");
    return errors.sort();
  }
  const seen = new Set();
  for (const [path, digest] of Object.entries(inventory)) {
    const folded = path.toLowerCase();
    if (seen.has(folded)) fail(`Case collision in inventory: ${path}`);
    seen.add(folded);
    if (!safePath(path)) {
      fail(`Unsafe inventory path: ${path}`);
      continue;
    }
    if (!owned(path)) {
      fail(`${path}: outside owned inventory roots`);
      continue;
    }
    if (!SHA256.test(digest)) {
      fail(`${path}: expected lowercase SHA256`);
      continue;
    }
    const data = await bytes(path);
    if (data && hash(data) !== digest) fail(`${path}: SHA256 digest mismatch`);
  }
  const required = [`${VENDOR}/LICENSE`, `${VENDOR}/NOTICE.md`];
  for (const helper of HELPER_DEFINITIONS)
    required.push(
      `${VENDOR}/${posix.basename(helper.source)}/SKILL.md`,
      `${helper.path}/SKILL.md`,
      `${helper.path}/agents/openai.yaml`,
    );
  for (const path of required)
    if (!(path in inventory)) fail(`${path}: missing required inventory entry`);
  for (const path of await walk(VENDOR))
    if (!(path in inventory)) fail(`${path}: unregistered inventory file`);
  const skillInfo = await inspect(".agents/skills");
  if (skillInfo?.isDirectory()) {
    const officialNames = [
      "analyze",
      "checklist",
      "clarify",
      "constitution",
      "converge",
      "implement",
      "plan",
      "specify",
      "tasks",
      "taskstoissues",
    ].map((name) => `speckit-${name}`);
    const allowed = new Set([
      ...officialNames,
      ...HELPER_DEFINITIONS.map((helper) => helper.name),
    ]);
    for (const name of await readdir(resolve(base, ".agents/skills")))
      if (!allowed.has(name))
        fail(`.agents/skills/${name}: unregistered helper`);
  }
  for (const helper of HELPER_DEFINITIONS) {
    for (const path of await walk(helper.path))
      if (!(path in inventory)) fail(`${path}: unregistered inventory file`);
    const skill = await bytes(`${helper.path}/SKILL.md`);
    if (skill) {
      const text = skill.toString("utf8");
      const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      const metadata = fields(frontmatter?.[1] ?? "");
      if (metadata.get("name") !== helper.name)
        fail(
          `${helper.path}/SKILL.md: frontmatter name must be ${helper.name}`,
        );
      if (!metadata.get("description"))
        fail(`${helper.path}/SKILL.md: required scalar description`);
    }
    const metadata = await bytes(`${helper.path}/agents/openai.yaml`);
    if (metadata) {
      const text = metadata.toString("utf8");
      const sections = uiFields(
        text,
        `${helper.path}/agents/openai.yaml`,
        fail,
      );
      const info = sections.get("interface") ?? new Map();
      if (!info.get("display_name") || !info.get("short_description"))
        fail(
          `${helper.path}/agents/openai.yaml: interface display_name and short_description required`,
        );
      const prompt = info.get("default_prompt") ?? "";
      if (!new RegExp(`\\$${helper.name}(?![a-zA-Z0-9_-])`).test(prompt))
        fail(
          `${helper.path}/agents/openai.yaml: default_prompt must invoke $${helper.name}`,
        );
      if (sections.get("policy")?.get("allow_implicit_invocation") !== "true")
        fail(
          `${helper.path}/agents/openai.yaml: allow_implicit_invocation must be true`,
        );
    }
  }
  // References in adapted Markdown are authoritative; upstream is preserved inert history.
  for (const path of Object.keys(inventory).filter(
    (path) =>
      ownedRoots.some((root) => path.startsWith(`${root}/`)) &&
      path.endsWith(".md"),
  )) {
    const data = await bytes(path);
    if (!data) continue;
    const text = data.toString("utf8");
    for (const match of text.matchAll(/\$dmz-[a-z0-9-]+/g))
      if (!HELPER_DEFINITIONS.some((helper) => `$${helper.name}` === match[0]))
        fail(`${path}: unregistered helper reference ${match[0]}`);
    const references = [
      ...text.matchAll(
        /!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g,
      ),
      ...text.matchAll(/^ {0,3}\[[^\]\n]+\]:\s*(<[^>]+>|[^\s]+)(?:\s|$)/gm),
    ];
    for (const match of references) {
      let target = match[1].replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      try {
        target = decodeURIComponent(target.split(/[?#]/)[0]);
      } catch {
        fail(`${path}: invalid reference ${target}`);
        continue;
      }
      if (!target) continue;
      const destination = posix.normalize(
        posix.join(posix.dirname(path), target),
      );
      if (
        target.startsWith("/") ||
        /[\\:]/.test(target) ||
        !safePath(destination)
      ) {
        fail(`${path}: escaping or unsafe reference ${target}`);
        continue;
      }
      const info = await inspect(destination);
      if (info && !info.isFile())
        fail(`${path}: reference must resolve to a file: ${destination}`);
    }
  }
  const officialBytes = await bytes("speckit.lock.json");
  if (officialBytes) {
    if (hash(officialBytes) !== BASELINE)
      fail("speckit.lock.json: official baseline digest mismatch");
    else {
      const official = JSON.parse(officialBytes.toString("utf8"));
      for (const [path, digest] of Object.entries(official.files)) {
        const data = await bytes(path);
        if (data && hash(data) !== digest)
          fail(`${path}: official Spec Kit SHA256 mismatch`);
      }
    }
  }
  return [...new Set(errors)].sort();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--list") || args.length > 1) {
    console.error("Usage: node scripts/check-agent-skills.mjs [--list]");
    process.exitCode = 1;
  } else {
    const root = fileURLToPath(new URL("../", import.meta.url));
    try {
      const errors = await validateAgentSkills(root);
      if (errors.length) {
        console.error(errors.join("\n"));
        process.exitCode = 1;
      } else if (args.includes("--list"))
        for (const helper of HELPER_DEFINITIONS)
          console.log(`${helper.name}\t${helper.path}`);
      else
        console.log(
          "Agent skills structural integrity valid (12 helpers); behavioral acceptance requires pilot evidence.",
        );
    } catch (error) {
      console.error(`Agent skills validation failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
