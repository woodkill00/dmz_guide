import { validateJsonTree } from './validation.ts';

export const iconFrames = ['pin','circle','square','diamond','shield','none'] as const;
export const iconSymbols = ['target','crate','medical','warning','star','exit','house','key','flag','vehicle','radio','tools'] as const;
export interface IconDesign {
  version: 1;
  frame: typeof iconFrames[number];
  symbol: typeof iconSymbols[number];
  background: string;
  foreground: string;
  border: string;
  borderWidth: number;
  symbolSize: number;
  rotation: number;
  label: string;
}
const keys = ['version','frame','symbol','background','foreground','border','borderWidth','symbolSize','rotation','label'];
export function validateIconDesign(value: unknown): IconDesign {
  validateJsonTree(value);
  const d=value as IconDesign;
  if(!d || typeof d!=='object' || Array.isArray(d) || Object.keys(d).length!==keys.length || keys.some(k=>!Object.hasOwn(d,k)) ||
    d.version!==1 || !iconFrames.includes(d.frame) || !iconSymbols.includes(d.symbol) ||
    ![d.background,d.foreground,d.border].every(c=>typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c)) ||
    !Number.isInteger(d.borderWidth)||d.borderWidth<0||d.borderWidth>4 ||
    !Number.isInteger(d.symbolSize)||d.symbolSize<16||d.symbolSize>32 ||
    !Number.isInteger(d.rotation)||d.rotation<0||d.rotation>359 ||
    typeof d.label!=='string'||!/^([a-zA-Z0-9]{1,3})?$/.test(d.label))
    throw new Error('Invalid icon design. Use supported shapes, hex colors, bounded sizes and an optional 1–3 letter/number label.');
  return {...d};
}
const base:IconDesign={version:1,frame:'pin',symbol:'target',background:'#344a35',foreground:'#ffffff',border:'#d4de9b',borderWidth:2,symbolSize:24,rotation:0,label:''};
export const iconTemplates:readonly {id:string;name:string;design:IconDesign}[]=[
  {id:'general',name:'General marker',design:{...base}},
  {id:'loot',name:'Loot cache',design:{...base,frame:'square',symbol:'crate',background:'#755417',border:'#ffdb83'}},
  {id:'medical',name:'Medical',design:{...base,frame:'circle',symbol:'medical',background:'#177261',border:'#a2f4cf'}},
  {id:'danger',name:'Danger',design:{...base,frame:'diamond',symbol:'warning',background:'#8a302d',border:'#ffbb94'}},
  {id:'objective',name:'Objective',design:{...base,frame:'shield',symbol:'star',background:'#324f83',border:'#a4d5ff'}},
  {id:'extraction',name:'Extraction',design:{...base,symbol:'exit',background:'#57512b',border:'#f3edb3'}},
];
// Original primitives. No imported paths, markup, scripts, URLs, fonts or third-party artwork.
const symbols:Record<IconDesign['symbol'],string>={
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
 crate:'<rect x="3" y="5" width="18" height="15" rx="1"/><path d="M3 10h18M9 5v15m6-15v15M6 2h12v3"/>',
 medical:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
 warning:'<path d="M12 2 23 21H1Z M12 8v6m0 3v1"/>',
 star:'<path d="m12 1 3.3 6.8 7.5 1.1-5.4 5.3 1.3 7.5-6.7-3.5-6.7 3.5 1.3-7.5L1.2 8.9l7.5-1.1Z"/>',
 exit:'<path d="M10 3H3v18h7m3-14 6 5-6 5m-6-5h16"/>',
 house:'<path d="M1 11 12 2l11 9M4 9v13h16V9M9 22v-8h6v8"/>',
 key:'<circle cx="7" cy="7" r="5"/><path d="m11 11 11 11m-7-7 3-3m0 6 3-3"/>',
 flag:'<path d="M4 22V2m0 1h16l-4 5 4 5H4"/>',
 vehicle:'<path d="m4 9 2-6h12l2 6M2 10h20v9H2Z M5 19v3m14-3v3M5 14h3m8 0h3"/>',
 radio:'<rect x="5" y="8" width="14" height="14" rx="2"/><path d="M8 8V1m1 11h6m-6 4h6m-6 3h6M14 2q6 0 8 6m-8-2q3 0 4 3"/>',
 tools:'<path d="m3 3 5 2 2 5-3 3-5-2-1-5 4 4 3-3Zm7 10 11 8-3 2-10-10m8-12 5 5-9 9-5-5Z"/>',
};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function iconSVG(value:unknown,description:string):string {
  const d=validateIconDesign(value);
  if(typeof description!=='string'||!description.trim()||description.length>200)throw new Error('Provide an accessible icon description (1–200 characters).');
  const frame={pin:'<path d="M32 61C26 51 10 40 10 25a22 22 0 1 1 44 0c0 15-16 26-22 36Z"/>',circle:'<circle cx="32" cy="32" r="28"/>',square:'<rect x="4" y="4" width="56" height="56" rx="10"/>',diamond:'<path d="m32 3 29 29-29 29L3 32Z"/>',shield:'<path d="M32 3 57 12v18c0 14-13 24-25 31C20 54 7 44 7 30V12Z"/>',none:''}[d.frame];
  const cy=d.frame==='pin'?25:32;
  const glyph=d.label?`<text x="12" y="12" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${d.label.length===3?11:16}" fill="${d.foreground}" stroke="none">${escape(d.label)}</text>`:symbols[d.symbol];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 64 64" role="img" aria-labelledby="icon-title"><title id="icon-title">${escape(description.trim())}</title><g fill="${d.background}" stroke="${d.border}" stroke-width="${d.borderWidth}" stroke-linejoin="round">${frame}</g><g transform="translate(32 ${cy}) rotate(${d.rotation}) scale(${d.symbolSize/24}) translate(-12 -12)" fill="none" stroke="${d.foreground}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
}
export const iconSVGURL=(design:IconDesign,description:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSVG(design,description))}`;

/** Only accepts generated recipes, never raw SVG. Cancellation/deadline release the decoder. */
export function designedPNG(design:IconDesign,description:string,signal?:AbortSignal):Promise<Blob>{
  const svg=iconSVG(design,description);
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('Icon creation cancelled.'));return;}
    const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    let finished=false;
    const finish=(error?:Error,blob?:Blob)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);image.onload=image.onerror=null;image.src='';URL.revokeObjectURL(url);if(error)reject(error);else resolve(blob!);};
    const cancel=()=>finish(new Error('Icon creation cancelled.'));
    const timer=setTimeout(()=>finish(new Error('Icon creation timed out. Try again.')),10000);
    signal?.addEventListener('abort',cancel,{once:true});
    image.onerror=()=>finish(new Error('Unable to render this icon.'));
    image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable.');ctx.drawImage(image,0,0,256,256);canvas.toBlob(blob=>blob?finish(undefined,blob):finish(new Error('Unable to encode icon.')),'image/png');}catch(error){finish(error instanceof Error?error:new Error('Unable to render icon.'));}};
    image.src=url;
  });
}
