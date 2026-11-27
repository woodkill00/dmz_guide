const mounted = new WeakMap();
const key = "dmz-layout-109";
export function mountLayoutSystem(root = document) {
  if (mounted.has(root)) return mounted.get(root);
  const win = root.defaultView,
    html = root.documentElement,
    abort = new AbortController(),
    signal = abort.signal;
  html.dataset.layoutSystem = "109";
  let preference = { version: 1, navigationCollapsed: false },
    writable = true,
    frame = 0;
  try {
    const raw = win.localStorage.getItem(key);
    if (raw !== null) {
      if (raw.length > 1024) throw Error("Oversized layout");
      const p = JSON.parse(raw);
      if (
        !p ||
        Object.keys(p).sort().join(",") !== "navigationCollapsed,version" ||
        p.version !== 1 ||
        typeof p.navigationCollapsed !== "boolean"
      )
        throw Error("Invalid layout");
      preference = p;
    }
  } catch {
    writable = false;
  }
  const nav = root.querySelector(".site-nav"),
    header = root.querySelector(".site-header") || nav?.parentElement;
  const transferNotice = root.querySelector(".local-transfer-notice");
  if (nav && transferNotice) nav.append(transferNotice);
  const controls = root.createElement("span");
  controls.className = "ui-layout-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Page layout");
  const toggle = root.createElement("button"),
    reset = root.createElement("button");
  toggle.type = reset.type = "button";
  toggle.dataset.uiNavigationToggle = "";
  reset.dataset.uiLayoutReset = "";
  reset.textContent = "Reset layout";
  if (nav) {
    nav.id ||= "site-main-navigation";
    toggle.setAttribute("aria-controls", nav.id);
    controls.append(toggle);
  }
  controls.append(reset);
  if (header && nav) {
    if (header === nav.parentElement) nav.prepend(controls);
    else header.append(controls);
  }
  const paint = () => {
    html.dataset.navigationCollapsed = String(preference.navigationCollapsed);
    if (nav) {
      if (
        preference.navigationCollapsed &&
        nav.contains(root.activeElement) &&
        !controls.contains(root.activeElement)
      )
        toggle.focus({ preventScroll: true });
      if (nav.contains(controls)) {
        nav.dataset.uiNavigationState = preference.navigationCollapsed
          ? "collapsed"
          : "expanded";
      } else nav.hidden = preference.navigationCollapsed;
    }
    toggle.textContent = preference.navigationCollapsed
      ? "Show menu"
      : "Hide menu";
    toggle.setAttribute(
      "aria-expanded",
      String(!preference.navigationCollapsed),
    );
  };
  const save = () => {
    try {
      if (writable) win.localStorage.setItem(key, JSON.stringify(preference));
    } catch {
      writable = false;
    }
    if (!writable)
      controls.title =
        "Layout changed for this page; saved settings were retained.";
  };
  const measure = () => {
    frame = 0;
    html.dataset.layoutShort = String(
      Math.min(win.innerHeight, win.visualViewport?.height || win.innerHeight) <
        480,
    );
    let offset = 0;
    for (const n of root.querySelectorAll(
      ".site-header,.site-nav,.quick-tracker-tabs",
    )) {
      const style = win.getComputedStyle(n);
      if (
        ["fixed", "sticky"].includes(style.position) &&
        style.display !== "none"
      ) {
        const rect = n.getBoundingClientRect();
        const top = parseFloat(style.top) || 0;
        if (rect.height > 0 && rect.top <= top + 1 && rect.bottom > 0)
          offset = Math.max(offset, rect.bottom);
      }
    }

    html.style.setProperty(
      "--ui-visible-block",
      `${Math.min(win.innerHeight, win.visualViewport?.height || win.innerHeight)}px`,
    );
    html.style.setProperty("--ui-top-offset", `${offset}px`);
  };
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(measure);
  };
  toggle.addEventListener(
    "click",
    () => {
      toggle.focus({ preventScroll: true });
      preference.navigationCollapsed = !preference.navigationCollapsed;
      paint();
      save();
      schedule();
    },
    { signal },
  );
  reset.addEventListener(
    "click",
    () => {
      preference = { version: 1, navigationCollapsed: false };
      writable = true;
      paint();
      save();
      root.dispatchEvent(new win.CustomEvent("map-menu-reset"));
      win.dispatchEvent(new win.CustomEvent("ui-layout-reset"));
      schedule();
    },
    { signal },
  );
  const observer = new win.ResizeObserver(schedule);
  for (const n of root.querySelectorAll(
    ".site-header,.site-nav,.quick-tracker-tabs",
  ))
    observer.observe(n);
  win.addEventListener("resize", schedule, { signal });
  win.addEventListener("scroll", schedule, { signal, passive: true });
  win.visualViewport?.addEventListener("resize", schedule, { signal });
  win.addEventListener("pageshow", schedule, { signal });
  paint();
  schedule();
  const dispose = () => {
    abort.abort();
    observer.disconnect();
    win.cancelAnimationFrame(frame);
    controls.remove();
    if (nav) {
      nav.hidden = false;
      delete nav.dataset.uiNavigationState;
    }
    mounted.delete(root);
  };
  mounted.set(root, dispose);
  return dispose;
}
