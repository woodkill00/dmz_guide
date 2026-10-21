import {readFile, readdir, mkdir, writeFile, rm, cp, access} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {renderLayout,renderHome,renderCatalog,renderDetail,allRecords,recordUrl,pageHeading,setNavigation,publicTitle} from '../src/ui/render.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=join(root,'dist');
const packs=await Promise.all((await readdir(join(root,'content/packs'))).filter(f=>f.endsWith('.json')).sort().map(async f=>JSON.parse(await readFile(join(root,'content/packs',f),'utf8'))));
const schema=JSON.parse(await readFile(join(root,'schemas/pack.schema.json'),'utf8'));
const {validatePack}=await import('../src/content/validate.mjs');
for(const pack of packs){const result=validatePack(pack,schema);if(result===false||result?.ok===false||result?.valid===false)throw new Error(`Invalid pack ${pack.id}: ${JSON.stringify(result.errors)}`);}
const pages=[{path:'/',title:'Prepare for the next run',body:renderHome(packs),page:'home'}];
for(const [path,title,type] of [['catalog','The catalog',''],['items','Items & resources','item'],['weapons','Weapon reference','weapon'],['recipes','Recipes & crafting','recipe'],['guides','The field manual','guide']])pages.push({path:`/${path}/`,title,body:renderCatalog(packs,{title,type}),page:path==='items'||path==='weapons'?'catalog':path,scripts:['/assets/src/client/catalog.mjs']});
for(const record of allRecords(packs))pages.push({path:recordUrl(record),title:publicTitle(record),body:renderDetail(record,packs),page:({item:'catalog',recipe:'recipes',guide:'guides'})[record.recordType]||record.recordType});
for(const moduleName of ['private-pages','features','editor-page','local-page','maps-page']){
 const file=join(root,`src/ui/${moduleName}.mjs`);try{await access(file);}catch{continue;}
 const module=await import(pathToFileURL(file)); const extensions=await module.featurePages(packs);for(const page of extensions)pages.push({...page,path:'/'+page.path.replace(/^\/+|\/+$/g,'')+'/'});
}
for(const page of ['planner','inventory','settings'])if(!pages.some(p=>p.path===`/${page}/`))pages.push({path:`/${page}/`,title:page[0].toUpperCase()+page.slice(1),page,body:pageHeading('PRIVATE WORKSPACE',page[0].toUpperCase()+page.slice(1),'This workspace is not available in this build. Your existing browser data has not been changed.')});
setNavigation(pages);
const paths=new Set();for(const page of pages){if(!/^\/(?:[a-zA-Z0-9%_~-]+\/)*$/.test(page.path))throw new Error(`Unsafe output route: ${page.path}`);if(paths.has(page.path))throw new Error(`Duplicate output route: ${page.path}`);paths.add(page.path);}
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const page of pages){const file=join(dist,page.path,'index.html');await mkdir(dirname(file),{recursive:true});await writeFile(file,renderLayout(page));}
await writeFile(join(dist,'404.html'),renderLayout({title:'Record not found',page:'404',body:pageHeading('404 / NOT FOUND','This route is off the map.','The record may have moved, or the address may be incomplete.')+'<a class="button primary" href="/catalog/">Return to the catalog</a>'}));
await mkdir(join(dist,'assets'),{recursive:true});for(const folder of ['src','content','schemas'])await cp(join(root,folder),join(dist,'assets',folder),{recursive:true});
await writeFile(join(dist,'assets/content/manifest.json'),JSON.stringify({packs:(await readdir(join(root,'content/packs'))).filter(f=>f.endsWith('.json')).sort().map(f=>`/assets/content/packs/${f}`)},null,2));
console.log(`Built ${pages.length} independent HTML routes and 404 page in dist/.`);
