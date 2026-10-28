import type { ExplorerRecord } from './explorer-index.ts';
import { asDisplay } from './explorer-index.ts';
import { displayDuplicates } from '../map/display-duplicates.ts';
import { gridGeometry, gridReferenceAt } from '../map/tactical-grid.ts';
export interface SearchOrigin {x:number;y:number;label:string}
export interface SearchOptions {
 query:string;sources:string[]|null;category:string;kind:string;floor:string;build:string;
 visibility:'all'|'visible'|'hidden';placement:'all'|'placed'|'unplaced';verification:string;
 sort:'relevance'|'nearest'|'name';origin:SearchOrigin|null;radius:number|null;group:boolean;approximate:boolean;
}
export const defaultSearchOptions=():SearchOptions=>({query:'',sources:null,category:'',kind:'',floor:'',build:'',visibility:'all',placement:'all',verification:'',sort:'relevance',origin:null,radius:null,group:true,approximate:true});
export const normalized=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const cells=new Map(gridGeometry().cells.map(c=>[c.reference,c.center]));
export function searchOrigin(value:string):SearchOrigin{
 const label=value.trim().toUpperCase(),cell=cells.get(label);
 if(cell)return {...cell,label};
 const match=/^(\d{1,4}(?:\.\d{1,2})?)\s*,\s*(\d{1,4}(?:\.\d{1,2})?)$/.exec(value.trim());
 if(match){const x=Number(match[1]),y=Number(match[2]);if(x<=4096&&y<=4096)return{x,y,label:`X ${x}, Y ${y}`};}
 throw new Error('Enter a grid cell A1–J9 or image coordinates X,Y between 0 and 4096.');
}
const operators=new Set(['source','category','kind','floor','build','has','is','near','grid']);
export function parseSearch(query:string){
 if(query.length>256)throw new Error('Search is limited to256 characters.');
 if(/^\d{1,4}(?:\.\d{1,2})?\s*,\s*\d{1,4}(?:\.\d{1,2})?$/.test(query.trim()))return{text:[],fields:[],origin:searchOrigin(query),grid:null};
 const tokens:string[]=[];let token='',quoted=false;
 for(const c of query){if(c==='"'){quoted=!quoted;continue;}if(/\s/u.test(c)&&!quoted){if(token){tokens.push(token);token='';}}else token+=c;}
 if(quoted)throw new Error('Close the quoted search phrase.');if(token)tokens.push(token);
 if(tokens.length>8)throw new Error('Use at most8 search terms/operators; use the filters to narrow further.');
 const text:string[]=[],fields:{field:string;value:string}[]=[];let origin:SearchOrigin|null=null,grid:string|null=null;
 for(const t of tokens){
  const colon=t.indexOf(':');
  if(colon>0){const field=t.slice(0,colon).toLowerCase(),value=t.slice(colon+1);if(!operators.has(field)||!value.trim())throw new Error('Unknown or empty search operator. Use source/category/kind/floor/build/has/is/near/grid.');
   if(field==='near'||field==='grid'){if(origin)throw new Error('Use only one near/grid origin.');origin=searchOrigin(value);if(field==='grid'){if(!cells.has(value.toUpperCase()))throw new Error('grid: needs a cell A1–J9.');grid=value.toUpperCase();}}
   else{const enumValue=normalized(value);if(field==='has'&&!['notes','location'].includes(enumValue))throw new Error('Use has:notes or has:location.');if(field==='is'&&!['visible','hidden','observed','unverified'].includes(enumValue))throw new Error('Use is:visible, hidden, observed or unverified.');fields.push({field,value:normalized(value)});}
  }else if(tokens.length===1&&cells.has(t.toUpperCase())){grid=t.toUpperCase();origin=searchOrigin(t);}
  else if(tokens.length===1&&/^\d.*,.*/.test(t)){origin=searchOrigin(t);}
  else{const n=normalized(t);if(n)text.push(n);}
 }
 return{text,fields,origin,grid};
}
interface Indexed {record:ExplorerRecord;title:string;category:string;source:string;notes:string;all:string;words:string[]}
export function buildSearchIndex(records:ExplorerRecord[]):Indexed[]{
 if(records.length>30000||records.filter(r=>r.kind==='source').length>20000||records.filter(r=>r.kind==='custom').length>5000||records.filter(r=>r.kind==='reviewed').length>5000)throw new Error('Search input exceeds workspace limits.');
 return records.map(record=>{const title=normalized(record.title),category=normalized(record.category),source=normalized(record.sourceName+' '+record.sourceId),notes=normalized(record.notes);return{record,title,category,source,notes,all:`${title} ${category} ${source} ${notes}`,words:title.split(' ').filter(w=>w.length>=4).slice(0,12)};});
}
// At most one insertion/deletion/substitution/transposition, with a fixed comparison budget.
function closeWord(a:string,b:string){
 if(a.length<4||Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const bad:number[]=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i]){bad.push(i);if(bad.length>2)return false;}return bad.length<=1||bad.length===2&&bad[1]===bad[0]+1&&a[bad[0]]===b[bad[1]]&&a[bad[1]]===b[bad[0]];}
 const small=a.length<b.length?a:b,big=a.length<b.length?b:a;let i=0,j=0,miss=0;while(i<small.length&&j<big.length){if(small[i]===big[j]){i++;j++;}else{miss++;j++;if(miss>1)return false;}}return true;
}
export interface SearchHit {record:ExplorerRecord;score:number;distance:number|null;grid:string|null;copies:ExplorerRecord[];approximate:boolean}
export function searchIndex(index:Indexed[],options:SearchOptions,separate:readonly {a:string;b:string}[]=[]){
 const parsed=parseSearch(options.query),origin=parsed.origin??options.origin;
 if(origin&&![origin.x,origin.y].every(n=>Number.isFinite(n)&&n>=0&&n<=4096))throw new Error('Search origin is outside the map.');
 if(options.radius!==null&&(!Number.isFinite(options.radius)||options.radius<0||options.radius>6000))throw new Error('Radius must be between0 and6000 image pixels.');
 if((options.sort==='nearest'||options.radius!==null)&&!origin)throw new Error('Choose an origin for nearest/radius search.');
 const verification=(r:ExplorerRecord,value:string)=>(r.kind==='source'?['unverified']:normalized(r.status).split(' ')).includes(value);
 const hits:SearchHit[]=[];let fuzzyWork=0,fuzzyLimited=false;
 for(const item of index){const r=item.record,placed=r.x!==null&&r.y!==null;
  if(options.sources!==null&&!options.sources.includes(r.sourceId)||options.category&&normalized(r.category)!==normalized(options.category)||options.kind&&r.kind!==options.kind||options.floor&&normalized(r.floor??'')!==normalized(options.floor)||options.build&&normalized(r.build??'')!==normalized(options.build)||options.visibility==='visible'&&!r.visible||options.visibility==='hidden'&&r.visible||options.placement==='placed'&&!placed||options.placement==='unplaced'&&placed||options.verification&&!verification(r,options.verification))continue;
  const grid=placed?gridReferenceAt(r.x!,r.y!):null;
  if(parsed.grid&&grid!==parsed.grid)continue;
  const distance=placed&&origin?Math.hypot(r.x!-origin.x,r.y!-origin.y):null;
  if(options.radius!==null&&(distance===null||distance>options.radius))continue;
  if(parsed.fields.some(({field,value})=>field==='source'?!item.source.includes(value):field==='category'?!item.category.includes(value):field==='kind'?normalized(r.kind)!==value:field==='floor'?normalized(r.floor??'')!==value:field==='build'?normalized(r.build??'')!==value:field==='has'?value==='notes'?!item.notes:!placed:field==='is'?value==='visible'?!r.visible:value==='hidden'?r.visible:!verification(r,value):false))continue;
  let score=0,approximate=false,matched=true;
  for(const term of parsed.text){if(item.title===term)score+=120;else if(item.title.startsWith(term))score+=90;else if(item.title.includes(term))score+=70;else if(item.category.includes(term))score+=45;else if(item.source.includes(term))score+=30;else if(item.notes.includes(term))score+=20;else{
    let close=false;if(options.approximate&&term.length<=64){for(const word of item.words){if(++fuzzyWork>20000){fuzzyLimited=true;break;}if(closeWord(term,word)){close=true;break;}}}
    if(!close){matched=false;break;}approximate=true;score+=5;
  }}
  if(matched)hits.push({record:r,score,distance,grid,copies:[],approximate});
 }
 const rawCount=hits.length;let matchingLimited=false;
 if(options.group){const sources=hits.map(h=>asDisplay(h.record)).filter((v):v is NonNullable<typeof v>=>!!v),plan=displayDuplicates(sources,false,separate);matchingLimited=plan.truncated;
  const byKey=new Map(hits.map(h=>[h.record.key,h]));for(const group of plan.groups){const hit=byKey.get(group.representative.key);if(hit)hit.copies=group.members.filter(r=>r.key!==hit.record.key).map(r=>byKey.get(r.key)!.record);}
  const hidden=new Set(plan.groups.flatMap(g=>g.members.filter(m=>m.key!==g.representative.key).map(m=>m.key)));
  let keep=0;for(const hit of hits)if(!hidden.has(hit.record.key))hits[keep++]=hit;hits.length=keep;
 }
 const nearest=options.sort==='nearest'||!!parsed.origin&&options.sort==='relevance';
 hits.sort((a,b)=>(nearest?(a.distance??Infinity)-(b.distance??Infinity):options.sort==='relevance'?b.score-a.score:0)||a.record.title.localeCompare(b.record.title,'en')||a.record.sourceId.localeCompare(b.record.sourceId,'en')||a.record.key.localeCompare(b.record.key,'en'));
 return{hits,rawCount,origin,grid:parsed.grid,fuzzyLimited,matchingLimited};
}
