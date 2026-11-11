import {boundedBytes} from '../map/bounded-input.ts';

export type SharedKind='exfil'|'ammo'|'safe'|'bounty'|'spawn'|'key';
export type SharedIcons=Partial<Record<SharedKind,string>>;
const rules:Record<SharedKind,{source:string;category:string}>={
  exfil:{source:'official',category:'dmz_exfil'},
  ammo:{source:'official',category:'dmz_ammoCache'},
  safe:{source:'codcentral',category:'safe'},
  bounty:{source:'codcentral',category:'bounty'},
  spawn:{source:'mapgenie',category:'mapgenie-28409'},
  key:{source:'codcentral',category:'key'},
};
const hubKinds:Record<string,SharedKind>={exfiltration:'exfil','emergency-exfil':'exfil','ammo-armor-cache':'ammo',safe:'safe','bounty-terminal':'bounty','player-s-spawn':'spawn'};
const codKinds:Record<string,SharedKind>={exfil:'exfil',ammo:'ammo',bounty:'bounty',spawn:'spawn',key:'key'};
export const hubSharedIcon=(slug:string,icons:SharedIcons)=>hubKinds[slug]?icons[hubKinds[slug]]:undefined;
export const codSharedIcon=(layer:string,icons:SharedIcons)=>codKinds[layer]?icons[codKinds[layer]]:undefined;

type Capture={id:string;generation:string;snapshot:string;iconDirectory:string};
function validCapture(input:unknown,id:string):Capture|null{
  const row=input as Capture;
  if(!row||row.id!==id||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(row.generation))return null;
  const base=`/maps/hajin/captures/${row.generation}/${id}/`;
  return row.snapshot===base+'markers.json'&&row.iconDirectory===base+'icons/'?row:null;
}
async function readJson(path:string,limit:number,fetcher:typeof fetch):Promise<any>{
  const response=await fetcher(path,{cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw Error(`Local icon source ${response.status}`);
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(response,limit)));
}
export async function loadSharedHajinIcons(fetcher:typeof fetch=fetch):Promise<SharedIcons>{
  try{
    const pointer=await readJson('/maps/hajin/current-captures.local.json',32768,fetcher);
    if(pointer?.version!==1||!Array.isArray(pointer.sources)||pointer.sources.length>5)return {};
    const result:SharedIcons={};
    for(const id of ['official','codcentral','mapgenie']){
      const source=validCapture(pointer.sources.find((row:Capture)=>row?.id===id),id);
      if(!source)continue;
      try{
        const snapshot=await readJson(source.snapshot,262144,fetcher);
        if(!Array.isArray(snapshot?.categories)||snapshot.categories.length>100)continue;
        for(const [kind,rule] of Object.entries(rules) as [SharedKind,typeof rules[SharedKind]][]){
          if(rule.source!==id)continue;
          const category=snapshot.categories.find((row:{id:string})=>row?.id===rule.category),icon=category?.icon;
          if(typeof icon==='string'&&icon.startsWith(source.iconDirectory)&&/^[-a-zA-Z0-9_.]+\.(?:png|webp|svg)$/.test(icon.slice(source.iconDirectory.length)))result[kind]=icon;
        }
      }catch{/* Keep the source-specific X01 symbol if a local Hajin capture is unavailable. */}
    }
    return result;
  }catch{return {};}
}
export function sharedPin(url:string,fallback:{url?:string;text:string}){
  const pin=document.createElement('span');pin.className='x01-shared-pin';const image=document.createElement('img');image.src=url;image.alt='';image.width=20;image.height=20;image.onerror=()=>{if(fallback.url&&image.src!==new URL(fallback.url,location.href).href){image.src=fallback.url;return;}image.hidden=true;pin.textContent=fallback.text;};pin.append(image);return pin;
}
export function sharedKeyIcon(url:string,fallbackUrl?:string){const image=document.createElement('img');image.src=url;image.alt='';image.className='x01-shared-key-icon';image.width=20;image.height=20;image.onerror=()=>{if(fallbackUrl&&image.src!==new URL(fallbackUrl,location.href).href){image.src=fallbackUrl;return;}image.remove();};return image;}
