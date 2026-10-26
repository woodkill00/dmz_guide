import { sourcePolicies, type SourcePolicy } from '../workspace/policy.ts';

export interface MarkerSource {
  id: string;
  name: string;
  website: string;
  page: string;
  snapshot: string;
  iconDirectory: string;
  labelCategories: Record<string, 'major' | 'minor'>;
  recordLink: (id: string) => string;
  policy?: Readonly<SourcePolicy>;
}

// Reference-only providers are displayed without creating acquisition requests.
export const sourceReferenceRegistry = Object.values(sourcePolicies);

// Add another imported website here after preparing its local snapshot.
// Each source gets its own root layer, category layers, and filter controls.
export const markerSources: MarkerSource[] = [{
  id: 'official',
  policy: sourcePolicies.official,
  name: 'Call of Duty',
  website: 'callofduty.com',
  page: 'https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin',
  snapshot: '/maps/hajin/official/markers.json',
  iconDirectory: '/maps/hajin/official/icons/',
  labelCategories: { poiLabel: 'major', poiLabelSecondary: 'minor' },
  recordLink: id => `https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin?markerId=${encodeURIComponent(id)}`,
}];
