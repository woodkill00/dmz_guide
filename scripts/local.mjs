import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,open,stat} from 'node:fs/promises';
import {bundleRoot,sourceFingerprint,validateBundle} from './unified-map-bundle.mjs';
import {createConnection} from 'node:net';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),base='http://127.0.0.1:4173',skip=process.argv.includes('--skip-build');
const run=script=>new Promise((ok,fail)=>{const p=spawn(process.execPath,[script],{cwd:root,stdio:'inherit',windowsHide:true});p.once('error',fail);p.once('exit',code=>code===0?ok():fail(Error(script+' failed: '+code)));});
async function probe(){try{const r=await fetch(base+'/local-site/status.json',{signal:AbortSignal.timeout(2500)});const s=await r.json();return s;}catch{return null;}}
const valid=s=>s?.kind==='dmz-unified-local-site'&&s.version===1&&s.guide===true&&s.maps===true&&s.reason==='ready'&&s.mapBase==='/map/'&&/^[a-f0-9]{64}$/.test(s.bundleId);
async function main(){
 const existing=await probe();
 if(valid(existing)){const own=await validateBundle(bundleRoot(root),{fingerprint:await sourceFingerprint(root)});if(!own.fresh||own.bundleId!==existing.bundleId)throw Error('Running service belongs to a different or stale build. Stop that service explicitly before restarting.');console.log('Unified site already running: '+base+'/');return;}
 const occupied=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port:4173});const done=value=>{socket.destroy();resolve(value);};socket.setTimeout(2000,()=>done(true));socket.once('connect',()=>done(true));socket.once('error',()=>done(false));});
 if(occupied)throw Error('Port 4173 is occupied by a different or incomplete service. Stop it explicitly; no process was killed or port changed.');
 if(!skip){await run('scripts/build.mjs');await run('scripts/build-unified-map.mjs');}
 if(!(await stat(resolve(root,'dist/index.html'))).isFile())throw Error('Guide build missing. Run without --skip-build.');
 const bundle=await validateBundle(bundleRoot(root),{fingerprint:await sourceFingerprint(root)});if(!bundle.fresh)throw Error('Map build stale. Run without --skip-build.');
 const logs=resolve(root,'.local/service-logs');await mkdir(logs,{recursive:true});
 const out=await open(resolve(logs,'unified.out.log'),'a'),err=await open(resolve(logs,'unified.err.log'),'a');
 let child,launchError;try{child=spawn(process.execPath,['scripts/serve.mjs','--maps','--port','4173'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:'4173'},detached:true,windowsHide:true,stdio:['ignore',out.fd,err.fd]});child.on('error',e=>{launchError=e;});child.unref();}finally{await out.close();await err.close();}
 for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));const s=await probe();if(valid(s)&&s.bundleId===bundle.bundleId){console.log('Unified site: '+base+'/\nHajin: '+base+'/map/\nX01: '+base+'/map/x01/\nSafe Run: '+base+'/map/safes/\nLoot Run: '+base+'/map/loot/');return;}}
 if(child.exitCode===null)child.kill();
 throw Error('Unified service did not become ready. '+(launchError?.message||'See .local/service-logs/unified.err.log'));
}
await main().catch(e=>{console.error(e.message);process.exitCode=1;});
