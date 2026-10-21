/* ---------- Inbox (optional, Settings → Tasks; on by default) ----------
   A calm place to drop ideas without picking a space or list. Each idea can have steps (max 10).
   When ready, send it to the Backlog of any list (lists hold max 10 per stage).
   Ideas are ordinary tasks with inbox:true and no list, so sync, backup and undo just work;
   shown() leaves them out of every board, count and search. */
var ibOn=false,ibOpenId=null,ibDest=null; // var: other files read ibOn, possibly before this file runs
function inboxOn(){return !!(S.cfg&&S.cfg.inbox!==false)}
function inboxItems(){return S.tasks.filter(t=>t.inbox&&!t.archived).sort((a,b)=>(b.created||0)-(a.created||0))}
var IB_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l2.5-7.5h11L20 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20"/></svg>';

function openInbox(){
  if(!inboxOn())return;
  closeSearch&&closeSearch();
  ibOn=true;ibOpenId=null;drawInbox();$('inboxPg').classList.add('on');document.body.classList.add('ib-open');
  $('inboxPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
  setTimeout(()=>{if(ibOn&&matchMedia('(min-width:1100px)').matches)$('ibNew')&&$('ibNew').focus()},300);
}
function closeInbox(){
  if(!ibOn)return;ibOn=false;ibOpenId=null;
  $('inboxPg').classList.remove('on');document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#inboxPg'))a.blur();
  if(typeof renderDesk==='function')renderDesk();
}
/* where "Send" goes: the list you used last, else the first list */
function ibTarget(){
  const ok=id=>S.lists.some(l=>l.id===id);
  if(!ibDest||!ok(ibDest))ibDest=ok(S.cfg.ibLast)?S.cfg.ibLast:(S.lists[0]||{}).id;
  return ibDest;
}
const ibSpMini=x=>`<span class="sp-mini" style="background:${x.c}">${x.e?esc(x.e):esc((x.name[0]||'?').toUpperCase())}</span>`;
function ibPanel(t){
  const dest=ibTarget(),dl=listOf(dest),dsp=spaceOf(dl.space)||S.spaces[0],n=stageCount(dest,'backlog'),full=n>=STAGE_MAX;
  const steps=t.subs.map((s,i)=>`<div class="ib-step${s.done?' done':''}"><button class="ib-sck" data-ibsck="${t.id}:${s.id}" aria-label="${s.done?'Mark not done':'Mark done'}">${s.done?tick():''}</button>
      <input value="${esc(s.t)}" data-ibsren="${t.id}:${s.id}" maxlength="120" aria-label="Step" autocomplete="off"><button class="ib-sdel" data-ibsdel="${t.id}:${s.id}" aria-label="Remove step">${X}</button></div>`).join('');
  return `<div class="ib-p"><div class="ib-pin">
    <div class="ib-sec"><div class="ib-lbl">Idea</div><input class="ib-title" data-ibren="${t.id}" value="${esc(t.title)}" maxlength="120" placeholder="What’s the idea?" autocomplete="off" enterkeyhint="done"></div>
    <div class="ib-sec"><div class="ib-lbl">Steps <span>${t.subs.length}/${SUB_MAX}</span></div>${steps}
      ${t.subs.length<SUB_MAX?`<div class="ib-step ib-add"><i></i><input data-ibsnew="${t.id}" placeholder="Add a step" maxlength="120" enterkeyhint="done" autocomplete="off"></div>`:`<p class="ib-note">That’s the most for one idea. Keep it focused.</p>`}</div>
    <div class="ib-sec"><div class="ib-lbl">Send to</div>
      ${S.spaces.length>1?`<div class="ib-chips">${orderedSpaces().map(x=>`<button class="ib-chip${x.id===dsp.id?' on':''}" data-ibsp="${x.id}">${ibSpMini(x)}${esc(x.name)}</button>`).join('')}</div>`:''}
      <div class="ib-chips">${S.lists.filter(l=>l.space===dsp.id).map(l=>`<button class="ib-chip${l.id===dest?' on':''}" data-ibl="${l.id}"><i style="background:${l.c}"></i>${esc(l.name)}<small>${stageCount(l.id,'backlog')}/${STAGE_MAX}</small></button>`).join('')}</div>
    </div>
    <div class="ib-acts"><button class="primary ib-send" data-ibsend="${t.id}" ${full?'disabled':''}>${full?`${esc(dl.name)} Backlog is full`:`Send to ${esc(dl.name)} · Backlog`}</button>
      <button class="le-btn warn ib-del" data-ibdel="${t.id}" aria-label="Delete idea">${BIN_S}</button></div>
  </div></div>`;
}
function drawInbox(){
  const items=inboxItems();
  const rows=items.map(t=>{const done=t.subs.filter(s=>s.done).length;
    return `<div class="ib-it${ibOpenId===t.id?' open':''}" data-ib="${t.id}"><button class="ib-row" data-ibt="${t.id}" aria-expanded="${ibOpenId===t.id}">
      <span class="ib-dot"></span><span class="ib-tt">${esc(t.title)||'<em>Untitled</em>'}</span>${t.subs.length?`<span class="ib-sc">${done}/${t.subs.length}</span>`:''}${LX_CHEV}</button>${ibPanel(t)}</div>`}).join('');
  $('ibIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="ibBack" aria-label="Back">${BACK_SVG}</button></div>
    <h1 class="ib-h">Inbox</h1><p class="ib-lede">Drop ideas here, no sorting needed. Send each one to a list’s Backlog when you’re ready.</p>
    <div class="ib-cap"><span class="ib-cap-i">${PLUS_S}</span><input id="ibNew" placeholder="Add an idea" maxlength="120" enterkeyhint="done" autocomplete="off"><button class="ib-cap-go" id="ibAdd" aria-label="Add idea">Add</button></div>
    ${items.length?`<div class="ib-count">${items.length} ${items.length===1?'idea':'ideas'}</div><div class="ib-list">${rows}</div>`
      :`<div class="ib-empty">${IB_ICON}<b>Your inbox is empty</b><span>Ideas you add show up here.</span></div>`}`;
}
function ibAdd(){
  const i=$('ibNew'),v=(i.value||'').trim();if(!v)return;
  const t={id:newId(),title:v,stage:'backlog',list:null,est:S.cfg.defEst||30,subs:[],notes:'',repeat:'none',inbox:true,created:Date.now()};
  S.tasks.push(t);save();sfx('add');haptic(8);drawInbox();if(typeof renderDesk==='function')renderDesk();
  const n=$('ibNew');n.focus();
  const row=document.querySelector(`.ib-it[data-ib="${t.id}"]`);if(row)row.classList.add('new');
}
/* open or close an idea in place, so the panel glides instead of redrawing */
function ibToggle(id){
  const was=ibOpenId===id;
  document.querySelectorAll('#ibIn .ib-it.open').forEach(x=>{x.classList.remove('open');x.querySelector('.ib-row').setAttribute('aria-expanded','false')});
  ibOpenId=was?null:id;haptic(5);
  if(!was){const it=document.querySelector(`.ib-it[data-ib="${id}"]`);if(it){it.classList.add('open');it.querySelector('.ib-row').setAttribute('aria-expanded','true')}}
}
const ibTask=id=>S.tasks.find(t=>t.inbox&&String(t.id)===String(id));
const ibPair=v=>{const [a,b]=String(v).split(':');const t=ibTask(a);return [t,t?t.subs.find(s=>String(s.id)===b):null]};
function ibRedraw(){const y=$('inboxPg').scrollTop;drawInbox();$('inboxPg').scrollTop=y}

document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg" id="inboxPg" role="region" aria-label="Inbox"><div class="ib-in" id="ibIn"></div></div>');
document.addEventListener('click',e=>{if(e.target.closest('#ibEntry'))openInbox()});
$('inboxPg').addEventListener('click',e=>{
  if(e.target.closest('#ibBack'))return closeInbox();
  if(e.target.closest('#ibAdd'))return ibAdd();
  const tg=e.target.closest('[data-ibt]');if(tg)return ibToggle(+tg.dataset.ibt);
  const ck=e.target.closest('[data-ibsck]');if(ck){const [t,s]=ibPair(ck.dataset.ibsck);if(s){s.done=!s.done;haptic(6);save();ibRedraw()}return}
  const sd=e.target.closest('[data-ibsdel]');if(sd){const [t,s]=ibPair(sd.dataset.ibsdel);if(s){t.subs=t.subs.filter(x=>x!==s);haptic(5);save();ibRedraw()}return}
  const sp=e.target.closest('[data-ibsp]');if(sp){const l=S.lists.find(x=>x.space===sp.dataset.ibsp);if(l){ibDest=l.id;haptic(5);ibRedraw()}return}
  const ll=e.target.closest('[data-ibl]');if(ll){ibDest=ll.dataset.ibl;haptic(5);ibRedraw();return}
  const se=e.target.closest('[data-ibsend]');if(se){const t=ibTask(se.dataset.ibsend),dest=ibTarget();if(!t||!dest)return;
    if(!t.title.trim()){toast('Give the idea a name first');return}
    if(!canPut(dest,'backlog'))return;
    const it=se.closest('.ib-it');it.classList.add('leaving');S.cfg.ibLast=dest;
    setTimeout(()=>{ibOpenId=null;commit(()=>{t.inbox=false;delete t.created;t.list=dest;t.stage='backlog';if(typeof carryTags==='function')carryTags(t)},`Sent to ${listOf(dest).name} · ${STAGES[0].name}`);sfx('add')},280);return}
  const dl=e.target.closest('[data-ibdel]');if(dl){const t=ibTask(dl.dataset.ibdel);if(!t)return;
    const it=dl.closest('.ib-it');it.classList.add('leaving');haptic(10);sfx('remove');
    setTimeout(()=>{ibOpenId=null;commit(()=>{S.tasks=S.tasks.filter(x=>x!==t)},'Idea deleted')},280);return}
});
$('inboxPg').addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(e.target.matches('input')&&e.target.value&&e.target.id==='ibNew'){e.target.value='';return}e.stopPropagation();closeInbox();return}
  if(e.key!=='Enter')return;
  if(e.target.id==='ibNew'){e.preventDefault();ibAdd();return}
  const ns=e.target.dataset.ibsnew;if(ns){e.preventDefault();const t=ibTask(ns),v=e.target.value.trim();if(!t||!v)return;if(!canStep(t))return;
    t.subs.push({id:newId(),t:v,done:false});haptic(6);save();ibRedraw();const n=document.querySelector(`[data-ibsnew="${ns}"]`);if(n)n.focus();return}
  if(e.target.dataset.ibren||e.target.dataset.ibsren){e.preventDefault();e.target.blur()}
});
$('inboxPg').addEventListener('input',e=>{
  const r=e.target.dataset.ibren;if(r){const t=ibTask(r);if(t){t.title=e.target.value;const tt=document.querySelector(`.ib-it[data-ib="${r}"] .ib-tt`);if(tt)tt.textContent=t.title||'Untitled';save()}return}
  const s=e.target.dataset.ibsren;if(s){const [t,x]=ibPair(s);if(x&&e.target.value.trim()){x.t=e.target.value;save()}}
});
/* keep the page in step with undo and sync, without stealing focus while typing */
const _ibRender=render;
render=function(d){_ibRender(d);if(ibOn&&!inboxOn()){closeInbox();return}if(ibOn){const a=document.activeElement;if(!(a&&a.closest&&a.closest('#inboxPg')&&a.matches('input')))ibRedraw()}};
