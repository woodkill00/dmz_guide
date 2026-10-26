import type { UIServices } from "./ui-context.ts";
import type { SnapshotEntry } from "./model.ts";
import { el, button, field, input, select, note } from "./dom.ts";
import { sourcePolicies } from "./policy.ts";
import {
  adaptOfficial,
  stageSnapshot,
  consumePreview,
  readJSONFile,
} from "./import.ts";
import { refreshPreview, applySnapshot } from "./refresh.ts";
import { identityRegistration, registrationMatches } from "./registration.ts";
import { registrationPanel } from "./registration-panel.ts";
import { stageBasemap } from "./basemaps.ts";
import { hajin } from "../map/hajin";
import { validateMapping } from "./taxonomy.ts";
export function sourcePanel(services: UIServices) {
  const panel = el("section");
  panel.append(
    el("h3", "Sources and immutable snapshots"),
    note(
      "Each site has its own layer and category masks. Owner-enabled local captures can be previewed for review below. Reference-only sources stay unavailable; the viewer never fetches source websites.",
    ),
  );
  for (const policy of Object.values(sourcePolicies)) {
    const card = el("section", undefined, "workspace-card");
    card.dataset.provider = policy.id;
    const link = el("a", `Open ${policy.name} ↗`);
    link.href = policy.page;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.append(
      el("h4", policy.name),
      note(
        `${policy.capability === "referenceOnly" ? "Permission required · 0 imported records" : "Owner-local file import"} · ${policy.reason}`,
      ),
      link,
    );
    panel.append(card);
  }
  const source = select(
    Object.values(sourcePolicies).map((p) => ({
      value: p.id,
      label: `${p.name}${p.capability === "referenceOnly" ? " · reference only" : ""}`,
    })),
    "official",
  );
  source.id = "snapshot-source";
  const file = input("", "file");
  file.accept = ".json,application/json";
  file.id = "snapshot-file";
  const previewButton = button(
    "Preview snapshot file",
    async () => {
      try {
        const selected = file.files?.[0];
        if (!selected) throw new Error("Choose a snapshot file.");
        if (selected.size > 2 * 1024 * 1024)
          throw new Error("Snapshot exceeds2MiB.");
        await preview(
          (signal) => readJSONFile(selected, 2 * 1024 * 1024, signal),
          source.value,
        );
      } catch (error) {
        services.error(error);
      }
    },
    "preview-snapshot",
  );
  source.addEventListener("change", () => {
    previewButton.disabled =
      sourcePolicies[source.value].capability === "referenceOnly";
  });
  panel.append(
    field("Provider", source),
    field("Authorized local snapshot JSON", file),
    previewButton,
    button(
      "Preview loaded official locations",
      async () => {
        try {
          const raw = services.legacySnapshot();
          if (!raw)
            throw new Error(
              "Official locations are not currently loaded. Supply the owner-local snapshot or retry the map source.",
            );
          await preview(JSON.stringify(adaptOfficial(raw)), "official");
        } catch (error) {
          services.error(error);
        }
      },
      "preview-loaded-official",
    ),
  );
  for (const policy of Object.values(sourcePolicies)) {
    if (policy.id === "official" || !services.legacySnapshot(policy.id))
      continue;
    panel.append(
      button(
        `Preview loaded ${policy.name} locations`,
        async () => {
          try {
            await preview(
              JSON.stringify(
                adaptOfficial(services.legacySnapshot(policy.id), policy.id),
              ),
              policy.id,
            );
          } catch (error) {
            services.error(error);
          }
        },
        `preview-loaded-${policy.id}`,
      ),
    );
  }
  async function preview(
    json: string | ((signal: AbortSignal) => Promise<string>),
    sourceId: string,
  ) {
    const token = await services.process(async (signal) =>
        stageSnapshot(
          typeof json === "string" ? json : await json(signal),
          sourceId,
          services.revision(),
        ),
      ),
      diff = refreshPreview(services.state(), token.snapshot),
      node = el("section");
    node.id = "snapshot-preview";
    node.append(
      el(
        "h3",
        `Review ${sourcePolicies[token.snapshot.sourceId].name} snapshot import`,
      ),
      note(
        `${token.snapshot.records.length} raw records · ${diff.added.length} added · ${diff.changed.length} changed · ${diff.missing.length} missing. ${diff.affectedEntities.length} reviewed entities will be marked stale. Coordinates remain unplotted until registered.`,
      ),
    );
    const identity = input("", "checkbox");
    let exact = false;
    try {
      identityRegistration(token.snapshot.frame);
      exact = true;
    } catch {}
    identity.disabled = !exact;
    node.append(
      field(
        "I reviewed the exact official frame identity and want to accept that registration.",
        identity,
      ),
    );
    const sample = el("ul");
    token.snapshot.records
      .slice(0, 30)
      .forEach((r) =>
        sample.append(
          el(
            "li",
            `${r.title} · ${r.categoryId} · raw ${r.rawGeometry.x},${r.rawGeometry.y}`,
          ),
        ),
      );
    node.append(
      sample,
      note(
        `Showing the first${Math.min(30, token.snapshot.records.length)} records in this preview. Full records remain in the staged snapshot.`,
      ),
    );
    node.append(
      button(
        "Keep immutable snapshot",
        async () => {
          try {
            await services.commit(
              "Snapshot imported",
              (draft) => {
                const snapshot = consumePreview(token, services.revision());
                applySnapshot(
                  draft,
                  snapshot,
                  token.digest,
                  identity.checked
                    ? identityRegistration(snapshot.frame)
                    : null,
                  false,
                );
              },
              [],
              token.revision,
            );
            services.closeDetail();
          } catch (error) {
            services.error(error);
          }
        },
        "commit-snapshot",
      ),
      button("Cancel import", () => services.closeDetail()),
    );
    services.detail(node);
  }
  for (const entry of services.state().snapshots) {
    const card = el("section", undefined, "workspace-card"),
      registered = services
        .state()
        .registrations.find((r) => r.id === entry.registrationId);
    card.append(
      el(
        "h4",
        `${sourcePolicies[entry.snapshot.sourceId].name} · ${entry.snapshot.snapshotId}`,
      ),
      note(
        `${entry.snapshot.records.length} immutable raw records · ${registrationMatches(entry.snapshot.frame, registered) ? "Registered" : "Unplotted: registration required"} · captured ${entry.snapshot.capturedAt}`,
      ),
    );
    card.append(button("Inspect all raw records", () => inspectEntry(entry)));
    card.append(button("Prune unreferenced snapshot", () => pruneEntry(entry)));
    card.append(
      button("Inspect / calibrate snapshot", () => {
        void showSnapshot(entry);
      }),
    );
    card.append(
      button("Map category taxonomy", () => {
        const node = el("section");
        node.append(
          el("h3", "Original → canonical categories"),
          note(
            "Original paths stay immutable. Blank mappings become Unmapped; changes mark related curation stale.",
          ),
        );
        const fields = new Map<string, HTMLInputElement>();
        for (const category of entry.snapshot.categories) {
          const f = input(entry.mapping[category.id] ?? "");
          fields.set(category.id, f);
          node.append(field(category.path.join(" / "), f));
        }
        const revision = services.revision();
        node.append(
          button("Save taxonomy mapping", async () => {
            try {
              const mapping = Object.fromEntries(
                [...fields]
                  .filter(([, f]) => f.value.trim())
                  .map(([id, f]) => [id, f.value.trim()]),
              );
              validateMapping(mapping);
              await services.commit(
                "Taxonomy saved",
                (draft) => {
                  const target = draft.snapshots.find(
                    (e) => e.key === entry.key,
                  );
                  if (!target) throw new Error("Snapshot changed.");
                  target.mapping = mapping;
                  target.mappingVersion++;
                  draft.entities.forEach((e) => {
                    if (
                      e.refs.some((ref) =>
                        ref.startsWith(entry.key.slice(0, -1) + ","),
                      )
                    )
                      e.freshness = "stale";
                  });
                },
                [],
                revision,
              );
              services.closeDetail();
            } catch (error) {
              services.error(error);
            }
          }),
          button("Cancel taxonomy", () => services.closeDetail()),
        );
        services.detail(node);
      }),
    );
    panel.append(card);
  }
  function inspectEntry(entry: SnapshotEntry) {
    const node = el("section");
    node.append(
      el("h3", `Raw evidence: ${entry.snapshot.snapshotId}`),
      note(
        "Raw coordinates and provider claims are shown even when registration is unresolved.",
      ),
    );
    const query = input(""),
      list = el("div");
    let page = 0;
    const render = () => {
      list.replaceChildren();
      const matches = entry.snapshot.records.filter((r) =>
        `${r.title} ${r.categoryId}`
          .toLocaleLowerCase()
          .includes(query.value.toLocaleLowerCase()),
      );
      page = Math.max(0, Math.min(page, Math.ceil(matches.length / 50) - 1));
      list.append(
        note(
          `${matches.length} records · page ${page + 1}/${Math.max(1, Math.ceil(matches.length / 50))}`,
        ),
      );
      for (const r of matches.slice(page * 50, (page + 1) * 50)) {
        const card = el("section", undefined, "workspace-card");
        card.append(
          el("h4", r.title),
          note(
            `Original category: ${entry.snapshot.categories.find((c) => c.id === r.categoryId)?.path.join(" / ")} · raw X ${r.rawGeometry.x}, Y ${r.rawGeometry.y} · floor ${r.applicability.floor ?? "unknown"} · build ${r.applicability.gameBuild ?? "unknown"} · ${r.activityClaim.state}`,
          ),
        );
        for (const e of r.evidence) card.append(note(e.note));
        card.append(
          note(
            `Upstream lineage IDs: ${r.upstreamRefs.join(", ") || "unknown"}`,
          ),
        );
        list.append(card);
      }
      list.append(
        button("Previous raw records", () => {
          page = Math.max(0, page - 1);
          render();
        }),
        button("Next raw records", () => {
          page++;
          render();
        }),
      );
    };
    query.addEventListener("input", () => {
      page = 0;
      render();
    });
    node.append(
      field("Search all raw records", query),
      list,
      button("Close raw inspection", () => services.closeDetail()),
    );
    render();
    services.detail(node);
  }
  async function pruneEntry(entry: SnapshotEntry) {
    try {
      const old = await services.previousState(),
        prefix = entry.key.slice(0, -1) + ",";
      const referenced = (s: ReturnType<UIServices["state"]> | undefined) =>
        !!s &&
        (s.entities.some((e) => e.refs.some((r) => r.startsWith(prefix))) ||
          s.decisions.some(
            (d) =>
              d.refs.some((r) => r.startsWith(prefix)) ||
              [...d.before, ...d.after].some((e) =>
                e.refs.some((r) => r.startsWith(prefix)),
              ),
          ));
      if (referenced(services.state()) || referenced(old))
        throw new Error(
          "This snapshot is referenced by current/previous curation or decision history and cannot be pruned.",
        );
      const revision = services.revision(),
        node = el("section");
      node.append(
        el("h3", "Prune unreferenced snapshot?"),
        note(
          `${entry.snapshot.snapshotId}: ${entry.snapshot.records.length} raw records. The previous valid workspace remains recoverable.`,
        ),
        button("Confirm snapshot prune", async () => {
          try {
            await services.commit(
              "Snapshot pruned",
              (draft) => {
                draft.snapshots = draft.snapshots.filter(
                  (e) => e.key !== entry.key,
                );
                const frames = new Set([
                  ...draft.snapshots.map((e) => e.snapshot.frame.id),
                  ...draft.basemaps.map((b) => b.frame.id),
                ]);
                draft.registrations = draft.registrations.filter((r) =>
                  frames.has(r.frameId),
                );
              },
              [],
              revision,
            );
            services.closeDetail();
          } catch (error) {
            services.error(error);
          }
        }),
        button("Keep snapshot", () => services.closeDetail()),
      );
      services.detail(node);
    } catch (error) {
      services.error(error);
    }
  }
  async function showSnapshot(entry: SnapshotEntry) {
    const asset = services
        .state()
        .basemaps.find(
          (b) => b.frame.imageDigest === entry.snapshot.frame.imageDigest,
        ),
      blob = asset ? await services.readResource(asset.id) : undefined;
    const url = blob ? URL.createObjectURL(blob) : undefined;
    const node = registrationPanel(
      entry.snapshot.frame,
      url,
      hajin.background,
      async (registration) => {
        await services.commit("Registration accepted", (draft) => {
          const target = draft.snapshots.find((e) => e.key === entry.key);
          if (!target) throw new Error("Snapshot missing.");
          draft.registrations.push(registration);
          target.registrationId = registration.id;
          draft.entities.forEach((e) => {
            if (
              e.refs.some((ref) => ref.startsWith(entry.key.slice(0, -1) + ","))
            )
              e.freshness = "stale";
          });
        });
        services.closeDetail();
      },
      () => services.closeDetail(),
      services.error,
    );
    services.detail(node, () => {
      if (url) URL.revokeObjectURL(url);
    });
  }
  panel.append(
    el("h3", "Local comparison backgrounds"),
    note(
      "Add a background you own or are authorized to use. Site collection restrictions cannot be overridden by a file checkbox. Images are always separate dependencies in backups.",
    ),
  );
  const image = input("", "file");
  image.accept = "image/png,image/jpeg,image/webp";
  image.id = "background-file";
  const description = input("");
  description.id = "background-description";
  const own = input("", "checkbox");
  own.id = "background-owned";
  panel.append(
    field("Local background raster", image),
    field("Description", description),
    field("I own or am authorized to use this local background.", own),
    button(
      "Preview background",
      async () => {
        try {
          if (!own.checked)
            throw new Error("Confirm ownership or authorization.");
          const file = image.files?.[0];
          if (!file) throw new Error("Choose a local background.");
          const staged = await services.process((signal) =>
              stageBasemap(file, "owned", description.value, signal),
            ),
            url = URL.createObjectURL(staged.blob),
            node = el("section"),
            preview = el("img");
          preview.src = url;
          preview.alt = description.value;
          preview.className = "workspace-image-preview";
          node.append(
            el("h3", "Review local background"),
            preview,
            note(
              `${staged.asset.frame.width} × ${staged.asset.frame.height} · sanitized PNG · coordinates require registration.`,
            ),
          );
          const revision = services.revision();
          node.append(
            button(
              "Keep local background",
              async () => {
                try {
                  await services.commit(
                    "Background saved",
                    (draft) => {
                      if (
                        !draft.basemaps.some((b) => b.id === staged.asset.id)
                      ) {
                        if (draft.basemaps.length >= 3)
                          throw new Error(
                            "Three additional backgrounds maximum. Restore an existing matching file or use another workspace.",
                          );
                        draft.basemaps.push(staged.asset);
                      }
                    },
                    [{ id: staged.asset.id, blob: staged.blob }],
                    revision,
                  );
                  services.closeDetail();
                } catch (error) {
                  services.error(error);
                }
              },
              "commit-background",
            ),
            button("Cancel background", () => services.closeDetail()),
          );
          services.detail(node, () => URL.revokeObjectURL(url));
        } catch (error) {
          services.error(error);
        }
      },
      "preview-background",
    ),
  );
  for (const asset of services.state().basemaps) {
    const card = el("section", undefined, "workspace-card");
    card.append(
      note(
        `Local authorization: ${asset.rightsDeclaration} · imported ${asset.capturedAt}`,
      ),
      button("Forget local background", () => {
        const node = el("section"),
          revision = services.revision();
        node.append(
          el("h3", "Forget this local background?"),
          note(
            `${asset.description}. It stays in the previous valid revision until another change replaces that recovery state. Your source snapshots and custom points remain intact.`,
          ),
          button(
            "Confirm background removal",
            async () => {
              try {
                await services.commit(
                  "Background removed",
                  (draft) => {
                    draft.basemaps = draft.basemaps.filter(
                      (b) => b.id !== asset.id,
                    );
                    const frames = new Set([
                      ...draft.snapshots.map((e) => e.snapshot.frame.id),
                      ...draft.basemaps.map((b) => b.frame.id),
                    ]);
                    draft.registrations = draft.registrations.filter((r) =>
                      frames.has(r.frameId),
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
            "confirm-remove-background",
          ),
          button("Keep background", () => services.closeDetail()),
        );
        services.detail(node);
      }),
    );
    card.append(
      el("h4", asset.description),
      note(
        `Frame ${asset.frame.width} × ${asset.frame.height} · ${asset.registrationId ? "Registration saved" : "Unregistered"}`,
      ),
      button("Calibrate background", async () => {
        try {
          const blob = await services.readResource(asset.id);
          if (!blob)
            throw new Error(
              "Background bytes missing. Restore the same authorized local file first.",
            );
          const url = URL.createObjectURL(blob);
          services.detail(
            registrationPanel(
              asset.frame,
              url,
              hajin.background,
              async (registration) => {
                await services.commit(
                  "Background registration accepted",
                  (draft) => {
                    draft.registrations = draft.registrations.filter(
                      (r) =>
                        r.id !==
                        draft.basemaps.find((b) => b.id === asset.id)
                          ?.registrationId,
                    );
                    draft.registrations.push(registration);
                    draft.basemaps.find(
                      (b) => b.id === asset.id,
                    )!.registrationId = registration.id;
                  },
                );
                services.closeDetail();
              },
              () => services.closeDetail(),
              services.error,
            ),
            () => URL.revokeObjectURL(url),
          );
        } catch (error) {
          services.error(error);
        }
      }),
    );
    panel.append(card);
  }
  return panel;
}
