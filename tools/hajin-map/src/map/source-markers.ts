import L from 'leaflet';
import { hajin } from './hajin';
import { toPixels, type MapPosition } from './coordinates';
import type { MarkerSource } from './marker-sources';
import { boundedBytes } from './bounded-input';

interface Category { id: string; name: string; group: string; icon: string }
interface SourceRecord extends MapPosition { id: string; name: string; category: string; floor?: string | number | null; notes?: string }
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
    if(record.notes!==undefined&&(typeof record.notes!=='string'||record.notes.length>4000))throw new Error('Invalid source notes.');
    if(record.floor!=null&&!(typeof record.floor==='string'&&text(record.floor,128))&&!(typeof record.floor==='number'&&Number.isFinite(record.floor)))throw new Error('Invalid source floor.');
  }
  return data;
}

export function createSourceMarkers(source: MarkerSource, map: L.Map, container: HTMLElement, onUpdate: (visible: number, total: number, state: State) => void, keyContainer?: HTMLElement) {
  const root = L.layerGroup().addTo(map);
  const groups = new Map<string, L.LayerGroup>();
  const enabled = new Set<string>();
  let suppressed = new Set<string>(), duplicates = new Map<string,string>();
  let snapshot: Snapshot | undefined, captureDigest: string | undefined;
  let master = true;
  let controller: AbortController | undefined;
  let disposed = false;
  let pendingBulk: boolean | undefined;
  let query = '';
  let lastEvent = '';
  let legacyPersistence = true;
  let restoringSnapshot = false;
  const markerPool: {record: SourceRecord; marker: L.Marker}[] = [];
  const storageKey = `hajin.source-filters.v1.${source.id}`;
  const available = () => snapshot!.categories.filter(category => snapshot!.records.some(record => record.category === category.id));

  function persist() {
    if (!legacyPersistence) return;
    const active = available();
    const selection = enabled.size === active.length ? 'all' : enabled.size === 0 ? 'none' : 'mixed';
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, master, selection, enabled: [...enabled] })); } catch { /* Filters still work without browser storage. */ }
  }

  function update(persistLegacy = true) {
    if (!snapshot) return;
    root.clearLayers();
    if (markerPool.length) {
      groups.forEach(group => group.clearLayers());
      for (const {record, marker} of markerPool) if (!suppressed.has(record.id) && `${record.name} ${record.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) groups.get(record.category)?.addLayer(marker);
    }
    if (master) for (const [id, group] of groups) if (enabled.has(id)) root.addLayer(group);
    const visible = master ? snapshot.records.filter(record => !suppressed.has(record.id) && enabled.has(record.category) && `${record.name} ${record.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).length : 0;
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
    for (const host of [container,keyContainer]) host?.querySelectorAll<HTMLInputElement>('[data-category],[data-key-category]').forEach(input => {
      const category = input.dataset.category ?? input.dataset.keyCategory, records = snapshot!.records.filter(r=>r.category===category), matched = records.filter(r=>duplicates.has(r.id)).length;
      const row=input.closest('label'), count=row?.querySelector('.category-count');
      if(count)count.textContent=String(records.length);
      if(row){row.classList.toggle('duplicate-category',matched>0&&matched===records.length);row.dataset.duplicateCount=String(matched);if(matched)row.title=`* ${matched} likely duplicate locations. One selected source is drawn; enable Show duplicate markers to inspect every source.`;else if(records.length)row.removeAttribute('title');}
      row?.querySelector('.duplicate-details-button')?.remove();
      if(matched&&row){const inspect=document.createElement('button');inspect.type='button';inspect.className='duplicate-details-button';inspect.textContent=`* ${matched} matching — details`;inspect.setAttribute('aria-label',`Inspect matching ${category} locations from ${source.name}`);inspect.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();document.dispatchEvent(new CustomEvent('map-duplicate-details',{detail:{sourceId:source.id,categoryId:category}}));});row.append(inspect);}
    });
    if (persistLegacy) persist();
    const detail = {sourceId: source.id, origin: restoringSnapshot ? 'load' : persistLegacy ? 'user' : 'program', master, enabled: [...enabled], categories: snapshot.categories.map(c => c.id)};
    const signature = JSON.stringify(detail);
    if (signature !== lastEvent) { lastEvent = signature; document.dispatchEvent(new CustomEvent('map-source-filters', {detail})); }
    document.dispatchEvent(new CustomEvent('map-source-status'));
  }

  function setAll(show: boolean) {
    if (!snapshot) { pendingBulk = show; return; }
    enabled.clear();
    if (show) available().forEach(category => enabled.add(category.id));
    if (show) master = true;
    update();
  }

  function renderKey() {
    if (!snapshot || !keyContainer) return;
    keyContainer.replaceChildren();
    const heading = document.createElement('h3'); heading.className = 'key-source-name';
    const siteLink=document.createElement('a');siteLink.textContent=source.name;siteLink.href=source.page;siteLink.target='_blank';siteLink.rel='noopener noreferrer';heading.append(siteLink);
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
          if (input.checked) { master = true; enabled.add(category.id); }
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
    const heading = document.createElement('a'); heading.className = 'source-name'; heading.textContent = source.name;heading.href=source.page;heading.target='_blank';heading.rel='noopener noreferrer';heading.addEventListener('click',event=>event.stopPropagation());
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
    root.clearLayers(); groups.clear(); enabled.clear(); markerPool.length = 0;
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
      const notes=document.createElement('p');notes.textContent=record.notes||'No notes supplied.';
      const claim=document.createElement('p');claim.textContent=`Source claim · not independently verified · captured ${snapshot.capturedAt}`;
      const inspect=document.createElement('button');inspect.type='button';inspect.textContent='Details / flag discrepancy';inspect.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('map-record-details',{detail:{sourceId:source.id,recordId:record.id}})));
      const copy=document.createElement('button');copy.type='button';copy.textContent='Copy coordinates';copy.addEventListener('click',()=>{void (async()=>{try{await navigator.clipboard.writeText(`${x.toFixed(2)}, ${y.toFixed(2)}`);copy.textContent='Coordinates copied';}catch{const fallback=document.createElement('input');fallback.readOnly=true;fallback.value=`${x.toFixed(2)}, ${y.toFixed(2)}`;fallback.setAttribute('aria-label','Coordinates to copy');popup.append(fallback);fallback.focus();fallback.select();}})();});
      popup.append(notes,claim,inspect,copy);
      marker.bindPopup(popup, { maxWidth: 250 });
      markerPool.push({record, marker});
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
      const bytes = await boundedBytes(response, 2 * 1024 * 1024);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)), b => b.toString(16).padStart(2, '0')).join('');
      if (source.snapshotDigest) {
        if (digest !== source.snapshotDigest) throw new Error('Local snapshot changed; review its coordinate registration again.');
      }
      const data = parseSnapshot(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), source);
      if (disposed || controller !== request) return;
      snapshot = data; captureDigest=digest; restoringSnapshot = true; try { addRecords(); } finally { restoringSnapshot = false; }
    } catch {
      if (disposed || controller !== request) return;
      onUpdate(0, 0, 'failed');
      document.dispatchEvent(new CustomEvent('map-source-status'));
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
  return { id: source.id, reload: load, setAll,
    async replaceCapture(next: MarkerSource) { if(next.id!==source.id||next.page!==source.page)throw new Error('Source identity cannot change.');Object.assign(source,next);await load();if(!snapshot)throw new Error(`${source.name} capture could not reload. Reload the page to retry.`); },
    getSnapshot: () => snapshot,
    getSnapshotDigest: () => captureDigest,
    getFilters: () => ({master, enabled: [...enabled], categories: snapshot?.categories.map(c => c.id) ?? []}),
    setFilters(value: {master: boolean; enabled: string[]; query?: string; persistLegacy?: boolean; suppressed?: Set<string>; duplicates?: Map<string,string>}) { master = value.master; enabled.clear(); const valid = new Set(snapshot ? available().map(category => category.id) : []); value.enabled.forEach(id => { if (valid.has(id)) enabled.add(id); }); query = value.query ?? query; suppressed=value.suppressed??suppressed; duplicates=value.duplicates??duplicates; update(value.persistLegacy ?? false); },
    setQuery(value: string) { query = value; update(false); },
    setLegacyPersistence(value: boolean) { legacyPersistence = value; },
    destroy() { disposed = true; controller?.abort(); map.removeLayer(root); } };
}
