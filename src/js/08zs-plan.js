/* ---------- Plan (optional mode, Settings → Modes): time blocks for today ----------
   Today's tasks become blocks on a timeline, each as long as its estimate. Auto-plan fits the unplaced ones around
   what's already there, biggest impact first, from now on. Grey "busy" blocks (lunch, a meeting) keep time free.
   A task's place lives on the task (t.pl = {d: dayKey, s: minutes from midnight}); busy blocks are S.blocks
   [{id, t, d, s, len, rep}] (rep: every day) — both synced, backed up and undoable.
   Phones: a Plan tab, tap a block or an empty hour for choices. Computers: "Plan" under Modes; drag tasks onto the day. */
var pnOn=false,pnBusy=null;
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

/* today's tasks: on the plan (placed today) or waiting to be placed */
const pnDoneToday=t=>t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===today();
const pnTasks=()=>S.tasks.filter(t=>shown(t)&&!t.inbox&&(t.stage==='today'||pnDoneToday(t)));
const pnPlaced=t=>!!(t.pl&&t.pl.d===today()&&Number.isFinite(+t.pl.s));
const pnOnPlan=()=>pnTasks().filter(pnPlaced).sort((a,b)=>a.pl.s-b.pl.s);
const pnToPlace=()=>priSorted(pnTasks().filter(t=>t.stage==='today'&&!pnPlaced(t)));
const pnBlocks=()=>(S.blocks||[]).filter(b=>b.rep||b.d===today()).sort((a,b)=>a.s-b.s);
/* free minutes from now (or the day's start) to the day's end, around busy blocks */
function pnFree(){const from=Math.max(pnFrom(),pnNowMin()),to=pnTo();if(to<=from)return 0;
  let busy=0;pnBlocks().forEach(b=>{const s=Math.max(from,b.s),e=Math.min(to,b.s+b.len);if(e>s)busy+=e-s});return Math.max(0,to-from-busy)}
/* the earliest gap of `len` minutes from `from`, around everything in `occ` ([start, end] pairs) */
function pnGap(from,len,occ,to){let s=Math.ceil(from/PN_STEP)*PN_STEP;
  for(const [a,b] of [...occ].sort((x,y)=>x[0]-y[0])){if(s+len<=a)break;if(b>s)s=Math.ceil(b/PN_STEP)*PN_STEP}
  return s+len<=to?s:null}
const pnOcc=skip=>[...pnBlocks().map(b=>[b.s,b.s+b.len]),...pnOnPlan().filter(t=>t!==skip).map(t=>[t.pl.s,t.pl.s+pnLen(t)])];
function pnAuto(){const list=pnToPlace();if(!list.length)return toast('Everything for today is on the plan');
  const occ=pnOcc(),from=Math.max(pnFrom(),pnNowMin()),to=pnTo();let miss=0;const put=[];
  list.forEach(t=>{const s=pnGap(from,pnLen(t),occ,to);if(s==null){miss++;return}occ.push([s,s+pnLen(t)]);put.push([t,s])});
  if(!put.length)return toast(`No free time left today for ${miss===1?'that task':'those tasks'}`);
  commit(()=>{put.forEach(([t,s])=>{t.pl={d:today(),s}})},miss?`${put.length} placed · ${miss} didn't fit`:`${put.length} ${put.length===1?'task':'tasks'} placed`);
  try{sfx('done')}catch(e){}haptic([6,30,8]);drawPlan()}
function pnPlace(t,s){if(s==null){s=pnGap(Math.max(pnFrom(),pnNowMin()),pnLen(t),pnOcc(t),1440);if(s==null)return toast('No free time left today')}
  s=Math.max(0,Math.min(1440-PN_STEP,pnSnap(s)));commit(()=>{t.pl={d:today(),s}},`${t.title} at ${pnHM(s)}`);haptic(5);drawPlan()}
function pnUnplace(t){commit(()=>{delete t.pl},'Taken off the plan');drawPlan()}

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg pn-pg" id="planPg" role="region" aria-label="Plan"><div class="ib-in" id="pnIn"></div></div>');
function pnRange(){let a=pnFrom(),b=pnTo();pnOnPlan().forEach(t=>{a=Math.min(a,t.pl.s);b=Math.max(b,t.pl.s+pnLen(t))});pnBlocks().forEach(x=>{a=Math.min(a,x.s);b=Math.max(b,x.s+x.len)});
  return [Math.floor(a/60)*60,Math.min(1440,Math.ceil(b/60)*60)]}
/* side-by-side lanes when blocks overlap */
function pnLanes(items){const out=[];let group=[],end=-1;
  const flush=()=>{const lanes=[];group.forEach(it=>{let i=lanes.findIndex(e=>e<=it.s);if(i<0){i=lanes.length;lanes.push(0)}lanes[i]=it.e;it.lane=i});group.forEach(it=>it.n=lanes.length);out.push(...group);group=[]};
  items.sort((a,b)=>a.s-b.s).forEach(it=>{if(it.s>=end&&group.length){flush()}group.push(it);end=Math.max(end,it.e)});if(group.length)flush();return out}
function pnTimeline(){const [a,b]=pnRange(),px=pnPx(),now=pnNowMin();
  const hrs=[];for(let h=a;h<=b;h+=60)hrs.push(`<div class="pn-hr" style="top:${(h-a)*px}px"><span>${pnHM(h)}</span></div>`);
  const items=pnLanes([...pnOnPlan().map(t=>({k:'t',t,s:t.pl.s,e:t.pl.s+pnLen(t)})),...pnBlocks().map(x=>({k:'b',x,s:x.s,e:x.s+x.len}))]);
  const blk=items.map(it=>{const top=(it.s-a)*px,h=Math.max(22,(it.e-it.s)*px-3),w=`left:calc(var(--pn-l) + (100% - var(--pn-l)) * ${it.lane}/${it.n});width:calc((100% - var(--pn-l)) / ${it.n} - 4px)`;
    const tall=h>=44,when=`${pnHM(it.s)} – ${pnHM(it.e)}`;
    if(it.k==='b')return `<button class="pn-blk busy${tall?'':' short'}" data-pnb="${it.x.id}" style="top:${top}px;height:${h}px;${w}" aria-label="${esc(it.x.t)}, ${when}"><b>${esc(it.x.t)}</b>${tall?`<small>${when}</small>`:''}</button>`;
    const t=it.t,done=t.stage==='done',cur=!done&&it.s<=now&&now<it.e;
    return `<div class="pn-blk task${done?' done':''}${cur?' cur':''}${tall?'':' short'}" data-pnt="${t.id}" style="top:${top}px;height:${h}px;${w}" ${pnDesk()?'draggable="true"':''} role="button" tabindex="0" aria-label="${esc(t.title)}, ${when}${done?', done':''}">
      <span class="pn-bt"><b>${esc(t.title)}</b>${tall?`<small>${when} · ${fmt(pnLen(t))}</small>`:''}</span>${cur&&tall?`<button class="pn-focus" data-pnfocus="${t.id}">Focus</button>`:''}</div>`}).join('');
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
  const tp=pnToPlace(),on=pnOnPlan(),todo=pnTasks().filter(t=>t.stage==='today').reduce((a,t)=>a+pnLen(t),0),free=pnFree();
  const fits=todo<=free,sum=pnTasks().length?`<b>${fmt(todo)}</b> to do · <b>${fmt(free)}</b> free · ${fits?'it fits':`<span class="pn-over">${fmt(todo-free)} more than you have</span>`}`:'Add tasks to Today to plan your day';
  const acts=`<div class="pn-acts">${on.some(t=>t.stage!=='done')?`<button class="pn-clear" data-pnclear>Clear</button>`:''}${tp.length?`<button class="pn-auto" data-pnauto>Auto-plan</button>`:''}</div>`;
  const busyBtn=`<button class="wn-add pn-addb" data-pnbnew><span class="wn-pl">${PLUS_S}</span>Busy time</button>`;
  $('pnIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="pnBack" aria-label="Back">${BACK_SVG}</button>${desk?'':acts}</div>
    <div class="pn-head"><div><span class="pg-eye">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</span><h1 class="ib-h wn-h">Plan</h1><div class="pg-sum">${sum}</div></div>${desk?acts:''}</div>
    ${desk?`<div class="pn-grid"><div class="pn-l">
        <span class="pg-eye pn-lbl">To place · ${tp.length}</span><div class="pn-list">${tp.length?tp.map(pnChip).join(''):'<p class="pn-empty">Everything for today is on the plan.</p>'}</div>
        ${on.length?`<span class="pg-eye pn-lbl">Placed · ${on.length}</span><div class="pn-list pn-placed">${on.map(t=>`<button class="pn-chip${t.stage==='done'?' done':''}" data-pnt="${t.id}"><i></i><span>${esc(t.title)}</span><em>${pnHM(t.pl.s)}</em></button>`).join('')}</div>`:''}
        ${pnBusy?pnBusyForm():busyBtn}
        <p class="pn-note">Drag a task onto the day, or tap it to put it in the next free spot. Auto-plan fits them around busy time, biggest impact first.</p></div>
      <div class="pn-card">${pnTimeline()}</div></div>`
    :`${pnBusy?pnBusyForm():''}<div class="pn-card">${pnTimeline()}</div>${pnBusy?'':busyBtn}
      ${tp.length?`<div class="pn-tray" role="group" aria-label="Not placed"><span class="pn-tl2">Not placed</span><div class="pn-trayl">${tp.map(pnChip).join('')}</div></div>`:''}`}`;
  $('planPg').scrollTop=y;
  if(pnBusy){const i=$('pnBName');if(i&&!pnBusy.focused){pnBusy.focused=true;i.focus({preventScroll:false})}}}
function pnScrollNow(){const tl=$('pnTl');if(!tl)return;const a=+tl.dataset.a,top=tl.getBoundingClientRect().top+$('planPg').scrollTop-$('planPg').getBoundingClientRect().top;
  const y=top+Math.max(0,(pnNowMin()-a-60))*pnPx();if(y>innerHeight*.4)$('planPg').scrollTop=y-120}
function openPlan(){if(!planOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();if(wnOn)closeWins();if(rtOn)closeRoutines();if(typeof closeSearch==='function')closeSearch();
  pnOn=true;pnBusy=null;drawPlan();$('planPg').classList.add('on');document.body.classList.add('ib-open');$('planPg').scrollTop=0;pnScrollNow();haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closePlan(){if(!pnOn)return;pnOn=false;pnBusy=null;$('planPg').classList.remove('on');if(!ibOn&&!rhOn&&!wnOn&&!rtOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#planPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
const pnTask=id=>S.tasks.find(t=>String(t.id)===String(id));
/* where on the timeline a pointer is, in minutes (snapped to 15) */
function pnAt(y){const tl=$('pnTl');if(!tl)return null;const r=tl.getBoundingClientRect();return Math.max(0,Math.min(1440-PN_STEP,pnSnap(+tl.dataset.a+(y-r.top)/pnPx())))}
function pnTaskMenu(el,t){const done=t.stage==='done',s=t.pl.s;
  cxOpen(el,[...(!done?[{t:'Focus on this',ic:PLAY,act:()=>{closePlan();startBlitz([t])}}]:[]),
    {t:'Earlier 15 min',ic:ARR_L,act:()=>pnPlace(t,s-PN_STEP)},{t:'Later 15 min',ic:ARR_R,act:()=>pnPlace(t,s+PN_STEP)},
    {t:'Open task',ic:PEN_S,act:()=>openDetail(t.id)},{t:'Take off the plan',ic:X,act:()=>pnUnplace(t)}])}
function pnSlotMenu(el,s){const tp=pnToPlace().slice(0,6);
  cxOpen(el,[...tp.map(t=>({t:`${t.title} · ${fmt(pnLen(t))}`,ic:PLUS_S,act:()=>pnPlace(t,s)})),
    {t:`Busy time at ${pnHM(s)}`,ic:PN_ICON,act:()=>{pnBusy={t:'',s,len:60,rep:false};drawPlan()}}])}
$('planPg').addEventListener('click',e=>{
  if(e.target.closest('#pnBack'))return closePlan();
  if(e.target.closest('[data-pnauto]'))return pnAuto();
  if(e.target.closest('[data-pnclear]')){const on=pnOnPlan().filter(t=>t.stage!=='done');commit(()=>on.forEach(t=>delete t.pl),'Plan cleared');return drawPlan()}
  const f=e.target.closest('[data-pnfocus]');if(f){const t=pnTask(f.dataset.pnfocus);if(t){closePlan();startBlitz([t])}return}
  if(e.target.closest('[data-pnbnew]')){pnBusy={t:'',s:Math.max(pnFrom(),Math.ceil(pnNowMin()/PN_STEP)*PN_STEP),len:60,rep:false};return drawPlan()}
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
  commit(()=>{S.blocks=S.blocks||[];if(b.id){const x=S.blocks.find(v=>v.id===b.id);if(x)Object.assign(x,{t:name.slice(0,40),s,len,rep,d:today()})}else S.blocks.push({id:newId(),t:name.slice(0,40),d:today(),s,len,rep})},b.id?'Busy time saved':'Busy time added');
  haptic(5);drawPlan()}
/* computers: drag a task (from the list or the day) onto the timeline */
let pnDragId=null;
$('planPg').addEventListener('dragstart',e=>{const el=e.target.closest('[data-pnplace],.pn-blk.task');if(!el)return;pnDragId=el.dataset.pnplace||el.dataset.pnt;
  try{e.dataTransfer.setData('text/plain',String(pnDragId));e.dataTransfer.effectAllowed='move'}catch(err){}el.classList.add('pn-dragging')});
$('planPg').addEventListener('dragend',e=>{pnDragId=null;document.querySelectorAll('.pn-dragging').forEach(x=>x.classList.remove('pn-dragging'));const d=$('pnDrop');if(d)d.hidden=true});
$('planPg').addEventListener('dragover',e=>{if(pnDragId==null||!e.target.closest('#pnTl'))return;e.preventDefault();const t=pnTask(pnDragId),s=pnAt(e.clientY);if(!t||s==null)return;
  const d=$('pnDrop');d.hidden=false;d.style.top=(s-+$('pnTl').dataset.a)*pnPx()+'px';d.style.height=pnLen(t)*pnPx()-3+'px';d.textContent=`${t.title} · ${pnHM(s)} – ${pnHM(s+pnLen(t))}`});
$('planPg').addEventListener('drop',e=>{if(pnDragId==null||!e.target.closest('#pnTl'))return;e.preventDefault();const t=pnTask(pnDragId),s=pnAt(e.clientY);pnDragId=null;if(t&&s!=null)pnPlace(t,s)});

/* ---------- keep it fresh: the now line moves, finished tasks fade ---------- */
const _pnRender=render;render=function(d){_pnRender(d);try{if(pnOn){if(!planOn())closePlan();else if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest('#planPg .pn-form'))drawPlan()}}catch(err){console.error(err)}};
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
