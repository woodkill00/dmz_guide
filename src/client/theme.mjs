const button=document.querySelector('#theme-toggle');
let selected='dark';try{selected=localStorage.getItem('dmz-theme')==='light'?'light':'dark';}catch{}
function apply(){document.documentElement.dataset.theme=selected;if(button){button.textContent=selected==='dark'?'Light mode':'Dark mode';button.setAttribute('aria-label',`Switch to ${selected==='dark'?'light':'dark'} theme`);}}
apply();button?.addEventListener('click',()=>{selected=selected==='dark'?'light':'dark';apply();try{localStorage.setItem('dmz-theme',selected);}catch{button.title='Theme changed for this page only; browser storage is unavailable.';}});
