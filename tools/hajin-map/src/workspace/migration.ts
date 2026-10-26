import type { Json, VisibilityState } from './types.ts';
import type { WorkspaceHistory } from './store.ts';

/** Pure preview; caller commits state and marker together. Legacy storage is never changed. */
export function planLegacyMaskMigration(
  storage: Pick<Storage, 'getItem'>,
  categories: Record<string, string[]>,
  sources: string[],
  previousCategories: Record<string, string[]> = categories,
) {
  const visibility: VisibilityState = { sourceEnabled: {}, categoryMask: {}, curatedEnabled: true, customEnabled: true, query: '' };
  const warnings: string[] = [];
  for (const source of sources) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(source) || ['__proto__', 'prototype', 'constructor'].includes(source)) throw new Error('Invalid source ID.');
    const ids = categories[source] ?? [];
    if (ids.length > 100 || ids.some(id => !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) || ['__proto__', 'prototype', 'constructor'].includes(id))) throw new Error('Invalid category IDs.');
    visibility.sourceEnabled[source] = true;
    visibility.categoryMask[source] = Object.fromEntries(ids.map(id => [id, true]));
    try {
      const raw = storage.getItem(`hajin.source-filters.v1.${source}`);
      if (raw === null) continue;
      if (raw.length > 32768) throw new Error('Legacy preference too large.');
      const value = JSON.parse(raw);
      if (!value || value.version !== 1 || typeof value.master !== 'boolean' || !['all', 'none', 'mixed'].includes(value.selection) || !Array.isArray(value.enabled) || value.enabled.length > 100 || value.enabled.some((id: unknown) => typeof id !== 'string')) throw new Error('Invalid legacy filters.');
      visibility.sourceEnabled[source] = value.master;
      for (const id of ids) {
        const isNew = !(previousCategories[source] ?? []).includes(id);
        visibility.categoryMask[source][id] = isNew || value.selection === 'all' || (value.selection === 'mixed' && value.enabled.includes(id));
      }
    } catch { warnings.push(`Could not migrate ${source} preferences; defaults shown for review. Legacy state was retained.`); }
  }
  return { marker: 'source-masks-v1', visibility, warnings };
}

/** Stage against an exact revision. Commit this data only after the caller shows its preview. */
export function stageMaskMigration(history: WorkspaceHistory, plan: ReturnType<typeof planLegacyMaskMigration>) {
  const data = history.current?.data ?? {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Workspace document must be an object to migrate masks.');
  const migrations = data.migrations ?? [];
  if (!Array.isArray(migrations) || migrations.some(value => typeof value !== 'string')) throw new Error('Invalid migration history.');
  const alreadyApplied = migrations.includes(plan.marker);
  const next: Json = alreadyApplied ? structuredClone(data) : {
    ...structuredClone(data), visibility: structuredClone(plan.visibility) as unknown as Json, migrations: [...migrations, plan.marker],
  };
  return { expectedRevision: history.current?.revision ?? 0, alreadyApplied, data: next, warnings: [...plan.warnings] };
}
