import L from 'leaflet';
import { hajin } from './hajin';
import { toPixels, type MapPosition } from './coordinates';
import type { MarkerSource } from './marker-sources';
import { boundedBytes } from './bounded-input';

interface Category { id: string; name: string; group: string; icon: string }
interface SourceRecord extends MapPosition { id: string; name: string; category: string }
interface Snapshot { schemaVersion: number; sourcePage: string; capturedAt: string; categories: Category[]; records: SourceRecord[] }
type State = 'loading' | 'ready' | 'failed';

function parseSnapshot(value: unknown, source: MarkerSource): Snapshot {
  const data = value as Snapshot;
  const text = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max;
  if (!data || data.schemaVersion !== 1 || data.sourcePage !== source.page || !text(data.capturedAt, 40) || !Number.isFinite(Date.parse(data.capturedAt)) || !Array.isArray(data.categories) || data.categories.length > 100 || !Array.isArray(data.records) || data.records.length > 5000) throw new Error('Invalid source snapshot.');
  const categories = new Set<string>();
  for (const c of data.categories) {
    if (!text(c.id, 80) || !/^[\w.:-]+$/.test(c.id) || categories.has(c.id) || !text(c.name, 120) || !text(c.group, 80) || !text(c.icon, 260) || !c.icon.startsWith(source.iconDirectory) || !/^[\w.-]+\.(png|svg)$/.test(c.icon.slice(source.iconDirectory.length))) throw new Error('Invalid source category.');
    categories.add(c.id);
  }
  const ids = new Set<string>();
  for (const record of data.records) {
    if (!text(record.id, 100) || !/^[\w.:-]+$/.test(record.id) || ids.has(record.id) || !text(record.name, 200) || !categories.has(record.category)) throw new Error('Invalid source marker.');
    toPixels(record, hajin);
    ids.add(record.id);
  }
  return data;
}

export function createSourceMarkers(source: MarkerSource, map: L.Map, container: HTMLElement, onUpdate: (visible: number, total: number, state: State) => void, keyContainer?: HTMLElement) {
  const root = L.layerGroup().addTo(map);
  const groups = new Map<string, L.LayerGroup>();
  const enabled = new Set<string>();
  let snapshot: Snapshot | undefined;
  let master = true;
  let controller: AbortController | undefined;
  let disposed = false;
  let pendingBulk: boolean | undefined;
  const storageKey = `hajin.source-filters.v1.${source.id}`;
  const available = () => snapshot!.categories.filter(category => snapshot!.records.some(record => record.category === category.id));

  function persist() {
    const active = available();
    const selection = enabled.size === active.length ? 'all' : enabled.size === 0 ? 'none' : 'mixed';
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, master, selection, enabled: [...enabled] })); } catch { /* Filters still work without browser storage. */ }
  }

  function update() {
    if (!snapshot) return;
    root.clearLayers();
    if (master) for (const [id, group] of groups) if (enabled.has(id)) root.addLayer(group);
    const visible = master ? snapshot.records.filter(record => enabled.has(record.category)).length : 0;
    onUpdate(visible, snapshot.records.length, 'ready');
    const count = container.querySelector(`#${source.id}-count`);
    if (count) count.textContent = `${visible} of ${snapshot.records.length} locations shown`;
    container.querySelectorAll<HTMLInputElement>('[data-category]').forEach(input => { input.checked = !input.disabled && enabled.has(input.dataset.category!); });
    const active = available();
    const selected = active.filter(category => enabled.has(category.id)).length;
    const badge = container.querySelector('.source-selection');
    if (badge) badge.textContent = !master || selected === 0 ? 'None' : selected === active.length ? 'All' : 'Mixed';
    const parentToggle = container.querySelector<HTMLInputElement>(`#${source.id}-visible`);
    if (parentToggle) parentToggle.checked = master;
    container.querySelectorAll<HTMLInputElement>('[data-group]').forEach(input => {
      const members = active.filter(category => category.group === input.dataset.group);
      const chosen = members.filter(category => enabled.has(category.id)).length;
      input.checked = members.length > 0 && chosen === members.length;
      input.indeterminate = chosen > 0 && chosen < members.length;
      input.disabled = members.length === 0;
    });
    keyContainer?.querySelectorAll<HTMLInputElement>('[data-key-category]').forEach(input => {
      input.checked = master && !input.disabled && enabled.has(input.dataset.keyCategory!);
    });
    persist();
  }

  function setAll(show: boolean) {
    if (!snapshot) { pendingBulk = show; return; }
    enabled.clear();
    if (show) available().forEach(category => enabled.add(category.id));
    master = true;
    update();
  }

  function renderKey() {
    if (!snapshot || !keyContainer) return;
    keyContainer.replaceChildren();
    const heading = document.createElement('h3'); heading.className = 'key-source-name'; heading.textContent = source.name;
    const domain = document.createElement('p'); domain.className = 'key-source-domain'; domain.textContent = source.website;
    keyContainer.append(heading, domain);
    for (const group of [...new Set(snapshot.categories.map(category => category.group))]) {
      const fieldset = document.createElement('fieldset');
      const legend = document.createElement('legend'); legend.textContent = group; fieldset.append(legend);
      for (const category of snapshot.categories.filter(category => category.group === group)) {
        const amount = snapshot.records.filter(record => record.category === category.id).length;
        const row = document.createElement('label'); row.className = 'category-filter key-item';
        const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.keyCategory = category.id; input.disabled = amount === 0;
        input.addEventListener('change', () => {
          if (input.checked) { if (!master) enabled.clear(); master = true; enabled.add(category.id); }
          else enabled.delete(category.id);
          update();
        });
        const image = document.createElement('img'); image.src = category.icon; image.alt = ''; image.width = 24; image.height = 24;
        image.addEventListener('error', () => { image.hidden = true; });
        const name = document.createElement('span'); name.textContent = category.name;
        const count = document.createElement('span'); count.className = 'category-count'; count.textContent = String(amount);
        row.append(input, image, name, count);
        if (!amount) row.title = 'Icon available; no locations supplied by this source.';
        fieldset.append(row);
      }
      keyContainer.append(fieldset);
    }
  }

  function renderControls() {
    if (!snapshot) return;
    container.replaceChildren();
    const card = document.createElement('details'); card.className = 'source-layer'; card.open = true; card.dataset.source = source.id;
    const summary = document.createElement('summary');
    const heading = document.createElement('span'); heading.className = 'source-name'; heading.textContent = source.name;
    const domain = document.createElement('span'); domain.className = 'source-domain'; domain.textContent = source.website;
    const badge = document.createElement('span'); badge.className = 'source-selection';
    summary.append(heading, domain, badge); card.append(summary);
    const body = document.createElement('div'); body.className = 'source-layer-body'; card.append(body); container.append(card);
    const intro = document.createElement('p');
    intro.className = 'layers-intro';
    intro.textContent = `Captured ${new Date(snapshot.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}. Imported source locations; separate from your own discoveries.`;
    const sourceLink = document.createElement('a'); sourceLink.className = 'source-link'; sourceLink.href = source.page; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer'; sourceLink.textContent = 'View source website ↗';
    body.append(intro, sourceLink);
    const masterLabel = document.createElement('label');
    masterLabel.className = 'layer-master';
    const masterInput = document.createElement('input');
    masterInput.type = 'checkbox'; masterInput.id = `${source.id}-visible`; masterInput.checked = master;
    masterInput.addEventListener('change', () => { master = masterInput.checked; update(); });
    masterLabel.append(masterInput, document.createTextNode('Show this source'));
    body.append(masterLabel);
    const bulk = document.createElement('div'); bulk.className = 'layer-bulk';
    for (const [label, show] of [['Show all', true], ['Hide all', false]] as const) {
      const button = document.createElement('button'); button.textContent = label; button.id = `${show ? 'show' : 'hide'}-${source.id}`;
      button.addEventListener('click', () => {
        setAll(show);
      });
      bulk.append(button);
    }
    const count = document.createElement('p'); count.id = `${source.id}-count`; count.setAttribute('role', 'status'); count.className = 'layer-count';
    body.append(bulk, count);
    for (const group of [...new Set(snapshot.categories.map(category => category.group))]) {
      const fieldset = document.createElement('fieldset');
      const legend = document.createElement('legend'); legend.textContent = group;
      fieldset.append(legend);
      const groupLabel = document.createElement('label'); groupLabel.className = 'group-toggle';
      const groupInput = document.createElement('input'); groupInput.type = 'checkbox'; groupInput.dataset.group = group;
      groupInput.addEventListener('change', () => {
        for (const category of available().filter(c => c.group === group)) {
          if (groupInput.checked) enabled.add(category.id); else enabled.delete(category.id);
        }
        update();
      });
      groupLabel.append(groupInput, document.createTextNode(`All ${group.toLowerCase()}`)); fieldset.append(groupLabel);
      for (const category of snapshot.categories.filter(category => category.group === group)) {
        const amount = snapshot.records.filter(record => record.category === category.id).length;
        const row = document.createElement('label'); row.className = 'category-filter';
        const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.category = category.id; input.disabled = !amount;
        input.addEventListener('change', () => { if (input.checked) enabled.add(category.id); else enabled.delete(category.id); update(); });
        const image = document.createElement('img'); image.src = category.icon; image.alt = ''; image.width = 24; image.height = 24;
        image.addEventListener('error', () => { image.hidden = true; });
        const title = document.createElement('span'); title.textContent = category.name;
        const quantity = document.createElement('span'); quantity.className = 'category-count'; quantity.textContent = String(amount);
        row.append(input, image, title, quantity);
        if (!amount) row.title = 'Icon available; no location records in this source snapshot.';
        fieldset.append(row);
      }
      body.append(fieldset);
    }
    update();
  }

  function addRecords() {
    if (!snapshot) return;
    root.clearLayers(); groups.clear(); enabled.clear();
    const categories = new Map(snapshot.categories.map(c => [c.id, c]));
    for (const category of snapshot.categories) groups.set(category.id, L.layerGroup());
    available().forEach(category => enabled.add(category.id));
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (stored?.version === 1 && typeof stored.master === 'boolean' && ['all', 'none', 'mixed'].includes(stored.selection) && Array.isArray(stored.enabled)) {
        master = stored.master;
        if (stored.selection !== 'all') {
          enabled.clear();
          if (stored.selection === 'mixed') for (const category of available()) if (stored.enabled.includes(category.id)) enabled.add(category.id);
        }
      }
    } catch { /* Ignore unavailable or malformed stored preferences. */ }
    if (pendingBulk !== undefined) {
      enabled.clear();
      if (pendingBulk) available().forEach(category => enabled.add(category.id));
      master = true; pendingBulk = undefined;
    }
    for (const record of snapshot.records) {
      const category = categories.get(record.category)!;
      const label = source.labelCategories[record.category];
      const content = document.createElement('span');
      if (label) {
        content.className = label === 'major' ? 'official-place major' : 'official-place';
        content.textContent = record.name;
      } else {
        content.className = 'official-pin';
        const image = document.createElement('img'); image.src = category.icon; image.alt = ''; image.width = 20; image.height = 20;
        image.addEventListener('error', () => { image.hidden = true; content.textContent = '•'; });
        content.append(image);
      }
      const markerIcon = L.divIcon({ className: label ? 'official-label' : 'official-marker', html: content, iconSize: label ? [180, 24] : [28, 34], iconAnchor: label ? [90, 12] : [14, 32] });
      const [x, y] = toPixels(record, hajin);
      const marker = L.marker([y, x], { icon: markerIcon, title: record.name, alt: record.name, keyboard: true, riseOnHover: true });
      marker.on('add', () => {
        const element = marker.getElement();
        if (source.id === 'official') element?.setAttribute('data-official-id', record.id);
        element?.setAttribute('data-source-id', source.id);
        element?.setAttribute('data-source-marker-id', record.id);
        element?.setAttribute('aria-label', `${record.name}, ${category.name}, ${source.name}`);
      });
      const popup = document.createElement('div'); popup.className = 'official-popup';
      const heading = document.createElement('strong'); heading.textContent = record.name;
      const detail = document.createElement('p'); detail.textContent = `${category.name} · ${source.name}`;
      const location = document.createElement('p'); location.textContent = `Image position: ${Math.round(x)}, ${Math.round(y)}`;
      const link = document.createElement('a'); link.href = source.recordLink(record.id); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `View on ${source.website} ↗`;
      popup.append(heading, detail, location, link);
      marker.bindPopup(popup, { maxWidth: 250 });
      groups.get(record.category)!.addLayer(marker);
    }
    renderKey();
    renderControls();
  }

  async function load() {
    controller?.abort();
    const request = new AbortController(); controller = request;
    const timeout = setTimeout(() => request.abort(), 10000);
    root.clearLayers(); groups.clear(); snapshot = undefined;
    onUpdate(0, 0, 'loading');
    container.textContent = `Loading ${source.name} locations…`;
    if (keyContainer) keyContainer.textContent = `Loading ${source.name} icons…`;
    try {
      const response = await fetch(source.snapshot, { signal: request.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Expected a JSON snapshot.');
      const data = parseSnapshot(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(response, 2 * 1024 * 1024))), source);
      if (disposed || controller !== request) return;
      snapshot = data; addRecords();
    } catch {
      if (disposed || controller !== request) return;
      onUpdate(0, 0, 'failed');
      container.replaceChildren();
      const message = document.createElement('p'); message.textContent = `${source.name} locations couldn’t load. You can still explore the background.`;
      const retry = document.createElement('button'); retry.id = `retry-${source.id}`; retry.textContent = `Retry ${source.name} locations`; retry.addEventListener('click', load);
      container.append(message, retry);
      if (keyContainer) {
        keyContainer.replaceChildren();
        const keyMessage = document.createElement('p'); keyMessage.className = 'small-note'; keyMessage.textContent = `${source.name} icons couldn’t load.`;
        const keyRetry = document.createElement('button'); keyRetry.className = 'key-retry'; keyRetry.textContent = 'Retry icons'; keyRetry.addEventListener('click', load);
        keyContainer.append(keyMessage, keyRetry);
      }
    } finally { clearTimeout(timeout); }
  }
  load();
  return { reload: load, setAll, destroy() { disposed = true; controller?.abort(); map.removeLayer(root); } };
}
