export type X01Marker = { id:string; name:string; floor:1|2; layer:string; grid:string; x:number; y:number; description:string };
export type X01Snapshot = { schemaVersion:1; mapId:"x01"; coordinateVersion:"codcentral-x01-v4"; source:string; capturedAt:string; floors:{id:1|2;name:string;url:string;sha256:string}[]; markers:X01Marker[] };
export const layerNames:Record<string,string> = {poi:"Areas",spawn:"Spawn",exfil:"Exfils",key:"Keys",stash:"Hidden stash",printer:"3D printer",encoder:"Keycard encoders",ammo:"Ammo caches",conn:"Floor connectors",bounty:"Bounty terminal"};
export function validateSnapshot(input:unknown):X01Snapshot {
  const value=input as X01Snapshot;
  if(!value||value.schemaVersion!==1||value.mapId!=="x01"||value.coordinateVersion!=="codcentral-x01-v4"||value.source!=="https://codcentral.net/blog/mw4-dmz-map/"||!/^\d{4}-\d{2}-\d{2}T/.test(value.capturedAt)||!Array.isArray(value.floors)||value.floors.length!==2||!Array.isArray(value.markers)||value.markers.length<1||value.markers.length>500)throw Error("Invalid X01 source snapshot");
  for(let index=0;index<2;index++){const floor=value.floors[index];if(!floor||floor.id!==index+1||typeof floor.name!=="string"||floor.name.length>80||floor.url!==`https://codcentral.net/assets/library/mw4/dmz/map/x01-floor-${index+1}-v4.webp`||!/^([a-f0-9]{64})$/.test(floor.sha256))throw Error("Invalid X01 floor source");}
  const ids=new Set<string>();
  for(const row of value.markers){if(!row||!/^x01-[a-z0-9-]{1,80}$/.test(row.id)||ids.has(row.id)||typeof row.name!=="string"||row.name.length<1||row.name.length>120||/[<>\u0000-\u001f]/.test(row.name)||!layerNames[row.layer]||![1,2].includes(row.floor)||typeof row.grid!=="string"||!/^([A-J][0-8])(\/[A-J][0-8])*$/.test(row.grid)||!Number.isFinite(row.x)||!Number.isFinite(row.y)||row.x<0||row.x>1||row.y<0||row.y>1||typeof row.description!=="string"||row.description.length>700||/[<>\u0000-\u001f]/.test(row.description))throw Error("Invalid X01 marker");ids.add(row.id);}
  return value;
}
export function filteredMarkers(snapshot:X01Snapshot,floor:1|2,enabled:ReadonlySet<string>,query:string){const q=query.trim().toLocaleLowerCase();return snapshot.markers.filter(row=>row.floor===floor&&enabled.has(row.layer)&&(!q||`${row.name} ${row.grid} ${row.description}`.toLocaleLowerCase().includes(q)));}
export const dmzhubReferences = [
  {name:"Audit Room",floor:2,sector:"G4"},{name:"Deep Vault 106",floor:1,sector:"C2"},{name:"Deep Vault 406",floor:1,sector:"C1"},{name:"Deep Vault Room 301",floor:1,sector:"B1"},{name:"Executive Room",floor:2,sector:"C4"},{name:"Lt. Chol-Min's Stash Room",floor:2,sector:"E7"},{name:"Maintenance Room",floor:1,sector:"E5"},{name:"Small Test Chamber",floor:1,sector:"E4"},{name:"Superintendent's Office",floor:2,sector:"E3"},{name:"X01 VAULT DRC LOCKER KEY",floor:1,sector:"B1"},
] as const;
