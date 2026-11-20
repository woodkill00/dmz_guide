import { mapPath } from '../../../src/domain/map-routes.mjs';

export const unifiedSite = import.meta.env?.BASE_URL === '/map/';
export function mapURL<T>(value: T): T {
  if (typeof value !== 'string') return value;
  if (unifiedSite && value.startsWith('http://127.0.0.1:4173/')) {
    const url = new URL(value);
    return (location.origin + url.pathname + url.search + url.hash) as T;
  }
  return mapPath(value, { standalone: !unifiedSite }) as T;
}
export const guideOrigin = () => unifiedSite ? location.origin : 'http://127.0.0.1:4173';
export const guideURL = (path: string) => guideOrigin() + path;
// Only controlled application markup passes here, never imported HTML.
export function mapMarkup<T>(value: T): T {
  if (!unifiedSite || typeof value !== 'string') return value;
  return value.replace(/((?:href|src|action)=["'])(\/(?!\/)[^"']*)/g, (_, start, path) => start + mapURL(path)) as T;
}
