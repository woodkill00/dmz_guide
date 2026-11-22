import { features, featureURL } from "../ui/feature-registry.mjs";
import { workspacePreferences } from "../domain/site-workflows.mjs";
import { validateSaveReceipt } from "../domain/save-receipt.mjs";
import {
  subscribeSaveReceipts,
  SAVE_RECEIPT_KEY,
} from "../storage/save-events.mjs";
import { readNavigation } from "./navigation-state.mjs";
export const WORKSPACE_UI_KEY = "dmz-workspace-ui-v1";
export function setupSiteTools(root = document) {
  for (const menu of root.querySelectorAll("[data-workspace-tools]")) {
    if (menu.dataset.ready) continue;
    menu.dataset.ready = "true";
    let prefs;
    try {
      prefs = workspacePreferences(localStorage.getItem(WORKSPACE_UI_KEY));
    } catch {
      prefs = workspacePreferences(null);
    }
    const density = menu.querySelector("[data-workspace-density]");
    const apply = () => {
      document.documentElement.dataset.workspaceDensity = prefs.density;
      document.documentElement.dataset.density = prefs.density;
      density.setAttribute("aria-pressed", String(prefs.density === "compact"));
    };
    apply();
    const setDensity = (value) => {
      if (!["compact", "comfortable"].includes(value)) return;
      try {
        prefs = workspacePreferences(localStorage.getItem(WORKSPACE_UI_KEY));
      } catch {}
      prefs = { ...prefs, density: value };
      try {
        localStorage.setItem(WORKSPACE_UI_KEY, JSON.stringify(prefs));
      } catch {}
      apply();
    };
    window.addEventListener("workspace-density", (event) =>
      setDensity(event.detail?.density),
    );
    density.addEventListener("click", () => {
      const value =
        document.documentElement.dataset.density === "compact"
          ? "comfortable"
          : "compact";
      setDensity(value);
      window.dispatchEvent(
        new CustomEvent("workspace-density", { detail: { density: value } }),
      );
    });
    const summary = menu.querySelector(":scope > summary");
    const close = () => {
      menu.open = false;
    };
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.open) {
        event.preventDefault();
        event.stopPropagation();
        close();
        summary.focus();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (menu.open && !menu.contains(event.target)) close();
    });
    document.addEventListener("focusin", (event) => {
      if (menu.open && !menu.contains(event.target)) close();
    });
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a[href]")) close();
    });
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      for (const other of document.querySelectorAll(
        ".site-nav > details[open]",
      ))
        if (other !== menu) other.open = false;
      const links = menu.querySelector("[data-workspace-recent]");
      const nav = readNavigation(),
        ids = [...new Set([...nav.pins, ...nav.recent])].slice(0, 8);
      if (!ids.length) return;
      links.replaceChildren();
      const surface = menu.dataset.workspaceSurface || "guide";
      const mapBase = location.pathname.startsWith("/map/")
        ? "/map/"
        : undefined;
      for (const id of ids) {
        const feature = features.find((f) => f.id === id);
        if (!feature) continue;
        const link = document.createElement("a");
        link.href = featureURL(feature, surface, { mapBase });
        link.textContent = feature.label;
        links.append(link);
      }
    });
    const show = (receipt, remote) => {
      menu.querySelector("[data-workspace-save]").textContent =
        `${remote ? "Another tab saved" : "Saved locally"} · ${receipt.owner === "armory" ? "Armory" : "Guide"} · revision ${receipt.revision} · ${new Date(receipt.savedAt).toLocaleTimeString()}`;
      menu.querySelector("[data-workspace-save-mark]").textContent = remote
        ? "●"
        : "✓";
      menu.querySelector("[data-workspace-remote]").hidden = !remote;
    };
    try {
      const raw = localStorage.getItem(SAVE_RECEIPT_KEY);
      if (raw && raw.length <= 1024)
        show(validateSaveReceipt(JSON.parse(raw)), false);
    } catch {}
    let unsubscribe = subscribeSaveReceipts(show);
    window.addEventListener("pagehide", () => {
      unsubscribe?.();
      unsubscribe = null;
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && !unsubscribe)
        unsubscribe = subscribeSaveReceipts(show);
    });
  }
}
