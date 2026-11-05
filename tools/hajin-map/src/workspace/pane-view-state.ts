import {createPresentationState,type PresentationContext} from '../../../../src/ui/presentation-state.mjs';
import {toolTargets} from '../tool-links.ts';
/** Clean DOM context only; no quantities, files, draft forms or persistent storage. */
export function createPaneViewState(host:HTMLElement,context:()=>PresentationContext){
 const cache=createPresentationState({taskIds:[...toolTargets,'backup'],validateContext:c=>c.workspace==='hajin',validateRecordRef:()=>false});
 const scroller=()=>host.closest<HTMLElement>('#ui-map-task')??host;
 const controls=()=>new Map([...host.querySelectorAll<HTMLElement>('[id]')].map(node=>[node.id,node]));
 const limits=()=>({controlKeys:new Set(controls().keys()),maxScroll:Math.max(0,scroller().scrollHeight-scroller().clientHeight)});
 const query=()=>host.querySelector<HTMLInputElement>('input[data-workspace-search][type=search],input#explorer-search,input#points-search,input#review-search');
 return{
  capture(task:string){const ctx=context(),keys=controls(),element=query(),focused=document.activeElement;cache.activate(task,ctx,limits());cache.put(task,ctx,{query:element?.value.slice(0,256)??'',scope:task==='workspace-search'?'workspace':'map',expanded:[...host.querySelectorAll<HTMLDetailsElement>('details[id][open]')].map(d=>d.id).filter(id=>keys.has(id)).slice(0,128),scroll:{anchor:null,offset:scroller().scrollTop},focusKey:focused instanceof HTMLElement&&keys.get(focused.id)===focused?focused.id:null},limits());},
  restore(task:string,{focus=false}={}){const keys=controls(),view=cache.activate(task,context(),limits()),element=query();if(element&&element.value!==view.query){element.value=view.query;element.dispatchEvent(new Event('input',{bubbles:true}));}for(const node of host.querySelectorAll<HTMLDetailsElement>('details[id]'))node.open=view.expanded.includes(node.id);scroller().scrollTop=view.scroll.offset;if(focus&&view.focusKey)keys.get(view.focusKey)?.focus({preventScroll:true});},
  clear:()=>cache.clear(),stats:()=>cache.stats(),
 };
}
