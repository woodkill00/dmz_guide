export function parseKeyMarkerTarget(search: string) {
  if (search.length > 4096) return null;
  const q = new URLSearchParams(search);
  const sourceId = q.get('key-source'), recordId = q.get('key-marker');
  if (q.getAll('key-source').length !== 1 || q.getAll('key-marker').length !== 1 || sourceId !== 'codcentral' || !recordId || !/^key-[a-z0-9-]{1,115}$/.test(recordId)) return null;
  return {sourceId, recordId};
}
// Use the existing guarded selection/highlight owner; never modify saved filters.
export function mountKeyMarkerTarget(search: string, open: (sourceId:string, recordId:string)=>boolean, ready:()=>boolean) {
  const target = parseKeyMarkerTarget(search);
  if (!target) return () => {};
  let disposed=false, timer:ReturnType<typeof setTimeout>, attempts=0;
  const stop=()=>{disposed=true;clearTimeout(timer);window.removeEventListener('pagehide',stop);};
  const apply=()=>{
    if(disposed)return;
    if(ready()&&open(target.sourceId,target.recordId)){stop();return;}
    if(++attempts>=60){const message=document.createElement('p');message.id='key-marker-unavailable';message.setAttribute('role','status');message.textContent='This key marker could not open from the current capture. Use the key guide or reload after the map sources are available.';document.querySelector('.map-workspace')?.append(message);stop();return;}
    timer=setTimeout(apply,250);
  };
  window.addEventListener('pagehide',stop,{once:true});apply();return stop;
}
