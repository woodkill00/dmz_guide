import { renderMissionObjectives } from "./mission-objectives.mjs";
import { activeOrderPageKeys } from "../domain/order-progress.mjs";
import { orderCompletionCheck } from "./order-progress.mjs";
import { dashboardEscape as e } from "./dashboard-page.mjs";
import { dashboardItemLink, dashboardLink } from "../domain/dashboard.mjs";
export function dashboardOrderCards(
  model,
  pack,
  { expanded = false, showCompleted = false } = {},
) {
  const active = activeOrderPageKeys(model.orders);
  return (
    '<label class="order-show-completed"><input type="checkbox" data-order-show-completed' +
    (showCompleted ? " checked" : "") +
    "> Show completed</label>" +
    ["hajin", "x01", "listed"]
      .map((set) => {
        const all = model.orders.filter((r) => r.set === set);
        if (!all.length) return "";
        const pending = all.filter((r) => !r.total || r.done < r.total);
        const rows = showCompleted ? all : pending;
        return (
          "<h3>" +
          (set === "hajin"
            ? "Hajin"
            : set === "x01"
              ? "X01"
              : "Listed orders") +
          "</h3><p>" +
          all.reduce((n, r) => n + r.done, 0) +
          "/" +
          all.reduce((n, r) => n + r.total, 0) +
          " missions complete</p>" +
          `<details class="order-page-index" data-order-page-index="${e(set)}"><summary>All ${all.length} pages</summary><nav aria-label="${e(set === "hajin" ? "Hajin" : set === "x01" ? "X01" : "Listed")} Order pages">${all.map((r) => `<a href="${e(dashboardLink("/missions/", pack.id) + (r.page ? "&page=" + set + "-" + r.page : ""))}">${e(r.label)}${r.total > 0 && r.done === r.total ? " · Done" : ""}</a>`).join("")}</nav></details>` +
          `<p class="order-preview-count">Showing ${Math.min(rows.length, expanded ? 100 : 3)} of ${rows.length} ${showCompleted ? "listed" : "unfinished"} pages</p>` +
          (rows.length
            ? rows
                .slice(0, expanded ? 100 : 3)
                .map((r) => {
                  const key = set + "-" + r.page,
                    complete = r.total > 0 && r.done === r.total;
                  const check = orderCompletionCheck(key, r.label, {
                    complete,
                    partial: r.done > 0 && !complete,
                    total: r.total,
                    readonly: model.status !== "ready",
                  });
                  const missions = showCompleted
                    ? r.rows
                    : r.rows.filter((m) => !m.done);
                  return (
                    '<article class="dash-order" data-order-key="' +
                    e(key) +
                    '"><header>' +
                    check +
                    '<h4><a href="' +
                    e(
                      dashboardLink("/missions/", pack.id) +
                        (r.page ? "&page=" + key : ""),
                    ) +
                    '">' +
                    e(r.label) +
                    "</a></h4><small>" +
                    r.done +
                    "/" +
                    r.total +
                    "</small></header>" +
                    (r.protected
                      ? "<small>Visible missions only</small>"
                      : "") +
                    '<details data-order-disclosure="' +
                    e(key) +
                    '"' +
                    (active.has(key) ? " open" : "") +
                    "><summary>Missions (" +
                    missions.length +
                    ")</summary><ul>" +
                    missions
                      .map(
                        (m) =>
                          '<li class="dash-order-mission"><div class="order-mission-heading">' +
                          orderCompletionCheck(m.id, m.name, {
                            complete: m.done,
                            readonly: model.status !== "ready",
                          }) +
                          '<a href="' +
                          e(dashboardItemLink(pack.id, m.id)) +
                          '">' +
                          e(m.name) +
                          "</a></div>" +
                          renderMissionObjectives(m, {
                            expanded: active.has(key),
                          }) +
                          "</li>",
                      )
                      .join("") +
                    "</ul></details></article>"
                  );
                })
                .join("")
            : "<p>All listed orders complete.</p>")
        );
      })
      .join("")
  );
}
