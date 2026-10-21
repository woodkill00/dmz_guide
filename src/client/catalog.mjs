const form=document.querySelector('#catalog-filters');
if(form){
 const query=form.querySelector('[name="q"]'), type=form.querySelector('[name="type"]'),pack=form.querySelector('[name="pack"]');
 const cards=[...document.querySelectorAll('[data-record-card]')];
 function readURL(){const params=new URLSearchParams(location.search);query.value=params.get('q')||'';type.value=params.get('type')||'';pack.value=params.get('pack')||'';filter(false);}
 function filter(update){const q=query.value.trim().toLowerCase(); let count=0; for(const card of cards){const show=(!q||card.dataset.search.includes(q))&&(!type.value||card.dataset.type===type.value)&&(!pack.value||card.dataset.pack===pack.value);card.hidden=!show;if(show)count++;} for(const section of document.querySelectorAll('[data-catalog-section]')) section.hidden=![...section.querySelectorAll('[data-record-card]')].some(c=>!c.hidden); document.querySelector('#catalog-count').textContent=`${count} matching record${count===1?'':'s'}. Coverage not established.`;document.querySelector('#catalog-empty').hidden=count!==0;if(update){const params=new URLSearchParams();if(query.value)params.set('q',query.value);if(type.value)params.set('type',type.value);if(pack.value)params.set('pack',pack.value);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}}
 form.addEventListener('submit',event=>{event.preventDefault();filter(true);});form.addEventListener('input',()=>filter(true));form.addEventListener('change',()=>filter(true));window.addEventListener('popstate',readURL);readURL();
}
