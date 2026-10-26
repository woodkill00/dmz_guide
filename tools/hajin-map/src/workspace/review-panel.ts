import type { UIServices } from "./ui-context.ts";
import type {
  PlacedRecord,
  CanonicalEntity,
  OwnedCorrection,
} from "./model.ts";
import type { CandidateResult } from "./compare.ts";
import { placedRecords } from "./backup.ts";
import {
  acceptReview,
  splitEntity,
  undoReview,
  withdrawEntity,
} from "./review.ts";
import { el, button, input, field, select, note, pagedList } from "./dom.ts";
export async function compareInWorker(
  records: PlacedRecord[],
  signal?: AbortSignal,
): Promise<CandidateResult> {
  if (signal?.aborted) throw new Error("Comparison cancelled.");
  const worker = new Worker(new URL("./compare-worker.ts", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new Error("Comparison cancelled."));
    };
    const timer = setTimeout(() => {
      finish();
      reject(
        new Error(
          "Comparison exceeded its deadline; narrow the sources or area.",
        ),
      );
    }, 10000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event) => {
      finish();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message));
    };
    worker.postMessage(records);
  });
}
export function reviewPanel(services: UIServices) {
  const state = services.state(),
    all = placedRecords(state),
    latest = placedRecords(state, new Map()),
    panel = el("section"),
    selection = new Set<string>();
  panel.append(
    el("h3", "Compare and review evidence"),
    note(
      "Suggestions never merge automatically. Select evidence, choose a source for each field, and accept your decision. Shared upstream evidence is counted once; unknown lineage stays unknown.",
    ),
  );
  const reviewer = input("Local author");
  reviewer.id = "reviewer";
  panel.append(field("Reviewer", reviewer));
  const selectedSummary = note("Select up to32 records to review."),
    list = el("div");
  list.id = "review-records";
  const search = input("");
  search.id = "review-search";
  let page = 0;
  const pageSize = 50;
  function renderList() {
    list.replaceChildren();
    const filtered = latest.filter((r) =>
      `${r.title} ${r.category} ${r.sourceId}`
        .toLocaleLowerCase()
        .includes(search.value.toLocaleLowerCase()),
    );
    page = Math.min(
      page,
      Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
    );
    list.append(
      note(
        `${filtered.length} registered raw records · page ${page + 1}/${Math.max(1, Math.ceil(filtered.length / pageSize))}. Unregistered source records remain in Sources for calibration.`,
      ),
    );
    for (const record of filtered.slice(
      page * pageSize,
      (page + 1) * pageSize,
    )) {
      const checked = input("", "checkbox");
      checked.checked = selection.has(record.key);
      checked.dataset.reviewRecord = record.key;
      checked.addEventListener("change", () => {
        if (checked.checked && selection.size >= 32) {
          checked.checked = false;
          services.error(new Error("Select at most32 records."));
          return;
        }
        if (checked.checked) selection.add(record.key);
        else selection.delete(record.key);
        selectedSummary.textContent = `${selection.size} evidence records selected.`;
      });
      const row = field(
        `${record.title} · ${record.category} · ${record.sourceId} · floor ${record.applicability.floor ?? "unknown"} · ${record.activity}`,
        checked,
      );
      row.append(button("Locate", () => services.focus(record.x, record.y)));
      list.append(row);
    }
    list.append(
      button("Previous records", () => {
        page = Math.max(0, page - 1);
        renderList();
      }),
      button("Next records", () => {
        page = Math.min(Math.ceil(filtered.length / pageSize) - 1, page + 1);
        renderList();
      }),
    );
  }
  search.addEventListener("input", () => {
    page = 0;
    renderList();
  });
  panel.append(
    field("Find raw evidence", search),
    selectedSummary,
    list,
    button(
      "Review selected evidence",
      () => {
        try {
          showReview(
            [...selection].map((key) => latest.find((r) => r.key === key)!),
          );
        } catch (error) {
          services.error(error);
        }
      },
      "review-selected",
    ),
  );
  const candidates = el("div");
  candidates.id = "comparison-results";
  const compare = button(
    "Suggest possible duplicates",
    async () => {
      compare.disabled = true;
      try {
        const result = await services.process((signal) =>
          compareInWorker(latest, signal),
        );
        candidates.replaceChildren(
          note(
            `${result.pairs.length} possible pairs${result.truncated ? " · truncated by bounded work/pair limits; narrow your sources/area" : ""}. No records were changed.`,
          ),
        );
        candidates.append(
          pagedList(
            result.pairs,
            "Find candidate pairs",
            (pair) => `${pair.a.title} ${pair.b.title} ${pair.a.category}`,
            (pair) =>
              button(
                `${pair.a.title} ↔ ${pair.b.title} · ${pair.distance.toFixed(1)}px${pair.uncertain ? " · unknown floor/build" : ""}`,
                () => showReview([pair.a, pair.b]),
              ),
          ),
        );
      } catch (error) {
        services.error(error);
      } finally {
        compare.disabled = false;
      }
    },
    "suggest-duplicates",
  );
  panel.append(compare, candidates);
  function showReview(
    records: PlacedRecord[],
    existing?: CanonicalEntity,
    correction?: OwnedCorrection,
  ) {
    if (!records.length)
      throw new Error("Choose at least one registered evidence record.");
    const node = el("section");
    node.id = "review-draft";
    node.append(
      el(
        "h3",
        existing
          ? "Reconfirm reviewed entity"
          : "Review canonical field choices",
      ),
    );
    const options = [
      ...records.map((r) => ({
        value: r.key,
        label: `${r.title} · ${r.sourceId} · ${r.snapshotId}`,
      })),
      {
        value: "authored",
        label: "My authored correction (evidence required)",
      },
    ];
    const title = select(
        options,
        correction?.title ? "authored" : existing?.choices.title,
      ),
      position = select(
        options,
        correction?.position ? "authored" : existing?.choices.position,
      ),
      category = select(
        options,
        correction?.category ? "authored" : existing?.choices.category,
      ),
      notes = el("textarea");
    notes.maxLength = 4000;
    notes.value = existing?.notes ?? "";
    node.append(
      field("Title from", title),
      field("Position and applicability from", position),
      field("Category from", category),
      field("Review notes (private)", notes),
    );
    const ownTitle = input(correction?.title ?? existing?.title ?? ""),
      ownX = input(
        String(correction?.position?.x ?? existing?.x ?? records[0].x),
        "number",
      ),
      ownY = input(
        String(correction?.position?.y ?? existing?.y ?? records[0].y),
        "number",
      ),
      ownCategory = input(
        correction?.category ?? existing?.category ?? records[0].category,
      ),
      ownEvidence = el("textarea"),
      ownDeclaration = el("textarea");
    ownEvidence.maxLength = ownDeclaration.maxLength = 4000;
    ownEvidence.value =
      correction?.evidence ?? existing?.authoredEvidence ?? "";
    ownDeclaration.value =
      correction?.declaration ?? existing?.authoredDeclaration ?? "";
    ownTitle.id = "review-authored-title";
    ownX.id = "review-authored-x";
    ownY.id = "review-authored-y";
    ownCategory.id = "review-authored-category";
    ownEvidence.id = "review-authored-evidence";
    ownDeclaration.id = "review-authored-declaration";
    node.append(
      field("Authored title (used only when selected above)", ownTitle),
      field("Authored X image position", ownX),
      field("Authored Y image position", ownY),
      field("Authored category", ownCategory),
      field("Evidence for authored fields", ownEvidence),
      field(
        "Ownership / authorization declaration for authored fields",
        ownDeclaration,
      ),
    );
    const evidence = el("ul");
    for (const r of records)
      evidence.append(
        el(
          "li",
          `${r.title} · ${r.x.toFixed(2)},${r.y.toFixed(2)} · category ${r.category} · build ${r.applicability.gameBuild ?? "unknown"} · floor ${r.applicability.floor ?? "unknown"} · upstream ${r.lineages.join(", ") || "unknown"} · ${r.activity}`,
        ),
      );
    node.append(
      evidence,
      note(
        "Unselected source values remain alternatives in the immutable evidence. No position averaging, live-activity inference or independent-verification claim is made.",
      ),
    );
    const revision = services.revision();
    node.append(
      button(
        "Accept reviewed entity",
        async () => {
          try {
            await services.commit(
              "Review decision accepted",
              (draft) => {
                acceptReview(draft, records, {
                  titleKey: title.value,
                  positionKey: position.value,
                  categoryKey: category.value,
                  reviewer: reviewer.value,
                  notes: notes.value,
                  entityId: existing?.id,
                  authored: {
                    title: ownTitle.value,
                    position: { x: Number(ownX.value), y: Number(ownY.value) },
                    category: ownCategory.value,
                    evidence: ownEvidence.value,
                    declaration: ownDeclaration.value,
                  },
                });
                if (correction)
                  draft.ownedCorrections = draft.ownedCorrections.filter(
                    (c) => c.entityId !== correction.entityId,
                  );
              },
              [],
              revision,
            );
            services.closeDetail();
          } catch (error) {
            services.error(error);
          }
        },
        "accept-review",
      ),
      button("Cancel review", () => services.closeDetail()),
    );
    services.detail(node);
  }
  panel.append(
    el(
      "h3",
      `Reviewed map · ${state.entities.filter((e) => e.acceptance === "accepted").length} accepted entities`,
    ),
  );
  panel.append(
    pagedList(
      state.entities.filter((e) => e.acceptance === "accepted"),
      "Search reviewed entities",
      (e) => `${e.title} ${e.category} ${e.freshness}`,
      (entity) => {
        const card = el("section", undefined, "workspace-card");
        card.append(
          el("h4", entity.title),
          note(
            `${entity.freshness.toUpperCase()} · ${entity.refs.length} raw evidence records · independent upstream lineages ${entity.independentLineages ?? "unknown"} · floor ${entity.applicability.floor ?? "unknown"}`,
          ),
          button("Locate reviewed point", () =>
            services.focus(entity.x, entity.y),
          ),
          button("Reconfirm / inspect fields", () => {
            try {
              const refs = entity.refs
                .map((key) => all.find((r) => r.key === key))
                .filter((r): r is PlacedRecord => !!r);
              if (refs.length !== entity.refs.length)
                throw new Error(
                  "Restore or register omitted evidence before reconfirming.",
                );
              const replacements = latest.filter((r) =>
                refs.some(
                  (old) =>
                    old.sourceId === r.sourceId && old.recordId === r.recordId,
                ),
              );
              const alternatives = [
                ...new Map(
                  [...refs, ...replacements].map((r) => [r.key, r]),
                ).values(),
              ];
              if (alternatives.length > 32)
                throw new Error(
                  "Narrow the evidence selection to32 records before reconfirming.",
                );
              showReview(alternatives, entity);
            } catch (error) {
              services.error(error);
            }
          }),
          button("Split into source entities", async () => {
            try {
              await services.commit("Merged entity split", (draft) =>
                splitEntity(draft, entity.id, all, reviewer.value),
              );
            } catch (error) {
              services.error(error);
            }
          }),
          button("Withdraw from Reviewed map", async () => {
            try {
              await services.commit("Entity withdrawn", (draft) =>
                withdrawEntity(draft, entity.id, reviewer.value),
              );
            } catch (error) {
              services.error(error);
            }
          }),
        );
        return card;
      },
    ),
  );
  if (state.ownedCorrections.length) {
    panel.append(el("h3", "Owned corrections awaiting source evidence"));
    panel.append(
      pagedList(
        state.ownedCorrections,
        "Find owned corrections",
        (c) => `${c.title ?? ""} ${c.category ?? ""} ${c.evidence}`,
        (c) => {
          const card = el("section", undefined, "workspace-card");
          card.append(
            note(
              `Authored title: ${c.title ?? "not authored"} · category: ${c.category ?? "not authored"} · position: ${c.position ? `${c.position.x},${c.position.y}` : "not authored"}`,
            ),
            note(c.evidence),
            note(c.declaration),
            button("Apply owned correction to selected evidence", () => {
              try {
                showReview(
                  [...selection].map(
                    (key) => latest.find((r) => r.key === key)!,
                  ),
                  undefined,
                  c,
                );
              } catch (error) {
                services.error(error);
              }
            }),
          );
          return card;
        },
      ),
    );
  }
  panel.append(
    button(
      "Inspect decision history",
      () => {
        const node = el("section");
        node.append(
          el("h3", "Append-only review history"),
          pagedList(
            state.decisions.slice().reverse(),
            "Find decisions",
            (d) => `${d.action} ${d.reviewer} ${d.at}`,
            (d) => {
              const card = el("section", undefined, "workspace-card");
              card.append(
                el("h4", `${d.action} · ${d.at}`),
                note(
                  `Reviewer: ${d.reviewer} · ${d.redacted ? "source fields redacted; omitted evidence required" : "original local evidence retained"}`,
                ),
                note(
                  `Before: ${d.before.map((e) => e.title).join("; ") || "none"} · after: ${d.after.map((e) => e.title).join("; ") || "none"}`,
                ),
                note(`Evidence IDs: ${d.refs.join(", ") || "none"}`),
              );
              return card;
            },
            20,
          ),
          button("Close decision history", () => services.closeDetail()),
        );
        services.detail(node);
      },
      "inspect-review-history",
    ),
  );
  panel.append(
    button(
      "Undo last review decision",
      async () => {
        try {
          await services.commit("Review decision undone", (draft) =>
            undoReview(draft, reviewer.value),
          );
        } catch (error) {
          services.error(error);
        }
      },
      "undo-review",
    ),
    note(
      `${state.decisions.length} append-only decisions retained. Redacted backup history requires original evidence to restore editable decisions.`,
    ),
  );
  renderList();
  return panel;
}
