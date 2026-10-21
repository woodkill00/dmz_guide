import {init, state, $, esc, error, persist} from './common.mjs';
import {progressRows, progressSources, progressStates, spoilerGuard, setCompletion, resetProgress} from '../domain/progression.mjs';
let resetTarget = null, saving = false, offset = 0;
const labelStatus = value => value==='verified' ? 'Source-backed · live build unverified' : value;
const reference = ref => ref.url ? `<a href="${esc(ref.url)}">${esc(ref.name)}</a>` : esc(ref.name);
function setBusy(value) {
  for (const control of document.querySelectorAll('#pack-select, #spoiler-toggle, #progress-reset, #progress-reset-yes, [data-progress-id]')) control.disabled = value;
}
function render() {
  const selectedSource = $('#progress-source').value;
  const sources = progressSources(state.pack, {reveal:state.profile.spoilers,track:$('#progress-track').value});
  $('#progress-source').innerHTML = '<option value="">All visible sources</option>' + sources.map(s=>`<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  if ([...$('#progress-source').options].some(o=>o.value===selectedSource)) $('#progress-source').value = selectedSource;
  const rows = progressRows(state.pack, state.profile, {track:$('#progress-track').value, query:$('#progress-query').value, source:$('#progress-source').value, status:$('#progress-status').value, progress:$('#progress-state').value,offset});
  const guard = spoilerGuard(state.pack, state.profile.spoilers);
  $('#pack-note').textContent = guard.text(`${state.pack.title} · ${state.pack.contentVersion}. ${state.pack.coverage.note}`);
  $('#spoiler-toggle').textContent = state.profile.spoilers ? 'Hide spoilers' : 'Reveal spoilers';
  $('#spoiler-toggle').setAttribute('aria-pressed', String(state.profile.spoilers));
  offset = rows.offset;
  $('#progress-count').textContent = `Showing ${rows.length ? offset+1 : 0}–${offset+rows.length} of ${rows.total} matching records. This is not a completion percentage; coverage is incomplete.`;
  $('#progress-previous').disabled = offset===0;$('#progress-next').disabled = !rows.more;
  $('#progress-limit-note').hidden = !rows.privacyLimited && !sources.truncated;
  $('#progress-limit-note').textContent = rows.privacyLimited ? 'This large spoiler dictionary exceeds the protected-display budget. Text is conservatively hidden; reveal spoilers or use a smaller pack to inspect it.' : 'The source chooser shows its first 500 choices. Narrow the track to reduce this list.';
  $('#progress-rows').innerHTML = rows.map(r=>`<article class="panel"><p class="eyebrow">${esc(r.track)} · ${esc(labelStatus(r.status))}</p><h2>${esc(r.name)}</h2>${r.hidden ? '<p>Reveal spoilers to inspect or track this record.</p>' : `
<p>${esc(r.description)}</p>${r.disputed ? '<p class="notice">Sources disagree. Your manual state does not resolve this evidence conflict or verify readiness.</p>' : ''}
${r.type==='objective' ? `<label>Manual state for ${esc(r.name)}<select data-progress-id="${esc(r.id)}">${progressStates.map(v=>`<option value="${v}" ${r.state===v?'selected':''}>${v}</option>`).join('')}</select></label>
<h3>Prerequisite chain</h3><ul>${r.prerequisites.map(p=>`<li>${reference(p)}: ${esc(p.state)} · evidence ${esc(labelStatus(p.status))}${p.depth ? ` · indirect prerequisite (depth ${p.depth+1})` : ''}</li>`).join('') || '<li>No listed prerequisites; review source completeness.</li>'}</ul>
${r.effects.length ? `<h3>Recorded effects</h3><ul>${r.effects.map(e=>`<li>${esc(e.type)} · ${esc(e.target)}: ${esc(e.value)}</li>`).join('')}</ul><p>Effects use the record’s sources below. They do not create owned items or prove live-game access.</p>` : ''}` : ''}
${r.detailsTruncated ? '<p class="notice">This is a bounded preview of a large dependency or evidence list. Open the selected private record to inspect direct details.</p>' : ''}
${r.related.length ? `<h3>Related records</h3><ul>${r.related.map(ref=>`<li>${reference(ref)}</li>`).join('')}</ul>` : ''}
<dl><dt>Scope</dt><dd>${esc(r.scope)}</dd><dt>Content version</dt><dd>${esc(r.contentVersion)}</dd></dl>
<h3>Evidence &amp; sources</h3><ul class="source-list">${r.sources.map(s=>`<li>${s.url ? `<a href="${esc(s.url)}" rel="noreferrer noopener">${esc(s.title)}</a>` : esc(s.title)}<p>${esc(s.supports)}</p><p>${esc(s.type)} · Published ${esc(s.publishedAt)} · Reviewed ${esc(s.reviewedAt)}</p></li>`).join('') || '<li>No sources recorded. Treat this as unverified.</li>'}</ul>
${r.url ? `<p><a href="${esc(r.url)}">Open selected private record</a></p>` : ''}`}</article>`).join('') || '<section class="panel"><h2>No matching records.</h2><p>This starter pack may not contain a verified catalog for this track. Clear filters or add a sourced record in the editor.</p></section>';
  setBusy(saving);
}
// One save at a time avoids local controls racing the revision used by persist.
async function save(candidate) {
  if (saving) return false;
  saving = true;
  const focused = document.activeElement;
  setBusy(true);
  let saved = false;
  try { saved = await persist(candidate); return saved; }
  finally {
    saving = false;setBusy(false);
    if (saved && focused?.isConnected && focused.matches('[data-progress-id]')) focused.focus();
  }
}
$('#progress-filters').addEventListener('submit', event=>{event.preventDefault();offset=0;render();});
$('#progress-filters').addEventListener('input', ()=>{offset=0;render();});
$('#progress-previous').addEventListener('click', ()=>{offset=Math.max(0,offset-50);render();$('#progress-count').focus();});
$('#progress-next').addEventListener('click', ()=>{offset+=50;render();$('#progress-count').focus();});
$('#progress-clear').addEventListener('click', ()=>{$('#progress-filters').reset();offset=0;render();});
$('#spoiler-toggle').addEventListener('click', async()=>{
  if (saving) return;
  state.profile = {...state.profile, spoilers:!state.profile.spoilers};offset=0;
  // Hide immediately, including when storage is unavailable or another tab saved.
  render();
  await save(state.profile);
  $('#spoiler-toggle').focus();
});
$('#progress-rows').addEventListener('change', async event=>{
  const id = event.target.dataset.progressId;
  if (!id || saving) return;
  try {
    state.profile = setCompletion(state.pack, state.profile, id, event.target.value);
    const saved = await save(state.profile);
    render();
    if (saved) (document.querySelector(`[data-progress-id="${CSS.escape(id)}"]`) || $('#progress-state')).focus();
  } catch (reason) {error(reason);}
});
$('#progress-reset').addEventListener('click', ()=>{
  if (saving) return;
  resetTarget = {packId:state.pack.id, revision:state.revision};
  $('#progress-reset-target').textContent = `Clear only manual progress for ${state.pack.title}, saved revision ${state.revision}? Inventory, reserves and goals stay unchanged. A previous saved snapshot will be kept.`;
  $('#progress-reset-confirm').hidden = false;
  $('#progress-reset-yes').focus();
});
$('#progress-reset-no').addEventListener('click', ()=>{resetTarget=null;$('#progress-reset-confirm').hidden=true;$('#progress-reset').focus();});
$('#progress-reset-yes').addEventListener('click', async()=>{
  if (saving) return;
  if (!resetTarget || resetTarget.packId!==state.pack.id || resetTarget.revision!==state.revision) {error(new Error('Reset confirmation expired. Review the selected pack again.'));return;}
  if (await save(resetProgress(state.profile))) {resetTarget=null;$('#progress-reset-confirm').hidden=true;render();$('#progress-reset').focus();}
});
document.addEventListener('pack-changing', ()=>{resetTarget=null;offset=0;$('#progress-reset-confirm').hidden=true;});
init(render).catch(error);
