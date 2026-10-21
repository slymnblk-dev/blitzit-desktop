/* ---------- Weekly review (optional, Settings → Tasks; on by default, Sundays) ----------
   Once a week a small card on Home invites a calm review: what you finished, what's still in My week
   (keep it, send it back to Backlog, or archive it), and how many ideas wait in the Inbox.
   Finishing or skipping marks the week as reviewed until the next review day. */
var rvOn=false;
const REVIEW_DAYS=[[5,'Fri'],[0,'Sun'],[1,'Mon']];
function reviewOn(){return !!(S.cfg&&S.cfg.review!==false)}
/* the start of the most recent review day (today counts) */
function lastReviewDay(){const d=new Date();d.setHours(0,0,0,0);const want=+(S.cfg.reviewDay??0);while(d.getDay()!==want)d.setDate(d.getDate()-1);return d.getTime()}
function reviewDue(){
  if(!reviewOn()||!S.tasks.length||isDemo())return false;
  if((S.firstUse||0)>lastReviewDay())return false; // not in your first days
  return (S.cfg.reviewedAt||0)<lastReviewDay();
}
const RV_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>';
function reviewCard(){
  if(!reviewDue())return '';
  const done=weekDone().length;
  return `<div class="rv-card"><span class="rv-ic">${RV_ICON}</span><span class="rv-t"><b>Your weekly review is ready</b><small>${done?`${done} done this week. `:''}Five calm minutes to reset.</small></span>
    <button class="rv-skip" data-rvskip>Skip</button><button class="rv-go" data-rvgo>Start</button></div>`;
}
const weekDone=()=>S.tasks.filter(t=>t.stage==='done'&&t.doneAt&&t.doneAt>Date.now()-7*DAY&&!t.inbox);
function weekFocus(){const lg=S.focusLog||{};let s=0;for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);s+=lg[dkey(d)]||0}return Math.round(s/60)}
function openReview(){
  if(typeof closeInbox==='function')closeInbox();
  rvOn=true;drawReview();$('reviewPg').classList.add('on');document.body.classList.add('rv-open');$('reviewPg').scrollTop=0;haptic(6);
}
function closeReview(){if(!rvOn)return;rvOn=false;$('reviewPg').classList.remove('on');document.body.classList.remove('rv-open');render()}
function finishReview(msg){S.cfg.reviewedAt=Date.now();save();closeReview();if(msg)toast(msg)}
function drawReview(){
  const done=weekDone(),fm=weekFocus(),wk=S.tasks.filter(t=>shown(t)&&t.stage==='week'),ib=typeof inboxItems==='function'&&inboxOn()?inboxItems().length:0;
  const tag=t=>{const l=listOf(t.list),sp=spaceOf(l.space)||{};return `<small>${sp.e?esc(sp.e)+' ':''}${esc(sp.name||'')}<i style="background:${l.c}"></i>${esc(l.name)}</small>`};
  $('rvIn').innerHTML=`<div class="set-top"><button class="icon-btn" id="rvBack" aria-label="Close review">${BACK_SVG}</button></div>
    <div class="rv-eye">Weekly review</div><h1 class="rv-h">${done.length?'Nice week.':'A fresh week.'}</h1>
    <div class="rv-stats"><div><b>${done.length}</b><span>tasks done</span></div><div><b>${fmt(fm)}</b><span>focused</span></div><div><b>${wk.length}</b><span>still in My week</span></div></div>
    ${done.length?`<section class="rv-sec"><h3>1 · Finished</h3><div class="rv-list">${done.slice(0,6).map(t=>`<div class="rv-row done"><span class="rv-ck">${tick()}</span><span class="rv-tt"><b>${esc(t.title)}</b>${tag(t)}</span></div>`).join('')}${done.length>6?`<div class="rv-more">+${done.length-6} more</div>`:''}</div></section>`:''}
    <section class="rv-sec"><h3>${done.length?'2':'1'} · Still in My week</h3>
      ${wk.length?`<p class="rv-p">Keep what still matters. Send the rest back, or let it go.</p><div class="rv-list">${wk.map(t=>`<div class="rv-row" data-rvt="${t.id}"><span class="rv-tt"><b>${esc(t.title)}</b>${tag(t)}</span>
        <span class="rv-acts"><button data-rvk="${t.id}" class="on">Keep</button><button data-rvb="${t.id}">Backlog</button><button data-rva="${t.id}">Archive</button></span></div>`).join('')}</div>`
      :`<p class="rv-p">Nothing left over. Clean slate.</p>`}</section>
    ${inboxOn()?`<section class="rv-sec"><h3>${done.length?'3':'2'} · Inbox</h3><p class="rv-p">${ib?`${ib} ${ib===1?'idea is':'ideas are'} waiting. Send the good ones to a Backlog, delete the rest.`:'Empty. Nothing waiting.'}</p>${ib?`<button class="le-btn rv-ib" id="rvInbox">Open Inbox</button>`:''}</section>`:''}
    <button class="primary rv-done" id="rvDone">Done for this week</button>`;
}
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg review-pg" id="reviewPg" role="region" aria-label="Weekly review"><div class="ib-in" id="rvIn"></div></div>');
document.addEventListener('click',e=>{
  if(e.target.closest("[data-rvgo]"))return openReview();
  if(e.target.closest("[data-rvskip]")){S.cfg.reviewedAt=Date.now();save();render();toast('Skipped. See you next week.');return}
  if(e.target.closest('#rvStart')){closeSettings&&closeSettings();setTimeout(openReview,200);return}
});
$('reviewPg').addEventListener('click',e=>{
  if(e.target.closest('#rvBack'))return closeReview();
  if(e.target.closest('#rvDone'))return finishReview('Week reviewed. Good luck this week.');
  if(e.target.closest('#rvInbox')){finishReview();setTimeout(()=>openInbox(),200);return}
  const k=e.target.closest('[data-rvk]');if(k){k.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===k));haptic(4);return}
  const move=(id,fn,msg)=>{const t=S.tasks.find(x=>x.id===+id);if(!t)return;const row=$('reviewPg').querySelector(`[data-rvt="${id}"]`);if(row)row.classList.add('leaving');
    setTimeout(()=>{commit(()=>fn(t),msg);drawReview()},260)};
  const b=e.target.closest('[data-rvb]');if(b){const t=S.tasks.find(x=>x.id===+b.dataset.rvb);if(t&&!canPut(t.list,'backlog',t))return;move(b.dataset.rvb,t=>setStage(t,'backlog'),'Moved to Backlog');return}
  const a=e.target.closest('[data-rva]');if(a){move(a.dataset.rva,t=>archiveTask(t),'Archived');return}
});
$('reviewPg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeReview()}});
