/* ---------- Plan (optional mode, Settings → Modes): time blocks for today ----------
   Today's tasks become blocks on a timeline, each as long as its estimate. Auto-plan fits the unplaced ones around
   what's already there, biggest impact first, from now on. Grey "busy" blocks (lunch, a meeting) keep time free.
   A task's place lives on the task (t.pl = {d: dayKey, s: minutes from midnight}); busy blocks are S.blocks
   [{id, t, d, s, len, rep}] (rep: every day) — both synced, backed up and undoable.
   Phones: a Plan tab, tap a block or an empty hour for choices. Computers: "Plan" under Modes; drag tasks onto the day. */
var pnOn=false,pnBusy=null,pnTmr=false; // pnTmr: planning tomorrow
function planOn(){return !!(S.cfg&&S.cfg.plan)}
var PN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M8 14h5"/></svg>';
const PN_STEP=15;
const pnFrom=()=>{const v=+(S.cfg||{}).planFrom;return Number.isFinite(v)&&v>=0&&v<1440?v:480};
const pnTo=()=>{const v=+(S.cfg||{}).planTo;return Number.isFinite(v)&&v>pnFrom()&&v<=1440?v:1200};
const pnNowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const pnHM=m=>{m=Math.round(m);return `${Math.floor(m/60)%24}:${String(m%60).padStart(2,'0')}`};
const pnLen=t=>Math.max(PN_STEP,+t.est||30);
const pnSnap=m=>Math.round(m/PN_STEP)*PN_STEP;
const pnDesk=()=>matchMedia('(min-width:1100px)').matches;
const pnPx=()=>pnDesk()?1.1:0.95; // pixels per minute

/* the day being planned: today, or tomorrow (Today and This week tasks can go there) */
const pnTomorrow=()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+1);return dkey(d)};
const pnD=()=>pnTmr?pnTomorrow():today();
const pnWord=()=>pnTmr?'tomorrow':'today';
const pnStart=()=>pnTmr?pnFrom():Math.max(pnFrom(),pnNowMin()); // planning starts now today, at the day's start tomorrow
const pnDoneToday=t=>t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===today();
const pnTasks=()=>S.tasks.filter(t=>shown(t)&&!t.inbox&&(pnTmr?(t.stage==='today'||t.stage==='week'):(t.stage==='today'||pnDoneToday(t))));
const pnOpen=t=>t.stage!=='done';
const pnPlaced=t=>!!(t.pl&&t.pl.d===pnD()&&Number.isFinite(+t.pl.s));
const pnOnPlan=()=>pnTasks().filter(pnPlaced).sort((a,b)=>a.pl.s-b.pl.s);
const pnToPlace=()=>priSorted(pnTasks().filter(t=>pnOpen(t)&&!pnPlaced(t)&&!(t.pl&&t.pl.d>pnD())));
const pnBlocks=()=>(S.blocks||[]).filter(b=>b.rep||b.d===pnD()).sort((a,b)=>a.s-b.s);
/* free minutes from now (or the day's start) to the day's end, around busy blocks */
function pnFree(){const from=pnStart(),to=pnTo();if(to<=from)return 0;
  let busy=0;pnBlocks().forEach(b=>{const s=Math.max(from,b.s),e=Math.min(to,b.s+b.len);if(e>s)busy+=e-s});return Math.max(0,to-from-busy)}
/* the earliest gap of `len` minutes from `from`, around everything in `occ` ([start, end] pairs) */
function pnGap(from,len,occ,to){let s=Math.ceil(from/PN_STEP)*PN_STEP;
  for(const [a,b] of [...occ].sort((x,y)=>x[0]-y[0])){if(s+len<=a)break;if(b>s)s=Math.ceil(b/PN_STEP)*PN_STEP}
  return s+len<=to?s:null}
const pnOcc=skip=>[...pnBlocks().map(b=>[b.s,b.s+b.len]),...pnOnPlan().filter(t=>t!==skip).map(t=>[t.pl.s,t.pl.s+pnLen(t)])];
function pnAuto(){const list=pnToPlace();if(!list.length)return toast(`Everything for ${pnWord()} is on the plan`);
  const occ=pnOcc(),from=pnStart(),to=pnTo();let miss=0;const put=[];
  list.forEach(t=>{const s=pnGap(from,pnLen(t),occ,to);if(s==null){miss++;return}occ.push([s,s+pnLen(t)]);put.push([t,s])});
  if(!put.length)return toast(`No free time left ${pnWord()} for ${miss===1?'that task':'those tasks'}`);
  commit(()=>{put.forEach(([t,s])=>{t.pl={d:pnD(),s}})},miss?`${put.length} placed · ${miss} didn't fit`:`${put.length} ${put.length===1?'task':'tasks'} placed`);
  try{sfx('done')}catch(e){}haptic([6,30,8]);drawPlan()}
function pnPlace(t,s){if(s==null){s=pnGap(pnStart(),pnLen(t),pnOcc(t),1440);if(s==null)return toast(`No free time left ${pnWord()}`)}
  s=Math.max(0,Math.min(1440-PN_STEP,pnSnap(s)));commit(()=>{t.pl={d:pnD(),s}},`${t.title} at ${pnHM(s)}${pnTmr?' tomorrow':''}`);haptic(5);drawPlan()}
function pnUnplace(t){commit(()=>{delete t.pl},'Taken off the plan');drawPlan()}

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg pn-pg" id="planPg" role="region" aria-label="Plan"><div class="ib-in" id="pnIn"></div></div>');
function pnRange(){let a=pnFrom(),b=pnTo();pnOnPlan().forEach(t=>{a=Math.min(a,t.pl.s);b=Math.max(b,t.pl.s+pnLen(t))});pnBlocks().forEach(x=>{a=Math.min(a,x.s);b=Math.max(b,x.s+x.len)});
  return [Math.floor(a/60)*60,Math.min(1440,Math.ceil(b/60)*60)]}
/* side-by-side lanes when blocks overlap */
function pnLanes(items){const out=[];let group=[],end=-1;
  const flush=()=>{const lanes=[];group.forEach(it=>{let i=lanes.findIndex(e=>e<=it.s);if(i<0){i=lanes.length;lanes.push(0)}lanes[i]=it.e;it.lane=i});group.forEach(it=>it.n=lanes.length);out.push(...group);group=[]};
  items.sort((a,b)=>a.s-b.s).forEach(it=>{if(it.s>=end&&group.length){flush()}group.push(it);end=Math.max(end,it.e)});if(group.length)flush();return out}
function pnTimeline(){const [a,b]=pnRange(),px=pnPx(),now=pnTmr?-1:pnNowMin();
  const hrs=[];for(let h=a;h<=b;h+=60)hrs.push(`<div class="pn-hr" style="top:${(h-a)*px}px"><span>${pnHM(h)}</span></div>`);
  const items=pnLanes([...pnOnPlan().map(t=>({k:'t',t,s:t.pl.s,e:t.pl.s+pnLen(t)})),...pnBlocks().map(x=>({k:'b',x,s:x.s,e:x.s+x.len}))]);
  const blk=items.map(it=>{const top=(it.s-a)*px,h=Math.max(22,(it.e-it.s)*px-3),w=`left:calc(var(--pn-l) + (100% - var(--pn-l)) * ${it.lane}/${it.n});width:calc((100% - var(--pn-l)) / ${it.n} - 4px)`;
    const tall=h>=44,when=`${pnHM(it.s)} – ${pnHM(it.e)}`;
    if(it.k==='b')return `<button class="pn-blk busy${tall?'':' short'}" data-pnb="${it.x.id}" style="top:${top}px;height:${h}px;${w}" aria-label="${esc(it.x.t)}, ${when}${it.x.cal?', from your calendar':''}"><b>${esc(it.x.t)}</b>${tall?`<small>${when}${it.x.cal?' · calendar':''}</small>`:''}<span class="pn-rs" data-pnrs="b:${it.x.id}" aria-hidden="true"></span></button>`;
    const t=it.t,done=t.stage==='done',cur=!done&&it.s<=now&&now<it.e;
    return `<div class="pn-blk task${done?' done':''}${cur?' cur':''}${tall?'':' short'}" data-pnt="${t.id}" style="top:${top}px;height:${h}px;${w}" ${pnDesk()?'draggable="true"':''} role="button" tabindex="0" aria-label="${esc(t.title)}, ${when}${done?', done':''}">
      <span class="pn-bt"><b>${esc(t.title)}</b>${tall?`<small>${when} · ${fmt(pnLen(t))}</small>`:''}</span>${cur&&tall?`<button class="pn-focus" data-pnfocus="${t.id}">Focus</button>`:''}${done?'':`<span class="pn-rs" data-pnrs="t:${t.id}" aria-hidden="true"></span>`}</div>`}).join('');
  const nowL=now>=a&&now<=b?`<div class="pn-now" style="top:${(now-a)*px}px" aria-label="Now, ${pnHM(now)}"><i></i></div>`:'';
  return `<div class="pn-tl" id="pnTl" style="height:${(b-a)*px}px" data-a="${a}">${hrs.join('')}${blk}${nowL}<div class="pn-drop" id="pnDrop" hidden></div></div>`}
/* on computers a chip is a div: Chromium won't start a drag from a <button> */
const pnChip=t=>{const tag=pnDesk()?'div':'button';return `<${tag} class="pn-chip" data-pnplace="${t.id}" ${pnDesk()?'draggable="true" role="button" tabindex="0"':''}><i></i><span>${esc(t.title)}</span><em>${fmt(pnLen(t))}</em></${tag}>`};
function pnBusyForm(){if(!pnBusy)return '';const b=pnBusy,lens=[15,30,45,60,90,120,180,240];
  return `<div class="pn-form" role="group" aria-label="Busy time"><div class="pn-fh"><b>${b.id?'Busy time':'Add busy time'}</b><button class="icon-btn" data-pnbx aria-label="Close">${X}</button></div>
    <input id="pnBName" value="${esc(b.t)}" maxlength="40" placeholder="What is it? (Lunch, a meeting…)" autocomplete="off" aria-label="Name">
    <div class="pn-frow"><label>From<input type="time" id="pnBFrom" value="${pnHM(b.s).padStart(5,'0')}" step="900"></label>
      <label>For<select id="pnBLen">${lens.map(m=>`<option value="${m}"${m===b.len?' selected':''}>${fmt(m)}</option>`).join('')}</select></label></div>
    <label class="pn-rep"><input type="checkbox" id="pnBRep"${b.rep?' checked':''}> Every day</label>
    <div class="pn-facts">${b.id?`<button class="pn-del" data-pnbdel>Delete</button>`:''}<button class="primary pn-save" data-pnbsave>${b.id?'Save':'Add'}</button></div></div>`}
function drawPlan(){if(!pnOn)return;const y=$('planPg').scrollTop,desk=pnDesk();
  const tp=pnToPlace(),on=pnOnPlan(),todo=(pnTmr?on.filter(pnOpen):pnTasks().filter(t=>t.stage==='today')).reduce((a,t)=>a+pnLen(t),0),free=pnFree();
  const fits=todo<=free,sum=pnTmr?(on.length?`<b>${fmt(todo)}</b> planned · <b>${fmt(free)}</b> free`:'Pick from Today and This week')
    :pnTasks().length?`<b>${fmt(todo)}</b> to do · <b>${fmt(free)}</b> free · ${fits?'it fits':`<span class="pn-over">${fmt(todo-free)} more than you have</span>`}`:'Add tasks to Today to plan your day';
  const dayD=new Date();if(pnTmr)dayD.setDate(dayD.getDate()+1);
  const sw=`<div class="segc pn-sw" role="group" aria-label="Day"><button data-pnday="0" class="${pnTmr?'':'on'}" aria-pressed="${!pnTmr}">Today</button><button data-pnday="1" class="${pnTmr?'on':''}" aria-pressed="${pnTmr}">Tomorrow</button></div>`;
  const calBtn=`<button class="pn-cal" data-pnics>${PN_ICON}Import a calendar</button>`;
  const acts=`<div class="pn-acts">${on.some(t=>t.stage!=='done')?`<button class="pn-clear" data-pnclear>Clear</button>`:''}${tp.length?`<button class="pn-auto" data-pnauto>Auto-plan</button>`:''}</div>`;
  const busyBtn=`<button class="wn-add pn-addb" data-pnbnew><span class="wn-pl">${PLUS_S}</span>Busy time</button>`;
  $('pnIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="pnBack" aria-label="Back">${BACK_SVG}</button>${desk?'':acts}</div>
    <div class="pn-head"><div><span class="pg-eye">${dayD.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</span><h1 class="ib-h wn-h">Plan</h1><div class="pg-sum">${sum}</div></div>${desk?`<div class="pn-hr2">${sw}${acts}</div>`:''}</div>${desk?'':sw}
    ${desk?`<div class="pn-grid"><div class="pn-l">
        <span class="pg-eye pn-lbl">To place · ${tp.length}</span><div class="pn-list">${tp.length?tp.map(pnChip).join(''):`<p class="pn-empty">Everything for ${pnWord()} is on the plan.</p>`}</div>
        ${on.length?`<span class="pg-eye pn-lbl">Placed · ${on.length}</span><div class="pn-list pn-placed">${on.map(t=>`<button class="pn-chip${t.stage==='done'?' done':''}" data-pnt="${t.id}"><i></i><span>${esc(t.title)}</span><em>${pnHM(t.pl.s)}</em></button>`).join('')}</div>`:''}
        ${pnBusy?pnBusyForm():busyBtn}${calBtn}
        <p class="pn-note">Drag a task onto the day, or tap it to put it in the next free spot. Auto-plan fits them around busy time, biggest impact first.</p></div>
      <div class="pn-card">${pnTimeline()}</div></div>`
    :`${pnBusy?pnBusyForm():''}<div class="pn-card">${pnTimeline()}</div>${pnBusy?'':busyBtn+calBtn}
      ${tp.length?`<div class="pn-tray" role="group" aria-label="Not placed"><span class="pn-tl2">Not placed</span><div class="pn-trayl">${tp.map(pnChip).join('')}</div></div>`:''}`}`;
  $('planPg').scrollTop=y;
  if(pnBusy){const i=$('pnBName');if(i&&!pnBusy.focused){pnBusy.focused=true;i.focus({preventScroll:false})}}}
function pnScrollNow(){const tl=$('pnTl');if(!tl)return;const a=+tl.dataset.a,top=tl.getBoundingClientRect().top+$('planPg').scrollTop-$('planPg').getBoundingClientRect().top;
  const y=top+Math.max(0,(pnNowMin()-a-60))*pnPx();if(y>innerHeight*.4)$('planPg').scrollTop=y-120}
function openPlan(){if(!planOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();if(wnOn)closeWins();if(rtOn)closeRoutines();if(typeof closeSearch==='function')closeSearch();
  pnOn=true;pnBusy=null;pnTmr=false;drawPlan();$('planPg').classList.add('on');document.body.classList.add('ib-open');$('planPg').scrollTop=0;pnScrollNow();haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closePlan(){if(!pnOn)return;pnOn=false;pnBusy=null;$('planPg').classList.remove('on');if(!ibOn&&!rhOn&&!wnOn&&!rtOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#planPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
const pnTask=id=>S.tasks.find(t=>String(t.id)===String(id));
/* where on the timeline a pointer is, in minutes (snapped to 15) */
function pnAt(y){const tl=$('pnTl');if(!tl)return null;const r=tl.getBoundingClientRect();return Math.max(0,Math.min(1440-PN_STEP,pnSnap(+tl.dataset.a+(y-r.top)/pnPx())))}
function pnTaskMenu(el,t){const done=t.stage==='done',s=t.pl.s;
  cxOpen(el,[...(!done?[{t:'Focus on this',ic:PLAY,act:()=>{closePlan();startBlitz([t])}}]:[]),
    {t:'Earlier 15 min',ic:ARR_L,act:()=>pnPlace(t,s-PN_STEP)},{t:'Later 15 min',ic:ARR_R,act:()=>pnPlace(t,s+PN_STEP)},
    {t:'Open task',ic:PEN_S,act:()=>openDetail(t.id)},...(!done&&!pnTmr?[{t:'Move to tomorrow',ic:ARR_R,act:()=>{commit(()=>{t.pl={d:pnTomorrow(),s};if(t.stage==='today')setStage(t,'week')},`Tomorrow at ${pnHM(s)}`);drawPlan()}}]:[]),{t:'Take off the plan',ic:X,act:()=>pnUnplace(t)}])}
function pnSlotMenu(el,s){const tp=pnToPlace().slice(0,6);
  cxOpen(el,[...tp.map(t=>({t:`${t.title} · ${fmt(pnLen(t))}`,ic:PLUS_S,act:()=>pnPlace(t,s)})),
    {t:`Busy time at ${pnHM(s)}`,ic:PN_ICON,act:()=>{pnBusy={t:'',s,len:60,rep:false};drawPlan()}}])}
$('planPg').addEventListener('click',e=>{
  if(e.target.closest('#pnBack'))return closePlan();
  if(pnResized){pnResized=false;return}
  const dy=e.target.closest('[data-pnday]');if(dy){pnTmr=dy.dataset.pnday==='1';pnBusy=null;haptic(4);drawPlan();if(!pnTmr)pnScrollNow();else $('planPg').scrollTop=0;return}
  if(e.target.closest('[data-pnics]'))return pnIcsPick();
  if(e.target.closest('[data-pnauto]'))return pnAuto();
  if(e.target.closest('[data-pnclear]')){const on=pnOnPlan().filter(t=>t.stage!=='done');commit(()=>on.forEach(t=>delete t.pl),'Plan cleared');return drawPlan()}
  const f=e.target.closest('[data-pnfocus]');if(f){const t=pnTask(f.dataset.pnfocus);if(t){closePlan();startBlitz([t])}return}
  if(e.target.closest('[data-pnbnew]')){pnBusy={t:'',s:Math.ceil(pnStart()/PN_STEP)*PN_STEP,len:60,rep:false};return drawPlan()}
  if(e.target.closest('[data-pnbx]')){pnBusy=null;return drawPlan()}
  if(e.target.closest('[data-pnbsave]'))return pnBusySave();
  if(e.target.closest('[data-pnbdel]')){const id=pnBusy.id;pnBusy=null;commit(()=>{S.blocks=(S.blocks||[]).filter(b=>b.id!==id)},'Busy time deleted');return drawPlan()}
  const pc=e.target.closest('[data-pnplace]');if(pc){const t=pnTask(pc.dataset.pnplace);if(t)pnPlace(t,null);return}
  const b=e.target.closest('[data-pnb]');if(b){const x=(S.blocks||[]).find(v=>String(v.id)===b.dataset.pnb);if(x){pnBusy={...x};drawPlan()}return}
  const tb=e.target.closest('[data-pnt]');if(tb){e.stopPropagation();const t=pnTask(tb.dataset.pnt);if(t&&pnPlaced(t))pnTaskMenu(tb,t);return}
  if(e.target.closest('#pnTl')&&!e.target.closest('.pn-blk,.pn-now')){e.stopPropagation();const s=pnAt(e.clientY);if(s==null)return;
    const d=$('pnDrop');d.hidden=false;d.style.top=(s-+$('pnTl').dataset.a)*pnPx()+'px';d.style.height=30*pnPx()+'px';d.textContent=pnHM(s);
    pnSlotMenu(d,s);setTimeout(()=>{const w=()=>{if(!document.querySelector('.cx-pop.on')){d.hidden=true;clearInterval(iv)}},iv=setInterval(w,200)},300)}});
$('planPg').addEventListener('keydown',e=>{
  if(e.target.closest('.pn-form')){if(e.key==='Enter'&&e.target.tagName!=='SELECT'){e.preventDefault();pnBusySave()}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();pnBusy=null;drawPlan()}return}
  const ch=e.target.closest('div[data-pnplace]');if(ch&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const t=pnTask(ch.dataset.pnplace);if(t)pnPlace(t,null);return}
  const tb=e.target.closest('.pn-blk.task');if(tb&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const t=pnTask(tb.dataset.pnt);if(t)pnTaskMenu(tb,t)}});
function pnBusySave(){const b=pnBusy;if(!b)return;const name=($('pnBName').value||'').trim()||'Busy',[h,m]=($('pnBFrom').value||'').split(':').map(Number),len=+$('pnBLen').value||60,rep=$('pnBRep').checked;
  const s=Number.isFinite(h)&&Number.isFinite(m)?h*60+m:b.s;pnBusy=null;
  commit(()=>{S.blocks=S.blocks||[];if(b.id){const x=S.blocks.find(v=>v.id===b.id);if(x)Object.assign(x,{t:name.slice(0,40),s,len,rep,d:x.rep&&rep?x.d:pnD()})}else S.blocks.push({id:newId(),t:name.slice(0,40),d:pnD(),s,len,rep})},b.id?'Busy time saved':'Busy time added');
  haptic(5);drawPlan()}
/* computers: drag a task (from the list or the day) onto the timeline */
let pnDragId=null;
$('planPg').addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('.pn-rs')||pnRs){e.preventDefault();return}const el=e.target.closest('[data-pnplace],.pn-blk.task');if(!el)return;pnDragId=el.dataset.pnplace||el.dataset.pnt;
  try{e.dataTransfer.setData('text/plain',String(pnDragId));e.dataTransfer.effectAllowed='move'}catch(err){}el.classList.add('pn-dragging')});
$('planPg').addEventListener('dragend',e=>{pnDragId=null;document.querySelectorAll('.pn-dragging').forEach(x=>x.classList.remove('pn-dragging'));const d=$('pnDrop');if(d)d.hidden=true});
$('planPg').addEventListener('dragover',e=>{if(pnDragId==null||!e.target.closest('#pnTl'))return;e.preventDefault();const t=pnTask(pnDragId),s=pnAt(e.clientY);if(!t||s==null)return;
  const d=$('pnDrop');d.hidden=false;d.style.top=(s-+$('pnTl').dataset.a)*pnPx()+'px';d.style.height=pnLen(t)*pnPx()-3+'px';d.textContent=`${t.title} · ${pnHM(s)} – ${pnHM(s+pnLen(t))}`});
$('planPg').addEventListener('drop',e=>{if(pnDragId==null||!e.target.closest('#pnTl'))return;e.preventDefault();const t=pnTask(pnDragId),s=pnAt(e.clientY);pnDragId=null;if(t&&s!=null)pnPlace(t,s)});

/* ---------- resize: drag a block's bottom edge (15-minute steps). A task's length is its estimate. ---------- */
let pnRs=null,pnResized=false;
$('planPg').addEventListener('pointerdown',e=>{const h=e.target.closest('.pn-rs');if(!h)return;e.preventDefault();e.stopPropagation();
  const [k,id]=h.dataset.pnrs.split(':'),blk=h.closest('.pn-blk'),it=k==='t'?pnTask(id):(S.blocks||[]).find(b=>String(b.id)===id);if(!it||!blk)return;
  pnRs={k,it,blk,y:e.clientY,len:k==='t'?pnLen(it):it.len,s:k==='t'?it.pl.s:it.s,nl:null};blk.classList.add('pn-sizing');try{h.setPointerCapture(e.pointerId)}catch(err){}});
$('planPg').addEventListener('pointermove',e=>{if(!pnRs)return;e.preventDefault();
  const nl=Math.max(PN_STEP,Math.min(600,pnSnap(pnRs.len+(e.clientY-pnRs.y)/pnPx())));if(nl===pnRs.nl)return;pnRs.nl=nl;
  pnRs.blk.style.height=Math.max(22,nl*pnPx()-3)+'px';const sm=pnRs.blk.querySelector('small');if(sm)sm.textContent=`${pnHM(pnRs.s)} – ${pnHM(pnRs.s+nl)} · ${fmt(nl)}`;haptic(3)});
function pnRsEnd(){if(!pnRs)return;const r=pnRs;pnRs=null;r.blk.classList.remove('pn-sizing');if(r.nl==null||r.nl===r.len)return;pnResized=true;setTimeout(()=>pnResized=false,350);
  commit(()=>{if(r.k==='t')r.it.est=r.nl;else r.it.len=r.nl},r.k==='t'?`${r.it.title}: ${fmt(r.nl)}`:`${r.it.t}: ${fmt(r.nl)}`);drawPlan()}
$('planPg').addEventListener('pointerup',pnRsEnd);$('planPg').addEventListener('pointercancel',pnRsEnd);

/* ---------- import a calendar (.ics file from Google, Outlook or Apple Calendar): events become busy time ----------
   Today's and tomorrow's timed events (daily and weekly repeats included) replace what an earlier import added.
   All-day events don't block time. Times with a time zone name are read as your local time. */
function pnIcsDate(v){const m=/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?(Z)?)?$/.exec(v.trim());if(!m)return null;
  const [_,y,mo,d,h,mi,se,z]=m;if(h==null)return {all:true,d:new Date(+y,+mo-1,+d,12)};
  return {d:z?new Date(Date.UTC(+y,+mo-1,+d,+h,+mi,+(se||0))):new Date(+y,+mo-1,+d,+h,+mi,+(se||0))}}
function pnIcsParse(txt,days){const lines=txt.replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'').split(/\r?\n/),out=[];let ev=null;
  const BD={SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};
  for(const ln of lines){if(ln==='BEGIN:VEVENT'){ev={};continue}if(ln==='END:VEVENT'){if(ev)out.push(ev);ev=null;continue}if(!ev)continue;
    const i=ln.indexOf(':');if(i<0)continue;const key=ln.slice(0,i).split(';')[0].toUpperCase(),val=ln.slice(i+1);
    if(key==='SUMMARY')ev.t=val.replace(/\\,/g,',').replace(/\;/g,';').replace(/\\n/gi,' ').trim();
    else if(key==='DTSTART')ev.s=pnIcsDate(val);else if(key==='DTEND')ev.e=pnIcsDate(val);
    else if(key==='DURATION'){const m=/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(val);if(m)ev.dur=((+m[1]||0)*1440+(+m[2]||0)*60+(+m[3]||0))}
    else if(key==='RRULE')ev.rr=Object.fromEntries(val.split(';').map(p=>p.split('=')));
    else if(key==='STATUS'&&val.trim()==='CANCELLED')ev.cancel=true}
  const res=[];
  out.forEach(ev=>{if(!ev.s||ev.s.all||ev.cancel)return;const st=ev.s.d,len=ev.e&&!ev.e.all?Math.round((ev.e.d-st)/60000):(ev.dur||60);if(!(len>0))return;
    const sMin=st.getHours()*60+st.getMinutes(),k0=dkey(st);
    days.forEach(k=>{const day=new Date(k+'T12:00:00');let hit=k===k0;
      if(!hit&&ev.rr&&k>k0){const f=ev.rr.FREQ,until=ev.rr.UNTIL?pnIcsDate(ev.rr.UNTIL):null;if(until&&dkey(until.d)<k)return;
        const iv=+ev.rr.INTERVAL||1,diff=Math.round((day-new Date(k0+'T12:00:00'))/864e5);
        if(f==='DAILY')hit=diff%iv===0;
        else if(f==='WEEKLY'){const bd=ev.rr.BYDAY?ev.rr.BYDAY.split(',').map(x=>BD[x.slice(-2)]):[st.getDay()];hit=bd.includes(day.getDay())&&Math.floor(diff/7)%iv===0}
        if(hit&&ev.rr.COUNT){/* a counted series: stop once it has run its course (close enough for daily and weekly) */const n=+ev.rr.COUNT;if(f==='DAILY'&&diff/iv>=n)hit=false;if(f==='WEEKLY'&&diff/7/iv>=n)hit=false}}
      if(!hit)return;const s=Math.max(0,sMin),e=Math.min(1440,sMin+len);if(e<=s)return;
      res.push({t:(ev.t||'Busy').slice(0,40),d:k,s,len:e-s})})});
  return res}
function pnIcsPick(){let i=$('pnIcs');if(!i){document.body.insertAdjacentHTML('beforeend','<input type="file" id="pnIcs" accept=".ics,text/calendar" hidden>');i=$('pnIcs');
    i.addEventListener('change',()=>{const f=i.files&&i.files[0];i.value='';if(!f)return;f.text().then(pnIcsImport).catch(()=>toast('Could not read that file'))})}
  i.click()}
function pnIcsImport(txt){if(!/BEGIN:VCALENDAR/.test(txt))return toast('That doesn’t look like a calendar file (.ics)');
  const days=[today(),pnTomorrow()],evs=pnIcsParse(txt,days);
  commit(()=>{S.blocks=(S.blocks||[]).filter(b=>!(b.cal&&days.includes(b.d)));evs.forEach(x=>S.blocks.push({id:newId(),...x,cal:1}))},
    evs.length?`${evs.length} ${evs.length===1?'event':'events'} from your calendar`:'No timed events today or tomorrow');
  haptic(6);drawPlan()}
/* a task you placed for tomorrow from This week moves to Today when its day comes */
let pnRollDay=null;
function pnRoll(){if(pnRollDay===today()||!planOn())return;pnRollDay=today();const k=today();let n=0;
  S.tasks.forEach(t=>{if(t.pl&&t.pl.d===k&&t.stage==='week'&&shown(t)){setStage(t,'today');n++}});if(n){save();setTimeout(()=>render(),0);toast(`${n} planned ${n===1?'task':'tasks'} moved to Today`)}}

/* ---------- keep it fresh: the now line moves, finished tasks fade ---------- */
const _pnRender=render;render=function(d){_pnRender(d);try{pnRoll();if(pnOn){if(!planOn())closePlan();else if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest('#planPg .pn-form'))drawPlan()}}catch(err){console.error(err)}};
setInterval(()=>{if(pnOn&&!pnBusy&&!pnDragId&&!document.querySelector('.cx-pop.on'))drawPlan()},60000);

/* ---------- computers: "Plan" under Modes in the sidebar ---------- */
const _pnSide=rhythmSide;
rhythmSide=function(){const h=_pnSide();if(!planOn())return h;const n=pnToPlace().length;
  const it=`<button class="s-list s-home s-inbox ${pnOn?'on':''}" id="sPlan" title="Plan">${PN_ICON}<span class="s-name">Plan</span>${n?`<span class="n">${n}</span>`:''}</button>`;
  return h?h+it:`<div class="s-lbl2"><span class="s-name">Modes</span></div>${it}`};
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sPlan')){e.stopImmediatePropagation();return pnOn?closePlan():openPlan()}
  if(pnOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l],#sInbox,#sRhythm,#sGoals,[data-sgoal],[data-sgnew],#sMetrics,#sWins,#sRoutines'))closePlan()},true);
for(const fn of ['openInbox','openRhythm','openGoals','openGoal','goHome','openSpaceSide','openMetrics','openWins','openRoutines']){const f=window[fn];if(typeof f!=='function')continue;
  window[fn]=function(){if(pnOn)closePlan();return f.apply(this,arguments)}}
const _pnDesk=renderDesk;renderDesk=function(){_pnDesk.apply(this,arguments);if(pnOn){const h=$('sHome');if(h)h.classList.remove('on')}};
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!pnOn||e.defaultPrevented||$('dlg').classList.contains('on')||document.querySelector('.sheet.on,.cx-pop.on'))return;
  if(e.target&&e.target.closest&&e.target.closest('#planPg input,#planPg select'))return;if(!pnDesk())return;e.preventDefault();closePlan()});
ESC_PAGES.planPg=()=>{if(pnBusy){pnBusy=null;return drawPlan()}closePlan()};

/* ---------- phones: a Plan tab ---------- */
TB_I.plan=PN_ICON;
const _pnTabs=tabsList;
tabsList=function(){let t=_pnTabs();if(!planOn())return t;t=t.length?t:[['home','Home',TB_HOME]];t.push(['plan','Plan',PN_ICON]);return t};
const _pnTabNow=tabNow;tabNow=function(){return pnOn?'plan':_pnTabNow()};
const _pnTbGo=tbGo;
tbGo=function(k){
  if(k==='plan'){if(pnOn){$('planPg').scrollTo({top:0,behavior:'smooth'});return}_pnTbGo('home');openPlan();return drawTabs()}
  if(pnOn)closePlan();return _pnTbGo(k)};
const _pnApply=applySettings;applySettings=function(){_pnApply.apply(this,arguments);if(pnOn&&!planOn())closePlan()};

/* ---------- Settings → Modes: a Plan card, with the hours of your day ---------- */
const _pnModes=modesPage;
modesPage=function(){const h=_pnModes.apply(this,arguments),on=planOn();
  const hrs=(k,v)=>`<select class="pn-hsel" data-pnh="${k}" aria-label="${k==='planFrom'?'Day starts':'Day ends'}">${Array.from({length:k==='planFrom'?16:18},(_,i)=>(k==='planFrom'?4:7)+i).map(x=>x*60).filter(m=>m<=1440).map(m=>`<option value="${m}"${m===v?' selected':''}>${pnHM(m)}</option>`).join('')}</select>`;
  const card=`<div class="md-card${on?' on':''}" data-md="plan"><div class="md-head"><span class="md-ic">${PN_ICON}</span><span class="md-t"><b>Plan</b><small>Time blocks for today</small></span>${tg('plan')}</div>
    ${on?`<div class="md-body"><p class="md-note">Your Today tasks become blocks on a timeline. Auto-plan fits them around busy time, biggest impact first.</p>
      <div class="pn-hours"><span>Your day</span>${hrs('planFrom',pnFrom())}<span>to</span>${hrs('planTo',pnTo())}</div></div>`:''}</div>`;
  const i=h.indexOf('<div class="set-sec"><h3>Everyday');if(i<0)return h+card;const j=h.lastIndexOf('</div>',i);return h.slice(0,j)+card+h.slice(j)};
$('setIn').addEventListener('change',e=>{const s=e.target.closest('[data-pnh]');if(!s)return;const k=s.dataset.pnh,v=+s.value;
  if(k==='planTo'&&v<=pnFrom())return toast('The day has to end after it starts');if(k==='planFrom'&&v>=pnTo())return toast('The day has to start before it ends');
  S.cfg[k]=v;S.cfgU=Date.now();save();haptic(4);if(pnOn)drawPlan()});
