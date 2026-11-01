import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";
import {
  createWeaponManager,
  runWeaponJob,
} from "../../scripts/weapon-manager.mjs";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function fixture(t, { hold = false, sessionMs } = {}) {
  const root = await mkdtemp(join(tmpdir(), "dmz049-manager-"));
  await mkdir(join(root, "content"));
  await mkdir(join(root, ".local"));
  await writeFile(
    join(root, "content/weapon-intel.json"),
    await readFile(new URL("../../content/weapon-intel.json", import.meta.url)),
  );
  const calls = [];
  let release, started;
  const began = new Promise((r) => {
    started = r;
  });
  const proposal = async () => {
    const bytes = await readFile(join(root, "content/weapon-intel.json")),
      db = JSON.parse(bytes),
      row = {
        ...db.patches[0],
        after: "Synthetic QA correction, not game data",
      };
    const value = {
      version: 1,
      baseRevision: digest(bytes),
      articles: [row.sourceURL],
      observations: [row],
      warnings: ["Synthetic test fixture only"],
    };
    await writeFile(
      join(root, ".local/weapon-patch-proposal.json"),
      JSON.stringify(value),
    );
  };
  const runner = async (repo, action, fields) => {
    calls.push(action);
    if (action === "check") {
      started();
      if (hold)
        await new Promise((r) => {
          release = r;
        });
      await proposal();
      return {};
    }
    if (action === "build") return { built: true };
    return runWeaponJob(repo, action, fields);
  };
  const app = await createWeaponManager({
    root,
    port: 0,
    runner,
    ...(sessionMs === undefined ? {} : { sessionMs }),
  });
  t.after(async () => {
    release?.();
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  const session = await (await fetch(app.url + "/api/session")).json();
  const post = (value, headers = {}) =>
    fetch(app.url + "/api/action", {
      method: "POST",
      headers: {
        Origin: app.url,
        "Content-Type": "application/json",
        "X-Weapon-Token": session.token,
        ...headers,
      },
      body: JSON.stringify(value),
    });
  return {
    root,
    app,
    calls,
    post,
    proposal,
    session,
    began,
    release: () => release?.(),
  };
}
test("049 manager readonly startup, fixed assets and origin/token boundary", async (t) => {
  const f = await fixture(t);
  const response = await fetch(f.app.url);
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    (await fetch(f.app.url + "/assets/src/client/studio.mjs")).status,
    404,
  );
  assert.equal(
    (
      await fetch(f.app.url + "/api/session", {
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(f.app.url + "/api/state", {
        headers: { "Sec-Fetch-Site": "cross-site" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.post({ action: "check" }, { "X-Weapon-Token": "bad" })).status,
    403,
  );
  assert.equal(
    (await f.post({ action: "check" }, { Origin: "https://evil.invalid" }))
      .status,
    403,
  );
  assert.equal(
    (await f.post({ action: "check", url: "https://evil.invalid" })).status,
    422,
  );
  assert.equal(
    (await f.post({ action: "shell", command: "anything" })).status,
    422,
  );
  assert.equal(
    (await f.post({ action: "check" }, { "Content-Type": "text/plain" }))
      .status,
    415,
  );
  assert(!f.calls.includes("check"));
  for (const [body, status] of [
    ["x".repeat(4097), 413],
    ['{"action":"check","action":"apply"}', 422],
  ]) {
    const response = await fetch(f.app.url + "/api/action", {
      method: "POST",
      headers: {
        Origin: f.app.url,
        "Content-Type": "application/json",
        "X-Weapon-Token": f.session.token,
      },
      body,
    });
    assert.equal(response.status, status);
  }
  assert.equal(
    (
      await fetch(f.app.url + "/api/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Weapon-Token": f.session.token,
        },
        body: '{"action":"check"}',
      })
    ).status,
    403,
  );
  const hostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(
      f.app.url + "/api/state",
      { headers: { Host: "evil.invalid" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(hostStatus, 403);
  assert(!f.calls.includes("check"));
});
test("049 manager actual Python apply/hash-bound review and backup rollback", async (t) => {
  const f = await fixture(t),
    original = await readFile(join(f.root, "content/weapon-intel.json"));
  assert.equal((await f.post({ action: "check" })).status, 200);
  let state = await (await fetch(f.app.url + "/api/state")).json();
  assert.equal(typeof state.proposal, "object", JSON.stringify(state));
  assert.equal(state.proposal.changed.length, 1);
  assert.equal(state.receipt.lastCheck.result, "success");
  const reviewedHash = state.proposal.hash;
  assert.equal(
    (await f.post({ action: "apply", proposalHash: reviewedHash })).status,
    200,
  );
  const changed = await readFile(join(f.root, "content/weapon-intel.json"));
  assert.notDeepEqual(changed, original);
  state = await (await fetch(f.app.url + "/api/state")).json();
  assert(state.backupAvailable);
  assert.equal(
    (await f.post({ action: "rollback", expectedRevision: "0".repeat(64) }))
      .status,
    409,
  );
  assert.equal(
    (await f.post({ action: "rollback", expectedRevision: state.revision }))
      .status,
    200,
  );
  assert.deepEqual(
    await readFile(join(f.root, "content/weapon-intel.json")),
    original,
  );
});
test("049 manager rejects a proposal changed after browser review", async (t) => {
  const f = await fixture(t);
  await f.post({ action: "check" });
  const state = await (await fetch(f.app.url + "/api/state")).json();
  assert.equal(typeof state.proposal, "object", JSON.stringify(state));
  const file = join(f.root, ".local/weapon-patch-proposal.json"),
    proposal = JSON.parse(await readFile(file));
  proposal.observations[0].after = "Another synthetic correction";
  await writeFile(file, JSON.stringify(proposal));
  const before = await readFile(join(f.root, "content/weapon-intel.json"));
  assert.equal(
    (await f.post({ action: "apply", proposalHash: state.proposal.hash }))
      .status,
    409,
  );
  assert.deepEqual(
    await readFile(join(f.root, "content/weapon-intel.json")),
    before,
  );
});
test("049 manager single active action prevents replay while check is pending", async (t) => {
  const f = await fixture(t, { hold: true });
  const first = f.post({ action: "check" });
  await f.began;
  assert.equal((await f.post({ action: "build" })).status, 409);
  f.release();
  assert.equal((await first).status, 200);
  assert.equal(f.calls.filter((c) => c === "check").length, 1);
});
test("049 expired manager session cannot write", async (t) => {
  const f = await fixture(t, { sessionMs: -1 });
  assert.equal((await f.post({ action: "check" })).status, 403);
  assert(!f.calls.includes("check"));
});
