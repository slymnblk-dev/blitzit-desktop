/* ---------- Inbox (optional, Settings → Tasks; on by default) ----------
   A calm place to drop ideas without picking a space or list.
   Ideas look and open exactly like tasks in a list: tap one for the same details sheet
   (title, steps up to 10, notes, time, priority). "Send to a list" moves it to that list's Backlog
   (lists hold max 10 per stage).
   Ideas are ordinary tasks with inbox:true and no list, so sync, backup and undo just work;
   shown() leaves them out of every board, count and search. */
var ibOn=false; // var: other files read ibOn, possibly before this file runs
function inboxOn(){return !!(S.cfg&&S.cfg.inbox!==false)}
function inboxItems(){return S.tasks.filter(t=>t.inbox&&!t.archived).sort((a,b)=>(b.created||0)-(a.created||0))}
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
      <div class="est">${fmt(t.est)}</div>
    </div></li>`;
}
function drawInbox(){
  const items=inboxItems();
  $('ibIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="ibBack" aria-label="Back">${BACK_SVG}</button></div>
    <h1 class="ib-h">Inbox</h1><p class="ib-lede">Drop ideas here, no sorting needed. Tap one to add steps or notes, then send it to a list’s Backlog.</p>
    <div class="ib-cap"><span class="ib-cap-i">${PLUS_S}</span><input id="ibNew" placeholder="Add an idea" maxlength="120" enterkeyhint="done" autocomplete="off"><button class="ib-cap-go" id="ibAdd" aria-label="Add idea">Add</button></div>
    ${items.length?`<div class="ib-count">${items.length} ${items.length===1?'idea':'ideas'}</div><ul class="list ib-list">${items.map(ibRow).join('')}</ul>`
      :`<div class="ib-empty">${IB_ICON}<b>Your inbox is empty</b><span>Ideas you add show up here.</span></div>`}`;
  enterId=null;
}
function ibAdd(){
  const i=$('ibNew'),v=(i.value||'').trim();if(!v)return;
  const t={id:newId(),title:v,stage:'backlog',list:null,est:S.cfg.defEst||30,subs:[],notes:'',repeat:'none',inbox:true,created:Date.now()};
  S.tasks.push(t);enterId=t.id;save();sfx('add');haptic(8);drawInbox();if(typeof renderDesk==='function')renderDesk();
  $('ibNew').focus();
}
/* the "Send to a list" picker in the details sheet: lists grouped by space, with how full each Backlog is */
function ibListPicks(){
  return orderedSpaces().map(sp=>{const ls=S.lists.filter(l=>l.space===sp.id);if(!ls.length)return '';
    return `<span class="pk-lbl">${sp.e?esc(sp.e)+' ':''}${esc(sp.name)}</span>`+ls.map(l=>{const n=stageCount(l.id,'backlog'),full=n>=STAGE_MAX;
      return `<button class="pk${full?' full':''}" data-v="${l.id}"><i style="background:${l.c}"></i>${esc(l.name)}<small>${n}/${STAGE_MAX}</small></button>`}).join('')}).join('');
}
function ibSendTo(t,list){
  if(!t.title.trim()){toast('Give the idea a name first');drawDetail();return}
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
  const g=e.target.closest('[data-ibgo]');if(g){haptic(6);return ibOpen(+g.dataset.ibgo,true)}
  const r=e.target.closest('[data-ibid] .row-in');if(r)return ibOpen(+r.closest('[data-ibid]').dataset.ibid);
});
$('inboxPg').addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(e.target.id==='ibNew'&&e.target.value){e.target.value='';return}e.stopPropagation();closeInbox();return}
  if(e.key==='Enter'&&e.target.id==='ibNew'){e.preventDefault();ibAdd()}
});
/* keep the page in step with edits, undo and sync, without stealing focus while typing */
const _ibRender=render;
render=function(d){_ibRender(d);if(ibOn&&!inboxOn()){closeInbox();return}if(ibOn){const a=document.activeElement,typing=a&&a.id==='ibNew';const y=$('inboxPg').scrollTop;drawInbox();$('inboxPg').scrollTop=y;if(typing){const n=$('ibNew');n.value=a.value;n.focus()}}};
