/** Read-only, bounded inbound item-area search. Never creates map markers. */
export function parseItemArea(search:string):string|null {
  if(typeof search!=='string'||search.length>2048)return null;
  const values=new URLSearchParams(search).getAll('area');
  if(values.length!==1||!values[0].trim()||values[0].length>120||/[\u0000-\u001f\u007f]/.test(values[0]))return null;
  return values[0].trim();
}
