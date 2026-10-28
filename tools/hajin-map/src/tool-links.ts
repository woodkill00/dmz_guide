/** Navigation targets only. No target represents a mutation or collection action. */
export const toolTargets=['planner','health','map','key','layers','grid','updates','points','icons','sources','review','backups','explore','duplicates','saved-views','completeness','discrepancies','backgrounds'] as const;
export type ToolTarget=typeof toolTargets[number];
export function parseToolTarget(search:string):ToolTarget|null{
  const values=new URLSearchParams(search).getAll('tool');
  return values.length===1&&toolTargets.some(t=>t===values[0])?values[0] as ToolTarget:null;
}
export interface WorkspaceDestination{
  tab:'planner'|'health'|'points'|'icons'|'sources'|'review'|'backup'|'explore';
  section?:'search'|'duplicates'|'presets'|'coverage'|'flags';
  focus?:string;
}
const destinations=new Map<ToolTarget,WorkspaceDestination>([
  ['planner',{tab:'planner'}],
  ['health',{tab:'health'}],
  ['points',{tab:'points'}],['icons',{tab:'icons'}],['sources',{tab:'sources'}],['review',{tab:'review'}],['backups',{tab:'backup'}],
  ['explore',{tab:'explore',section:'search'}],['duplicates',{tab:'explore',section:'duplicates'}],['saved-views',{tab:'explore',section:'presets'}],
  ['completeness',{tab:'explore',section:'coverage'}],['discrepancies',{tab:'explore',section:'flags'}],['backgrounds',{tab:'sources',focus:'background-file'}],
]);
export const workspaceDestination=(target:ToolTarget):WorkspaceDestination|null=>destinations.get(target)??null;
