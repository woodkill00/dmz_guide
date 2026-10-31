import mapDestinations from '../../../src/ui/map-destinations.json' with {type:'json'};
import type {PlannerSection} from './workspace/field-guide-ui.ts';
/** Navigation targets only. No target represents a mutation or collection action. */
const baseToolTargets=['planner','health','map','key','layers','grid','updates','points','icons','sources','review','backups','explore','duplicates','saved-views','completeness','discrepancies','backgrounds'] as const;
export const toolTargets=[...baseToolTargets,...mapDestinations.planner.map(([id])=>id as PlannerSection)];
export type ToolTarget=typeof baseToolTargets[number]|PlannerSection;
export function parseToolTarget(search:string):ToolTarget|null{
  const values=new URLSearchParams(search).getAll('tool');
  return values.length===1&&toolTargets.some(t=>t===values[0])?values[0] as ToolTarget:null;
}
export interface WorkspaceDestination{
  tab:'planner'|'health'|'points'|'icons'|'sources'|'review'|'backup'|'explore';
  section?:'search'|'duplicates'|'presets'|'coverage'|'flags';
  focus?:string;
  plannerSection?:PlannerSection;
}
const destinations=new Map<ToolTarget,WorkspaceDestination>([
  ...mapDestinations.planner.map(([id])=>[id as PlannerSection,{tab:'planner' as const,plannerSection:id as PlannerSection}] as const),
  ['planner',{tab:'planner'}],
  ['health',{tab:'health'}],
  ['points',{tab:'points'}],['icons',{tab:'icons'}],['sources',{tab:'sources'}],['review',{tab:'review'}],['backups',{tab:'backup'}],
  ['explore',{tab:'explore',section:'search'}],['duplicates',{tab:'explore',section:'duplicates'}],['saved-views',{tab:'explore',section:'presets'}],
  ['completeness',{tab:'explore',section:'coverage'}],['discrepancies',{tab:'explore',section:'flags'}],['backgrounds',{tab:'sources',focus:'background-file'}],
]);
export const workspaceDestination=(target:ToolTarget):WorkspaceDestination|null=>destinations.get(target)??null;
