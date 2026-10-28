import {el,input,select,field,note,button,errorText} from './dom.ts';
import {buildSearchIndex,searchIndex,searchOrigin,defaultSearchOptions,parseSearch,type SearchOrigin,type SearchOptions} from './search.ts';
import type {ExplorerRecord} from './explorer-index.ts';
export interface SearchHost{
 records:()=>ExplorerRecord[];separate:()=>readonly {a:string;b:string}[];
 card:(record:ExplorerRecord)=>HTMLElement;error:(error:unknown)=>void;
 center:()=>SearchOrigin;go:(origin:SearchOrigin)=>void;open:()=>void;allowed:()=>boolean;
}
export function createSearchPanel(h:SearchHost){
 let options=defaultSearchOptions(),page=0,advancedOpen=false,nearOpen=false,originText='',current:HTMLElement|undefined,refresh:(()=>void)|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 const schedule=(work:()=>void)=>{clearTimeout(timer);timer=setTimeout(()=>{if(current?.isConnected)work();},150);};
 const nearby=(r:ExplorerRecord)=>{if(!h.allowed()||r.x===null||r.y===null)return;options={...options,query:'',sort:'nearest',origin:{x:r.x,y:r.y,label:r.title}};originText=`${r.x.toFixed(2)},${r.y.toFixed(2)}`;page=0;clearTimeout(timer);h.open();};
 function render(root:HTMLElement){
  clearTimeout(timer);current=root;
  let records=h.records(),index=buildSearchIndex(records);
  const query=input(options.query,'search',256);query.id='explorer-search';query.setAttribute('aria-label','Find locations across sites and my points');
  const status=note('');status.id='search-results-status';status.setAttribute('role','status');
  const results=el('div');results.id='explorer-results';
  const advanced=el('details',undefined,'search-advanced'),summary=el('summary','Filters, matching and search syntax');advanced.open=advancedOpen;advanced.addEventListener('toggle',()=>{advancedOpen=advanced.open;});advanced.append(summary);
  const controls=el('div',undefined,'search-controls');
  const makeSelect=(label:string,key:'category'|'kind'|'visibility'|'placement'|'verification'|'sort',values:{value:string;label:string}[])=>{const node=select(values,options[key]);node.id='search-'+key;node.dataset.workspaceSearch='true';node.addEventListener('change',()=>{options={...options,[key]:node.value};page=0;show();});controls.append(field(label,node));return node;};
  const category=input(options.category);category.id='search-category';category.dataset.workspaceSearch='true';category.setAttribute('list','search-category-options');
  const suggestions=el('datalist');suggestions.id='search-category-options';for(const name of [...new Set(records.map(r=>r.category))].sort().slice(0,200)){const option=el('option');option.value=name;suggestions.append(option);}
  category.addEventListener('input',()=>{options.category=category.value;page=0;defer();});controls.append(field('Category (exact; blank = any)',category),suggestions);
  makeSelect('Record type','kind',[{value:'',label:'All types'},{value:'source',label:'Website records'},{value:'custom',label:'My points / annotations'},{value:'reviewed',label:'Reviewed locations'}]);
  makeSelect('Map visibility','visibility',[{value:'all',label:'Visible and hidden'},{value:'visible',label:'Currently visible'},{value:'hidden',label:'Currently hidden'}]);
  makeSelect('Location','placement',[{value:'all',label:'Located and reference entries'},{value:'placed',label:'Has map location'},{value:'unplaced',label:'Unplaced / reference entry'}]);
  makeSelect('Verification','verification',[{value:'',label:'Any status'},{value:'observed',label:'Observed'},{value:'unverified',label:'Unverified'},{value:'accepted',label:'Accepted review'},{value:'stale',label:'Stale review'}]);
  for(const [key,label] of [['floor','Floor (exact, blank = any)'],['build','Build (exact, blank = any)']] as const){const node=input(options[key]);node.id='search-'+key;node.dataset.workspaceSearch='true';node.addEventListener('input',()=>{options[key]=node.value;page=0;defer();});controls.append(field(label,node));}
  const sources=el('fieldset');sources.append(el('legend','Search these websites / collections'));
  const names=new Map(records.map(r=>[r.sourceId,r.sourceName]));
  for(const [id,name] of names){const row=el('label',undefined,'search-source-option'),check=input('','checkbox');check.checked=options.sources===null||options.sources.includes(id);check.dataset.workspaceSearch='true';check.addEventListener('change',()=>{const selected=new Set(options.sources??names.keys());check.checked?selected.add(id):selected.delete(id);options.sources=[...selected];page=0;show();});row.append(check,document.createTextNode(name));sources.append(row);}
  for(const [key,label] of [['group','Group matching website copies'],['approximate','Include approximate title matches']] as const){const check=input('','checkbox');check.checked=options[key];check.dataset.workspaceSearch='true';check.id='search-'+key;check.addEventListener('change',()=>{options[key]=check.checked;page=0;show();});controls.append(field(label,check));}
  advanced.append(sources,controls,note('All words must match. Use "quoted phrases" or source:mapgenie category:clinic kind:custom floor:2 has:notes has:location is:hidden. G6 limits results to that cell; near:G6 finds nearby locations. Approximate matches use titles and a bounded comparison budget.'));
  const near=el('details',undefined,'nearby-search'),nearSummary=el('summary','Nearby / grid / coordinates');near.id='search-nearby-options';near.open=nearOpen;near.addEventListener('toggle',()=>{nearOpen=near.open;});near.append(nearSummary);
  const origin=input(originText);origin.id='search-origin';origin.placeholder='G6 or 2048,2048';origin.dataset.workspaceSearch='true';
  const radius=input(options.radius===null?'':String(options.radius),'number');radius.id='search-radius';radius.min='0';radius.max='6000';radius.dataset.workspaceSearch='true';
  const originStatus=note('');originStatus.id='search-origin-status';
  const capture=(point:SearchOrigin)=>{const parsed=parseSearch(options.query);if(parsed.origin){const quoted=(value:string)=>value.includes(' ')?JSON.stringify(value):value;options.query=[...parsed.text.map(quoted),...parsed.fields.map(f=>f.field+':'+quoted(f.value))].join(' ');query.value=options.query;}clearTimeout(timer);options.origin=point;options.sort='nearest';originText=`${point.x.toFixed(2)},${point.y.toFixed(2)}`;origin.value=originText;sort.value='nearest';page=0;show();};
  const sort=select([{value:'relevance',label:'Best text match'},{value:'nearest',label:'Nearest to chosen origin'},{value:'name',label:'Name A–Z'}],options.sort);sort.id='search-sort';sort.dataset.workspaceSearch='true';sort.addEventListener('change',()=>{options.sort=sort.value as SearchOptions['sort'];page=0;show();});
  origin.addEventListener('input',()=>{originText=origin.value;go.hidden=!origin.value.trim()&&!options.origin;});
  radius.addEventListener('input',()=>{options.radius=radius.value===''?null:radius.valueAsNumber;page=0;defer();});
  const go=button('Go to origin / grid',()=>{try{const selected=origin.value.trim()?searchOrigin(origin.value):options.origin;if(!selected)throw new Error('Choose an origin first.');if(h.allowed())h.go(selected);}catch(error){h.error(error);}},'search-go-origin');
  near.append(field('Grid cell or image X,Y',origin),button('Use grid / coordinates',()=>{try{capture(searchOrigin(origin.value));}catch(error){h.error(error);}},'search-use-origin'),button('Use map center',()=>{try{capture(h.center());}catch(error){h.error(error);}},'search-map-center'),field('Radius in image pixels (blank = unlimited)',radius),originStatus);
  function defer(){status.textContent='Searching…';results.setAttribute('aria-busy','true');results.replaceChildren(note('Searching…'));go.disabled=true;schedule(show);}
  function show(){
   results.setAttribute('aria-busy','false');go.disabled=false;
   if(!root.isConnected&&current!==root)return;
   const filterCount=[options.sources!==null,!!options.category,!!options.kind,!!options.floor,!!options.build,options.visibility!=='all',options.placement!=='all',!!options.verification,!options.group,!options.approximate].filter(Boolean).length;
   summary.textContent=`Filters, matching and search syntax · ${filterCount} active`;
   results.replaceChildren();
   try{
    const result=searchIndex(index,options,h.separate());
    nearSummary.textContent=result.origin?`Nearby / grid / coordinates · ${result.origin.label.slice(0,50)}`:"Nearby / grid / coordinates";go.hidden=!result.origin;
    if(result.origin){originStatus.textContent=`Origin: ${result.origin.label} · distance in canonical image pixels`;if(result.grid){origin.value=result.grid;originText=result.grid;}else if(!options.origin&&result.origin){origin.value=`${result.origin.x.toFixed(2)},${result.origin.y.toFixed(2)}`;}}
    else originStatus.textContent='Choose an origin to sort or limit by proximity. This is not live player tracking.';
    page=Math.max(0,Math.min(page,Math.ceil(result.hits.length/50)-1));
    status.textContent=`${result.hits.length} results · ${result.rawCount} matching entries · page ${page+1}/${Math.max(1,Math.ceil(result.hits.length/50))}${result.fuzzyLimited?' · approximate comparison limit reached; narrow the query':''}${result.matchingLimited?' · copy grouping limit reached; evidence retained':''}`;
    if(!result.hits.length)results.append(note('No results match these filters. Try fewer words, a wider radius or another source.'));
    for(const hit of result.hits.slice(page*50,(page+1)*50)){
     const row=h.card(hit.record);row.classList.add('search-result');
     const location=note(`${hit.grid??'No grid cell'}${hit.distance===null?'':` · ${hit.distance.toFixed(1)} px from origin`}${hit.approximate?' · approximate title match':''}`);row.prepend(location);
     if(hit.record.notes)row.append(note('Notes / evidence: '+hit.record.notes.slice(0,220)));
     if(hit.copies.length){const copies=el('details');copies.append(el('summary',`${hit.copies.length} matching source copies`));for(const copy of hit.copies)copies.append(h.card(copy));row.append(copies);}
     results.append(row);
    }
    const prev=button('Previous results',()=>{page--;show();}),next=button('Next results',()=>{page++;show();});prev.disabled=page===0;next.disabled=(page+1)*50>=result.hits.length;results.append(prev,next);
   }catch(error){status.textContent=errorText(error);results.append(note('Correct the search or use Reset search.'));}
  }
  const jumps=()=>[...results.querySelectorAll<HTMLButtonElement>('.search-result > button[data-search-jump]:not(:disabled)')];
  query.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();jumps()[0]?.focus();}});
  results.addEventListener('keydown',event=>{if(!(event.target instanceof HTMLElement)||!event.target.matches('[data-search-jump]')||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const list=jumps(),at=list.indexOf(event.target as HTMLButtonElement);const next=event.key==='Home'?0:event.key==='End'?list.length-1:event.key==='ArrowDown'?Math.min(at+1,list.length-1):Math.max(at-1,0);event.preventDefault();list[next]?.focus();});
  query.dataset.workspaceSearch='true';query.addEventListener('input',()=>{options.query=query.value;page=0;defer();});
  const toolbar=el('div',undefined,'search-main-toolbar');toolbar.append(field('Sort results',sort),button('Reset search',()=>{options=defaultSearchOptions();originText='';advancedOpen=false;nearOpen=false;page=0;clearTimeout(timer);h.open();},'reset-explorer-search'),go);
  root.append(field('Search names, categories, websites, notes and evidence',query),note('Includes hidden layers and references. Select a title or Jump; Nearby searches around it.'),toolbar,near,advanced,status,results);
  refresh=()=>{if(!root.isConnected)return;records=h.records();index=buildSearchIndex(records);show();};show();
 }
 return{render,nearby,refresh:()=>refresh?.(),destroy:()=>{clearTimeout(timer);current=undefined;refresh=undefined;}};
}
