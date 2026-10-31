import { escapeHTML as esc } from "../ui/render.mjs";
export const useLabels = {
  recipes: "Recipes",
  upgrades: "Upgrade uses",
  missions: "Mission uses",
  crafts: "Crafts",
};
export const useLink = (r) =>
  `<a href="${esc(r.url)}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a>`;
export function usesList(rows, offset = 0) {
  return rows.length
    ? `<ul>${rows
        .slice(offset, offset + 50)
        .map(
          (r) =>
            `<li>${useLink(r)}${r.role ? ` · ${esc(r.role)}` : ""}${r.track ? ` · ${esc(r.track)}` : ""}${r.completed ? " · Recorded completed" : ""}</li>`,
        )
        .join(
          "",
        )}</ul>${rows.length > 50 ? `<div class="draft-actions"><button type="button" data-use-page="${Math.max(0, offset - 50)}" ${offset === 0 ? "disabled" : ""}>Previous uses</button><button type="button" data-use-page="${offset + 50}" ${offset + 50 >= rows.length ? "disabled" : ""}>Next uses</button><span>${offset + 1}–${Math.min(offset + 50, rows.length)} of ${rows.length}</span></div>` : ""}`
    : "<p>No known links in this catalog.</p>";
}
export function useCell(rows, kind, id) {
  return `<div class="inventory-use" role="group" aria-label="${useLabels[kind]}"><span class="mobile-label">${useLabels[kind]}</span>${rows.length ? `${useLink(rows[0])}${rows.length > 1 ? `<button type="button" data-show-use="${esc(id)}" data-kind="${kind}" aria-label="Show all ${useLabels[kind]}">+${rows.length - 1}</button>` : ""}` : "<span>—</span>"}</div>`;
}
export function singleExpansion(container, selector) {
  container?.addEventListener(
    "toggle",
    (event) => {
      if (!event.target.matches(selector) || !event.target.open) return;
      for (const details of container.querySelectorAll(selector))
        if (details !== event.target) details.open = false;
    },
    true,
  );
}
