import { mountDirectories } from "../ui/directory-view.mjs";
import { mountWorkspaceShell } from "../ui/workspace-shell.mjs";
if (
  document.documentElement.dataset.uiSurface === "guide" ||
  ["studio", "manager"].includes(document.documentElement.dataset.uiSurface)
)
  mountWorkspaceShell(document, {
    mounted: document.documentElement.dataset.uiSurface === "guide",
  });

mountDirectories();
