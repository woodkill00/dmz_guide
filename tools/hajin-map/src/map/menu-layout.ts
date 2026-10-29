/** Browser-local display state; never touches map/workspace data. */
export function mountMapMenuLayout(host: HTMLElement) {
  const key = 'hajin-map-menu-layout-v1';
  type Position = { x: number; y: number };
  const positions: Record<string, Position> = Object.create(null);
  const definitions = [
    ['navigation', '.map-controls', 'Map navigation'],
    ['map-tools', '.map-top-right', 'Map tools'],
    ['workspace', '#workspace-open', 'My workspace'],
    ['routes', '#waypoint-routes-open', 'Routes'],
    ['tracker', '#route-plan-summary', 'Waypoint tracker'],
    ['gameplay', '#field-gameplay-toolbar', 'Gameplay toolbar'],
  ] as const;
  try {
    const raw = localStorage.getItem(key);
    const saved = raw && raw.length < 4096 ? JSON.parse(raw) : null;
    for (const [id] of definitions) {
      const p = saved?.[id];
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
        positions[id] = { x: p.x, y: p.y };
    }
  } catch { /* Optional display preference. */ }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(positions)); } catch { /* Session still works. */ } };
  const menus = new Map<string, { node: HTMLElement; original: HTMLElement; handle: HTMLButtonElement }>();
  const listeners = new AbortController();
  let frame = 0;
  let drag: { id: string; pointer: number; startX: number; startY: number; left: number; top: number; prior?: Position; capture: HTMLButtonElement } | undefined;
  function bounds(node: HTMLElement) {
    return { x: Math.max(0, host.clientWidth - node.offsetWidth - 8), y: Math.max(0, host.clientHeight - node.offsetHeight - 8) };
  }
  function paint(id: string) {
    const menu = menus.get(id), p = positions[id];
    if (!menu) return;
    const { node } = menu;
    if (!p) {
      node.style.removeProperty('left'); node.style.removeProperty('top'); node.style.removeProperty('right'); node.style.removeProperty('bottom');
      if (!node.offsetWidth || !node.offsetHeight) return;
      const r = node.getBoundingClientRect(), h = host.getBoundingClientRect(), b = bounds(node);
      const left = Math.max(4, Math.min(b.x, r.left - h.left)), top = Math.max(4, Math.min(b.y, r.top - h.top));
      // Transient safety clamp; responsive defaults remain the reset target.
      if (Math.abs(left - (r.left - h.left)) > .5 || Math.abs(top - (r.top - h.top)) > .5) {
        node.style.left = `${left}px`; node.style.top = `${top}px`; node.style.right = 'auto'; node.style.bottom = 'auto';
      }
      return;
    }
    if (!node.offsetWidth || !node.offsetHeight) return;
    const b = bounds(node);
    node.style.left = `${4 + p.x * Math.max(0, b.x - 4)}px`;
    node.style.top = `${4 + p.y * Math.max(0, b.y - 4)}px`;
    node.style.right = 'auto'; node.style.bottom = 'auto';
  }
  function move(id: string, left: number, top: number) {
    const b = bounds(menus.get(id)!.node);
    positions[id] = { x: Math.max(0, Math.min(1, (left - 4) / Math.max(1, b.x - 4))), y: Math.max(0, Math.min(1, (top - 4) / Math.max(1, b.y - 4))) };
    paint(id);
  }
  function cancel() {
    if (!drag) return;
    const old = drag; drag = undefined;
    if (old.prior) positions[old.id] = old.prior; else delete positions[old.id];
    if (old.capture.hasPointerCapture(old.pointer)) old.capture.releasePointerCapture(old.pointer);
    paint(old.id);
  }
  const resize = new ResizeObserver(() => schedule());
  function discover() {
    for (const [id, selector, label] of definitions) {
      const original = host.querySelector<HTMLElement>(selector);
      if (!original) continue;
      let menu = menus.get(id);
      if (!menu) {
        let node = original;
        if (original instanceof HTMLButtonElement || id === 'tracker' || id === 'gameplay') {
          node = document.createElement('div');
          node.className = `${original instanceof HTMLButtonElement ? 'movable-launcher ' : ''}movable-${id}`;
          original.before(node); node.append(original);
        }
        node.classList.add('movable-map-menu'); node.dataset.menuId = id;
        const handle = document.createElement('button');
        handle.type = 'button'; handle.className = 'map-menu-drag-handle';
        handle.textContent = '⠿';
        handle.setAttribute('aria-label', `Move ${label}`);
        handle.title = `Move ${label}: drag or use arrow keys (Shift: fine move). Home or double-click resets; Escape cancels drag.`;
        handle.setAttribute('aria-description', handle.title);
        menu = { node, original, handle }; menus.set(id, menu);
        resize.observe(node);
        handle.addEventListener('pointerdown', event => {
          if (!event.isPrimary || event.button !== 0) return;
          event.preventDefault(); event.stopPropagation(); cancel(); handle.focus();
          const rect = node.getBoundingClientRect(), parent = host.getBoundingClientRect();
          drag = { id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left - parent.left, top: rect.top - parent.top, prior: positions[id] && { ...positions[id] }, capture: handle };
          handle.setPointerCapture(event.pointerId);
        }, { signal: listeners.signal });
        handle.addEventListener('pointermove', event => {
          if (!drag || drag.id !== id || event.pointerId !== drag.pointer) return;
          event.preventDefault(); event.stopPropagation();
          move(id, drag.left + event.clientX - drag.startX, drag.top + event.clientY - drag.startY);
        }, { signal: listeners.signal });
        handle.addEventListener('pointerup', event => {
          if (!drag || drag.id !== id || event.pointerId !== drag.pointer) return;
          event.stopPropagation(); drag = undefined; handle.releasePointerCapture(event.pointerId); save();
        }, { signal: listeners.signal });
        handle.addEventListener('pointercancel', cancel, { signal: listeners.signal });
        handle.addEventListener('lostpointercapture', () => { if (drag?.id === id) cancel(); }, { signal: listeners.signal });
        const reset = () => { cancel(); delete positions[id]; paint(id); save(); };
        handle.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation(); reset(); }, { signal: listeners.signal });
        handle.addEventListener('click', event => event.stopPropagation(), { signal: listeners.signal });
        handle.addEventListener('keydown', event => {
          if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); reset(); return; }
          const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
          const d = delta[event.key]; if (!d) return;
          event.preventDefault(); event.stopPropagation(); cancel();
          const r = node.getBoundingClientRect(), h = host.getBoundingClientRect(), step = event.shiftKey ? 1 : 10;
          move(id, r.left - h.left + d[0] * step, r.top - h.top + d[1] * step); save();
        }, { signal: listeners.signal });
      }
      if (menu.node !== original && menu.node.hidden !== original.hidden) menu.node.hidden = original.hidden;
      if (menu.handle.parentElement !== menu.node) menu.node.prepend(menu.handle);
      paint(id);
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; discover(); }); }
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); cancel(); } }, { capture: true, signal: listeners.signal });
  const mutations = new MutationObserver(schedule);
  mutations.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  resize.observe(host); discover();
  return () => {
    cancel(); listeners.abort(); mutations.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
    for (const [id, { node, original, handle }] of menus) {
      handle.remove(); delete positions[id]; paint(id);
      node.classList.remove('movable-map-menu'); delete node.dataset.menuId;
      if (node !== original) { node.before(original); node.remove(); }
    }
  };
}
