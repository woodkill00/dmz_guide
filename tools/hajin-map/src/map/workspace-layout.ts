import { mountTaskResize } from "./task-resize.ts";
/** Allocation only. Moves original nodes; never copies a form or changes map camera. */
export function mountMapWorkspaceLayout() {
  if (document.documentElement.dataset.uiVariant !== "modern") return undefined;
  const root = document.querySelector<HTMLElement>(".workspace")!,
    terrain = document.querySelector<HTMLElement>(".map-workspace")!,
    key = document.querySelector<HTMLElement>("#map-key")!;
  const task = document.createElement("aside");
  task.id = "ui-map-task";
  task.setAttribute("aria-label", "Map task");
  const header = document.createElement("header"),
    title = document.createElement("h2"),
    content = document.createElement("div"),
    feedback = document.createElement("p");
  header.className = "ui-map-task-header";
  title.id = "ui-map-task-title";
  title.textContent = "Map task";
  title.tabIndex = -1;
  content.className = "ui-map-task-body";
  feedback.className = "ui-map-mode-feedback";
  feedback.setAttribute("role", "status");
  feedback.hidden = true;
  const action = (id: string, text: string, label: string) => {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    return button;
  };
  const minimize = action("ui-task-minimize", "Minimize", "Minimize task"),
    half = action("ui-task-half", "Half", "Half view"),
    expand = action("ui-task-expand", "Expand", "Expand task"),
    close = action("ui-task-close", "Close", "Close task");
  header.append(title, minimize, half, expand, close, feedback);
  task.append(header, content);
  const controls = document.createElement("nav");
  controls.className = "ui-map-view-controls";
  controls.setAttribute("aria-label", "Workspace view");
  const map = action("ui-map-view", "Map view", "Map view"),
    tools = action("ui-task-view", "Task view", "Task view");
  controls.append(map, tools);
  root.before(controls);
  root.prepend(task);
  content.append(key);
  const route = document.createElement("div");
  route.id = "ui-map-route";
  route.setAttribute("aria-label", "Route tracking");
  terrain.after(route);
  const taskResize = mountTaskResize(root);
  type Expanded = "auto" | "half" | "full";
  let requested: Expanded | "map" | "peek" = "auto",
    lastExpanded: Expanded = "auto",
    chosen: "map" | "task" = "map",
    disposed = false,
    frame = 0;
  const paint = () => {
    if (disposed) return;
    const focused = document.activeElement,
      wasTask = focused instanceof HTMLElement && content.contains(focused),
      wasMap = focused instanceof HTMLElement && terrain.contains(focused);
    if (requested === "auto" && wasTask) chosen = "task";
    const dialog =
      content.querySelector<HTMLDialogElement>("#workspace-dialog");
    const ownerHeading =
      content.querySelector<HTMLElement>(
        "#ui-selection-detail .marker-popup-title",
      ) ??
      content.querySelector<HTMLElement>(
        "#workspace-content form h2, #workspace-content form h3",
      ) ??
      content.querySelector<HTMLElement>(
        "#workspace-content h2, #workspace-content h3",
      );
    const taskTitle = dialog?.open
      ? ownerHeading?.textContent?.trim() || "Map task"
      : "Map layers";
    if (title.textContent !== taskTitle.slice(0, 120))
      title.textContent = taskTitle.slice(0, 120);
    title.title = taskTitle;
    const peekRequested = requested === "peek";
    minimize.hidden = half.hidden = peekRequested;
    expand.hidden = requested === "full";
    feedback.hidden = true;
    const r = root.getBoundingClientRect(),
      font = parseFloat(getComputedStyle(root).fontSize) || 16,
      available = Math.max(
        0,
        (window.visualViewport?.height ?? innerHeight) -
          Math.max(0, r.top + scrollY),
      ),
      visibleHeight = Math.min(
        available,
        Math.max(
          0,
          Math.min(
            r.bottom,
            window.visualViewport
              ? window.visualViewport.offsetTop + window.visualViewport.height
              : innerHeight,
          ) - Math.max(r.top, window.visualViewport?.offsetTop ?? 0),
        ),
      ),
      routeHeight = route.getBoundingClientRect().height,
      headerHeight = header.getBoundingClientRect().height,
      halfFits = visibleHeight - routeHeight >= 26 * font + headerHeight,
      peekFits = visibleHeight - routeHeight >= 12 * font + headerHeight,
      dock =
        r.width >= 58 * font &&
        visibleHeight - routeHeight >=
          Math.max(26 * font, 14 * font + headerHeight);
    document.documentElement.dataset.mapSpace =
      available < 14 * font ? "scroll" : "fit";
    let mode: "map" | "task" | "docked" | "peek" | "half";
    if (requested === "map") mode = "map";
    else if (requested === "full") mode = "task";
    else if (requested === "half") mode = halfFits ? "half" : "task";
    else if (requested === "peek") mode = peekFits ? "peek" : "task";
    else mode = dock ? "docked" : chosen;
    const paneMode =
      mode === "task" ? "full" : mode === "map" ? "closed" : mode;
    document.documentElement.dataset.mapLayout = mode;
    taskResize.refresh(mode === "docked");
    document.documentElement.dataset.mapPaneMode = paneMode;
    document.documentElement.dataset.mapView = chosen;
    // Revealing the destination first makes focus possible before hiding the old view.
    if (mode !== "map") task.hidden = false;
    // Move focus before hiding/inerting its original subtree.
    if ((mode === "peek" || mode === "map") && wasTask) {
      (mode === "peek" ? expand : tools).focus({ preventScroll: true });
    }
    if (mode === "task" && wasMap) title.focus({ preventScroll: true });
    task.hidden = mode === "map";
    terrain.hidden = mode === "task";
    content.inert = content.hidden = mode === "peek";
    if (mode === "half") {
      const usable = visibleHeight - routeHeight,
        taskHeight = Math.min(
          usable - 12 * font,
          Math.max(14 * font + headerHeight, (usable + headerHeight) / 2),
        );
      root.style.setProperty("--ui-map-half-task", `${taskHeight}px`);
    }
    if ((requested === "half" || requested === "peek") && mode === "task") {
      feedback.textContent = `${requested === "half" ? "Half" : "Peek"} view does not fit this space. The full task stays available.`;
      feedback.hidden = false;
      minimize.hidden = half.hidden = false;
      if (document.activeElement === expand)
        title.focus({ preventScroll: true });
      expand.hidden = true;
    }
    // Fit selection excludes fallback feedback, but scrolling uses the final visible header.
    // The fallback adds a message and changes controls, so its actual height can differ.
    const finalHeaderHeight = header.getBoundingClientRect().height;
    const headerFlows =
      available < 14 * font ||
      (mode === "task" &&
        visibleHeight - routeHeight < finalHeaderHeight + 14 * font);
    task.dataset.uiHeaderFlow = String(headerFlows);
    task.style.setProperty(
      "--ui-task-header-height",
      `${headerFlows ? 0 : finalHeaderHeight}px`,
    );
    minimize.setAttribute("aria-pressed", String(mode === "peek"));
    half.setAttribute("aria-pressed", String(mode === "half"));
    expand.setAttribute("aria-pressed", String(mode === "task"));
    document
      .querySelector("#toggle-key")
      ?.setAttribute(
        "aria-expanded",
        String(!task.hidden && !content.hidden && !key.hidden),
      );
    map.setAttribute("aria-pressed", String(chosen === "map"));
    tools.setAttribute("aria-pressed", String(chosen === "task"));
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(paint);
  };
  const choose = (next: Expanded | "map" | "peek", focus?: HTMLElement) => {
    requested = next;
    chosen = next === "map" || next === "peek" ? "map" : "task";
    if (next === "auto" || next === "half" || next === "full")
      lastExpanded = next;
    if (next === "peek") expand.hidden = false;
    focus?.focus({ preventScroll: true });
    paint();
  };
  const showTask = () => choose(lastExpanded),
    showMap = () => choose("map", map),
    showPeek = () => choose("peek", expand),
    showHalf = () => choose("half", title),
    showFull = () => choose("full", title),
    closeTask = () => choose("map", tools);
  map.addEventListener("click", showMap);
  tools.addEventListener("click", showTask);
  minimize.addEventListener("click", showPeek);
  half.addEventListener("click", showHalf);
  expand.addEventListener("click", showFull);
  close.addEventListener("click", closeTask);
  const observer = new ResizeObserver(schedule);
  for (const element of [root, controls, route, header])
    observer.observe(element);
  window.visualViewport?.addEventListener("resize", schedule);
  window.addEventListener("resize", schedule);
  const mutations = new MutationObserver(schedule);
  mutations.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-density", "data-theme", "style"],
  });
  const relocate = () => {
    // Pane host appends original dialogs to the aside; keep that same node in its body.
    for (const node of [...task.children])
      if (node !== header && node !== content) content.append(node);
    const hud = document.querySelector<HTMLElement>("#route-plan-summary");
    if (hud && hud.parentElement !== route) route.append(hud);
    for (const selector of ["#workspace-open", ".field-toolbar"]) {
      const node = document.querySelector<HTMLElement>(selector);
      if (node && node.parentElement !== controls) controls.append(node);
    }
  };
  // Watch task content, not continuously changing map coordinates. The header is
  // outside this observer, so painting its own title cannot schedule a loop.
  const taskObserver = new MutationObserver(schedule);
  taskObserver.observe(content, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open", "data-ui-detail"],
  });
  const childObserver = new MutationObserver(relocate);
  childObserver.observe(root, { childList: true, subtree: true });
  relocate();
  schedule();
  return {
    task,
    key,
    showTask,
    showMap,
    refresh: schedule,
    destroy() {
      disposed = true;
      taskResize.destroy();
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      childObserver.disconnect();
      taskObserver.disconnect();
      window.visualViewport?.removeEventListener("resize", schedule);
      window.removeEventListener("resize", schedule);
      map.removeEventListener("click", showMap);
      tools.removeEventListener("click", showTask);
      minimize.removeEventListener("click", showPeek);
      half.removeEventListener("click", showHalf);
      expand.removeEventListener("click", showFull);
      close.removeEventListener("click", closeTask);
      content.inert = false;
      content.hidden = false;
    },
  };
}
