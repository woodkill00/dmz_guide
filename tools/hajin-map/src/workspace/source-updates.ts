import {sourceChanges} from './field-guide.ts';
import { el, button, note } from "./dom.ts";
import type { UIServices } from "./ui-context.ts";
import type { Workspace } from "./model.ts";
import { adaptOfficial, sha256 } from "./import.ts";
import { applySnapshot, refreshPreview } from "./refresh.ts";
import { identityRegistration } from "./registration.ts";
import { snapshotKey } from "./model.ts";
import { sourcePolicies, authorizeLocalCapture } from "./policy.ts";
import {
  captureSource,
  type CaptureDescriptor,
} from "../map/current-captures.ts";
import { boundedBytes } from "../map/bounded-input.ts";
import type { SourceSnapshot } from "./types.ts";
interface Outcome {
  id: string;
  status: string;
  message?: string;
  descriptor?: CaptureDescriptor;
  diff?: {
    added: number;
    changed: number;
    missing: number;
    categoriesChanged: boolean;
  };
  warnings?: string[];
}
interface Job {
  id: string;
  state: string;
  outcomes: Outcome[];
  error?: string;
}
interface Prepared {
  snapshot: SourceSnapshot;
  digest: string;
  descriptor: CaptureDescriptor;
}
interface Pending {
  version: 1;
  id: string;
  entries: { key: string; digest: string }[];
  descriptors: CaptureDescriptor[];
}
const receiptKey = "hajin-source-update-pending-v1";
export function reusePrepared(state: Workspace, p: Prepared): Prepared {
  const projection = (s: SourceSnapshot) =>
    JSON.stringify({
      frame: s.frame,
      applicability: s.applicability,
      categories: [...s.categories].sort((a, b) => a.id.localeCompare(b.id)),
      records: [...s.records].sort((a, b) => a.id.localeCompare(b.id)),
    });
  const match = state.snapshots.find(
    (e) =>
      e.snapshot.sourceId === p.snapshot.sourceId &&
      e.snapshot.sourceRevision === p.snapshot.sourceRevision &&
      /^[a-f0-9]{64}$/.test(p.snapshot.sourceRevision) &&
      projection(e.snapshot) === projection(p.snapshot),
  );
  return match ? { ...p, snapshot: match.snapshot, digest: match.digest } : p;
}
function currentPrepared(state: Workspace, prepared: Prepared[]) {
  return prepared.every(
    (p) =>
      state.snapshots
        .filter((e) => e.snapshot.sourceId === p.snapshot.sourceId)
        .at(-1)?.key ===
      snapshotKey(p.snapshot.sourceId, p.snapshot.snapshotId),
  );
}
export function applyPrepared(state: Workspace, prepared: Prepared[]) {
  for (const incoming of prepared) {
    const p = reusePrepared(state, incoming);
    const key = snapshotKey(p.snapshot.sourceId, p.snapshot.snapshotId),
      old = state.snapshots.find((e) => e.key === key);
    if (old) {
      if (old.digest !== p.digest)
        throw Error("Existing update identity has different content.");
      if (
        state.snapshots
          .filter((e) => e.snapshot.sourceId === p.snapshot.sourceId)
          .at(-1)?.key !== key
      ) {
        const diff = refreshPreview(state, p.snapshot);
        state.entities.forEach((e) => {
          if (diff.affectedEntities.includes(e.id)) e.freshness = "stale";
        });
        state.snapshots = state.snapshots.filter((e) => e.key !== key);
        state.snapshots.push(old);
      }
      continue;
    }
    applySnapshot(
      state,
      p.snapshot,
      p.digest,
      identityRegistration(p.snapshot.frame),
    );
  }
}
export function createSourceUpdates(
  h: UIServices & {
    allowed: () => boolean;
    transition: <T>(work: () => Promise<T>) => Promise<T>;
    finish: () => void;
    replace: (d: CaptureDescriptor[]) => Promise<void>;
    select: (entries: { key: string; digest: string }[]) => void;
  },
) {
  const root = el("section", undefined, "source-update-controls");
  root.id = "map-source-updates";
  const status = note("Checking local update service…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  let token = "",
    busy = false,
    disposed = false,
    activeJob: string | undefined,
    controller: AbortController | undefined;
  const start = button("Update map sources", run, "update-map-sources");
  start.disabled = true;
  const cancel = button(
    "Cancel update",
    () => controller?.abort(),
    "cancel-map-update",
  );
  cancel.hidden = true;
  const recover = button("Resume pending update", resume, "resume-map-update");
  recover.hidden = true;
  const manage = button(
    "Manage staged updates",
    async () => {
      if (!h.allowed()) {
        h.error("Close your draft or preview first.");
        return;
      }
      try {
        const data = await h.transition(() => api("/jobs"));
        const node = el("section");
        node.append(
          el("h3", "Staged source checks"),
          note(
            "Dismissing a stage leaves saved workspace evidence intact. If another browser saved it, run a fresh check there to reconcile source files.",
          ),
        );
        for (const j of data.jobs)
          node.append(
            note(
              `${j.createdAt} · ${j.reserved ? "reserved for workspace save/activation" : "preview"}`,
            ),
            button(`Dismiss stage ${j.id.slice(0, 8)}`, async () =>
              h.transition(async () => {
                await api(`/jobs/${j.id}/cancel`, "POST");
                if (pending()?.id === j.id) clear();
                h.closeDetail();
                status.textContent =
                  "Stage dismissed. You can run another check.";
              }),
            ),
          );
        if (!data.jobs.length) node.append(note("No staged updates."));
        node.append(button("Close", h.closeDetail));
        h.detail(node);
      } catch (e) {
        h.error(e);
      }
    },
    "manage-map-updates",
  );
  manage.hidden = true;
  root.append(start, cancel, recover, manage, status);
  let invalidReceipt = false;
  const discardReceipt = button(
    "Discard damaged recovery metadata",
    () => {
      clear();
      status.textContent =
        "Damaged local recovery metadata removed. Saved workspace evidence and server stages are unchanged; manage staged updates or run a new check.";
    },
    "discard-map-update-receipt",
  );
  discardReceipt.hidden = true;
  root.append(discardReceipt);
  function pending(): Pending | null {
    try {
      const raw = localStorage.getItem(receiptKey);
      if (!raw) return null;
      if (raw.length > 16384) throw Error("Receipt limit.");
      const p = JSON.parse(raw);
      if (
        p.version !== 1 ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
          p.id,
        ) ||
        !Array.isArray(p.entries) ||
        p.entries.length < 1 ||
        p.entries.length > 5 ||
        !Array.isArray(p.descriptors) ||
        p.descriptors.length !== p.entries.length ||
        p.entries.some(
          (e: { key?: unknown; digest?: unknown }) =>
            !e ||
            typeof e.key !== "string" ||
            e.key.length > 300 ||
            typeof e.digest !== "string" ||
            !/^[a-f0-9]{64}$/.test(e.digest),
        )
      )
        throw Error("Receipt shape.");
      p.descriptors.forEach(captureSource);
      return p;
    } catch {
      invalidReceipt = true;
      discardReceipt.hidden = false;
      status.textContent =
        "Pending update metadata is damaged or storage is unavailable. Saved workspace evidence is intact. Discard the metadata before a new check; server stages can be managed separately.";
      return null;
    }
  }
  function save(p: Pending) {
    localStorage.setItem(receiptKey, JSON.stringify(p));
    if (localStorage.getItem(receiptKey) !== JSON.stringify(p))
      throw Error("Cannot save the update recovery receipt.");
    recover.hidden = false;
  }
  function clear() {
    localStorage.removeItem(receiptKey);
    recover.hidden = true;
    invalidReceipt = false;
    discardReceipt.hidden = true;
  }
  async function api(path: string, method = "GET", signal?: AbortSignal) {
    const response = await fetch("/__map-updates" + path, {
      method,
      headers: {
        "x-map-update-token": token,
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: "{}" } : {}),
      signal: signal ?? AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const value = JSON.parse(
      new TextDecoder().decode(await boundedBytes(response, 128 * 1024)),
    );
    if (!response.ok || value.error)
      throw Error(value.error ?? "Local update service unavailable.");
    return value;
  }
  async function capabilities() {
    try {
      const response = await fetch("/__map-updates/capabilities", {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      const c = JSON.parse(
        new TextDecoder().decode(await boundedBytes(response, 8192)),
      );
      if (!c.enabled || typeof c.token !== "string")
        throw Error(
          c.reason ??
            "Updates are available from the owner-enabled local development server.",
        );
      token = c.token;
      start.disabled = false;
      manage.hidden = false;
      recover.hidden = !pending();
      if (!invalidReceipt)
        status.textContent =
          "Check configured websites. Review changes before adding them; unconfigured sources keep their previous data.";
    } catch (e) {
      status.textContent =
        e instanceof SyntaxError
          ? "Updates are available only from the owner-enabled local development server. Existing map data remains available."
          : e instanceof Error
            ? e.message
            : String(e);
      start.disabled = true;
    }
  }
  async function prepare(job: Job, signal: AbortSignal): Promise<Prepared[]> {
    const result: Prepared[] = [];
    for (const o of job.outcomes) {
      if (!o.descriptor || o.status === "error") continue;
      const d = o.descriptor;
      captureSource(d);
      if (
        o.id !== "official" &&
        sourcePolicies[o.id].capability === "referenceOnly"
      )
        authorizeLocalCapture(o.id, "Owner-enabled local update service.");
      const response = await fetch(d.snapshot, { signal, cache: "no-store" });
      const bytes = await boundedBytes(response, 2 * 1024 * 1024);
      if ((await sha256(bytes)) !== d.snapshotDigest)
        throw Error("Staged source digest changed.");
      const snapshot = structuredClone(
        adaptOfficial(
          JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
          o.id,
        ),
      );
      snapshot.snapshotId = `${o.id}-update-${d.snapshotDigest.slice(0, 32)}`;
      snapshot.sourceRevision = d.semanticDigest ?? d.snapshotDigest;
      result.push(
        reusePrepared(h.state(), {
          snapshot,
          digest: await sha256(
            new TextEncoder().encode(JSON.stringify(snapshot)),
          ),
          descriptor: d,
        }),
      );
    }
    return result;
  }
  async function activate(p: Pending) {
    await api(`/jobs/${p.id}/activate`, "POST");
    await h.replace(p.descriptors);
    h.select(p.entries);
    h.refresh();
    clear();
    status.textContent =
      "Update applied. Source errors, if listed, kept their previous data.";
    h.notice("Map source update applied.");
  }
  async function resume() {
    if (!h.allowed()) {
      h.error("Save or cancel your current draft before resuming an update.");
      return;
    }
    try {
      const p = pending();
      if (!p) return;
      const node = el("section");
      node.id = "map-update-recovery";
      node.append(el("h3", "Pending source update"));
      const committed = p.entries.every((e) =>
        h
          .state()
          .snapshots.some((s) => s.key === e.key && s.digest === e.digest),
      );
      node.append(
        note(
          committed
            ? "The workspace contains this capture. Retry file activation without importing it again."
            : "The workspace save did not finish. Dismiss this stage and run a new check; no source files were activated.",
        ),
      );
      if (committed)
        node.append(
          button(
            "Retry capture activation",
            async () =>
              h.transition(async () => {
                try {
                  await activate(p);
                  h.finish();
                } catch (e) {
                  h.error(e);
                }
              }),
            "retry-map-activation",
          ),
        );
      node.append(
        button(
          committed
            ? "Keep workspace and dismiss pending activation"
            : "Dismiss interrupted update",
          async () =>
            h.transition(async () => {
              await api(`/jobs/${p.id}/cancel`, "POST");
              clear();
              h.closeDetail();
              status.textContent =
                "Pending activation dismissed. Run a fresh check to reconcile current source files.";
            }),
          "dismiss-map-update",
        ),
        button(
          "Keep workspace and forget activation receipt",
          () => {
            clear();
            h.finish();
            status.textContent =
              "Pending receipt cleared. Workspace evidence is retained. Manage staged updates or run a fresh check to reconcile the current source files.";
          },
          "forget-map-update-receipt",
        ),
        button("Close", h.closeDetail),
      );
      h.detail(node);
    } catch (e) {
      h.error(e);
    }
  }
  async function run() {
    if (busy) return;
    if (!h.allowed()) {
      h.error(
        "Save or cancel your current draft/preview before updating sources.",
      );
      return;
    }
    try {
      const receipt = pending();
      if (invalidReceipt) {
        h.error("Discard damaged recovery metadata before a new source check.");
        return;
      }
      if (receipt) {
        await resume();
        return;
      }
    } catch (e) {
      h.error(e);
      return;
    }
    busy = true;
    start.disabled = true;
    cancel.hidden = false;
    controller = new AbortController();
    const own = controller;
    try {
      const expectedRevision = h.revision();
      const { job, prepared } = await h.process(async (signal) => {
        const abort = () => own.abort();
        signal.addEventListener("abort", abort, { once: true });
        const deadline = setTimeout(() => own.abort(), 190000);
        try {
          let job: Job = await api("/prepare", "POST", own.signal);
          activeJob = job.id;
          while (job.state === "collecting") {
            status.textContent =
              job.outcomes
                .map(
                  (o) => `${sourcePolicies[o.id]?.name ?? o.id}: ${o.status}`,
                )
                .join(" · ") || "Checking websites…";
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(done, 500);
              function done() {
                own.signal.removeEventListener("abort", stop);
                resolve();
              }
              function stop() {
                clearTimeout(timer);
                reject(Error("Update cancelled."));
              }
              own.signal.addEventListener("abort", stop, { once: true });
            });
            own.signal.throwIfAborted();
            job = await api(`/jobs/${job.id}`, "GET", own.signal);
          }
          if (job.state !== "ready")
            throw Error(job.error ?? "Update stopped; current data retained.");
          return { job, prepared: await prepare(job, own.signal) };
        } finally {
          clearTimeout(deadline);
          signal.removeEventListener("abort", abort);
        }
      });
      const node = el("section");
      node.id = "map-update-preview";
      node.append(
        el("h3", "Review source update"),
        note(
          "Source claims remain separate. Matching name/location copies stay hidden. Missing records remain in older snapshots.",
        ),
      );
      for (const o of job.outcomes) {
        node.append(el("h4", sourcePolicies[o.id]?.name ?? o.id));
        node.append(
          note(
            o.message ??
              `${o.status}: ${o.diff?.added ?? 0} added · ${o.diff?.changed ?? 0} changed · ${o.diff?.missing ?? 0} missing${o.diff?.categoriesChanged ? " · categories changed" : ""}`,
          ),
        );
        if (o.warnings?.length) {
          const details = el("details");
          details.append(
            el("summary", `${o.warnings.length} icon reuse / fallback notes`),
          );
          for (const w of o.warnings) details.append(note(w));
          node.append(details);
        }
        const incoming = prepared.find((p) => p.snapshot.sourceId === o.id);
        if (incoming) {
          const d = refreshPreview(h.state(), incoming.snapshot);
          const old=h.state().snapshots.filter(e=>e.snapshot.sourceId===o.id).at(-1)?.snapshot??(()=>{try{const raw=h.legacySnapshot(o.id);return raw?adaptOfficial(raw,o.id):undefined;}catch{return undefined;}})();
          const rows=sourceChanges(old,incoming.snapshot),changes=el('details');changes.dataset.sourceChanges=o.id;
          changes.append(el('summary',`${rows.length} changed locations · names, positions and removals`));let page=0;const list=el('div');
          const show=()=>{list.replaceChildren(note(`Page ${page+1}/${Math.max(1,Math.ceil(rows.length/50))} · up to200 per-source entries shown`));for(const row of rows.slice(page*50,Math.min((page+1)*50,200))){const item=el('article',undefined,'workspace-card');item.append(el('strong',row.types.join(' + ')),note(`Before: ${row.before?.title??'not present'}${row.before?` · X ${row.before.x??'unplaced'}, Y ${row.before.y??'unplaced'}`:''}`),note(`After: ${row.after?.title??'missing from new capture'}${row.after?` · X ${row.after.x??'unplaced'}, Y ${row.after.y??'unplaced'}`:''}`));list.append(item);}const prev=button('Previous changes',()=>{page--;show();}),next=button('Next changes',()=>{page++;show();});prev.disabled=page===0;next.disabled=(page+1)*50>=Math.min(rows.length,200);list.append(prev,next);};show();changes.append(list);if(rows.length>200)changes.append(note('Additional changes remain in the captures; this preview is capped at200 entries.'));node.append(changes);
          node.append(
            note(
              `${d.affectedEntities.length} reviewed decisions will need checking. ${h.state().snapshots.some((s) => s.digest === incoming.digest) ? "Already in this workspace; capture will be reused." : ""}`,
            ),
          );
        }
      }
      if (prepared.length)
        node.append(
          button(
            "Apply source update",
            async () =>
              h.transition(async () => {
                try {
                  if (h.revision() !== expectedRevision)
                    throw Error(
                      "Workspace changed. Close this preview and run another check.",
                    );
                  await api(`/jobs/${job.id}/reserve`, "POST");
                  const p: Pending = {
                    version: 1,
                    id: job.id,
                    entries: prepared.map((p) => ({
                      key: snapshotKey(
                        p.snapshot.sourceId,
                        p.snapshot.snapshotId,
                      ),
                      digest: p.digest,
                    })),
                    descriptors: prepared.map((p) => p.descriptor),
                  };
                  try {
                    save(p);
                  } catch (e) {
                    try {
                      await api(`/jobs/${job.id}/cancel`, "POST");
                    } catch {
                      throw Error(
                        `Recovery receipt could not save and cleanup failed. Manage staged update ${job.id} before another check.`,
                      );
                    }
                    throw e;
                  }
                  if (!currentPrepared(h.state(), prepared))
                    await h.commit(
                      "Map sources updated",
                      (draft) => applyPrepared(draft, prepared),
                      [],
                      expectedRevision,
                    );
                  h.select(p.entries);
                  h.refresh();
                  try {
                    await activate(p);
                    h.finish();
                  } catch (e) {
                    status.textContent =
                      "Workspace saved; file activation is pending. Resume pending update to retry.";
                    h.finish();
                    h.error(e);
                  }
                } catch (e) {
                  h.error(e);
                }
              }),
            "apply-map-update",
          ),
        );
      node.append(
        button(
          "Dismiss update",
          async () =>
            h.transition(async () => {
              await api(`/jobs/${job.id}/cancel`, "POST");
              h.closeDetail();
              status.textContent =
                "Update dismissed; active source captures unchanged.";
            }),
          "dismiss-map-update-preview",
        ),
      );
      h.detail(node);
      status.textContent =
        "Check complete. Review the per-site results before applying.";
    } catch (e) {
      if (activeJob)
        try {
          await api(`/jobs/${activeJob}/cancel`, "POST");
        } catch {
          /* No activation happened. */
        }
      status.textContent = "Update stopped; current source captures retained.";
      h.error(e);
    } finally {
      busy = false;
      activeJob = undefined;
      cancel.hidden = true;
      if (!disposed) start.disabled = false;
      controller = undefined;
    }
  }
  void capabilities();
  return {
    root,
    destroy() {
      disposed = true;
      controller?.abort();
      root.remove();
    },
  };
}
