/* ---------- Inbox (optional, Settings → Tasks; on by default) ----------
   A calm place to drop ideas without picking a space or list.
   Ideas look and open exactly like tasks in a list: tap one for the same details sheet
   (title, steps up to 10, notes, time, priority). "Send to a list" moves it to that list's Backlog
   (lists hold max 10 per stage).
   Ideas are ordinary tasks with inbox:true and no list, so sync, backup and undo just work;
   shown() leaves them out of every board, count and search.
   Notes live here too: inbox items with note:true. The text is in t.notes and its first line in t.title. A note never
   goes on a board; it can be pinned, edited in a calm popup, turned into a task, or deleted. */
var ibOn=false; // var: other files read ibOn, possibly before this file runs
function inboxOn(){return !!(S.cfg&&S.cfg.inbox!==false)}
function inboxItems(){return S.tasks.filter(t=>t.inbox&&!t.archived&&!t.note).sort((a,b)=>(b.created||0)-(a.created||0))}
function inboxNotes(){return S.tasks.filter(t=>t.inbox&&!t.archived&&t.note).sort((a,b)=>(!!b.pin-!!a.pin)||((b.edited||b.created||0)-(a.edited||a.created||0)))}
var ibKind='task',ibTab='all',nbId=null;
var I_NOTE2='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h6M9 16h4"/></svg>';
var I_TASK2='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8.5 12.3l2.3 2.3 4.7-4.8"/></svg>';
var I_PIN='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 3.5l5 5-2.6.9-3.3 3.3.4 4.3-1.9 1.9-3.7-3.7-4.6 4.6-1.1-1.1 4.6-4.6-3.7-3.7 1.9-1.9 4.3.4 3.3-3.3z"/></svg>';
const nbTitle=s=>String(s||'').trim().split('\n')[0].slice(0,120);
const nbWhen=t=>{const d=new Date(t.edited||t.created||Date.now()),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):d.toLocaleDateString(undefined,{month:'short',day:'numeric'})};
var IB_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l2.5-7.5h11L20 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20"/></svg>';
var I_SEND='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

function openInbox(){
  if(!inboxOn())return;
  if(typeof closeSearch==='function')closeSearch();
  if(typeof rhOn!=='undefined'&&rhOn)closeRhythm();
  ibOn=true;drawInbox();$('inboxPg').classList.add('on');document.body.classList.add('ib-open');
  $('inboxPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
  setTimeout(()=>{if(ibOn&&matchMedia('(min-width:1100px)').matches)$('ibNew')&&$('ibNew').focus()},300);
}
function closeInbox(){
  if(!ibOn)return;ibOn=false;
  $('inboxPg').classList.remove('on');document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#inboxPg'))a.blur();
  if(typeof renderDesk==='function')renderDesk();
}
/* one idea, drawn like a task row in a list */
function ibRow(t){
  const sd=t.subs.filter(s=>s.done).length,pr=priOf(t);
  const meta=[pr?`<span class="mi pri ${pr.id}">${priIcon(pr.n)}${pr.name}</span>`:'',
    t.subs.length?`<span class="mi">${I_SUB}${sd}/${t.subs.length}</span>`:'',
    t.notes.trim()?`<span class="mi" aria-label="Has notes">${I_NOTE}</span>`:''].join('');
  return `<li class="row ib-r${t.id===enterId?' enter':''}" data-ibid="${t.id}">
    <div class="row-in">
      <button class="check ib-go" data-ibgo="${t.id}" aria-label="Send ${esc(t.title)} to a list" title="Send to a list">${I_SEND}</button>
      <div class="body"><div class="title"><span>${esc(t.title)||'Untitled'}</span></div>${meta?`<div class="meta">${meta}</div>`:''}</div>
      <div class="est">${fmt(t.est)}</div>${MORE(`data-ibm="${t.id}"`,`Options for ${esc(t.title)||'task'}`)}
    </div></li>`;
}
/* a note as a soft card: its first line stands out, the rest follows quietly */
function ibNoteCard(t){const lines=String(t.notes||'').trim().split('\n'),head=lines[0]||'',rest=lines.slice(1).join('\n').trim();
  return `<div class="ib-nw${t.id===enterId?' enter':''}"><button class="ib-note${t.pin?' pin':''}" data-ibnote="${t.id}"><b>${esc(head)||'Empty note'}</b>${rest?`<span>${esc(rest)}</span>`:''}
    <small>${t.pin?`<i class="ib-pin">${I_PIN}</i>`:''}${nbWhen(t)}</small></button>${MORE(`data-ibm="${t.id}"`,`Options for note ${esc(head)}`)}</div>`}
/* note ↔ task: a note's first line becomes the task's name; a task's name and steps become the note's lines */
function nbToTask(t){const lines=String(t.notes||'').trim().split('\n');if(!lines[0]){toast('Write something first');return}
  commit(()=>{t.note=false;delete t.pin;t.title=lines[0].slice(0,120);t.notes=lines.slice(1).join('\n').trim();t.est=S.cfg.defEst||30},'Now a task in your Inbox')}
function ibToNote(t){commit(()=>{const steps=(t.subs||[]).map(s=>`${s.done?'✓':'•'} ${s.t}`);t.notes=[t.title,...steps,(t.notes||'').trim()].filter(Boolean).join('\n');t.subs=[];t.note=true;t.est=0;t.edited=Date.now();delete t.pri},'Now a note in your Inbox')}
function ibDelete(t){confirmAsk({title:t.note?'Delete this note?':'Delete this task?',text:`“${(t.note?nbTitle(t.notes):t.title)||'Untitled'}” will be deleted.`,yes:'Yes, delete',no:'No',
  onYes:()=>{try{sfx('remove')}catch(e){}commit(()=>{S.tasks=S.tasks.filter(x=>x!==t)},t.note?'Note deleted':'Task deleted')}})}
function ibMenu(t){return t.note?[{t:'Edit',ic:PEN_S,act:()=>openNote(t.id)},{t:t.pin?'Unpin':'Pin to the top',ic:I_PIN,act:()=>{t.pin=!t.pin;if(!t.pin)delete t.pin;save();render();toast(t.pin?'Pinned to the top':'Unpinned')}},
    {t:'Turn into a task',ic:I_TASK2,act:()=>nbToTask(t)},{sep:1},{t:'Delete note',ic:BIN_S,warn:1,act:()=>ibDelete(t)}]
  :[{t:'Open',ic:CHEV,act:()=>ibOpen(t.id)},{t:'Send to a list…',ic:I_SEND,act:()=>ibOpen(t.id,true)},{t:'Turn into a note',ic:I_NOTE2,act:()=>ibToNote(t)},{sep:1},{t:'Delete task',ic:BIN_S,warn:1,act:()=>ibDelete(t)}]}
function drawInbox(){
  const items=inboxItems(),notes=inboxNotes(),nT=items.length,nN=notes.length,tab=nT&&nN?ibTab:'all',note=ibKind==='note';
  const tabs=nT&&nN?`<div class="ib-tabs" role="tablist" aria-label="Show">${[['all','All',nT+nN],['tasks','Tasks',nT],['notes','Notes',nN]].map(([k,l,n])=>`<button role="tab" data-ibtab="${k}" aria-selected="${tab===k}" class="${tab===k?'on':''}">${l}<small>${n}</small></button>`).join('')}</div>`:'';
  const tasksSec=nT&&tab!=='notes'?`${tab==='all'?`<div class="ib-count">${nT} ${nT===1?'task':'tasks'}</div>`:''}<ul class="list ib-list">${items.map(ibRow).join('')}</ul>`:'';
  const notesSec=nN&&tab!=='tasks'?`${tab==='all'?`<div class="ib-count">${nN} ${nN===1?'note':'notes'}</div>`:''}<div class="ib-notes">${notes.map(ibNoteCard).join('')}</div>`:'';
  $('ibIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="ibBack" aria-label="Back">${BACK_SVG}</button></div>
    <h1 class="ib-h">Inbox</h1><p class="ib-lede">Catch anything: a task for later, or a note to keep. Sort it out when you’re ready.</p>
    <div class="ib-cap${note?' note':''}"><div class="ib-kind" role="tablist" aria-label="Add a"><button role="tab" data-ibk="task" aria-selected="${!note}" aria-label="Task" class="${note?'':'on'}">${I_TASK2}<span>Task</span></button><button role="tab" data-ibk="note" aria-selected="${note}" aria-label="Note" class="${note?'on':''}">${I_NOTE2}<span>Note</span></button></div>
      ${note?`<textarea id="ibNew" rows="1" placeholder="Write a note…" maxlength="4000" aria-label="New note"></textarea>`:`<input id="ibNew" placeholder="Add a task" maxlength="120" enterkeyhint="done" autocomplete="off" aria-label="New task">`}
      <button class="ib-cap-go" id="ibAdd" aria-label="${note?'Add note':'Add task'}">Add</button></div>
    ${note?'<p class="ib-hint">Enter for a new line · Ctrl or ⌘ + Enter to add</p>':''}
    ${nT||nN?`${tabs}${tasksSec}${notesSec}`:`<div class="ib-empty">${IB_ICON}<b>Your inbox is empty</b><span>Tasks and notes you add show up here.</span></div>`}`;
  enterId=null;
}
function ibAdd(){
  const i=$('ibNew'),v=(i.value||'').trim();if(!v)return;
  const t=ibKind==='note'?{id:newId(),title:nbTitle(v),stage:'backlog',list:null,est:0,subs:[],notes:v,repeat:'none',inbox:true,note:true,created:Date.now()}
    :{id:newId(),title:v,stage:'backlog',list:null,est:S.cfg.defEst||30,subs:[],notes:'',repeat:'none',inbox:true,created:Date.now()};
  S.tasks.push(t);enterId=t.id;save();sfx('add');haptic(8);if(ibTab!=='all'&&ibTab!==(t.note?'notes':'tasks'))ibTab='all';drawInbox();if(typeof renderDesk==='function')renderDesk();
  $('ibNew').focus();
}
/* the textarea grows with the note */
function ibGrow(el){if(!el||el.tagName!=='TEXTAREA')return;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,240)+'px'}

/* ---------- a note's editor: a calm popup in the middle of the screen; it saves as you type ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="dlg gme nb" id="nbEd" role="dialog" aria-modal="true" aria-label="Note"><div class="dlg-in gme-in nb-in">
  <div class="gme-h"><span class="nb-when" id="nbWhen"></span><button class="icon-btn" id="nbPin" aria-label="Pin note"></button><button class="icon-btn gme-x0" id="nbClose" aria-label="Close">${X}</button></div>
  <textarea id="nbText" maxlength="4000" aria-label="Note" placeholder="Write a note…"></textarea>
  <div class="nb-acts"><button class="le-btn" id="nbTask" type="button">${I_TASK2}Turn into a task</button><button class="le-btn warn" id="nbDel" type="button">${BIN_S}Delete</button></div>
  <button class="primary" id="nbDone">Done</button></div></div>`);
let nbT=null;
function openNote(id){const t=S.tasks.find(x=>x.id===id&&x.note);if(!t)return;nbId=id;$('nbText').value=t.notes||'';nbPaint(t);$('nbEd').classList.add('on');haptic(5);
  setTimeout(()=>{const a=$('nbText');a.focus();a.setSelectionRange(a.value.length,a.value.length)},60)}
function nbPaint(t){$('nbWhen').textContent=(t.edited?'Edited ':'Added ')+nbWhen(t);$('nbPin').innerHTML=I_PIN;$('nbPin').classList.toggle('on',!!t.pin);$('nbPin').setAttribute('aria-pressed',!!t.pin);$('nbPin').setAttribute('aria-label',t.pin?'Unpin note':'Pin note')}
function nbSave(){const t=S.tasks.find(x=>x.id===nbId);if(!t)return;const v=$('nbText').value;if(v===t.notes)return;t.notes=v;t.title=nbTitle(v);t.edited=Date.now();save()}
function closeNote(){if(nbId==null)return;clearTimeout(nbT);nbSave();const t=S.tasks.find(x=>x.id===nbId);
  if(t&&!String(t.notes||'').trim()){S.tasks=S.tasks.filter(x=>x!==t);save();toast('Empty note removed')} // an emptied note just goes away
  nbId=null;$('nbEd').classList.remove('on');render()}
$('nbText').addEventListener('input',()=>{clearTimeout(nbT);nbT=setTimeout(nbSave,400)});
$('nbEd').addEventListener('click',e=>{
  if(e.target===$('nbEd')||e.target.closest('#nbDone,#nbClose'))return closeNote();
  const t=S.tasks.find(x=>x.id===nbId);if(!t)return;
  if(e.target.closest('#nbPin')){t.pin=!t.pin;if(!t.pin)delete t.pin;save();nbPaint(t);haptic(5);toast(t.pin?'Pinned to the top':'Unpinned');return}
  if(e.target.closest('#nbTask')){nbSave();if(!String(t.notes||'').trim()){toast('Write something first');return}nbId=null;$('nbEd').classList.remove('on');return nbToTask(t)}
  if(e.target.closest('#nbDel'))return confirmAsk({title:'Delete this note?',text:`“${nbTitle(t.notes)||'Empty note'}” will be deleted.`,yes:'Yes, delete',no:'No',
    onYes:()=>{nbId=null;$('nbEd').classList.remove('on');try{sfx('remove')}catch(err){}commit(()=>{S.tasks=S.tasks.filter(x=>x!==t)},'Note deleted')}});
});
$('nbEd').addEventListener('keydown',e=>{if(e.key==='Escape'){if($('dlg').classList.contains('on'))return;e.preventDefault();e.stopPropagation();closeNote()}
  if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();closeNote()}});

/* the "Send to a list" picker in the details sheet: lists grouped by space, with how full each Backlog is */
function ibListPicks(){
  return orderedSpaces().map(sp=>{const ls=S.lists.filter(l=>l.space===sp.id);if(!ls.length)return '';
    return `<span class="pk-lbl">${sp.e?esc(sp.e)+' ':''}${esc(sp.name)}</span>`+ls.map(l=>{const n=stageCount(l.id,'backlog'),full=n>=STAGE_MAX;
      return `<button class="pk${full?' full':''}" data-v="${l.id}"><i style="background:${l.c}"></i>${esc(l.name)}<small>${n}/${STAGE_MAX}</small></button>`}).join('')}).join('');
}
function ibSendTo(t,list){
  if(!t.title.trim()){toast('Give it a name first');drawDetail();return}
  if(!canPut(list,'backlog')){drawDetail();return}
  S.cfg.ibLast=list;
  const name=listOf(list).name;cur=null;onSheetClose=null;closeSheets();
  setTimeout(()=>{commit(()=>{t.inbox=false;delete t.created;t.list=list;t.stage='backlog';carryTags(t)},`Sent to ${name} · Backlog`);sfx('add')},220);
}
function ibOpen(id,pick){openDetail(id);if(pick){pickOpen='list';drawDetail()}}

document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg" id="inboxPg" role="region" aria-label="Inbox"><div class="ib-in" id="ibIn"></div></div>');
document.addEventListener('click',e=>{if(e.target.closest('#ibEntry'))openInbox()});
$('inboxPg').addEventListener('click',e=>{
  if(e.target.closest('#ibBack'))return closeInbox();
  if(e.target.closest('#ibAdd'))return ibAdd();
  const k=e.target.closest('[data-ibk]');if(k){const was=$('ibNew').value;ibKind=k.dataset.ibk;haptic(5);drawInbox();const n=$('ibNew');n.value=was;ibGrow(n);n.focus();return}
  const tb=e.target.closest('[data-ibtab]');if(tb){ibTab=tb.dataset.ibtab;haptic(4);return drawInbox()}
  const mo=e.target.closest('[data-ibm]');if(mo){e.stopPropagation();const t=S.tasks.find(x=>x.id===+mo.dataset.ibm);if(t)cxOpen(mo,ibMenu(t));return}
  const nt=e.target.closest('[data-ibnote]');if(nt)return openNote(+nt.dataset.ibnote);
  const g=e.target.closest('[data-ibgo]');if(g){haptic(6);return ibOpen(+g.dataset.ibgo,true)}
  const r=e.target.closest('[data-ibid] .row-in');if(r)return ibOpen(+r.closest('[data-ibid]').dataset.ibid);
});
$('inboxPg').addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(e.target.id==='ibNew'&&e.target.value){e.target.value='';return}e.stopPropagation();closeInbox();return}
  if(e.key==='Enter'&&e.target.id==='ibNew'&&(ibKind!=='note'||e.metaKey||e.ctrlKey)){e.preventDefault();ibAdd()}
});
$('inboxPg').addEventListener('input',e=>{if(e.target.id==='ibNew')ibGrow(e.target)});
/* keep the page in step with edits, undo and sync, without stealing focus while typing */
const _ibRender=render;
render=function(d){_ibRender(d);if(ibOn&&!inboxOn()){closeInbox();return}if(ibOn){const a=document.activeElement,typing=a&&a.id==='ibNew';const y=$('inboxPg').scrollTop;drawInbox();$('inboxPg').scrollTop=y;if(typing){const n=$('ibNew');n.value=a.value;ibGrow(n);n.focus()}}};
