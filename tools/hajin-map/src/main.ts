import 'leaflet/dist/leaflet.css';
import './styles.css';
import { createMapView, type MapState } from './map/map-view';
import { hajin } from './map/hajin';
import { createSourceMarkers } from './map/source-markers';
import { markerSources as defaultMarkerSources } from './map/marker-sources';
import { loadLocalProviderSources } from './map/local-providers';
import type { MarkerSource } from './map/marker-sources';
import { loadCurrentCaptures } from './map/current-captures';
import { mountWorkspace } from './workspace/app';

const icon = (name: string) => {
  const paths: Record<string, string> = {
    cross: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
    reset: '<path d="M3 9a9 9 0 1 1 1 9M3 3v6h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
};

const sourceInfo = `
  <p class="eyebrow">MAP INTELLIGENCE</p>
  <h2>Know the ground.</h2>
  <p>Explore Hajin’s roads, rivers and districts. This is the foundation of your personal DMZ field guide.</p>
  <div class="info-rule"></div>
  <h3>The background</h3>
  <p>Official Hajin terrain imagery and optional official location icons. Your own gameplay discoveries will remain a separate layer.</p>
  <a class="source-link" href="${hajin.source}" target="_blank" rel="noopener noreferrer">Open official map ${icon('arrow')}</a>
  <h3>Map details</h3>
  <dl><div><dt>Coverage</dt><dd>Full surface map</dd></div><div><dt>Resolution</dt><dd>4096 × 4096</dd></div><div><dt>Source captured</dt><dd>25 Oct 2026</dd></div></dl>
  <p class="small-note">Orange terrain and reactor shading are part of the source image. They do not show live match conditions.</p>
  <div class="info-rule"></div>
  <h3>Navigation</h3>
  <p>Drag to explore. Scroll or pinch to zoom. Use Reset view to see the full map.</p>
  <p class="small-note">Keyboard: focus the map, use arrow keys to pan and + / − to zoom. Tab moves to the next control.</p>
  <p class="independent">An independent fan project. Not affiliated with Activision or Infinity Ward.</p>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#map">Skip to map</a>
  <header class="app-header">
    <a class="brand" href="/" aria-label="Hajin Field Guide home"><span class="brand-mark">${icon('cross')}</span><span>FIELD GUIDE<span class="brand-sub">MODERN WARFARE · DMZ</span></span></a>
    <div class="header-center"><span class="status-dot"></span> HAJIN EXCLUSION ZONE</div>
    <div class="local-badge"><span></span> LOCAL EDITION</div>
  </header>
  <main class="workspace">
    <aside id="map-key" class="sidebar" aria-label="Map key">
      <div class="sidebar-heading"><span class="section-number">MAP KEY</span><button id="close-key" class="key-close" aria-label="Hide map key">×</button></div>
      <div class="key-toolbar"><p>Choose the symbols shown on your map.</p><label class="grid-toggle"><input id="show-coordinate-grid" type="checkbox" checked aria-describedby="coordinate-grid-help"> Coordinate grid (A–J / 1–9)</label><p id="coordinate-grid-help" class="small-note">Source-aligned tactical grid. Unlabelled margins show —.</p><div class="layer-bulk"><button id="key-show-all" disabled>Show all</button><button id="key-hide-all" disabled>Hide all</button></div><p id="key-summary" role="status">Loading icons…</p></div>
      <div id="map-key-content" class="key-content"></div>
      <div class="overlay-summary">${icon('map')}<div><strong id="official-summary">Loading official locations…</strong><span>No authored markers yet</span></div><span id="official-summary-count" class="marker-count">—</span></div>
    </aside>
    <section class="map-workspace" aria-label="Hajin interactive map">
      <div id="map" tabindex="0" role="region" aria-label="Hajin map. Arrow keys pan. Plus and minus zoom." aria-describedby="map-help"></div>
      <div class="map-heading"><span class="eyebrow">THE EXCLUSION ZONE</span><h1>HAJIN<span>하진</span></h1><p>Your next deployment starts here.</p></div>
      <div class="map-top-right"><button id="toggle-key" class="key-toggle" aria-controls="map-key" aria-expanded="true">${icon('map')}<span>Map key</span></button><span class="north-indicator" aria-label="Map north is up"><span>↑</span>N</span><button id="fullscreen" class="icon-button" aria-label="Enter fullscreen" title="Fullscreen">${icon('expand')}</button></div>
      <div class="map-controls" role="group" aria-label="Map navigation">
        <button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in" data-map-control disabled>${icon('plus')}</button>
        <button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out" data-map-control disabled>${icon('minus')}</button>
        <span class="control-divider"></span>
        <button id="reset" class="icon-button" aria-label="Reset view" title="Reset view" data-map-control disabled>${icon('reset')}</button>
        <button id="layers" class="icon-button" aria-label="Map sources and layers" title="Map sources and layers">${icon('layers')}</button>
        <button id="info" class="icon-button" aria-label="Map information and keyboard help" title="Map information">${icon('info')}</button>
      </div>
      <div class="map-bottom-bar"><span class="map-position"><span><span class="coordinate-label">GRID</span><span id="grid-position">—</span></span><span><span class="coordinate-label">IMAGE POSITION</span><span id="position">X — &nbsp; Y —</span></span></span><span id="zoom-level">OVERVIEW</span></div>
      <div id="map-status" class="map-status" role="status" aria-live="polite"><span class="loader"></span><strong>Preparing the terrain</strong><p>Loading the Hajin background…</p></div>
      <p id="map-help" class="sr-only">Drag or use arrow keys to pan. Scroll, pinch, or use the zoom buttons to zoom. Reset view fits the whole map. Image positions are not in-game grid coordinates.</p>
      <footer class="map-credit"><a href="${hajin.source}" target="_blank" rel="noopener noreferrer">Official Hajin map & icons</a><span>© 2026 Activision Publishing, Inc.</span></footer>
    </section>
  </main>
  <dialog id="info-dialog" aria-labelledby="dialog-title"><div class="dialog-top"><span id="dialog-title">FIELD NOTES</span><button id="close-info" aria-label="Close map information">Close <span aria-hidden="true">×</span></button></div><div class="dialog-content">${sourceInfo}</div></dialog>
  <dialog id="layers-dialog" aria-labelledby="layers-title"><div class="dialog-top"><span id="layers-title">SOURCES & LAYERS</span><button id="close-layers" aria-label="Close map layers">Close <span aria-hidden="true">×</span></button></div><div class="layers-explanation">Choose a website, then pick the categories you want to see. Your choices are saved in this browser.</div><div id="source-controls" class="dialog-content"></div></dialog>`;

const keyBreakpoint = window.matchMedia('(max-width: 760px)');
const keyPanel = document.querySelector<HTMLElement>('#map-key')!;
const keyToggle = document.querySelector<HTMLButtonElement>('#toggle-key')!;
let keyOpen = !keyBreakpoint.matches;
function setKeyOpen(open: boolean, returnFocus = false) {
  keyOpen = open;
  keyPanel.hidden = !open;
  document.querySelector('.workspace')!.classList.toggle('key-hidden', !open);
  keyToggle.setAttribute('aria-expanded', String(open));
  if (returnFocus) keyToggle.focus();
}
setKeyOpen(keyOpen);
keyToggle.addEventListener('click', () => {
  // This button is an explicit opener. Clicking it must never hide an already open key.
  setKeyOpen(true);
  document.querySelector('#map-key-content')!.scrollTop = 0;
  document.querySelector<HTMLButtonElement>('#key-show-all')!.focus();
});
document.querySelector('#close-key')!.addEventListener('click', () => setKeyOpen(false, true));
keyPanel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); setKeyOpen(false, true); } });
keyBreakpoint.addEventListener('change', event => setKeyOpen(!event.matches));

const status = document.querySelector<HTMLDivElement>('#map-status')!;
let state: MapState = 'loading';
function updateState(next: MapState) {
  state = next;
  document.querySelector('#map')!.setAttribute('aria-busy', String(next === 'loading'));
  document.querySelectorAll<HTMLButtonElement>('[data-map-control]').forEach(button => { button.disabled = next !== 'ready'; });
  status.hidden = next === 'ready';
  status.classList.toggle('failed', next === 'failed');
  if (next === 'loading') status.innerHTML = '<span class="loader"></span><strong>Preparing the terrain</strong><p>Loading the Hajin background…</p>';
  if (next === 'failed') {
    status.innerHTML = `<span class="failure-symbol" aria-hidden="true">!</span><strong>The map couldn’t load</strong><p>Try loading the background again.</p><button id="retry">Retry map</button><a href="${hajin.source}" target="_blank" rel="noopener noreferrer">View the official source ↗</a>`;
    document.querySelector('#retry')!.addEventListener('click', () => viewer.retry());
  }
}

export const viewer = createMapView(document.querySelector<HTMLElement>('#map')!, updateState, (x, y, grid) => {
  document.querySelector('#grid-position')!.textContent=grid??'—';
  document.querySelector('#position')!.textContent = x === null ? 'X —   Y —' : `X ${String(x).padStart(4, '0')}   Y ${String(y).padStart(4, '0')}`;
}, zoom => { document.querySelector('#zoom-level')!.textContent = `ZOOM ${Math.round(100 * 2 ** (zoom - 4))}%`; });
const gridToggle=document.querySelector<HTMLInputElement>('#show-coordinate-grid')!;
gridToggle.checked=viewer.coordinateGrid.isVisible();gridToggle.disabled=!viewer.coordinateGrid.supported;
gridToggle.addEventListener('change',()=>viewer.coordinateGrid.setVisible(gridToggle.checked));

const sourceStatus = new Map<string, { visible: number; total: number; state: string }>();
async function startSources() {
const markerSources = [...defaultMarkerSources];
if (import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS === '1') {
  try {
    markerSources.push(...await loadLocalProviderSources());
    for(const current of await loadCurrentCaptures()){
      const index=markerSources.findIndex(s=>s.id===current.id);
      if(index<0)markerSources.push(current);else markerSources[index]=current;
    }
  }
  catch {
    const warning = document.createElement('p'); warning.id = 'local-provider-load-error'; warning.setAttribute('role', 'alert');
    warning.textContent = 'Local provider captures could not load. Check the local manifest and registration evidence; the official map remains available.';
    document.querySelector('#map-key-content')!.prepend(warning);
  }
}
const createSource = (source: MarkerSource) => {
  const slot = document.createElement('section'); slot.className = 'source-slot'; slot.dataset.sourceSlot = source.id; slot.setAttribute('aria-label', `${source.name} layers`);
  document.querySelector('#source-controls')!.append(slot);
  const keySlot = document.createElement('section'); keySlot.className = 'key-source'; keySlot.dataset.keySource = source.id; keySlot.setAttribute('aria-label', `${source.name} map key`);
  document.querySelector('#map-key-content')!.append(keySlot);
  return createSourceMarkers(source, viewer.map, slot, (visible, total, state) => {
    sourceStatus.set(source.id, { visible, total, state });
    const values = [...sourceStatus.values()];
    const shown = values.reduce((sum, item) => sum + item.visible, 0);
    const available = values.reduce((sum, item) => sum + item.total, 0);
    const failed = values.some(item => item.state === 'failed');
    if (document.querySelector<HTMLElement>('#workspace-dialog')?.dataset.ready !== 'true') {
    document.querySelector('#official-summary')!.textContent = failed ? 'Some source locations unavailable' : `${shown} / ${available} imported locations`;
    document.querySelector('#official-summary-count')!.textContent = String(shown);
    document.querySelector('#key-summary')!.textContent = `${shown} / ${available} locations shown${failed ? ' · source unavailable' : ''}`;
    const loading = sourceStatus.size < markerSources.length || values.some(item => item.state === 'loading');
    document.querySelectorAll<HTMLButtonElement>('#key-show-all, #key-hide-all').forEach(button => { button.disabled = loading || values.every(item => item.state === 'failed'); });
    }
  }, keySlot);
};
const sources=markerSources.map(createSource);
document.querySelector('#key-show-all')!.addEventListener('click', () => sources.forEach(source => source.setAll(true)));
document.querySelector('#key-hide-all')!.addEventListener('click', () => sources.forEach(source => source.setAll(false)));
const layersDialog = document.querySelector<HTMLDialogElement>('#layers-dialog')!;
document.querySelector('#layers')!.addEventListener('click', () => layersDialog.showModal());
document.querySelector('#close-layers')!.addEventListener('click', () => layersDialog.close());

document.querySelector('#zoom-in')!.addEventListener('click', () => viewer.zoomIn());
document.querySelector('#zoom-out')!.addEventListener('click', () => viewer.zoomOut());
document.querySelector('#reset')!.addEventListener('click', () => viewer.reset());
const dialog = document.querySelector<HTMLDialogElement>('#info-dialog')!;
document.querySelector('#info')!.addEventListener('click', () => dialog.showModal());
document.querySelector('#close-info')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
const fullscreen = document.querySelector<HTMLButtonElement>('#fullscreen')!;
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { fullscreen.title = 'Fullscreen is unavailable in this browser'; }
});
document.addEventListener('fullscreenchange', () => fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
document.querySelector('#map')!.addEventListener('keydown', event => {
  if ((event as KeyboardEvent).key.toLowerCase() === 'r' && state === 'ready') { event.preventDefault(); viewer.reset(); }
});
const authorWorkspace = mountWorkspace(viewer, sources,source=>{const controller=createSource(source);sources.push(controller);return controller;});

if (import.meta.hot) import.meta.hot.dispose(() => { authorWorkspace.destroy(); sources.forEach(source => source.destroy()); viewer.destroy(); });
}
void startSources();
