import { el, input, select, field, note, button, download, errorText } from './dom.ts';
import { iconTemplates, iconFrames, iconSymbols, validateIconDesign, iconSVG, iconSVGURL, type IconDesign } from './icon-design.ts';
import { stageDesignedIcon } from './icons.ts';
import type { IconAsset } from './model.ts';
import type { UIServices } from './ui-context.ts';

const filename=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'map-icon';
export function downloadIconPNG(icon:IconAsset){
  const link=el('a');link.href=`data:image/png;base64,${icon.base64}`;link.download=filename(icon.description)+'.png';link.click();
}
export function downloadIconSVG(design:IconDesign,description:string){download(filename(description)+'.svg',iconSVG(design,description),'image/svg+xml');}

export function createIconStudio(h:Pick<UIServices,'process'|'error'|'notice'> & {
  starters?:{description:string;design:IconDesign}[];
  dirty:()=>void;
  save:(design:IconDesign,description:string)=>Promise<void>;
}){
  const root=el('section',undefined,'icon-studio');root.id='icon-studio';root.setAttribute('aria-labelledby','icon-studio-title');
  const title=el('h3','Create SVG icon');title.id='icon-studio-title';
  const intro=note('Choose a starter, then customize it. Save to use on your map, or download SVG / PNG. A short label replaces the symbol.');
  const starters=el('div',undefined,'icon-starters');starters.setAttribute('aria-label','Icon starters');
  const controls=el('div',undefined,'icon-design-controls');
  const description=input('General marker');description.id='icon-design-description';description.required=true;
  const frame=select(iconFrames.map(value=>({value,label:value==='none'?'No frame (transparent)':value[0].toUpperCase()+value.slice(1)})));
  frame.id='icon-design-frame';
  const symbol=select(iconSymbols.map(value=>({value,label:value[0].toUpperCase()+value.slice(1)})));symbol.id='icon-design-symbol';
  const label=input('', 'text',3);label.id='icon-design-label';label.pattern='[a-zA-Z0-9]{0,3}';
  const background=input('#344a35','color'),foreground=input('#ffffff','color'),border=input('#d4de9b','color');
  background.id='icon-design-background';foreground.id='icon-design-foreground';border.id='icon-design-border';
  const numeric=(id:string,min:number,max:number,value:number)=>{const n=input(String(value),'number');n.id=id;n.min=String(min);n.max=String(max);n.step='1';return n;};
  const borderWidth=numeric('icon-design-border-width',0,4,2),size=numeric('icon-design-symbol-size',16,32,24),rotation=numeric('icon-design-rotation',0,359,0);
  controls.append(field('Accessible description',description),field('Marker frame',frame),field('Symbol',symbol),field('Short label (optional, 1–3 letters/numbers)',label),field('Frame color',background),field('Symbol / label color',foreground),field('Border color',border),field('Border width (0–4)',borderWidth),field('Symbol size (16–32)',size),field('Rotation in degrees (0–359)',rotation));
  const previews=el('div',undefined,'icon-design-previews');
  const images:HTMLImageElement[]=[];
  for(const [caption,cls,dimension] of [['Enlarged','large',128],['Map size · dark','dark',32],['Map size · light','light',32]] as const){
    const box=el('figure',undefined,`icon-design-preview ${cls}`),image=el('img');image.width=image.height=dimension;
    images.push(image);box.append(image,el('figcaption',caption));previews.append(box);
  }
  const status=note('');status.id='icon-design-status';status.setAttribute('role','status');
  const actions=el('div',undefined,'icon-design-actions');
  const read=()=>{
    const design=validateIconDesign({version:1,frame:frame.value,symbol:symbol.value,background:background.value,foreground:foreground.value,border:border.value,borderWidth:borderWidth.valueAsNumber,symbolSize:size.valueAsNumber,rotation:rotation.valueAsNumber,label:label.value});
    iconSVG(design,description.value);return {design,description:description.value.trim()};
  };
  const save=button('Save icon to library',async()=>{try{const v=read();await h.save(v.design,v.description);}catch(error){h.error(error);}},'save-designed-icon');
  const svg=button('Download SVG',()=>{const v=read();downloadIconSVG(v.design,v.description);h.notice('SVG download started.');},'download-designed-svg');
  const png=button('Download PNG',async()=>{try{const v=read();const icon=await h.process(signal=>stageDesignedIcon(v.design,v.description,signal));downloadIconPNG(icon);h.notice('PNG download started.');}catch(error){h.error(error);}},'download-designed-png');
  actions.append(save,svg,png);
  const preview=()=>{
    try{const v=read(),url=iconSVGURL(v.design,v.description);for(const image of images){image.src=url;image.alt=v.description;}status.textContent='Preview ready · transparent outside the frame';for(const b of [save,svg,png])b.disabled=false;}
    catch(error){status.textContent=errorText(error);for(const image of images){image.removeAttribute('src');image.alt='Invalid design: preview unavailable';}for(const b of [save,svg,png])b.disabled=true;}
  };
  const historyControls=[description,frame,symbol,label,background,foreground,border,borderWidth,size,rotation];
  const snapshot=()=>historyControls.map(n=>n.value.slice(0,256));
  let history:string[][]=[snapshot()],cursor=0;
  const undo=button('Undo design change',()=>restore(cursor-1),'undo-icon-design'),redo=button('Redo design change',()=>restore(cursor+1),'redo-icon-design');
  const historyState=()=>{undo.disabled=cursor<=0;redo.disabled=cursor>=history.length-1;};
  function restore(next:number){if(next<0||next>=history.length)return;cursor=next;historyControls.forEach((n,i)=>n.value=history[cursor][i]);preview();h.dirty();historyState();}
  const remember=()=>{const next=snapshot();if(JSON.stringify(next)!==JSON.stringify(history[cursor])){history=history.slice(0,cursor+1);history.push(next);if(history.length>50)history.shift();cursor=history.length-1;}historyState();};
  const load=(value:IconDesign,name:string,record=false)=>{
    const d=validateIconDesign(value);description.value=name;frame.value=d.frame;symbol.value=d.symbol;label.value=d.label;background.value=d.background;foreground.value=d.foreground;border.value=d.border;borderWidth.value=String(d.borderWidth);size.value=String(d.symbolSize);rotation.value=String(d.rotation);preview();if(record)remember();else{history=[snapshot()];cursor=0;historyState();}
  };
  for(const template of iconTemplates){const b=button(template.name,()=>{load(template.design,template.name+' marker',true);h.dirty();});b.dataset.iconTemplate=template.id;const img=el('img');img.src=iconSVGURL(template.design,template.name);img.alt='';img.width=img.height=32;b.prepend(img);starters.append(b);}
  controls.addEventListener('input',()=>{h.dirty();preview();remember();});controls.addEventListener('change',()=>{h.dirty();preview();remember();});
  const savedStarters=el('details');savedStarters.append(el('summary','My saved design starters'));
  for(const starter of h.starters??[])savedStarters.append(button(starter.description,()=>{load(starter.design,starter.description,true);h.dirty();}));
  actions.append(undo,redo);historyState();
  root.append(title,intro,starters,savedStarters,note('Choosing a starter replaces the current design settings.'),previews,status,controls,actions);
  preview();
  return {root,load};
}
