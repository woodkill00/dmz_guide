// Move existing controls; catalog/profile selection and save ownership stay intact.
export function mountCatalogContext({
  pack = () => null,
  doc = globalThis.document,
} = {}) {
  if (!doc?.createElement) return null;
  const select = doc.querySelector("#pack-select");
  if (!select || select.dataset.compactContext) return null;
  select.dataset.compactContext = "true";
  if (!doc.querySelector(".quick-tracker-nav")) {
    const controls =
      select.closest(".profile-toolbar") || select.closest("label");
    const context = doc.createElement("details");
    context.className = "catalog-context";
    const summary = doc.createElement("summary");
    summary.dataset.trackerContextLabel = "";
    summary.textContent = "Data & backup";
    controls.before(context);
    context.append(summary, controls);
    const note = doc.querySelector("#pack-note");
    if (note) {
      const coverage = doc.createElement("details"),
        label = doc.createElement("summary");
      label.textContent = "Version & coverage";
      note.before(coverage);
      coverage.append(label, note);
      context.append(coverage);
    }
    const settings = doc.createElement("a");
    settings.href = "/settings/";
    settings.textContent = "Backups & settings";
    settings.dataset.catalogSettings = "";
    context.append(settings);
  }
  const update = () => {
    const status = doc.querySelector("#save-status");
    const text = status?.textContent.trim() || "";
    const clean = /^Saved locally · (no account or sync|revision \d+)$/.test(
      text,
    );
    const draft =
      text ===
      "Unsaved inventory edits · save locally or export a validated backup.";
    const settled =
      clean ||
      [
        "Saved values unchanged / no unsaved inventory edits.",
        "Saved values unchanged · no unsaved inventory edits.",
        "Inventory edits canceled; saved profile restored.",
        "Progress unchanged; no save needed.",
      ].includes(text);
    const active = pack(),
      label = doc.querySelector("[data-tracker-context-label]");
    const fixture = active
      ? active.sources?.some((s) => s.type === "original-fixture") ||
        active.id.startsWith("fixture:")
      : /FICTIONAL/i.test(select.selectedOptions[0]?.textContent || "");
    if (label) {
      label.textContent =
        "Data & backup" +
        (fixture
          ? " · Test data, not game facts"
          : active && active.id !== "official:mw4-dmz-starter"
            ? " · Other catalog"
            : "") +
        (draft
          ? " · Unsaved edits"
          : text === "Inventory edits canceled; saved profile restored."
            ? " · Edits canceled"
            : "");
      label.title =
        active?.title ||
        "Choose data, review coverage, or back up your profile";
      label.dataset.fixture = String(Boolean(fixture));
      label.dataset.unsaved = String(draft);
    }
    if (
      !active &&
      doc.querySelector("main")?.getAttribute("aria-busy") === "false"
    ) {
      const context = doc.querySelector(".catalog-context");
      if (context) context.open = true;
    }
    if (status) {
      status.dataset.catalogClean = String(clean);
      status.dataset.catalogQuiet = String(settled || draft);
    }
    const settings = doc.querySelector("[data-catalog-settings]");
    if (settings)
      settings.href =
        "/settings/" +
        (select.value ? "?pack=" + encodeURIComponent(select.value) : "");
  };
  const observer = new MutationObserver(update);
  for (const node of [
    select,
    doc.querySelector("#pack-note"),
    doc.querySelector("#save-status"),
  ].filter(Boolean))
    observer.observe(node, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  select.addEventListener("change", update);
  doc.addEventListener("tracker-refreshed", update);
  update();
  return { update, disconnect: () => observer.disconnect() };
}
