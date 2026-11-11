import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const site='https://dmzhub.gg/maps/x01-black-site';
const api='https://api.dmzhub.gg/api/v2/maps/x01-black-site';
const surfaces=['x01-1st-v1-wm','x01-2nd-v1-wm'];
const rawDir=new URL('../../../.local/x01-dmzhub/',import.meta.url);
const assetsDir=new URL('../public/maps/x01/dmzhub/',import.meta.url);
const captureAssets=process.argv.includes('--assets');
const webp=(bytes)=>bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
const fail=(message)=>{throw new Error(message)};
let browser;
try{
  browser=await chromium.launch({headless:false,channel:'msedge'});
  const page=await browser.newPage();
  const first=page.waitForResponse(response=>response.url().startsWith(api)&&response.status()===200,{timeout:30000});
  const pageResponse=await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  if(pageResponse?.status()!==200)fail(`DMZHub page returned ${pageResponse?.status()}; no capture was written`);
  await first;
  const fetchJson=async url=>{
    const result=await page.evaluate(async target=>{const response=await fetch(target);return {status:response.status,body:await response.text()};},url);
    if(result.status!==200||result.body.length>2_000_000)fail(`Unexpected response from ${url}: ${result.status}`);
    return JSON.parse(result.body);
  };
  const metadata=await fetchJson(api);
  if(metadata?.data?.map?.slug!=='x01-black-site'||metadata.data.revision?.slug!=='x01-v1-wm'||metadata.data.surfaces?.length!==2)fail('Unexpected X01 map metadata');
  const categories=metadata.data.layers.flatMap(layer=>layer.categories.map(category=>({id:category.id,slug:category.slug,name:category.name,layer:layer.slug,iconUrl:category.icon_url||category.presentation?.icon_url||null,renderer:category.renderer_type})));
  if(categories.length<10||categories.length>100||new Set(categories.map(row=>row.id)).size!==categories.length)fail('Unexpected category catalog');
  for(const category of categories)if(!Number.isInteger(category.id)||!/^[-a-z0-9]{1,80}$/.test(category.slug)||!/^[-a-z0-9]{1,80}$/.test(category.layer)||typeof category.name!=='string'||category.name.length>100||/[<>\u0000-\u001f]/.test(category.name)||!['marker','line','circle','label'].includes(category.renderer))fail('Invalid category metadata');
  const categoryIds=new Set(categories.map(row=>row.id));
  const floors=[];
  for(let index=0;index<2;index++){
    const surface=metadata.data.surfaces.find(row=>row.slug===surfaces[index]);
    const frame=surface?.grid?.frame;
    if(!surface||surface.floor_number!==index+1||surface.tile_set?.manifest?.image?.width!==4096||surface.tile_set?.manifest?.image?.height!==4096||surface.tile_set?.manifest?.tiles?.tile_size!==512||!frame||![frame.x,frame.y,frame.width,frame.height].every(value=>Number.isFinite(value)&&value>=0&&value<=1)||frame.x+frame.width>1||frame.y+frame.height>1)fail('Unexpected floor frame');
    const url=`${api}/features?revision=x01-v1-wm&surface=${surfaces[index]}&min_x=0&min_y=0&max_x=1&max_y=1`;
    const payload=await fetchJson(url);
    if(payload.meta?.truncated!==false||!Array.isArray(payload.data)||payload.data.length<1||payload.data.length>500)fail('Incomplete or oversized floor feed');
    for(const row of payload.data){if(!Number.isInteger(row.id)||!categoryIds.has(row.category_id)||!Number.isFinite(row.x)||!Number.isFinite(row.y)||row.x<0||row.x>1||row.y<0||row.y>1||!['Point','LineString'].includes(row.geometry?.type)||!(row.geometry.type==='Point'?Array.isArray(row.geometry.coordinates)&&Math.abs(row.geometry.coordinates[0]-row.x)<=1e-8&&Math.abs(row.geometry.coordinates[1]-row.y)<=1e-8:Array.isArray(row.geometry.coordinates)&&row.geometry.coordinates.length>=2&&row.geometry.coordinates.length<=100&&row.geometry.coordinates.every(point=>Array.isArray(point)&&point.length===2&&point.every(value=>Number.isFinite(value)&&value>=0&&value<=1)))||row.title!=null&&(typeof row.title!=='string'||row.title.length>120||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(row.title))||row.presentation?.renderer&&!['marker','label'].includes(row.presentation.renderer))fail(`Invalid feature ${row.id}`);}
    const expected=Object.values(surface.counts).reduce((sum,value)=>sum+value,0);
    if(payload.data.length!==expected)fail(`Floor ${index+1} feed count ${payload.data.length} differs from metadata ${expected}`);
    floors.push({id:index+1,slug:surface.slug,name:surface.name,grid:surface.grid,features:payload.data});
  }
  const iconUrls=[...new Set([...categories.map(row=>row.iconUrl),...floors.flatMap(floor=>floor.features.map(row=>row.presentation?.icon_url))].filter(Boolean))];
  for(const url of iconUrls)if(!/^https:\/\/cdn\.dmzhub\.gg\/storage\/map-icons\/[a-z0-9-]{1,80}\.webp$/.test(url))fail(`Unexpected icon URL: ${url}`);
  const iconFile=url=>url?.split('/').at(-1)||null;
  const snapshot={schemaVersion:1,mapId:'x01',coordinateVersion:'dmzhub-x01-v1-wm-4096',source:site,apiSource:api,capturedAt:new Date().toISOString(),revision:metadata.data.revision.slug,categories:categories.map(row=>({id:row.id,slug:row.slug,name:row.name,layer:row.layer,renderer:row.renderer,icon:iconFile(row.iconUrl)})),floors:floors.map(floor=>({id:floor.id,slug:floor.slug,name:floor.name,grid:floor.grid})),markers:floors.flatMap(floor=>floor.features.map(row=>({id:`dmzhub-${row.id}`,sourceId:row.id,floor:floor.id,categoryId:row.category_id,title:row.title?.replace(/\s+/g,' ').trim()||null,x:row.x,y:row.y,renderer:row.presentation?.renderer||null,path:row.geometry.type==='LineString'?row.geometry.coordinates:null,icon:iconFile(row.presentation?.icon_url)})))};
  await mkdir(rawDir,{recursive:true});
  await writeFile(new URL('metadata.json',rawDir),JSON.stringify(metadata));
  for(let index=0;index<2;index++)await writeFile(new URL(`floor${index+1}.json`,rawDir),JSON.stringify({data:floors[index].features,meta:{truncated:false}}));
  await writeFile(new URL('snapshot.json',rawDir),JSON.stringify(snapshot,null,2)+'\n');
  if(captureAssets){
    const fetchImage=async url=>{
      const result=await page.evaluate(async target=>{const response=await fetch(target);return {status:response.status,type:response.headers.get('content-type'),bytes:[...new Uint8Array(await response.arrayBuffer())]};},url);
      const bytes=Buffer.from(result.bytes);
      if(result.status!==200||!result.type?.includes('image/webp')||bytes.length>500_000||!webp(bytes))fail(`Invalid WebP: ${url}`);
      return bytes;
    };
    let total=0;
    for(const floor of floors){
      const directory=new URL(`tiles/${floor.slug}/2/`,assetsDir);await mkdir(directory,{recursive:true});
      for(let y=0;y<4;y++)for(let x=0;x<4;x++){
        const url=`https://cdn.dmzhub.gg/storage/map-tiles/dmz-mw4/${floor.slug}/2/${x}/${y}.webp`;
        const bytes=await fetchImage(url);total+=bytes.length;if(total>12_000_000)fail('Asset capture exceeds 12 MB');
        const sub=new URL(`${x}/`,directory);await mkdir(sub,{recursive:true});await writeFile(new URL(`${y}.webp`,sub),bytes);
      }
    }
    const iconDir=new URL('icons/',assetsDir);await mkdir(iconDir,{recursive:true});
    for(const url of iconUrls){const bytes=await fetchImage(url);total+=bytes.length;if(total>12_000_000)fail('Asset capture exceeds 12 MB');await writeFile(new URL(iconFile(url),iconDir),bytes);}
    console.log(`Captured ${32} tiles and ${iconUrls.length} icons (${total} bytes) to ignored local assets`);
  }
  console.log(`Captured DMZHub X01: ${floors.map(floor=>`${floor.name} ${floor.features.length}`).join(', ')}; ${categories.length} categories. Review .local/x01-dmzhub/snapshot.json before updating the checked-in snapshot.`);
}finally{await browser?.close();}
