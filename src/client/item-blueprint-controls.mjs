import {
  createBlueprintOperation,
  commitFoundOperation,
  verifyFoundOperation,
} from "./collection-action.mjs";
import {
  readDashboardProfile,
  readDashboardOverlay,
} from "../storage/dashboard-context.mjs";
import { newProfile } from "../domain/profile.mjs";
import { automaticIngredientBlueprint } from "../domain/inventory-presentation.mjs";
import { itemCardURL } from "../ui/item-card.mjs";
const owners = new WeakMap();
export function itemPageDrafts(root, profile) {
  for (const box of root.querySelectorAll("[data-build-auto]")) {
    const select = box.querySelector("[data-build-select]"),
      quantity = box.querySelector("[data-build-quantity]");
    const saved = profile?.buildTargets?.[box.dataset.buildItem];
    if (
      !select ||
      !quantity ||
      select.disabled ||
      (select.checked && quantity.disabled) ||
      !quantity.validity.valid ||
      quantity.value.trim() === "" ||
      !Number.isSafeInteger(Number(quantity.value)) ||
      Number(quantity.value) < 1 ||
      select.checked !== (saved !== undefined) ||
      (select.checked && Number(quantity.value) !== saved)
    )
      return true;
  }
  return [
    ...root.querySelectorAll(
      "#private-picture input,#private-picture textarea,#private-picture select,[data-private-photo-dirty]",
    ),
  ].some(
    (n) =>
      n.hasAttribute("data-private-photo-dirty") ||
      (n.type === "file" ? n.files?.length : n.value !== n.defaultValue),
  );
}
export async function mountItemBlueprint(
  workspace,
  pack,
  profile,
  item,
  context = null,
) {
  const previous = owners.get(workspace);
  if (previous?.pending()) return;
  previous?.stop();
  const host = workspace.querySelector("[data-item-collection]"),
    box = document.createElement("div");
  box.className = "item-blueprint-editor";
  const label = document.createElement("label"),
    input = document.createElement("input"),
    caption = document.createElement("span"),
    status = document.createElement("p");
  label.className = "blueprint-check";
  input.type = "checkbox";
  input.disabled = true;
  input.dataset.itemBlueprintEdit = item.id;
  input.setAttribute("aria-label", "Blueprint owned: " + item.name);
  caption.textContent = "Blueprint owned";
  label.append(input, caption);
  status.setAttribute("role", "status");
  status.dataset.blueprintSaveStatus = "";
  box.append(label, status);
  host.append(box);
  const controller = new AbortController(),
    disabled = new Map();
  let op = null,
    flight = null,
    epoch = 0,
    resumeAfterFlight = false,
    live = true,
    known = profile || newProfile(pack),
    overlayTag = "";
  const controlsRoot = context ? document.querySelector("main") : workspace;
  const pending = () => !!flight || (!!op && op.state !== "confirmed");
  const lock = (blocked) => {
    if (blocked)
      for (const n of controlsRoot.querySelectorAll(
        "button,input,select,textarea",
      )) {
        if (n.closest("[data-blueprint-recovery]")) continue;
        if (!disabled.has(n)) disabled.set(n, n.disabled);
        n.disabled = true;
      }
    else {
      for (const [n, value] of disabled) if (n.isConnected) n.disabled = value;
      disabled.clear();
      input.disabled = !!automaticIngredientBlueprint(pack, known, item);
    }
  };
  const show = (message) => {
    if (!live || !workspace.isConnected) return;
    status.textContent = message;
    box.querySelector("[data-blueprint-recovery]")?.remove();
    if (!op || op.state === "confirmed") return;
    const recovery = document.createElement("div");
    recovery.dataset.blueprintRecovery = "";
    for (const [action, text] of [
      [
        op.state === "committed-unverified" ? "verify" : "retry",
        op.state === "committed-unverified" ? "Verify saved" : "Retry save",
      ],
      ["export", "Export unsaved"],
      ["reload", "Reload saved"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.blueprintRecoveryAction = action;
      b.textContent = text;
      b.disabled = !!flight;
      recovery.append(b);
    }
    box.append(recovery);
  };
  const adopt = (value) => {
    if (
      value.contentVersion !== pack.contentVersion ||
      value.packId !== pack.id
    )
      return false;
    if (
      context &&
      (context.pack()?.id !== pack.id ||
        context.pack()?.contentVersion !== pack.contentVersion ||
        value.revision < context.profile().revision)
    )
      return false;
    known = value;
    context?.adopt(value);
    if (live && workspace.isConnected) {
      input.checked =
        !!value.itemBlueprints?.[item.id] ||
        !!automaticIngredientBlueprint(pack, value, item);
      input.disabled = !!automaticIngredientBlueprint(pack, value, item);
    }
    return true;
  };
  const run = () => {
    if (flight) return flight;
    if (!op) return Promise.resolve(false);
    const target = op;
    lock(true);
    flight = (async () => {
      try {
        if (target.state !== "committed-unverified") {
          const [saved, overlay] = await Promise.all([
            readDashboardProfile(pack.id),
            readDashboardOverlay(pack.id),
          ]);
          if (op !== target || !live || target.epoch !== epoch)
            throw Error(
              "View changed. Your proposal is retained; review it before retrying.",
            );
          if (
            (saved?.revision ?? 0) !== target.expectedRevision ||
            (saved && saved.contentVersion !== target.version) ||
            overlay.tag !== target.overlayTag
          )
            throw Error(
              "Saved progress or catalog changed. Export this proposal or reload saved values.",
            );
          if (context?.busy())
            throw Error("Wait for the current saved operation to finish.");
          await commitFoundOperation(
            target,
            context ? { save: context.save } : undefined,
          );
        }
        for (let attempts = 0; attempts < 3; attempts++) {
          const readEpoch = epoch;
          // Verification is read-only after durable acknowledgement, including Back.
          const saved = await verifyFoundOperation(target),
            overlay = await readDashboardOverlay(pack.id);
          if (op !== target) return false;
          if (readEpoch !== epoch) {
            target.state = "committed-unverified";
            continue;
          }
          if (!live) {
            target.state = "committed-unverified";
            return false;
          }
          if (overlay.tag !== target.overlayTag)
            throw Error(
              "Blueprint saved. Catalog changed; reload before further edits.",
            );
          if (!adopt(saved))
            throw Error(
              "Blueprint saved in its original context. Reload to review it.",
            );
          target.state = "confirmed";
          op = null;
          lock(false);
          show("Blueprint saved. Inventory quantities unchanged.");
          return true;
        }
        target.state = "committed-unverified";
        show("Saved blueprint needs verification.");
        return false;
      } catch (reason) {
        if (target.committedRevision) target.state = "committed-unverified";
        else target.state = "failed-before-commit";
        show(reason.message);
        return false;
      }
    })().finally(() => {
      flight = null;
      if (resumeAfterFlight && live && op?.state === "committed-unverified") {
        resumeAfterFlight = false;
        queueMicrotask(() => void run());
      }
      if (op)
        show(
          op.state === "committed-unverified"
            ? "Saved blueprint needs verification. Do not repeat the change."
            : "Blueprint was not saved. Your proposal is retained.",
        );
    });
    return flight;
  };
  window.addEventListener(
    "beforeunload",
    (event) => {
      if (pending()) {
        event.preventDefault();
        event.returnValue = "";
      }
    },
    { signal: controller.signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest?.("a[href]");
      if (
        !pending() ||
        !link ||
        link.hasAttribute("download") ||
        link.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const url = new URL(link.href, location.href);
      if (
        url.pathname !== location.pathname ||
        url.search !== location.search
      ) {
        event.preventDefault();
        show(
          "Finish blueprint recovery before leaving. Export or reload the proposal if needed.",
        );
      }
    },
    { capture: true, signal: controller.signal },
  );
  owners.set(workspace, { pending, stop: () => controller.abort() });
  input.disabled = true;
  try {
    const overlay = await readDashboardOverlay(pack.id);
    overlayTag = overlay.tag;
    if (!context && overlay.pack) {
      input.disabled = true;
      status.textContent =
        "Open your local item to edit blueprint ownership for the current catalog.";
      const link = document.createElement("a");
      link.href = itemCardURL(pack.id, item.id);
      link.textContent = "Open local item";
      status.append(" ", link);
      return;
    }
    input.checked =
      !!known.itemBlueprints?.[item.id] ||
      !!automaticIngredientBlueprint(pack, known, item);
    input.disabled =
      known.contentVersion !== pack.contentVersion ||
      !!automaticIngredientBlueprint(pack, known, item);
    status.textContent = automaticIngredientBlueprint(pack, known, item)
      ? "Granted by completed printing upgrade."
      : known.contentVersion !== pack.contentVersion
        ? "Catalog version changed. Review Inventory first."
        : "Saved with your Inventory blueprint checklist.";
  } catch {
    status.textContent =
      "Saved blueprint unavailable. Open Inventory for recovery.";
    return;
  }
  input.addEventListener(
    "change",
    () => {
      const wanted = input.checked;
      input.checked =
        !!known.itemBlueprints?.[item.id] ||
        !!automaticIngredientBlueprint(pack, known, item);
      const base = context?.profile() || known;
      if (
        pending() ||
        context?.busy() ||
        context?.dirty() ||
        itemPageDrafts(workspace, base)
      ) {
        show(
          "Finish or clear current build/photo edits before changing blueprints.",
        );
        return;
      }
      try {
        op = createBlueprintOperation(pack, base, item.id, wanted, {
          overlayTag,
          displayName: item.name,
        });
        op.epoch = epoch;
        void run();
      } catch (reason) {
        show(reason.message);
      }
    },
    { signal: controller.signal },
  );
  box.addEventListener(
    "click",
    async (event) => {
      const action = event.target.closest("[data-blueprint-recovery-action]")
        ?.dataset.blueprintRecoveryAction;
      if (!action || !op || flight) return;
      if (action === "export") {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(op.candidate)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "dmz-unsaved-item-blueprint.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (action === "retry" || action === "verify") {
        op.epoch = epoch;
        await run();
      } else if (
        action === "reload" &&
        confirm(
          "Discard this blueprint proposal and reload saved progress? Export it first if needed.",
        )
      )
        location.reload();
    },
    { signal: controller.signal },
  );
  window.addEventListener(
    "beforeunload",
    (event) => {
      if (pending()) {
        event.preventDefault();
        event.returnValue = "";
      }
    },
    { signal: controller.signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (
        pending() &&
        event.target.closest("a[href]") &&
        !event.target.closest("[data-blueprint-recovery]")
      ) {
        event.preventDefault();
        show("Finish blueprint recovery before leaving this page.");
      }
    },
    { capture: true, signal: controller.signal },
  );
  window.addEventListener(
    "pagehide",
    () => {
      epoch++;
      live = false;
    },
    { signal: controller.signal },
  );
  window.addEventListener(
    "pageshow",
    () => {
      epoch++;
      live = true;
      if (op?.committedRevision) {
        op.state = "committed-unverified";
        if (flight) resumeAfterFlight = true;
        else void run();
      }
    },
    { signal: controller.signal },
  );
}
