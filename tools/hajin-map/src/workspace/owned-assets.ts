import {stageBasemap} from './basemaps.ts';
import {normalizeRaster,decodeRaster} from '../../../../src/client/raster-editor.mjs';
import {imageInfo,base64FromBytes,bytesFromBase64} from '../../../../src/content/portable.mjs';
import {sha256} from './import.ts';
import {validateJsonTree} from './validation.ts';
export interface EvidenceAsset{id:string;base64:string;width:number;height:number;caption:string}
export interface OwnedGeometry{kind:'route'|'area';vertices:[number,number][];color:string}
const exact=(value:unknown,keys:string[])=>{validateJsonTree(value);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw new Error('Invalid owned asset fields.');};
export function evidenceBytes(asset:EvidenceAsset){
 exact(asset,['id','base64','width','height','caption']);
 if(!/^[a-f0-9]{64}$/.test(asset.id)||typeof asset.base64!=='string'||asset.base64.length>3*1024*1024||typeof asset.caption!=='string'||!asset.caption.trim()||asset.caption.length>200)throw new Error('Invalid screenshot metadata.');
 const bytes=bytesFromBase64(asset.base64),info=imageInfo(bytes);
 if(bytes.length>2*1024*1024||info.mime!=='image/png'||info.width>1600||info.height>1600||info.width!==asset.width||info.height!==asset.height)throw new Error('Screenshot must be a sanitized PNG up to1600px and2MiB.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let offset=8;offset+12<=bytes.length;){const length=view.getUint32(offset),kind=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if(!['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind)||offset+length+12>bytes.length)throw new Error('Screenshot contains invalid metadata.');offset+=length+12;}
 return bytes;
}
export async function stageEvidence(file:File,caption:string,signal?:AbortSignal):Promise<EvidenceAsset>{
 if(!caption.trim()||caption.length>200||file.size<=0||file.size>8*1024*1024)throw new Error('Choose an owned PNG/JPEG/WebP up to8MiB and a caption (1–200 characters).');
 const staged=await stageBasemap(file,'owned',caption,signal,{maxDimension:1600,outputBytes:2*1024*1024});
 const image=await normalizeRaster(new Uint8Array(await staged.blob.arrayBuffer()),{signal,maxDimension:1600});
 const asset={id:image.sha256,base64:base64FromBytes(image.bytes),width:image.width,height:image.height,caption:caption.trim()};evidenceBytes(asset);return asset;
}
export async function verifyEvidence(asset:EvidenceAsset,signal?:AbortSignal){const bytes=evidenceBytes(asset);if(await sha256(bytes)!==asset.id)throw new Error('Screenshot digest mismatch.');await decodeRaster(bytes,'image/png',signal);}
export function validateGeometry(value:unknown):OwnedGeometry{
 exact(value,['kind','vertices','color']);const g=value as OwnedGeometry;
 if(!['route','area'].includes(g.kind)||!/^#[a-f0-9]{6}$/i.test(g.color)||!Array.isArray(g.vertices)||g.vertices.length<(g.kind==='area'?3:2)||g.vertices.length>200||g.vertices.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>4096)))throw new Error('Route/area needs bounded in-map vertices (2–200 /3–200) and a hex color.');
 if(new Set(g.vertices.map(v=>v.join(','))).size<(g.kind==='area'?3:2))throw new Error('Use distinct geometry vertices.');
 if(g.kind==='area'){const a=g.vertices[0],b=g.vertices.find(v=>v[0]!==a[0]||v[1]!==a[1])!;const noncollinear=g.vertices.some(c=>Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>.001);if(!noncollinear)throw new Error('Area vertices must not all lie on one line.');}
 return structuredClone(g);
}
export function parseVertices(text:string):[number,number][]{if(text.length>8000)throw new Error('Vertex input is too long.');return text.trim().split(/\n/).filter(s=>s.trim()).map(line=>{const m=/^\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*$/.exec(line);if(!m)throw new Error('Use one X,Y vertex per line.');return[Number(m[1]),Number(m[2])];});}
export function geometryAnchor(g:OwnedGeometry){return{x:g.vertices.reduce((n,v)=>n+v[0],0)/g.vertices.length,y:g.vertices.reduce((n,v)=>n+v[1],0)/g.vertices.length};}
export function geometryLength(g:OwnedGeometry){let length=0;for(let i=1;i<g.vertices.length;i++)length+=Math.hypot(g.vertices[i][0]-g.vertices[i-1][0],g.vertices[i][1]-g.vertices[i-1][1]);if(g.kind==='area')length+=Math.hypot(g.vertices[0][0]-g.vertices.at(-1)![0],g.vertices[0][1]-g.vertices.at(-1)![1]);return length;}
export function validObservedDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
