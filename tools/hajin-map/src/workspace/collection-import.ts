import {
  validateCollectionHandoff,
  validateRunPlanHandoff,
} from "../../../../src/domain/collection-handoff.mjs";
import { el, button, note, field, input } from "./dom.ts";
import { matchingItemAreas } from "../map/item-area-highlight.ts";
import type { ExplorerRecord } from "./explorer-index.ts";
interface Plan {
  kind: string;
  version: number;
  packId: string;
  contentVersion: string;
  createdAt: string;
  scope: string;
  items: {
    itemId: string;
    name: string;
    needed: number;
    minimum: boolean;
    areas: { id: string; name: string }[];
  }[];
}
interface RunPlanHandoff {
  kind: "dmz-run-plan-handoff";
  version: 1;
  packId: string;
  contentVersion: string;
  planId: string;
  name: string;
  createdAt: string;
  objectiveIds: string[];
  stops: { id: string; name: string }[];
}
interface Host {
  records: () => ExplorerRecord[];
  allowed: () => boolean;
  highlight: (records: ExplorerRecord[]) => void;
  createRoute: (records: ExplorerRecord[]) => Promise<void>;
  openRoutes: () => void;
  changed: () => void;
  error: (error: unknown) => void;
}
export function createCollectionImport(h: Host) {
  let pending: Plan | null = null,
    current: Plan | null = null,
    pendingRun: RunPlanHandoff | null = null,
    currentRun: RunPlanHandoff | null = null,
    selection = new Set<string>(),
    disposed = false;
  const params = new URLSearchParams(location.search),
    nonces = params.getAll("collection"),
    runNonces = params.getAll("run-plan"),
    nonce =
      nonces.length === 1 && /^[a-f0-9-]{36}$/i.test(nonces[0])
        ? nonces[0]
        : null,
    runNonce =
      runNonces.length === 1 && /^[a-f0-9-]{36}$/i.test(runNonces[0])
        ? runNonces[0]
        : null;
  const ready = () => {
    if (
      (nonce || runNonce) &&
      !disposed &&
      h.allowed() &&
      window.opener &&
      !window.opener.closed
    )
      window.opener?.postMessage(
        runNonce
          ? { type: "dmz-run-plan-ready", nonce: runNonce }
          : { type: "dmz-collection-ready", nonce },
        "*",
      );
  };
  const timer = nonce || runNonce ? setInterval(ready, 500) : undefined;
  const deadline =
    nonce || runNonce
      ? setTimeout(() => clearInterval(timer), 15000)
      : undefined;
  function receive(value: unknown) {
    if (!h.allowed())
      throw Error(
        "Save or cancel the current map draft before reviewing a collection plan.",
      );
    pending = validateCollectionHandoff(value) as Plan;
    h.changed();
  }
  const message = (event: MessageEvent) => {
    if (
      disposed ||
      (!nonce && !runNonce) ||
      event.source !== window.opener ||
      !["http://127.0.0.1:4173", "http://localhost:4173"].includes(
        event.origin,
      ) ||
      !(
        (nonce &&
          event.data?.type === "dmz-collection-plan" &&
          event.data?.nonce === nonce) ||
        (runNonce &&
          event.data?.type === "dmz-run-plan" &&
          event.data?.nonce === runNonce)
      )
    )
      return;
    try {
      if (runNonce) {
        if (!h.allowed())
          throw Error(
            "Save or cancel the current map draft before reviewing a run plan.",
          );
        pendingRun = validateRunPlanHandoff(event.data.plan) as RunPlanHandoff;
        h.changed();
      } else receive(event.data.plan);
      event.source?.postMessage(
        runNonce
          ? { type: "dmz-run-plan-received", nonce: runNonce }
          : { type: "dmz-collection-received", nonce },
        { targetOrigin: event.origin },
      );
      clearInterval(timer);
      clearTimeout(deadline);
    } catch (error) {
      h.error(error);
    }
  };
  window.addEventListener("message", message);
  ready();
  const areas = () => [
    ...new Map(
      (current?.items || [])
        .flatMap((item) => item.areas)
        .map((area) => [area.name.toLocaleLowerCase(), area]),
    ).values(),
  ];
  const resolved = () =>
    areas()
      .filter((area) => selection.has(area.name.toLocaleLowerCase()))
      .flatMap((area) => {
        const matches = matchingItemAreas(area.name, h.records()).sort(
          (a, b) =>
            Number(b.sourceId === "official") -
              Number(a.sourceId === "official") ||
            Number(b.visible) - Number(a.visible) ||
            a.key.localeCompare(b.key),
        );
        return matches.length ? [matches[0]] : [];
      });
  function panel() {
    const root = el("details");
    root.id = "map-collection-plan";
    root.open = !!pending || !!current || !!pendingRun || !!currentRun;
    root.append(el("summary", "Import collection plan / guide shortages"));
    if (pendingRun) {
      const incoming = pendingRun;
      root.append(
        note(
          `Review next-run plan: ${incoming.name} · ${incoming.objectiveIds.length} public objectives · ${incoming.stops.length} named stops. Private stock was not transferred.`,
        ),
      );
      const list = el("ul");
      for (const stop of incoming.stops) list.append(el("li", stop.name));
      root.append(
        list,
        button(
          "Accept run-plan context",
          () => {
            if (!h.allowed()) return;
            currentRun = incoming;
            pendingRun = null;
            h.changed();
          },
          "run-plan-accept",
        ),
        button(
          "Decline run-plan context",
          () => {
            pendingRun = null;
            h.changed();
          },
          "run-plan-decline",
        ),
      );
    }
    if (currentRun) {
      const active = currentRun;
      root.append(
        note(
          `Reviewed run plan: ${active.name} · ${active.objectiveIds.length} objective IDs. Named stops without registered positions stay list-only.`,
        ),
      );
      const list = el("ul");
      for (const stop of active.stops) {
        const matches = matchingItemAreas(stop.name, h.records());
        list.append(
          el(
            "li",
            `${stop.name} · ${matches.length ? "registered match available" : "no positioned match"}`,
          ),
        );
      }
      root.append(
        list,
        button(
          "Highlight run-plan stops",
          () => {
            if (!h.allowed()) return;
            h.highlight(
              active.stops.flatMap((stop) =>
                matchingItemAreas(stop.name, h.records()).slice(0, 1),
              ),
            );
          },
          "run-plan-highlight",
        ),
        button(
          "Return to Guide plan",
          () => {
            window.open(
              "http://127.0.0.1:4173/run-plan/",
              "_blank",
              "noopener",
            );
          },
          "run-plan-return",
        ),
        button(
          "Clear run-plan context",
          () => {
            currentRun = null;
            h.changed();
          },
          "run-plan-clear",
        ),
      );
    }
    const file = input("", "file");
    file.id = "collection-plan-file";
    file.dataset.workspaceSearch = "true";
    file.accept = "application/json,.json";
    file.addEventListener("change", async () => {
      try {
        const chosen = file.files?.[0];
        if (!chosen) return;
        if (chosen.size > 200000) throw Error("Collection plan exceeds 200 KB");
        const data = JSON.parse(await chosen.text());
        if (data?.kind === "dmz-run-plan-handoff") {
          if (!h.allowed())
            throw Error(
              "Save or cancel the current map draft before reviewing a run plan.",
            );
          pendingRun = validateRunPlanHandoff(data) as RunPlanHandoff;
          h.changed();
        } else receive(data);
      } catch (error) {
        h.error(error);
      }
    });
    root.append(
      field(
        "Choose a plan downloaded from Field desk or Guide run plans",
        file,
      ),
    );
    if (pending) {
      const incoming = pending;
      root.append(
        note(
          `Review ${incoming.items.length} requested items · ${incoming.scope === "builds" ? "additional build ingredients" : "unfinished upgrades/missions"} · catalog ${incoming.contentVersion}`,
        ),
      );
      const list = el("ul");
      for (const row of incoming.items)
        list.append(
          el(
            "li",
            `${row.name}: ${row.minimum ? "at least " : ""}${row.needed.toLocaleString()} · ${row.areas.length} named area references`,
          ),
        );
      root.append(
        list,
        note(
          "Only source-mentioned names are transferred. Counts are a snapshot, not live account data. Importing does not change inventory, layers or existing routes.",
        ),
        button(
          current ? "Replace current reviewed plan" : "Accept collection plan",
          () => {
            if (!h.allowed()) return;
            current = incoming;
            pending = null;
            selection = new Set(
              current.items
                .flatMap((item) => item.areas)
                .map((area) => area.name.toLocaleLowerCase()),
            );
            h.changed();
          },
          "collection-plan-accept",
        ),
        button("Cancel incoming plan", () => {
          pending = null;
          h.changed();
        }),
      );
    }
    if (current) {
      root.append(
        note(
          `Reviewed plan · ${current.items.length} items · ${new Date(current.createdAt).toLocaleString()}`,
        ),
      );
      const list = el("ul");
      for (const area of areas()) {
        const matches = matchingItemAreas(area.name, h.records());
        const check = input("", "checkbox");
        check.dataset.workspaceSearch = "true";
        check.checked = selection.has(area.name.toLocaleLowerCase());
        check.addEventListener("change", () => {
          if (check.checked) selection.add(area.name.toLocaleLowerCase());
          else selection.delete(area.name.toLocaleLowerCase());
        });
        const row = el("li");
        row.append(
          field(
            `${area.name} · ${matches.length ? "registered position" : "no positioned match; list only"}`,
            check,
          ),
        );
        list.append(row);
      }
      root.append(list);
      root.append(
        button(
          "Highlight selected areas",
          () => {
            if (h.allowed()) h.highlight(resolved());
          },
          "collection-plan-highlight",
        ),
        button(
          "Create new collection route",
          async () => {
            try {
              if (!h.allowed()) return;
              const records = [
                ...new Map(
                  resolved().map((record) => [record.key, record]),
                ).values(),
              ];
              if (!records.length || records.length > 32)
                throw Error(
                  "Select 1–32 areas with registered positions. Unknown areas stay list-only.",
                );
              await h.createRoute(records);
            } catch (error) {
              h.error(error);
            }
          },
          "collection-plan-route",
        ),
        button("Open routes", h.openRoutes),
        button("Clear this plan", () => {
          current = null;
          pending = null;
          selection.clear();
          h.changed();
        }),
      );
      const items = el("details");
      items.append(el("summary", "Requested item counts"));
      for (const item of current.items)
        items.append(
          note(
            `${item.name} · ${item.minimum ? "at least " : ""}${item.needed}`,
          ),
        );
      root.append(
        items,
        note(
          "One representative registered source position per area is used. The existing road planner handles ordering and reports disconnected roads; no loot availability is guaranteed.",
        ),
      );
    }
    return root;
  }
  return {
    panel,
    destroy() {
      disposed = true;
      clearInterval(timer);
      clearTimeout(deadline);
      window.removeEventListener("message", message);
    },
  };
}
