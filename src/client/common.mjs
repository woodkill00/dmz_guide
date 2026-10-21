import {newProfile, validateProfile} from '../domain/profile.mjs';
import {loadProfile, saveProfile, readRecord} from '../storage/store.mjs';
export const $ = selector => document.querySelector(selector);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const state = {pack:null, profile:null, revision:0, packs:[], loading:false};
export function error(reason) {
  const element = $('#error');
  if (element) { element.hidden=false; element.textContent=reason.message || String(reason); element.focus(); }
  else console.error(reason);
}
export function status(text) { if ($('#save-status')) $('#save-status').textContent=text; }
export function download(name, data, type='application/json') {
  const blob=new Blob([typeof data==='string' ? data : JSON.stringify(data,null,2)], {type});
  const url=URL.createObjectURL(blob), anchor=document.createElement('a');
  anchor.href=url; anchor.download=name; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
let generation=0;let disabledControls=[];
export async function init(render) {
  state.packs=await Promise.all(['official-starter','demo-training'].map(async name=>{
    const response=await fetch(`/assets/content/packs/${name}.json`);
    if (!response.ok) throw new Error('Content unavailable. Start the local server and retry.');
    return response.json();
  }));
  $('#export-current-profile')?.addEventListener('click',()=>{
    try { if(state.loading)throw new Error('Wait for the selected pack to load.');validateProfile(state.profile);download('dmz-private-profile.json',state.profile); } catch(reason) {error(reason);}
  });
  const requested=new URL(location.href).searchParams.get('pack'), select=$('#pack-select');
  if(requested && state.packs.some(pack=>pack.id===requested))select.value=requested;
  async function change() {
    const token=++generation;
    document.dispatchEvent(new Event('pack-changing'));
    if(!state.loading){disabledControls=[...document.querySelectorAll('main button, main input, main select')].filter(n=>n!==select).map(n=>[n,n.disabled]);for(const[n]of disabledControls)n.disabled=true;}state.loading=true;document.querySelector('main').setAttribute('aria-busy','true');status('Loading selected local pack…');
    let pack=state.packs.find(pack=>pack.id===select.value)||state.packs[0];
    let warning=null;
    try { const overlay=await readRecord('content',pack.id);if(token!==generation)return;if(overlay?.value?.pack)pack=overlay.value.pack; }
    catch { if(token!==generation)return; }
    let profile=newProfile(pack), revision=0;
    try {
      const record=await loadProfile(pack.id);
      if(token!==generation)return;
      if(record?.value){validateProfile(record.value);profile=record.value;revision=profile.revision;}
    } catch(reason) { if(token!==generation)return;warning=reason; }
    if(token!==generation)return;
    state.pack=pack;state.profile=profile;state.revision=revision;state.loading=false;for(const[n,disabled]of disabledControls)n.disabled=disabled;disabledControls=[];document.querySelector('main').setAttribute('aria-busy','false');
    status(warning?'Unsaved: browser storage unavailable. Export a backup to keep edits.':'Saved locally · no account or sync');
    $('#pack-note').textContent=`${pack.title} · ${pack.contentVersion}. ${pack.coverage.note}`;
    const url=new URL(location.href);url.searchParams.set('pack',pack.id);history.replaceState(null,'',url);
    for(const anchor of document.querySelectorAll('a[href]')){
      const target=new URL(anchor.href,location.href);
      if(target.origin===location.origin && ['/planner/','/inventory/','/settings/','/editor/','/maps/','/progression/','/local/'].includes(target.pathname)){
        target.searchParams.set('pack',pack.id);anchor.href=target.href;
      }
    }
    render();if(warning)error(warning);
  }
  select.addEventListener('change',()=>change().catch(error));
  await change();return state;
}
export async function persist(candidate=state.profile) {
  try {
    if(state.loading)throw new Error('Wait for the selected pack to load.');
    validateProfile(candidate);
    if(candidate.packId!==state.pack.id)throw new Error('Profile pack changed. Preview again before applying.');
    const packId=state.pack.id, token=generation;
    const saved=await saveProfile(candidate,state.revision);
    if(token!==generation || state.pack.id!==packId)return false;
    state.profile=saved;state.revision=saved.revision;
    status(`Saved locally · revision ${saved.revision}`);$('#error').hidden=true;return true;
  } catch(reason) {
    status('Unsaved changes remain in this page. Export before reload.');error(reason);return false;
  }
}
