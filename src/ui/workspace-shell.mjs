export const UI_CONTRACT='071-v1';
export const primaryHubs=Object.freeze(['home','hajin-map','dmz-guide','dmz-fob','dmz-weapons']);
export function featureHub(feature){const id=typeof feature==='string'?feature:feature?.id;
 if(id==='home')return 'Home';if(['dmz-guide','keys','missions','progression','guides','catalog','maps','boss-checklist','tool-missions','tool-reference-library'].includes(id))return 'DMZ Guide';
 if(['dmz-fob','planner','inventory','collection','items','upgrades','recipes','tool-collections'].includes(id))return 'DMZ FOB';
 if(['dmz-weapons','weapons','armory','armory-workbench','weapon-updates'].includes(id))return 'DMZ Weapons';
 if(['settings','editor','local','studio','community','features','search','sitemap'].includes(id))return 'Tools';return 'Map';
}
const labels={'hajin-map':'Map',missions:'Missions & story','tool-missions':'Map mission tracker',settings:'Guide profiles & backups','tool-settings':'Map settings','tool-backups':'Map backups','tool-workspace-search':'Search my map workspace','tool-explore':'Find map locations','tool-updates':'Map source updates','weapon-updates':'Weapon source updates',recipes:'Crafting recipes'};
export function featureLabel(f){return labels[f.id]??f.label;}
export function mountWorkspaceShell(root=document,{mounted=true}={}){
 const html=root.documentElement;if(html?.dataset.uiVariant!=='modern')return ()=>{};
 const abort=new AbortController(),signal=abort.signal;
 let preference={version:1,density:'comfortable'},writable=true;
 const surface=html.dataset.uiSurface,validSurface=['guide','map','safe-runs','studio','manager'].includes(surface),key=`dmz-ui-display-v1.${surface}`;
 if(!validSurface)writable=false;
 try{const raw=validSurface?root.defaultView.localStorage.getItem(key):null;if(raw!==null){writable=false;if(new TextEncoder().encode(raw).byteLength<=16384){const p=JSON.parse(raw);if(p&&p.version===1&&Object.keys(p).sort().join(',')==='density,version'&&['comfortable','compact'].includes(p.density)){preference={version:1,density:p.density};writable=true;}}}}catch{writable=false;}

 html.dataset.density=preference.density;
 for(const button of root.querySelectorAll('[data-ui-density]')){
  const paint=()=>{button.textContent=html.dataset.density==='compact'?'Comfortable spacing':'Compact spacing';button.setAttribute('aria-pressed',String(html.dataset.density==='compact'));};paint();
  button.addEventListener('click',()=>{html.dataset.density=html.dataset.density==='compact'?'comfortable':'compact';try{if(writable)root.defaultView.localStorage.setItem(key,JSON.stringify({version:1,density:html.dataset.density}));else button.title='Spacing changed for this page; existing display settings were preserved.';}catch{button.title='Spacing changed for this page; storage is unavailable.';}paint();},{signal});
 }
 const menu=root.querySelector('.ui-mobile-sections');if(menu){const summary=menu.querySelector('summary'),breakpoint=root.defaultView.matchMedia('(max-width:700px)');const syncMenu=()=>{menu.open=!breakpoint.matches;html.dataset.uiNavigationLayout=breakpoint.matches?'mobile':'desktop';};syncMenu();breakpoint.addEventListener('change',syncMenu,{signal});menu.addEventListener('keydown',e=>{if(breakpoint.matches&&e.key==='Escape'&&menu.open){e.preventDefault();menu.open=false;summary?.focus();}},{signal});root.addEventListener('pointerdown',e=>{if(breakpoint.matches&&menu.open&&!menu.contains(e.target))menu.open=false;},{signal});root.addEventListener('focusin',e=>{if(breakpoint.matches&&menu.open&&!menu.contains(e.target))menu.open=false;},{signal});menu.addEventListener('click',e=>{if(breakpoint.matches&&e.target.closest('a[href]'))menu.open=false;},{signal});}
 html.dataset.uiShellMounted=UI_CONTRACT;
 if(mounted){html.dataset.uiMounted=UI_CONTRACT;html.dataset.uiAdapter=html.dataset.uiSurface==='guide'?'guide-shell':'shell-only';}
 return ()=>abort.abort();
}
