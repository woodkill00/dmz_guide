/** Safe runs owns its own controls, state and road worker. No main-map host is shared. */
export function mountSafeRunLayout(){
 if(document.documentElement.dataset.uiVariant!=='modern')return ()=>{};
 const root=document.querySelector<HTMLElement>('.safe-layout')!,task=document.querySelector<HTMLElement>('#safe-controls')!,terrain=document.querySelector<HTMLElement>('.safe-terrain')!;
 const bar=document.createElement('nav');bar.className='ui-safe-views';bar.setAttribute('aria-label',document.body.classList.contains('loot-run-page')?'Loot-run view':'Safe-run view');
 const map=document.createElement('button'),list=document.createElement('button');map.type=list.type='button';map.textContent='Map view';list.textContent=document.body.classList.contains('loot-run-page')?'Plan loot run':'Plan safe run';map.id='safe-map-view';list.id='safe-task-view';bar.append(map,list);root.before(bar);
 let choice:'map'|'task'='task',disposed=false;
 const paint=()=>{if(disposed)return;if(task.contains(document.activeElement))choice='task';const rect=root.getBoundingClientRect(),font=parseFloat(getComputedStyle(root).fontSize)||16,height=Math.min(rect.bottom,window.visualViewport?window.visualViewport.offsetTop+window.visualViewport.height:innerHeight)-Math.max(rect.top,window.visualViewport?.offsetTop??0);const dock=rect.width>=58*font&&height>=26*font;root.dataset.uiSafeView=dock?'docked':choice;task.hidden=!dock&&choice!=='task';terrain.hidden=!dock&&choice!=='map';map.setAttribute('aria-pressed',String(choice==='map'));list.setAttribute('aria-pressed',String(choice==='task'));};
 const showMap=()=>{choice='map';map.focus({preventScroll:true});paint();},showTask=()=>{choice='task';paint();task.focus({preventScroll:true});};
 map.addEventListener('click',showMap);list.addEventListener('click',showTask);const observer=new ResizeObserver(paint);observer.observe(root);window.visualViewport?.addEventListener('resize',paint);
 paint();document.documentElement.dataset.uiMounted='071-v1';document.documentElement.dataset.uiAdapter='safe-run-layout';
 return()=>{disposed=true;observer.disconnect();window.visualViewport?.removeEventListener('resize',paint);map.removeEventListener('click',showMap);list.removeEventListener('click',showTask);bar.remove();};
}
