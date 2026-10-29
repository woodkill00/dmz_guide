import L from 'leaflet';

export const markerPopupOptions: L.PopupOptions = {maxWidth:360,minWidth:180,autoPanPaddingTopLeft:L.point(16,104),autoPanPaddingBottomRight:L.point(16,112),className:'readable-marker-popup'};

/** Imported strings stay text; only trusted callers supply DOM content/actions. */
export function markerPopup(title:string){
 const root=document.createElement('section');root.className='map-marker-popup';
 const heading=document.createElement('strong');heading.className='marker-popup-title';heading.textContent=title;
 const details=document.createElement('div');details.className='marker-popup-details';details.tabIndex=0;details.setAttribute('role','region');details.setAttribute('aria-label',`Details for ${title}`);
 const actions=document.createElement('div');actions.className='marker-popup-actions';
 root.append(heading,details,actions);
 L.DomEvent.disableScrollPropagation(root);L.DomEvent.disableClickPropagation(root);
 root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();root.closest('.leaflet-popup')?.querySelector<HTMLAnchorElement>('.leaflet-popup-close-button')?.click();}});
 details.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key))event.stopPropagation();});
 return {root,details,actions};
}
