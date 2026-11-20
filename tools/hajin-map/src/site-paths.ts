import { mapPath } from '../../../src/domain/map-routes.mjs';
import {servicePath,serviceOrigin} from '../../../src/domain/local-services.mjs';

export const unifiedSite = import.meta.env?.BASE_URL === '/map/';
export function mapURL<T>(value: T): T {
  if (typeof value !== 'string') return value;
  return mapPath(value, { standalone: !unifiedSite }) as T;
}
export const guideOrigin = () => unifiedSite ? location.origin : serviceOrigin('guide',location.origin);
export const guideOrigins = () => unifiedSite ? [location.origin] : ['127.0.0.1','localhost'].map(host=>serviceOrigin('guide','http://'+host));
export const guideURL = (path: string) => unifiedSite ? new URL(path,location.origin).href : servicePath('guide',path);
// Only controlled application markup passes here, never imported HTML.
export function mapMarkup<T>(value: T): T {
  if (!unifiedSite || typeof value !== 'string') return value;
  return value.replace(/((?:href|src|action)=["'])(\/(?!\/)[^"']*)/g, (_, start, path) => start + mapURL(path)) as T;
}
