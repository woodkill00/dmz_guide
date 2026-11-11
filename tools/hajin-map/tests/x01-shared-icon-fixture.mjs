const generation='11111111-1111-1111-1111-111111111111';
const source=id=>({id,generation,snapshot:`/maps/hajin/captures/${generation}/${id}/markers.json`,iconDirectory:`/maps/hajin/captures/${generation}/${id}/icons/`});
const sources=['official','codcentral','mapgenie'].map(source);
const categories={
  official:[['dmz_exfil','exfil.png'],['dmz_ammoCache','ammo.png']],
  codcentral:[['safe','safe.png'],['bounty','bounty.png'],['key','key.png']],
  mapgenie:[['mapgenie-28409','spawn.png']],
};
export const sharedIconPaths=Object.fromEntries(sources.flatMap(item=>categories[item.id].map(([id,file])=>[id,item.iconDirectory+file])));
export async function routeSharedIconFixture(route,png){
  const url=new URL(route.request().url()),path=url.pathname;
  if(path==='/maps/hajin/current-captures.local.json'){await route.fulfill({json:{version:1,sources}});return true;}
  const item=sources.find(source=>source.snapshot===path);
  if(item){await route.fulfill({json:{categories:categories[item.id].map(([id,file])=>({id,icon:item.iconDirectory+file}))}});return true;}
  if(sources.some(source=>path.startsWith(source.iconDirectory))){await route.fulfill({body:png,contentType:'image/png'});return true;}
  return false;
}
