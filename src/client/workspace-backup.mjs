import { parseBounded } from "../content/limits.mjs";
import {
  createWorkspaceManifest,
  inspectWorkspaceManifest,
  WORKSPACE_MODULES,
} from "../domain/workspace-manifest.mjs";

const $ = (id) => document.getElementById(id);
let created = null,
  inspected = null,
  generation = 0;
function download(name, text) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function status(node, message) {
  node.textContent = message;
}
function showInspection(bundle, projection) {
  $("workspace-modules").replaceChildren();
  status(
    $("workspace-import-preview"),
    `${projection.modules.length} checked modules · ${projection.omitted.length} omitted · ${projection.totalBytes.toLocaleString()} bytes. No data restored. Each owner tool must validate its file.`,
  );
  for (const [index, row] of projection.modules.entries()) {
    const section = document.createElement("section");
    section.className = "panel";
    const heading = document.createElement("h3");
    heading.textContent = `${row.label} · ${row.bytes.toLocaleString()} bytes`;
    const note = document.createElement("p");
    note.textContent = row.restore
      ? `Download this checked module, then import it at its owner tool. Origin: ${row.origin}. No restore has occurred.`
      : "This module has no supported import tool yet. Retain the original export; no restore is offered.";
    section.append(heading, note);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Download module";
    button.addEventListener("click", () => {
      if (inspected !== bundle) return;
      download(bundle.modules[index].name, bundle.modules[index].text);
      status(
        $("workspace-import-preview"),
        "Module download requested. Check browser downloads before importing at its owner tool.",
      );
    });
    section.append(button);
    if (row.restore) {
      const link = document.createElement("a");
      link.href = row.origin + row.restore;
      link.textContent = "Open restore page";
      if (new URL(link.href).origin !== location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      section.append(" ", link);
    }
    $("workspace-modules").append(section);
  }
  if (projection.omitted.length) {
    const omitted = document.createElement("p");
    omitted.textContent =
      "Omitted: " +
      projection.omitted.map((id) => WORKSPACE_MODULES[id].label).join(", ");
    $("workspace-modules").append(omitted);
  }
}
$("workspace-create").addEventListener("click", async () => {
  const token = ++generation;
  created = null;
  $("workspace-download").hidden = true;
  status($("workspace-create-preview"), "Checking selected files locally…");
  try {
    const files = [...$("workspace-files").files];
    if (
      !files.length ||
      files.length > 6 ||
      files.some((file) => file.size > 20 * 1024 * 1024)
    )
      throw Error("Choose one to six JSON exports, each up to 20 MiB");
    const inputs = await Promise.all(
      files.map(async (file) => ({ name: file.name, text: await file.text() })),
    );
    const bundle = await createWorkspaceManifest(inputs);
    const preview = await inspectWorkspaceManifest(bundle);
    if (token !== generation) return;
    created = bundle;
    status(
      $("workspace-create-preview"),
      `${preview.modules.map((row) => row.label).join(", ")} checked. Omitted: ${preview.omitted.map((id) => WORKSPACE_MODULES[id].label).join(", ") || "none"}. Nothing saved yet.`,
    );
    $("workspace-download").hidden = false;
  } catch (reason) {
    if (token === generation)
      status($("workspace-create-preview"), reason.message || String(reason));
  }
});
$("workspace-files").addEventListener("change", () => {
  generation++;
  created = null;
  $("workspace-download").hidden = true;
  status(
    $("workspace-create-preview"),
    "Selected files changed. Preview again.",
  );
});
$("workspace-download").addEventListener("click", () => {
  if (!created) return;
  download("dmz-workspace-bundle.json", JSON.stringify(created));
  status(
    $("workspace-create-preview"),
    "Bundle download requested. Check browser downloads; no module has been restored.",
  );
});
$("workspace-import").addEventListener("change", async () => {
  const token = ++generation;
  inspected = null;
  $("workspace-modules").replaceChildren();
  status($("workspace-import-preview"), "Checking bundle and module digests…");
  try {
    const file = $("workspace-import").files?.[0];
    if (!file || file.size > 36 * 1024 * 1024)
      throw Error("Choose a bundle up to 36 MiB");
    const bundle = parseBounded(await file.text(), 36 * 1024 * 1024, {
      depth: 26,
      nodes: 300000,
      string: 20 * 1024 * 1024,
    });
    const projection = await inspectWorkspaceManifest(bundle);
    if (token !== generation) return;
    inspected = bundle;
    showInspection(bundle, projection);
  } catch (reason) {
    if (token === generation)
      status(
        $("workspace-import-preview"),
        `${reason.message || String(reason)}. Nothing restored.`,
      );
  }
});
