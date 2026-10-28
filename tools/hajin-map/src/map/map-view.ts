import L from 'leaflet';
import { hajin } from './hajin';
import { fromPixels } from './coordinates';
import { boundedBytes } from './bounded-input';
import { createCoordinateGrid } from './coordinate-grid.ts';
import { gridReferenceAt } from './tactical-grid.ts';

export type MapState = 'loading' | 'ready' | 'failed';

export function createMapView(element: HTMLElement, onState: (state: MapState) => void, onPosition: (x: number | null, y: number | null, grid?:string|null) => void, onZoom: (zoom: number) => void) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const crs = Object.assign({}, L.CRS.Simple, { transformation: new L.Transformation(1 / 16, 0, 1 / 16, 0) });
  const bounds = L.latLngBounds([0, 0], [hajin.height, hajin.width]);
  const map = L.map(element, {
    crs, minZoom: -4, maxZoom: 4, zoomSnap: 0.25, zoomDelta: 0.5,
    zoomControl: false, attributionControl: false, trackResize: false,
    maxBounds: bounds.pad(0.7), maxBoundsViscosity: 0.85,
    zoomAnimation: !reducedMotion.matches, fadeAnimation: !reducedMotion.matches,
    markerZoomAnimation: !reducedMotion.matches,
  }).setView([2048, 2048], 0);
  const basemapPane = map.createPane('hajin-basemaps');
  basemapPane.style.zIndex = '200';
  basemapPane.style.pointerEvents = 'none';
  const overlay = L.layerGroup().addTo(map);
  const coordinateGrid=createCoordinateGrid(map,bounds);
  let image: L.ImageOverlay | undefined;
  let generation = 0;
  let overview = true;
  let resizeFrame = 0;
  let disposed = false;
  let imageRequest: AbortController | undefined;
  let imageTimeout: ReturnType<typeof setTimeout> | undefined;
  let imageURL: string | undefined;

  const fit = () => {
    map.stop();
    map.fitBounds(bounds, { padding: [24, 24], animate: false });
    overview = true;
  };
  const resize = () => {
    const keepOverview = overview;
    const center = map.getCenter();
    map.invalidateSize({ pan: false });
    // getBoundsZoom clamps to the existing minimum; release the old viewport's limit first.
    map.setMinZoom(-4);
    const minimum = map.getBoundsZoom(bounds, false, L.point(48, 48));
    map.setMinZoom(Math.min(minimum, 4));
    if (keepOverview) fit();
    else map.setView(center, Math.max(map.getZoom(), minimum), { animate: false });
  };
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(element);
  map.on('dragstart zoomstart', () => { overview = false; });
  map.on('zoomend', () => onZoom(map.getZoom()));
  const positionAt=(x:number,y:number)=>{
    try {
      const position = fromPixels(x,y,hajin);
      onPosition(Math.round(position.x * hajin.width), Math.round(position.y * hajin.height),coordinateGrid.supported?gridReferenceAt(x,y):null);
    } catch { onPosition(null, null); }
  };
  map.on('mousemove', event => positionAt(event.latlng.lng,event.latlng.lat));
  map.on('moveend',()=>{const center=map.getCenter();positionAt(center.lng,center.lat);});
  map.on('mouseout', () => onPosition(null, null));

  async function load() {
    const current = ++generation;
    imageRequest?.abort(); clearTimeout(imageTimeout);
    if (imageURL) { URL.revokeObjectURL(imageURL); imageURL = undefined; }
    const request = new AbortController(); imageRequest = request;
    onState('loading');
    if (image) map.removeLayer(image);
    const fail = () => { if (!disposed && current === generation) { clearTimeout(imageTimeout); onState('failed'); } };
    imageTimeout = setTimeout(() => { request.abort(); fail(); }, 15000);
    const source = generation === 1 ? hajin.background : `${hajin.background}?retry=${generation}`;
    try {
      const response = await fetch(source, { signal: request.signal });
      const mime = response.headers.get('content-type')?.split(';')[0] || '';
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw new Error('Expected raster background.');
      const bytes = await boundedBytes(response, 32 * 1024 * 1024);
      if (disposed || current !== generation || request.signal.aborted) return;
      imageURL = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }));
      const layer = L.imageOverlay(imageURL, bounds, { pane: 'hajin-basemaps', alt: 'Hajin DMZ terrain map showing roads, buildings, rivers and coastline', interactive: false });
      image = layer;
      layer.on('load', async () => {
        try {
          await layer.getElement()?.decode();
          if (!disposed && current === generation && !request.signal.aborted) { clearTimeout(imageTimeout); onState('ready'); }
        } catch { fail(); }
      });
      layer.on('error', fail);
      layer.addTo(map);
    } catch { fail(); }
  }
  resize();
  load();
  return {
    map, overlay, bounds, coordinateGrid, reset: fit, retry: load,
    zoomIn: () => map.zoomIn(0.5, { animate: !reducedMotion.matches }),
    zoomOut: () => map.zoomOut(0.5, { animate: !reducedMotion.matches }),
    destroy() { disposed = true; generation++; imageRequest?.abort(); clearTimeout(imageTimeout); if (imageURL) URL.revokeObjectURL(imageURL); observer.disconnect(); cancelAnimationFrame(resizeFrame);coordinateGrid.destroy(); map.remove(); },
  };
}
