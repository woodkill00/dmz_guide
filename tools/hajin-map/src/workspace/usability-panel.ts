import { el, button, field, input, select, note, pagedList } from "./dom.ts";
import type { UIServices } from "./ui-context.ts";
import {
  emptyUsability,
  keepSeparate,
  savePreset,
  saveFlag,
  pairKey,
  reminderStatus,
  type Usability,
  type Receipt,
} from "./usability.ts";
import { coverage, asDisplay, type ExplorerRecord } from "./explorer-index.ts";
import { displayDuplicates } from "../map/display-duplicates.ts";
import type { VisibilityState } from "./types.ts";
export interface UsabilityHost extends UIServices {
  records: () => ExplorerRecord[];
  categories: () => Record<string, string[]>;
  inspectionMode: () => boolean;
  inspectAllowed: () => boolean;
  clean: () => void;
  view: () => VisibilityState;
  applyView: (v: VisibilityState) => Promise<void>;
  editPoint: (id: string) => void;
  jump: (r: ExplorerRecord, popup: HTMLElement) => void;
  receipt: () => Receipt | null;
  snooze: () => void;
  downloadBackup: () => void;
}
const meta = (h: UsabilityHost) => h.state().usability ?? emptyUsability();
const ensure = (s: { usability?: Usability }) =>
  (s.usability ??= emptyUsability());
const label = (r: ExplorerRecord) => `${r.title} · ${r.sourceName}`;
const position = (r: ExplorerRecord) =>
  r.x === null || r.y === null
    ? r.placement==='reference'?"Reference entry: no terrain location":"Unplaced: registration required"
    : `X ${r.x.toFixed(2)}, Y ${r.y.toFixed(2)} (canonical map pixels)`;
export function createUsabilityUI(h: UsabilityHost) {
  let updateSearch: (() => void) | undefined;
  let section = "search",
    query = "",
    page = 0,
    coverageFilter = "all",
    duplicateFilter: { sourceId: string; categoryId: string } | null = null;
  const allowed = () => {
    if (h.inspectAllowed()) return true;
    h.error(
      "Save or cancel your current draft/preview before opening another location.",
    );
    return false;
  };
  async function mutate(label: string, change: (s: Usability) => void) {
    await h.commit(label, (d) => change(ensure(d)));
    h.clean();
    h.refresh();
  }
  function copy(r: ExplorerRecord, host: HTMLElement) {
    if (r.x === null || r.y === null) return;
    const text = `${r.x.toFixed(2)}, ${r.y.toFixed(2)}`;
    host.append(
      button("Copy coordinates", async () => {
        try {
          await navigator.clipboard.writeText(text);
          h.notice("Coordinates copied.");
        } catch {
          const fallback = input(text);
          fallback.readOnly = true;
          fallback.setAttribute("aria-label", "Coordinates to copy");
          host.append(field("Select and copy these coordinates", fallback));
          fallback.focus();
          fallback.select();
          h.notice(
            "Clipboard unavailable. Select and copy the coordinate text.",
          );
        }
      }),
    );
  }
  function jump(r: ExplorerRecord) {
    if (!allowed()) return;
    const current = h
      .records()
      .find(
        (record) =>
          record.key === r.key &&
          (r.kind !== "source" || record.identity === r.identity),
      );
    if (!current) {
      h.error(
        "This location changed or is no longer loaded. Reopen it from Find locations.",
      );
      return;
    }
    r = current;
    if (r.x === null || r.y === null) {
      h.error(
        r.placement==='reference'?"This reference entry has no terrain location.":"This source frame needs registration before a location can be shown.",
      );
      return;
    }
    h.jump(r, popup(r));
  }
  function popup(r: ExplorerRecord) {
    const root = el("div");
    root.append(
      el("strong", r.title),
      note(`${r.sourceName} · ${r.category}`),
      note(r.notes || "No notes supplied."),
      note(position(r)),
      note(r.status),
      button(
        r.kind === "custom"
          ? "Details / edit point"
          : "Details / flag discrepancy",
        () => showRecord(r),
      ),
    );
    copy(r, root);
    return root;
  }
  function showRecord(record: ExplorerRecord) {
    if (!allowed()) return;
    const r = h.records().find((x) => x.key === record.key) ?? record,
      node = el("section");
    node.id = "location-details";
    node.append(
      el("h3", r.title),
      note(`${r.sourceName} · ${r.category}`),
      note(r.status),
      note(position(r)),
      note(`Floor: ${r.floor ?? "unknown"} · build: ${r.build ?? "unknown"}`),
      note(
        r.visible
          ? "Selected in current map view."
          : r.placement==='reference'?"Reference entry without a terrain position. Available in search and details.": "Outside current filters or hidden as a duplicate. Jump highlights it without changing filters.",
      ),
      note(r.notes || "No notes supplied."),
    );
    if (r.capturedAt) node.append(note("Capture / update: " + r.capturedAt));
    if (r.url) {
      const link = el("a", "Open source website ↗");
      link.href = r.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      node.append(link);
    }
    const go = button("Jump and highlight", () => jump(r), "jump-location");
    go.disabled = r.x === null;
    node.append(go);
    copy(r, node);
    if (r.kind === "custom")
      node.append(
        button(
          "Edit my point",
          () => {
            if (allowed()) h.editPoint(r.id);
          },
          "edit-explorer-point",
        ),
      );
    if (r.kind === "source" && r.identity) {
      const old = meta(h).flags.find((f) => f.recordIdentity === r.identity),
        observation = el("textarea");
      observation.id = "discrepancy-notes";
      observation.maxLength = 4000;
      observation.value = old?.notes ?? "";
      const owned = input("", "checkbox");
      owned.id = "discrepancy-owned";
      owned.checked = !!old;
      node.append(
        el("h4", "My private discrepancy note"),
        note(
          "This stays in your local workspace and private backup. It is not submitted to the website.",
        ),
        field("My observation", observation),
        field("I wrote this observation.", owned),
        button(
          "Save private discrepancy",
          async () => {
            await h.commit("Source discrepancy saved", (s) =>
              saveFlag(
                ensure(s),
                r.identity!,
                observation.value,
                owned.checked,
              ),
            );
            h.clean();
            h.closeDetail();
          },
          "save-discrepancy",
        ),
      );
      if (old)
        node.append(
          button(
            old.status === "open" ? "Mark resolved" : "Reopen discrepancy",
            async () => {
              if (!allowed()) return;
              await h.commit("Source discrepancy status saved", (s) => {
                const f = ensure(s).flags.find((f) => f.id === old.id)!;
                f.status = f.status === "open" ? "resolved" : "open";
                f.updatedAt = new Date().toISOString();
              });
              h.clean();
              h.closeDetail();
            },
            "toggle-discrepancy",
          ),
          button(
            "Delete my discrepancy",
            async () => {
              if (!allowed()) return;
              await h.commit("Source discrepancy deleted", (s) => {
                ensure(s).flags = ensure(s).flags.filter(
                  (f) => f.id !== old.id,
                );
              });
              h.clean();
              h.closeDetail();
            },
            "delete-discrepancy",
          ),
        );
    }
    node.append(
      button(
        "Back to Explore",
        () => {
          if (allowed()) h.closeDetail();
        },
        "close-location-details",
      ),
    );
    h.detail(node);
  }
  function card(r: ExplorerRecord) {
    const row = el("section", undefined, "workspace-card");
    row.dataset.explorerRecord = r.key;
    row.append(
      el("h4", r.title),
      note(
        `${r.sourceName} · ${r.category} · ${r.placement==='reference'?"reference entry · no terrain location":r.visible ? "selected" : "outside view / duplicate"}`,
      ),
      note(position(r)),
      button("Details", () => showRecord(r)),
    );
    const go = button("Jump", () => jump(r));
    go.disabled = r.x === null;
    row.append(go);
    return row;
  }
  function search(root: HTMLElement) {
    const search = input(query);
    search.id = "explorer-search";
    search.dataset.workspaceSearch = "true";
    search.setAttribute(
      "aria-label",
      "Find locations across sites and my points",
    );
    const results = el("div");
    results.id = "explorer-results";
    const render = () => {
      const records = h.records();
      const q = query.trim().toLocaleLowerCase(),
        filtered = records.filter((r) =>
          `${r.title} ${r.category} ${r.sourceName}`
            .toLocaleLowerCase()
            .includes(q),
        );
      page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 50) - 1));
      results.replaceChildren(
        note(
          `${filtered.length} results · page ${page + 1}/${Math.max(1, Math.ceil(filtered.length / 50))}`,
        ),
      );
      for (const r of filtered.slice(page * 50, (page + 1) * 50))
        results.append(card(r));
      const prev = button("Previous results", () => {
          page--;
          render();
        }),
        next = button("Next results", () => {
          page++;
          render();
        });
      prev.disabled = page === 0;
      next.disabled = (page + 1) * 50 >= filtered.length;
      results.append(prev, next);
    };
    updateSearch = () => {
      if (root.isConnected) render();
    };
    search.addEventListener("input", () => {
      query = search.value;
      page = 0;
      render();
    });
    root.append(
      field("Search names, categories and websites", search),
      note(
        "All loaded locations are searched, including hidden layers and collapsed copies. Jump adds a highlight without changing your selection.",
      ),
      results,
    );
    render();
  }
  function duplicates(root: HTMLElement) {
    const records = h.records(),
      byKey = new Map(records.map((r) => [r.key, r])),
      display = records
        .map(asDisplay)
        .filter((r): r is NonNullable<typeof r> => !!r),
      plan = displayDuplicates(display, false, meta(h).separate);
    const groups = plan.groups.filter(
      (g) =>
        !duplicateFilter ||
        g.members.some(
          (m) =>
            m.sourceId === duplicateFilter!.sourceId &&
            m.category === duplicateFilter!.categoryId,
        ),
    );
    root.append(
      note(
        "Possible matches require the same marker name and compatible category within24 canonical pixels. Unknown floor/build is not verification. The selected official copy is preferred; inactive sources can supply a fallback.",
      ),
    );
    if (duplicateFilter)
      root.append(
        button("Show all matching groups", () => {
          duplicateFilter = null;
          h.refresh();
        }),
      );
    if (plan.truncated)
      root.append(
        note(
          "Matching reached its work limit. Remaining source records stay visible and can be searched.",
        ),
      );
    root.append(
      pagedList(
        groups,
        "Find a duplicate group",
        (g) => g.members.map((r) => r.title + " " + r.sourceId).join(" "),
        (g) => {
          const node = el("section", undefined, "workspace-card");
          node.dataset.duplicateGroup = g.representative.key;
          node.append(
            el("h4", g.representative.title),
            note(
              `${h.inspectionMode() ? "Inspection mode shows all selected copies. Preferred representative" : g.members.some((m) => m.visible) ? "Displayed representative" : "No copy currently selected. Default representative"}: ${g.representative.sourceId} · selected sources determine which copy is drawn.`,
            ),
          );
          for (const m of g.members) {
            const r = byKey.get(m.key)!;
            node.append(
              note(
                `${r.sourceName} · ${r.title} · ${position(r)} · distance ${Math.hypot(m.x - g.representative.x, m.y - g.representative.y).toFixed(2)}px`,
              ),
              button("Inspect " + r.sourceName, () => showRecord(r)),
            );
            if (
              r.identity &&
              g.members.some((other) => other.identity && other.key !== m.key)
            )
              node.append(
                button(
                  "Keep " + r.sourceName + " location separate",
                  async () => {
                    if (!allowed()) return;
                    await mutate("Locations kept separate", (s) =>
                      keepSeparate(
                        s,
                        r.identity!,
                        g.members
                          .filter(
                            (other) => other.key !== m.key && other.identity,
                          )
                          .map((other) => other.identity!),
                      ),
                    );
                  },
                ),
              );
          }
          return node;
        },
      ),
    );
    root.append(
      el("h4", "My keep-separate decisions"),
      note(
        "Decisions apply only to the exact captures. Changed, promoted or omitted source versions are shown as inactive.",
      ),
    );
    const active = new Map(
      records.filter((r) => r.identity).map((r) => [r.identity!, r]),
    );
    for (const p of meta(h).separate) {
      const a = active.get(p.a),
        b = active.get(p.b),
        node = el("section", undefined, "workspace-card");
      node.append(
        note(
          `${a ? label(a) : "Unavailable / older capture"} ↔ ${b ? label(b) : "Unavailable / older capture"} · ${a && b ? "active" : "inactive"}`,
        ),
        button("Allow matching again", async () => {
          if (!allowed()) return;
          await mutate("Separate decision removed", (s) => {
            s.separate = s.separate.filter(
              (x) => pairKey(x.a, x.b) !== pairKey(p.a, p.b),
            );
          });
        }),
      );
      root.append(node);
    }
  }
  function presets(root: HTMLElement) {
    const name = input("", "text", 80);
    name.id = "saved-view-name";
    root.append(
      note(
        "Save the current website masters, category masks, source search and My points/Reviewed switches. Search highlights and duplicate-inspection mode are not saved.",
      ),
      field("Name this view", name),
      button(
        "Save current view",
        async () => {
          await mutate("Saved view saved", (s) =>
            savePreset(s, name.value, h.view()),
          );
        },
        "save-map-view",
      ),
      button("Cancel view name", () => {
        name.value = "";
        h.clean();
      }),
    );
    for (const p of meta(h).presets) {
      const row = el("section", undefined, "workspace-card");
      row.dataset.preset = p.id;
      row.append(
        el("h4", p.name),
        button("Apply view", async () => {
          if (!allowed()) return;
          const available = new Map(
            Object.entries(h.categories()).map(([source, ids]) => [
              source,
              new Set(ids),
            ]),
          );
          const missing = Object.entries(p.visibility.categoryMask).flatMap(
            ([s, mask]) =>
              Object.keys(mask).filter((id) => !available.get(s)?.has(id)),
          );
          await h.applyView(p.visibility);
          if (missing.length)
            h.notice(
              `View applied; ${missing.length} saved categories are not in currently loaded data. Their saved masks are retained.`,
            );
        }),
        button("Delete view", async () => {
          if (!allowed()) return;
          await mutate("Saved view deleted", (s) => {
            s.presets = s.presets.filter((x) => x.id !== p.id);
          });
        }),
      );
      root.append(row);
    }
  }
  function completeness(root: HTMLElement) {
    const result = coverage(h.records(), meta(h).separate);
    root.append(
      note(
        "Compares only loaded official data, not all locations in the game. Provider verification claims do not prove independent corroboration.",
      ),
    );
    if (!result.available) {
      root.append(
        note(
          "No registered official locations loaded. Completeness conclusions are unavailable.",
        ),
      );
      return;
    }
    const options = [
        "all",
        "not-found",
        "uncertain",
        "matched",
        "kept-separate",
        "unplaced",
        "incomplete",
      ],
      filter = select(
        options.map((value) => ({
          value,
          label:
            value === "not-found" ? "Not found in loaded official data" : value,
        })),
        coverageFilter,
      );
    filter.id = "coverage-filter";
    filter.dataset.workspaceSearch = "true";
    filter.addEventListener("change", () => {
      coverageFilter = filter.value;
      h.refresh();
    });
    root.append(field("Completeness classification", filter));
    if (result.truncated)
      root.append(
        note(
          "Comparison reached250,000 examined candidates. Unfinished results remain incomplete, never missing.",
        ),
      );
    const counts = options
      .slice(1)
      .map(
        (key) => `${key}: ${result.rows.filter((r) => r.state === key).length}`,
      )
      .join(" · ");
    root.append(
      note(counts),
      pagedList(
        result.rows.filter(
          (r) => coverageFilter === "all" || r.state === coverageFilter,
        ),
        "Find a comparison",
        (r) => label(r.record),
        (row) => {
          const node = card(row.record);
          node.append(note(`${row.state}: ${row.reason}`));
          for (const o of row.official)
            node.append(
              button("Inspect official: " + o.title, () => showRecord(o)),
            );
          return node;
        },
      ),
    );
  }
  function flags(root: HTMLElement) {
    const records = new Map(
      h
        .records()
        .filter((r) => r.identity)
        .map((r) => [r.identity!, r]),
    );
    root.append(
      note(
        "Private authored observations only. Open a source location’s Details to add or edit one. Nothing is submitted to the source website.",
      ),
    );
    root.append(
      pagedList(
        meta(h).flags,
        "Find my discrepancy",
        (f) =>
          `${f.notes} ${f.status} ${records.get(f.recordIdentity)?.title ?? ""}`,
        (f) => {
          const r = records.get(f.recordIdentity),
            node = el("section", undefined, "workspace-card");
          node.dataset.privateFlag = f.id;
          node.append(
            el("h4", r ? label(r) : "Unavailable / older capture"),
            note(`${f.status} · updated ${f.updatedAt}`),
            note(f.notes),
          );
          if (r) node.append(button("Open observation", () => showRecord(r)));
          else {
            node.append(
              note(
                "This reference is inactive. Your observation is preserved.",
              ),
            );
            node.append(
              button("Edit observation", () => {
                if (!allowed()) return;
                const form = el("section"),
                  notes = el("textarea"),
                  owned = input("", "checkbox");
                notes.id = "discrepancy-notes";
                notes.maxLength = 4000;
                notes.value = f.notes;
                owned.id = "discrepancy-owned";
                owned.checked = true;
                form.append(
                  el("h3", "Edit my private observation"),
                  note(
                    "The original capture is unavailable. Editing your authored note does not restore or verify that source.",
                  ),
                  field("My observation", notes),
                  field("I wrote this observation.", owned),
                  button(
                    "Save private discrepancy",
                    async () => {
                      await h.commit("Source discrepancy saved", (s) =>
                        saveFlag(
                          ensure(s),
                          f.recordIdentity,
                          notes.value,
                          owned.checked,
                        ),
                      );
                      h.clean();
                      h.closeDetail();
                    },
                    "save-discrepancy",
                  ),
                  button("Cancel observation edit", () => {
                    h.clean();
                    h.closeDetail();
                  }),
                );
                h.detail(form);
              }),
            );
          }
          node.append(
            button(
              f.status === "open" ? "Mark resolved" : "Reopen",
              async () => {
                if (!allowed()) return;
                await mutate("Source discrepancy status saved", (s) => {
                  const flag = s.flags.find((x) => x.id === f.id)!;
                  flag.status = flag.status === "open" ? "resolved" : "open";
                  flag.updatedAt = new Date().toISOString();
                });
              },
            ),
            button("Delete observation", async () => {
              if (!allowed()) return;
              await mutate("Source discrepancy deleted", (s) => {
                s.flags = s.flags.filter((x) => x.id !== f.id);
              });
            }),
          );
          return node;
        },
      ),
    );
  }
  function backup(root: HTMLElement) {
    const status = reminderStatus(meta(h).edits, h.receipt());
    root.append(
      el("h4", "Private backup status"),
      note(
        status.last
          ? `Last backup download started: ${status.last}`
          : "No backup download is recorded on this browser. Storage may be unavailable; an imported backup is not a download receipt.",
      ),
      note(
        `${status.changes} meaningful changes since that receipt. Visibility changes are not counted. A started download does not prove the file was saved to disk.`,
      ),
      button(
        "Download private backup",
        () => h.downloadBackup(),
        "explorer-backup",
      ),
      button(
        "Remind me tomorrow",
        () => {
          h.snooze();
          h.refresh();
        },
        "snooze-backup",
      ),
    );
    if (status.due)
      root.append(
        note(
          "Backup reminder:20 changes or7 days with changes. Download a backup to protect your private work.",
        ),
      );
  }
  function panel() {
    const root = el("section");
    root.id = "explore-panel";
    root.append(el("h3", "Explore and check the map"));
    const nav = el("div", undefined, "explorer-tabs");
    for (const [id, text] of [
      ["search", "Find locations"],
      ["duplicates", "Duplicate details"],
      ["presets", "Saved views"],
      ["coverage", "Completeness check"],
      ["flags", "My discrepancies"],
      ["backup", "Backup status"],
    ]) {
      const b = button(
        text,
        () => {
          if (!allowed()) return;
          section = id;
          h.refresh();
        },
        "explore-" + id,
      );
      b.setAttribute("aria-current", String(section === id));
      nav.append(b);
    }
    root.append(nav);
    (
      ({ search, duplicates, presets, coverage: completeness, flags, backup })[
        section
      ] ?? search
    )(root);
    return root;
  }
  return {
    refreshSearch: () => {
      if (section === "search") updateSearch?.();
    },
    panel,
    popup,
    showRecord,
    openSection: (
      value: string,
      filter?: { sourceId: string; categoryId: string },
    ) => {
      section = value;
      duplicateFilter = filter ?? null;
    },
    backup,
  };
}
