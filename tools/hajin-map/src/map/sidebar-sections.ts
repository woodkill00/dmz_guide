import "./sidebar-sections.css";
import { sidebarAllocation, sidebarPair } from "./sidebar-math.ts";
interface SidebarSections {
  root: HTMLElement;
  panes: HTMLElement[];
  dividers: HTMLElement[];
  fixed?: HTMLElement[];
  shares: number[];
  minimum: number;
}
/** Shared display-only layout; never reads or writes map/application state. */
export function mountSidebarSections({
  root,
  panes,
  dividers,
  fixed = [],
  shares,
  minimum,
}: SidebarSections) {
  if (
    panes.length !== dividers.length + 1 ||
    shares.length !== panes.length ||
    panes.some((p) => !root.contains(p) || !p.id) ||
    dividers.some((d) => !root.contains(d) || !d.id) ||
    new Set([...panes, ...dividers].map((p) => p.id)).size !==
      panes.length + dividers.length
  )
    throw Error("Invalid sidebar sections.");
  sidebarAllocation(1, shares, minimum);
  let ratios = [...shares],
    sizes: number[] = [],
    minima: number[] = [],
    lastBudget = -1,
    frame = 0,
    disposed = false;
  let drag: {
    index: number;
    pointerId: number;
    startY: number;
    startSizes: number[];
    priorShares: number[];
  } | null = null;
  const events = new AbortController();
  root.classList.add("resizable-sidebar");
  panes.forEach((p, i) => {
    p.classList.add("sidebar-scroll-section");
    if (!p.hasAttribute("tabindex")) p.tabIndex = 0;
    if (!p.hasAttribute("role")) p.setAttribute("role", "region");
    if (!p.hasAttribute("aria-label"))
      p.setAttribute(
        "aria-label",
        p.dataset.sectionName ?? `Sidebar section ${i + 1}`,
      );
  });
  dividers.forEach((d) => d.classList.add("sidebar-section-divider"));
  const pixels = (value: string) => Number.parseFloat(value) || 0;
  const outer = (node: HTMLElement) => {
    const style = getComputedStyle(node);
    return (
      node.getBoundingClientRect().height +
      pixels(style.marginTop) +
      pixels(style.marginBottom)
    );
  };
  const budget = () => {
    const style = getComputedStyle(root);
    return Math.max(
      0,
      root.clientHeight -
        pixels(style.paddingTop) -
        pixels(style.paddingBottom) -
        fixed.reduce((n, p) => n + outer(p), 0) -
        dividers.reduce((n, p) => n + outer(p), 0),
    );
  };
  function paint() {
    panes.forEach((p, i) => (p.style.flex = `0 0 ${sizes[i]}px`));
    dividers.forEach((divider, i) => {
      divider.setAttribute("role", "separator");
      divider.tabIndex = 0;
      divider.setAttribute("aria-orientation", "horizontal");
      divider.setAttribute(
        "aria-controls",
        panes[i].id + " " + panes[i + 1].id,
      );
      divider.setAttribute("aria-valuemin", String(Math.round(minima[i])));
      divider.setAttribute(
        "aria-valuemax",
        String(Math.round(sizes[i] + sizes[i + 1] - minima[i + 1])),
      );
      divider.setAttribute("aria-valuenow", String(Math.round(sizes[i])));
      divider.setAttribute(
        "aria-valuetext",
        `${Math.round(sizes[i])} pixels for ${panes[i].dataset.sectionName ?? "first section"}, ${Math.round(sizes[i + 1])} pixels for ${panes[i + 1].dataset.sectionName ?? "next section"}`,
      );
    });
  }
  function cancel() {
    const prior = drag;
    drag = null;
    if (!prior) return;
    ratios = prior.priorShares;
    if (dividers[prior.index].hasPointerCapture(prior.pointerId))
      dividers[prior.index].releasePointerCapture(prior.pointerId);
    sync();
  }
  function sync() {
    if (disposed) return;
    if (root.hidden || !root.clientHeight) {
      if (drag) cancel();
      return;
    }
    const available = budget();
    if (drag && Math.abs(available - lastBudget) > 0.5) {
      cancel();
      return;
    }
    lastBudget = available;
    ({ sizes, minima } = sidebarAllocation(available, ratios, minimum));
    paint();
  }
  function refresh() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  }
  function change(index: number, requested: number) {
    sizes = sidebarPair(sizes, minima, index, requested);
    const total = sizes.reduce((a, b) => a + b, 0);
    if (total) ratios = sizes.map((v) => v / total);
    paint();
  }
  dividers.forEach((divider, index) => {
    divider.addEventListener(
      "pointerdown",
      (event) => {
        if (!event.isPrimary || event.button !== 0 || !sizes.length) return;
        event.preventDefault();
        event.stopPropagation();
        divider.focus();
        drag = {
          index,
          pointerId: event.pointerId,
          startY: event.clientY,
          startSizes: [...sizes],
          priorShares: [...ratios],
        };
        divider.setPointerCapture(event.pointerId);
      },
      { signal: events.signal },
    );
    divider.addEventListener(
      "pointermove",
      (event) => {
        if (!drag || drag.index !== index || event.pointerId !== drag.pointerId)
          return;
        event.preventDefault();
        event.stopPropagation();
        change(index, drag.startSizes[index] + event.clientY - drag.startY);
      },
      { signal: events.signal },
    );
    divider.addEventListener(
      "pointerup",
      (event) => {
        if (!drag || drag.index !== index || event.pointerId !== drag.pointerId)
          return;
        event.stopPropagation();
        drag = null;
        if (divider.hasPointerCapture(event.pointerId))
          divider.releasePointerCapture(event.pointerId);
      },
      { signal: events.signal },
    );
    divider.addEventListener("pointercancel", cancel, {
      signal: events.signal,
    });
    divider.addEventListener(
      "lostpointercapture",
      (event) => {
        if (drag?.pointerId === event.pointerId) cancel();
      },
      { signal: events.signal },
    );
    divider.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && drag) {
          event.preventDefault();
          event.stopPropagation();
          cancel();
          return;
        }
        if (!sizes.length) return;
        let next: number;
        const maximum = sizes[index] + sizes[index + 1] - minima[index + 1];
        if (event.key === "ArrowUp") next = sizes[index] - 24;
        else if (event.key === "ArrowDown") next = sizes[index] + 24;
        else if (event.key === "Home") next = minima[index];
        else if (event.key === "End") next = maximum;
        else return;
        event.preventDefault();
        event.stopPropagation();
        change(index, next);
      },
      { signal: events.signal },
    );
  });
  const observer = new ResizeObserver(refresh);
  [root, ...fixed].forEach((p) => observer.observe(p));
  sync();
  refresh();
  return {
    refresh,
    cancel,
    destroy() {
      cancel();
      disposed = true;
      events.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
    },
  };
}
