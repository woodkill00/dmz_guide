import {
  readFile,
  writeFile,
  mkdir,
  rename,
  open,
  unlink,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  canonicalDigest,
  sites,
  digest,
  semantic,
  diffCaptures,
  validateCapture,
  validAffine,
} from "./source-contract.mjs";
import { collectSource } from "./source-collectors.mjs";
const absent = (e) => e?.code === "ENOENT";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export class SourceUpdates {
  constructor(
    root,
    { collect = collectSource, enabled = false, replace = rename } = {},
  ) {
    this.root = root;
    this.collect = collect;
    this.enabled = enabled;
    this.replace = replace;
    this.jobs = new Map();
    this.busy = false;
    this.pointer = path.join(
      root,
      "public/maps/hajin/current-captures.local.json",
    );
    this.stateDir = path.join(root, ".local/source-updates");
  }
  async bytes(file, limit) {
    const handle = await open(file, "r");
    try {
      const s = await handle.stat();
      if (!s.isFile() || s.size > limit) throw Error("Local file byte limit.");
      const b = await handle.readFile();
      if (b.length > limit) throw Error("Local file byte limit.");
      return b;
    } finally {
      await handle.close();
    }
  }
  async json(file, limit = 2 * 1024 * 1024) {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await this.bytes(file, limit),
      ),
    );
  }
  async authorization() {
    if (!this.enabled) throw Error("Local source updates are disabled.");
    const a = await this.json(
      path.join(this.root, "public/maps/hajin/update-authorization.local.json"),
      256 * 1024,
    );
    if (
      a.version !== 1 ||
      a.canonicalDigest !== canonicalDigest ||
      !Array.isArray(a.authorizedSources) ||
      !a.authorizedSources.length ||
      a.authorizedSources.length > Object.keys(sites).length ||
      new Set(a.authorizedSources).size !== a.authorizedSources.length ||
      a.authorizedSources.some((id) => !Object.hasOwn(sites, id))
    )
      throw Error("Owner local update authorization is missing or invalid.");
    return a;
  }
  async capabilities() {
    try {
      await this.authorization();
      return { enabled: true };
    } catch {
      return {
        enabled: false,
        reason:
          "Updates need the owner-enabled local development server and reviewed source fingerprints. Static builds cannot update source files.",
      };
    }
  }
  async current() {
    try {
      const bytes = await this.bytes(this.pointer, 32768);
      const value = JSON.parse(bytes.toString("utf8"));
      if (
        value.version !== 1 ||
        value.canonicalDigest !== canonicalDigest ||
        !Array.isArray(value.sources) ||
        value.sources.length > 5 ||
        new Set(value.sources.map((s) => s.id)).size !== value.sources.length
      )
        throw Error("Invalid current capture pointer.");
      for (const s of value.sources) this.validateDescriptor(s);
      return { value, hash: digest(bytes), bytes };
    } catch (e) {
      if (!absent(e)) throw e;
      return {
        value: { version: 1, canonicalDigest, sources: [] },
        hash: digest(""),
        bytes: null,
      };
    }
  }
  validateDescriptor(s) {
    if (
      !sites[s?.id] ||
      !uuid.test(s.generation) ||
      s.snapshot !==
        `/maps/hajin/captures/${s.generation}/${s.id}/markers.json` ||
      s.iconDirectory !==
        `/maps/hajin/captures/${s.generation}/${s.id}/icons/` ||
      !(
        /^[a-f0-9]{64}$/.test(s.snapshotDigest) &&
        /^[a-f0-9]{64}$/.test(s.semanticDigest)
      )
    )
      throw Error("Invalid capture descriptor.");
  }
  async baseline(id, current) {
    const descriptor = current.value.sources.find((s) => s.id === id);
    const url =
      descriptor?.snapshot ??
      `/maps/hajin/${id === "official" ? "official" : `providers/${id}`}/markers.json`;
    let bytes;
    try {
      bytes = await this.bytes(
        path.join(this.root, "public", url),
        2 * 1024 * 1024,
      );
    } catch (e) {
      if (id !== "mapgenie" || descriptor || !absent(e)) throw e;
      const capture = {
        schemaVersion: 1,
        sourcePage: sites.mapgenie.page,
        capturedAt: "1970-01-01T00:00:00.000Z",
        categories: [],
        records: [],
      };
      return { capture, descriptor: null, semanticDigest: semantic(capture) };
    }
    if (descriptor && digest(bytes) !== descriptor.snapshotDigest)
      throw Error("Current capture digest mismatch.");
    const capture = validateCapture(JSON.parse(bytes.toString("utf8")), id);
    const icons = {};
    for (const c of capture.categories) {
      if (
        !/^\/maps\/hajin\/[a-zA-Z0-9_./-]+\.(svg|png)$/.test(c.icon) ||
        c.icon.includes("..")
      )
        throw Error("Unsafe capture icon.");
      icons[c.id] = digest(
        await this.bytes(path.join(this.root, "public", c.icon), 512 * 1024),
      );
    }
    return {
      capture,
      descriptor: descriptor ?? {
        id,
        snapshot: url,
        iconDirectory: `/maps/hajin/${id === "official" ? "official" : `providers/${id}`}/icons/`,
        snapshotDigest: digest(bytes),
      },
      semanticDigest: semantic(capture, icons),
    };
  }
  async registration(id, authorization) {
    if (id === "official") return null;
    let bytes;
    if (id === "mapgenie") {
      const expected = authorization?.mapgenie?.registrationDigest;
      if (!/^[a-f0-9]{64}$/.test(expected ?? ""))
        throw Error(
          "MapGenie needs explicitly reviewed local coordinate registration.",
        );
      bytes = await this.bytes(
        path.join(
          this.root,
          "public/maps/hajin/providers/mapgenie/registration.local.json",
        ),
        2 * 1024 * 1024,
      );
      if (digest(bytes) !== expected)
        throw Error("MapGenie registration evidence changed.");
    } else {
      const manifest = await this.json(
          path.join(this.root, "public/maps/hajin/providers.local.json"),
          32768,
        ),
        entry = manifest.sources?.find((s) => s.id === id);
      if (!entry || !entry.authorization?.trim())
        throw Error("Reviewed provider authorization is missing.");
      bytes = await this.bytes(
        path.join(
          this.root,
          `public/maps/hajin/providers/${id}/provenance.local.json`,
        ),
        2 * 1024 * 1024,
      );
      if (digest(bytes) !== entry.registrationDigest)
        throw Error("Provider registration evidence changed.");
    }
    const p = JSON.parse(bytes.toString("utf8")),
      r = p.registration;
    if (
      p.registrationVersion !== "reviewed-affine-v1" ||
      r?.canonicalDigest !== canonicalDigest ||
      !Number.isFinite(r.rms) ||
      r.rms < 0 ||
      r.rms > 8 ||
      !Number.isFinite(r.maxError) ||
      r.maxError < 0 ||
      r.maxError > 16 ||
      !Number.isInteger(r.heldOut) ||
      r.heldOut < 2 ||
      !Array.isArray(r.matrix) ||
      r.matrix.length !== 2 ||
      r.matrix.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== 3 ||
          !row.every(Number.isFinite),
      )
    )
      throw Error("Reviewed provider alignment is invalid.");
    if (!validAffine(r.matrix))
      throw Error("Reviewed provider alignment is singular or degenerate.");
    return r;
  }
  publicJob(j) {
    return {
      id: j.id,
      state: j.state,
      createdAt: j.createdAt,
      reserved: !!j.reserved,
      outcomes: j.outcomes,
      error: j.error ?? null,
    };
  }
  async persist(j) {
    const file = path.join(this.stateDir, j.id + ".json");
    await mkdir(this.stateDir, { recursive: true });
    const tmp = file + ".tmp";
    await writeFile(
      tmp,
      JSON.stringify({
        ...this.publicJob(j),
        baseHash: j.baseHash,
        next: j.next,
      }),
      { flag: "w" },
    );
    await this.replace(tmp, file);
  }
  async restore(id) {
    if (!uuid.test(id)) throw Error("Invalid update job.");
    if (this.jobs.has(id)) return this.jobs.get(id);
    const j = await this.json(
      path.join(this.stateDir, id + ".json"),
      128 * 1024,
    );
    if (
      j.id !== id ||
      !["collecting", "ready", "activated", "cancelled"].includes(j.state) ||
      !Array.isArray(j.outcomes)
    )
      throw Error("Update job unavailable.");
    if (j.state === "collecting") {
      j.state = "cancelled";
      j.error =
        "Server restarted during collection. Current captures retained.";
    }
    for (const s of j.next?.sources ?? []) this.validateDescriptor(s);
    this.jobs.set(id, j);
    return j;
  }
  async get(id) {
    const j = await this.freshJob(id);
    if (
      j.state === "ready" &&
      !j.reserved &&
      Date.now() - Date.parse(j.createdAt) > 15 * 60 * 1000
    )
      throw Error("Update preview expired. Run another check.");
    return this.publicJob(j);
  }
  async list() {
    await mkdir(this.stateDir, { recursive: true });
    const result = [];
    for (const f of await readdir(this.stateDir)) {
      if (!f.endsWith(".json") || !uuid.test(f.slice(0, -5))) continue;
      const j = await this.freshJob(f.slice(0, -5));
      if (j.state === "ready")
        result.push({
          id: j.id,
          reserved: !!j.reserved,
          createdAt: j.createdAt,
        });
    }
    return { jobs: result.slice(0, 64) };
  }
  async prepare() {
    if (this.busy) throw Error("An update is already running.");
    this.busy = true;
    try {
      await this.authorization();
      await mkdir(this.stateDir, { recursive: true });
      const files = (await readdir(this.stateDir)).filter(
        (f) => uuid.test(f.slice(0, -5)) && f.endsWith(".json"),
      );
      let ready = 0;
      for (const f of files) {
        const j = await this.freshJob(f.slice(0, -5));
        if (
          j.state === "ready" &&
          (j.reserved || Date.now() - Date.parse(j.createdAt) <= 15 * 60 * 1000)
        )
          ready++;
      }
      if (ready >= 2)
        throw Error(
          "Two previews are waiting. Apply or dismiss a previous update first.",
        );
      if (files.length >= 64)
        throw Error(
          "Local update history reached64 jobs. Back up your workspace and review local capture history before maintenance.",
        );
      const current = await this.current(),
        j = {
          id: randomUUID(),
          state: "collecting",
          createdAt: new Date().toISOString(),
          outcomes: [],
          baseHash: current.hash,
          next: structuredClone(current.value),
          controller: new AbortController(),
        };
      this.jobs.set(j.id, j);
      this.busy = true;
      await this.persist(j);
      // Detached task always catches and clears the process mutex.
      j.work = this.run(j, current)
        .catch((e) => {
          j.error = j.controller.signal.aborted
            ? "Update cancelled or timed out."
            : e.message;
          j.state = "cancelled";
        })
        .finally(() => {
          clearTimeout(j.timer);
          this.busy = false;
        });
      j.timer = setTimeout(() => j.controller.abort(), 180000);
      return this.publicJob(j);
    } catch (e) {
      this.busy = false;
      throw e;
    }
  }
  async run(j, current) {
    const authorization = await this.authorization();
    for (const id of Object.keys(sites)) {
      j.controller.signal.throwIfAborted();
      const outcome = { id, status: "checking" };
      j.outcomes.push(outcome);
      try {
        if (!authorization.authorizedSources.includes(id))
          throw Error(
            `${id} is not authorized/configured for local collection. Existing source data retained.`,
          );
        const registration = await this.registration(id, authorization),
          old = await this.baseline(id, current),
          base = `/maps/hajin/captures/${j.id}/${id}/`;
        const result = await this.collect(id, {
          root: this.root,
          old: old.capture,
          registration,
          authorization,
          iconDirectory: base + "icons/",
          signal: j.controller.signal,
        });
        j.controller.signal.throwIfAborted();
        validateCapture(result.capture, id);
        const hashes = Object.fromEntries(
          Object.entries(result.icons).map(([id, i]) => [id, i.digest]),
        );
        const hash = semantic(result.capture, hashes);
        const unchanged = hash === old.semanticDigest;
        let descriptor = old.descriptor;
        if (!unchanged) {
          const dir = path.join(this.root, "public", base);
          await mkdir(path.join(dir, "icons"), { recursive: true });
          for (const i of Object.values(result.icons)) {
            if (
              !/^[a-f0-9]{20}\.(svg|png)$/.test(i.name) ||
              i.bytes.length > 512 * 1024 ||
              digest(i.bytes) !== i.digest
            )
              throw Error("Invalid staged icon.");
            await writeFile(path.join(dir, "icons", i.name), i.bytes, {
              flag: "wx",
            });
          }
          const bytes = Buffer.from(JSON.stringify(result.capture));
          await writeFile(path.join(dir, "markers.json"), bytes, {
            flag: "wx",
          });
          descriptor = {
            id,
            generation: j.id,
            snapshot: base + "markers.json",
            iconDirectory: base + "icons/",
            snapshotDigest: digest(bytes),
            semanticDigest: hash,
          };
          this.validateDescriptor(descriptor);
          j.next.sources = j.next.sources.filter((s) => s.id !== id);
          j.next.sources.push(descriptor);
        }
        Object.assign(outcome, {
          status: unchanged ? "unchanged" : "updated",
          descriptor,
          diff: diffCaptures(old.capture, result.capture),
          warnings: result.warnings ?? [],
        });
      } catch (e) {
        if (j.controller.signal.aborted) throw e;
        Object.assign(outcome, {
          status: "error",
          message: String(e.message).slice(0, 500),
        });
      }
    }
    j.controller.signal.throwIfAborted();
    j.state = "ready";
    await this.persist(j);
  }
  async locked(id, work) {
    const lockfile = path.join(this.stateDir, "update.lock");
    let lock;
    try {
      lock = await open(lockfile, "wx");
      await lock.writeFile(JSON.stringify({ pid: process.pid, id }));
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      throw Error(
        "Capture transition is locked by another operation. Retry when it finishes. If the server stopped unexpectedly, stop all map servers and remove only .local/source-updates/update.lock before restarting.",
      );
    }
    try {
      return await work();
    } finally {
      await lock.close();
      await unlink(lockfile);
    }
  }
  async freshJob(id) {
    const local = await this.restore(id);
    if (
      local.state === "collecting" &&
      local.controller &&
      !local.controller.signal.aborted
    )
      return local;
    const saved = await this.json(
      path.join(this.stateDir, id + ".json"),
      128 * 1024,
    );
    if (saved.state === "collecting") saved.state = "cancelled";
    for (const s of saved.next?.sources ?? []) this.validateDescriptor(s);
    Object.assign(local, saved);
    return local;
  }
  async reserve(id) {
    return this.locked(id, async () => {
      const j = await this.freshJob(id);
      if (
        j.state !== "ready" ||
        (!j.reserved && Date.now() - Date.parse(j.createdAt) > 15 * 60 * 1000)
      )
        throw Error("Update is not ready or preview expired.");
      j.reserved = true;
      await this.persist(j);
      return this.publicJob(j);
    });
  }
  async cancel(id) {
    const local = await this.restore(id);
    if (local.state === "collecting") {
      local.controller?.abort();
      if (local.work) await local.work;
    }
    return this.locked(id, async () => {
      const j = await this.freshJob(id);
      if (j.state === "activated")
        throw Error(
          "Activated captures are retained; cancellation is unavailable.",
        );
      j.state = "cancelled";
      await this.persist(j);
      return this.publicJob(j);
    });
  }
  async activate(id) {
    await this.authorization();
    return this.locked(id, async () => {
      const j = await this.freshJob(id);
      if (j.state === "activated") {
        if (
          JSON.stringify((await this.current()).value) !==
          JSON.stringify(j.next)
        )
          throw Error(
            "This capture was already activated and then superseded. Keep the workspace evidence and run a fresh source check.",
          );
        return this.publicJob(j);
      }
      if (j.state !== "ready" || !j.reserved)
        throw Error("Reserve the preview before workspace save.");
      const current = await this.current();
      if (current.hash !== j.baseHash) {
        if (JSON.stringify(current.value) === JSON.stringify(j.next)) {
          j.state = "activated";
          await this.persist(j);
          return this.publicJob(j);
        }
        throw Error(
          "Source captures changed in another update. Keep this workspace and run a fresh check; the current pointer was preserved.",
        );
      }
      for (const s of j.next.sources) {
        this.validateDescriptor(s);
        if (
          digest(
            await this.bytes(
              path.join(this.root, "public", s.snapshot),
              2 * 1024 * 1024,
            ),
          ) !== s.snapshotDigest
        )
          throw Error("Staged capture changed; activation stopped.");
      }
      if (JSON.stringify(current.value) !== JSON.stringify(j.next)) {
        if (current.bytes) {
          const prev = path.join(
            this.root,
            "public/maps/hajin/previous-captures.local.json",
          );
          await writeFile(prev + ".tmp", current.bytes);
          await this.replace(prev + ".tmp", prev);
        }
        const temporary = this.pointer + "." + id + ".tmp";
        await writeFile(temporary, JSON.stringify(j.next));
        await this.replace(temporary, this.pointer);
      }
      j.state = "activated";
      await this.persist(j);
      return this.publicJob(j);
    });
  }
  dispose() {
    for (const j of this.jobs.values()) j.controller?.abort();
  }
}
