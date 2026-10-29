import {validateIconDesign,type IconDesign} from './icon-design.ts';
import {validateJsonTree} from './validation.ts';
import type {IconAsset} from './model.ts';
export interface IconPack{kind:'dmz-icon-design-pack';version:1;entries:{description:string;design:IconDesign}[]}
export function parseIconPack(value:unknown):IconPack{
 validateJsonTree(value);const p=value as IconPack;
 if(!p||typeof p!=='object'||Object.keys(p).sort().join(',')!=='entries,kind,version'||p.kind!=='dmz-icon-design-pack'||p.version!==1||!Array.isArray(p.entries)||p.entries.length<1||p.entries.length>32)throw new Error('Invalid icon design pack (1–32 editable recipes).');
 if(new TextEncoder().encode(JSON.stringify(p)).length>256*1024)throw new Error('Icon pack exceeds256KiB.');
 return{kind:'dmz-icon-design-pack',version:1,entries:p.entries.map(e=>{if(!e||typeof e!=='object'||Object.keys(e).sort().join(',')!=='description,design'||typeof e.description!=='string'||!e.description.trim()||e.description.length>200)throw new Error('Invalid icon pack entry.');return{description:e.description.trim(),design:validateIconDesign(e.design)};})};
}
export function exportIconPack(icons:IconAsset[]):IconPack{return parseIconPack({kind:'dmz-icon-design-pack',version:1,entries:icons.filter(i=>i.design).map(i=>({description:i.description,design:i.design}))});}
