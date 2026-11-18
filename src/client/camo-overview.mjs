import { parseBounded } from "../content/limits.mjs";
import { CAMO_MAX_BYTES, parseCamoCatalog } from "../domain/weapon-camos.mjs";
import {
  parseProgressCatalog,
  progressCatalog,
  camoStates,
  camoKey,
} from "../domain/camo-progress.mjs";
import { createCamoSession } from "./camo-session.mjs";

const root = document.querySelector("#camo-overview"),
  metadata = parseProgressCatalog(
    document.querySelector("#camo-progress-data").textContent,
  ),
  roster = parseBounded(
    document.querySelector("#camo-overview-roster").textContent,
    20000,
  ),
  query = root.querySelector("[data-camo-query]"),
  category = root.querySelector("[data-camo-class]"),
  classes = [...root.querySelectorAll("[data-overview-class]")];
let catalog,
  session,
  savedOpen = null,
  view = "challenges",
  disposed = false;
const labels = {
  completed: "Completed",
  next: "Next to track",
  remaining: "Remaining",
  unknown: "Progress unavailable",
};

function filter() {
  const term = query.value.trim().toLowerCase(),
    searching = !!(term || category.value);
  if (searching && !savedOpen) savedOpen = classes.map((c) => c.open);
  let visible = 0;
  for (const section of classes) {
    let matches = 0;
    for (const row of section.querySelectorAll("[data-overview-weapon]")) {
      row.hidden = !(
        row.dataset.search.includes(term) &&
        (!category.value || row.dataset.class === category.value)
      );
      if (!row.hidden) {
        matches++;
        visible++;
      }
    }
    section.hidden = !matches;
    if (searching && matches) section.open = true;
  }
  if (!searching && savedOpen) {
    classes.forEach((c, i) => (c.open = savedOpen[i]));
    savedOpen = null;
  }
  root.querySelector("[data-camo-count]").textContent = `${visible} weapons`;
  root.querySelector("[data-camo-empty]").hidden = visible > 0;
}
query.addEventListener("input", filter);
category.addEventListener("change", filter);
query.form.addEventListener("submit", (e) => e.preventDefault());
query.form.addEventListener("reset", () => setTimeout(filter, 0));
filter();

// Views are navigation only, so remain usable if the catalog or storage fails.
const nav = document.createElement("div");
nav.className = "camo-view-buttons";
nav.setAttribute("role", "group");
nav.setAttribute("aria-label", "Overview camo views");
for (const [id, name] of [
  ["challenges", "Challenges"],
  ["prestige", "Prestige"],
  ["mastery", "Mode mastery"],
]) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = name;
  button.dataset.overviewView = id;
  button.setAttribute("aria-pressed", String(id === view));
  nav.append(button);
}
root.querySelector(".camo-search").before(nav);
function setView(next) {
  view = next;
  nav
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.overviewView === view)),
    );
  for (const group of root.querySelectorAll("[data-overview-group]")) {
    const g = group.dataset.overviewGroup;
    group.hidden =
      view === "challenges"
        ? !["military", "special", "completionist"].includes(g)
        : view === "prestige"
          ? g !== "prestige"
          : g !== "modeMastery";
  }
  for (const row of root.querySelectorAll("[data-overview-weapon]")) {
    row.querySelector(".camo-detail-panel")?.remove();
    row.querySelectorAll("[aria-expanded=true]").forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      b.removeAttribute("aria-controls");
    });
  }
}
nav.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setView(b.dataset.overviewView);
});
setView(view);

function paint(workspace, ready) {
  const states = new Map(
    metadata.weapons.map((w) => [
      w.id,
      ready ? camoStates(metadata, workspace, w.id) : {},
    ]),
  );
  for (const row of root.querySelectorAll("[data-overview-weapon]")) {
    const id = row.dataset.overviewWeapon,
      state = states.get(id),
      w = metadata.weapons.find((w) => w.id === id);
    for (const button of row.querySelectorAll("[data-overview-camo]")) {
      const s = state[button.dataset.overviewCamo] || "unknown";
      button.dataset.state = s;
      button.querySelector("[data-camo-dot-status]").textContent = labels[s];
      button.querySelector(".camo-dot-mark").textContent =
        s === "completed"
          ? "✓"
          : s === "next"
            ? "●"
            : s === "remaining"
              ? "○"
              : "?";
    }
    for (const input of row.querySelectorAll("[data-camo-complete]"))
      input.checked = state[input.dataset.camoComplete] === "completed";
    const count = w.rows.filter(
      (r) =>
        camoKey(id, r).startsWith("weapon:") && state[r.id] === "completed",
    ).length;
    row.querySelector("[data-overview-weapon-count]").textContent =
      `${ready ? count : "—"} / 18 weapon-specific`;
  }
  for (const metric of root.querySelectorAll("[data-camo-metric]")) {
    const id = metric.dataset.camoMetric,
      scope = metric.dataset.scope;
    const weapons = metadata.weapons.filter(
      (w) => scope === "all" || w.category === scope,
    );
    const shared = id === "divergence",
      total = shared ? 1 : weapons.length;
    const count = shared
      ? Number(states.get(weapons[0].id)[id] === "completed")
      : weapons.filter((w) => states.get(w.id)[id] === "completed").length;
    metric.textContent = `${ready ? count : "—"} / ${total}`;
    metric
      .closest(".camo-medal")
      .style.setProperty(
        "--camo-progress",
        `${ready ? (count / total) * 100 : 0}%`,
      );
  }
}
function details(row, button) {
  const wasOpen = button.getAttribute("aria-expanded") === "true";
  row.querySelector(".camo-detail-panel")?.remove();
  row.querySelectorAll("[data-overview-camo]").forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    b.removeAttribute("aria-controls");
  });
  if (wasOpen) {
    button.removeAttribute("aria-controls");
    return;
  }
  const w = catalog.weapons.find((w) => w.id === row.dataset.overviewWeapon),
    r = w.rows.find((r) => r.id === button.dataset.overviewCamo);
  const panel = document.createElement("div");
  panel.className = "camo-detail-panel";
  panel.id = `overview-panel-${w.id}`;
  const heading = document.createElement("h3"),
    objective = document.createElement("p"),
    label = document.createElement("label"),
    checkbox = document.createElement("input"),
    link = document.createElement("a"),
    close = document.createElement("button");
  heading.textContent =
    r.name +
    (r.group === "modeMastery"
      ? r.order <= 22
        ? " · Multiplayer · Shared"
        : " · DMZ · Shared"
      : r.id === "divergence"
        ? " · Shared"
        : "");
  objective.textContent = r.requirement;
  checkbox.type = "checkbox";
  checkbox.dataset.camoComplete = r.id;
  checkbox.disabled = true;
  label.className = "camo-complete-label";
  label.append(checkbox, document.createTextNode(`Completed · ${r.name}`));
  link.href = r.sourceURL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Challenge source (opens in new tab)";
  close.type = "button";
  close.textContent = "Close details";
  close.addEventListener("click", () => {
    panel.remove();
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-controls");
    button.focus({ preventScroll: true });
  });
  panel.append(heading, objective, label, link, close);
  row.append(panel);
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-controls", panel.id);
  session.repaint();
}
root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-overview-camo]");
  if (button && catalog && session)
    details(button.closest("[data-overview-weapon]"), button);
});
root.addEventListener("change", (event) => {
  const input = event.target.closest("[data-camo-complete]");
  if (input && session)
    session.edit(
      input.closest("[data-overview-weapon]").dataset.overviewWeapon,
      input.dataset.camoComplete,
      input.checked,
      input,
    );
});

const owner = new AbortController(),
  timer = setTimeout(() => owner.abort(), 10000);
window.addEventListener(
  "pagehide",
  () => {
    disposed = true;
    owner.abort();
  },
  { once: true },
);
try {
  const response = await fetch("/assets/src/ui/weapon-camos.json", {
    signal: owner.signal,
    credentials: "omit",
    redirect: "error",
  });
  if (
    !response.ok ||
    !response.body ||
    Number(response.headers.get("content-length")) > CAMO_MAX_BYTES
  )
    throw Error("Camo catalog unavailable or too large");
  const reader = response.body.getReader(),
    chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > CAMO_MAX_BYTES)
        throw Error("Camo catalog exceeds byte limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  catalog = parseCamoCatalog(
    new TextDecoder("utf-8", { fatal: true }).decode(buffer),
    roster,
  );
  if (JSON.stringify(progressCatalog(catalog)) !== JSON.stringify(metadata))
    throw Error("Camo catalog metadata mismatch");
  if (!disposed && !owner.signal.aborted) {
    session = createCamoSession(root, metadata, paint);
    root
      .querySelectorAll("[data-overview-camo]")
      .forEach((b) => (b.disabled = false));
    await session.start();
  }
} catch {
  catalog = null;
  const error = root.querySelector("#camo-save-error");
  error.hidden = false;
  error.textContent =
    "Camo catalog unavailable. Reload this page to retry; weapon links and saved progress are retained.";
  root.querySelector("#camo-save-status").textContent = "Progress unavailable";
} finally {
  clearTimeout(timer);
}
