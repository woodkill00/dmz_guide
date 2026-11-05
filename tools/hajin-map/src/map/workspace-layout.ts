/** Allocation only. Moves original nodes; never copies a form or changes map camera. */
export function mountMapWorkspaceLayout() {
  if(document.documentElement.dataset.uiVariant!=='modern')return undefined;
  const root=document.querySelector<HTMLElement>('.workspace')!,terrain=document.querySelector<HTMLElement>('.map-workspace')!,key=document.querySelector<HTMLElement>('#map-key')!;
  const task=document.createElement('aside');task.id='ui-map-task';task.setAttribute('aria-label','Map task');
  const controls=document.createElement('nav');controls.className='ui-map-view-controls';controls.setAttribute('aria-label','Workspace view');
  const map=document.createElement('button'),tools=document.createElement('button');map.id='ui-map-view';tools.id='ui-task-view';map.type=tools.type='button';map.textContent='Map view';tools.textContent='Task view';controls.append(map,tools);
  root.before(controls);root.prepend(task);task.append(key);
  const route=document.createElement('div');route.id='ui-map-route';route.setAttribute('aria-label','Route tracking');terrain.after(route);
  let chosen:'map'|'task'='map',allowDock=true,disposed=false,frame=0;
  const paint=()=>{if(disposed)return;const focused=document.activeElement,wasTask=focused instanceof HTMLElement&&task.contains(focused),wasMap=focused instanceof HTMLElement&&terrain.contains(focused);if(wasTask)chosen='task';const r=root.getBoundingClientRect(),font=parseFloat(getComputedStyle(root).fontSize)||16;
    // Fit is measured after real shell/navigation/route allocation, including font changes.
    const available=Math.max(0,(window.visualViewport?.height??innerHeight)-Math.max(0,r.top+scrollY));document.documentElement.dataset.mapSpace=available<14*font?'scroll':'fit';const visibleHeight=Math.min(available,Math.max(0,Math.min(r.bottom,window.visualViewport?window.visualViewport.offsetTop+window.visualViewport.height:innerHeight)-Math.max(r.top,window.visualViewport?.offsetTop??0)));const dock=r.width>=58*font&&visibleHeight-route.getBoundingClientRect().height>=26*font;
    const docked=dock&&allowDock;const mode=docked?'docked':chosen;document.documentElement.dataset.mapLayout=mode;document.documentElement.dataset.mapView=chosen;
    task.hidden=mode==='map';terrain.hidden=mode==='task';
    document.querySelector('#toggle-key')?.setAttribute('aria-expanded',String(!task.hidden&&!key.hidden));map.setAttribute('aria-pressed',String(chosen==='map'));tools.setAttribute('aria-pressed',String(chosen==='task'));if(!dock&&task.hidden&&wasTask)map.focus({preventScroll:true});if(!dock&&terrain.hidden&&wasMap)tools.focus({preventScroll:true});};
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);};
  const showTask=()=>{allowDock=true;chosen='task';paint();},showMap=()=>{allowDock=false;chosen='map';if(task.contains(document.activeElement))map.focus({preventScroll:true});paint();};
  map.addEventListener('click',showMap);tools.addEventListener('click',showTask);
  const observer=new ResizeObserver(schedule);observer.observe(root);observer.observe(controls);observer.observe(route);window.visualViewport?.addEventListener('resize',schedule);window.addEventListener('resize',schedule);
  const mutations=new MutationObserver(schedule);mutations.observe(document.documentElement,{attributes:true,attributeFilter:['data-density','data-theme','style']});
  const relocate=()=>{const hud=document.querySelector<HTMLElement>('#route-plan-summary');if(hud&&hud.parentElement!==route)route.append(hud);for(const selector of ['#workspace-open','.field-toolbar']){const node=document.querySelector<HTMLElement>(selector);if(node&&node.parentElement!==controls)controls.append(node);}};
  const childObserver=new MutationObserver(relocate);childObserver.observe(root,{childList:true,subtree:true});relocate();schedule();
  return{task,key,showTask,showMap,refresh:schedule,destroy(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();childObserver.disconnect();window.visualViewport?.removeEventListener('resize',schedule);window.removeEventListener('resize',schedule);map.removeEventListener('click',showMap);tools.removeEventListener('click',showTask);}};
}
