import {readFile,opendir,open,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {localRequest} from './source-update-plugin.mjs';
// Read-only bridge to explicit CLI captures. No network collection or filesystem writes.
export function referencePlugin({captureRoot=fileURLToPath(new URL('../../../.local/reference-captures/',import.meta.url))}={}){
 return{name:'local-reference-captures',apply:'serve',configureServer(server){server.middlewares.use('/__references',async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};
  try{if(!localRequest(req)||req.method!=='GET')return send(403,{error:'Local same-origin GET only.'});
   const registry=JSON.parse(await readFile(new URL('../src/workspace/source-registry.json',import.meta.url),'utf8'));
   const match=/^\/latest\/([a-z0-9-]+)$/.exec(req.url??'');if(!match||!registry.sources.some(s=>s.id===match[1]))return send(404,{error:'Unknown reference source.'});
   const folder=join(captureRoot,match[1]),resolved=await realpath(folder),expected=join(await realpath(captureRoot),match[1]);if(resolved!==expected)throw Error('Capture folder link refused.');
   let latest,count=0,total=0;const deadline=performance.now()+1500,directory=await opendir(folder);
   for await(const entry of directory){if(++count>64||performance.now()>deadline)throw Error('Capture directory capacity reached. Archive old files manually.');if(!entry.isFile()||!/^\w{64}\.json$/.test(entry.name)||!/^[a-f0-9]{64}\.json$/.test(entry.name))continue;
    const handle=await open(join(folder,entry.name),'r');let raw;try{const bytes=Buffer.alloc(2*1024*1024+1),result=await handle.read(bytes,0,bytes.length,0);if(result.bytesRead>2*1024*1024)throw Error('Capture too large.');total+=result.bytesRead;if(total>8*1024*1024||performance.now()>deadline)throw Error('Capture scan budget exceeded.');raw=bytes.subarray(0,result.bytesRead).toString('utf8');}finally{await handle.close();}
    const pack=JSON.parse(raw);if(pack.sourceId===match[1]&&(!latest||pack.capturedAt>latest.capturedAt))latest=pack;
   }
   if(!latest)return send(404,{error:'No capture yet. Run the displayed collector command first.'});return send(200,latest);
  }catch{return send(404,{error:'Local capture unavailable. Run the displayed collector command first.'});}
 });}};
}
