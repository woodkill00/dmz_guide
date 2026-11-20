import { hajinOrderSequence } from "../content/hajin-order-sequence.mjs";
import {
  hajinPageIntel,
  x01PageIntel,
  missionSources,
} from "../content/mission-intel.mjs";
import { ordersPageCoverage } from "../domain/progression.mjs";
import { chapterReaderPath } from "../domain/mission-chapter.mjs";
import { escapeHTML as e, recordUrl } from "./render.mjs";
import { renderMissionObjectives } from "./mission-objectives.mjs";

export function missionChapterPages(packs, overrides = {}) {
  const pack = packs.find((p) => p.id === "official:mw4-dmz-starter");
  if (!pack) return [];
  const byId = new Map(pack.objectives.map((r) => [r.id, r]));
  return [
    ...hajinOrderSequence.pages.map((row) => ({
      ...row,
      set: "hajin",
      base: hajinPageIntel[row.page - 1],
    })),
    ...ordersPageCoverage(pack, 5, "x01").map((row) => ({
      ...row,
      label: `X01 ${row.page}/5`,
      set: "x01",
      base: x01PageIntel[row.page - 1],
    })),
  ].map((row) => {
    const id = `${row.set}-${row.page}`,
      local = overrides[id],
      intel = { ...row.base, ...local },
      title = `${row.set === "hajin" ? "Hajin" : "X01"} · Page ${row.page}`,
      chapterRecord = {
        id,
        rewards: [...intel.rewards],
        reviewedAt: intel.reviewedAt,
        ...(intel.notes ? { notes: intel.notes } : {}),
      },
      directory = `/missions/?pack=${encodeURIComponent(pack.id)}&page=${id}`,
      sources =
        row.set === "hajin"
          ? intel.sourceKeys.map((key) => [
              key === "radar"
                ? "DMZ Radar"
                : key === "game8"
                  ? "Game8"
                  : "COD Central",
              missionSources[key],
            ])
          : [["COD Central", intel.sourceUrl]],
      missions = row.objectiveIds
        .map((id) => {
          const record = byId.get(id);
          if (!record) return "<li>Mission record missing · review source</li>";
          if (record.spoiler)
            return `<li>Story mission · reveal spoilers in the <a href="${e(directory)}">Orders directory</a> to open it.</li>`;
          const href = e(
            recordUrl({ ...record, pack, recordType: "objective" }),
          );
          return `<li><h2><a href="${href}">${e(record.name)}</a></h2>${renderMissionObjectives(record, { expanded: true })}<p><a href="${href}">Full guide &amp; edit</a></p></li>`;
        })
        .join("");
    return {
      path: chapterReaderPath(id),
      title,
      page: "missions",
      ownerPath: "/missions/",
      packId: pack.id,
      chapterRecord,
      body: `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(directory)}">All Orders</a></nav><header class="page-heading"><p class="eyebrow">${e(row.set.toUpperCase())} / ORDERS</p><h1>${e(title)}</h1><p>${e(row.label)}</p><p>${row.set === "hajin" && row.placement !== "fixed" ? "Reported chapter sequence; page placement may vary in game." : "Source-reported page roster; current build unverified."}</p></header><section class="panel" aria-labelledby="chapter-missions"><h2 id="chapter-missions">Missions</h2><ol>${missions}</ol><p>Each mission owns its tasks and requirements. Open its page to edit that content; the page editor below owns this group's rewards, notes, photos and layout. Player completion stays separate.</p></section><div data-chapter-report><section class="panel"><h2>Reported page rewards</h2><ul>${intel.rewards.map((reward) => `<li>${e(reward)}</li>`).join("")}</ul>${intel.notes ? `<p>${e(intel.notes)}</p>` : ""}<p>${local ? "Local repository report; original sources do not independently verify local changes." : "Community source report; confirm current-game rewards."} Reviewed ${e(intel.reviewedAt)}.</p></section></div><section class="panel" aria-labelledby="chapter-sources"><h2 id="chapter-sources">Sources</h2><p>${sources.map(([label, url]) => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`).join(" · ")}</p><a href="${e(directory)}">Return to Orders</a></section>`,
    };
  });
}
