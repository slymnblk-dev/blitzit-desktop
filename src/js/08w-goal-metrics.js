/* ---------- Goals ↔ KPIs & OKRs (always optional) ----------
   Ladder: Goal (months, years) › OKR (this quarter) › KPI (every week) › tasks (today).
   1 · Measured by: a goal links KPIs and OKRs it already has (⋯ → Measured by…). The goal page shows them as small
       cards (KPIs coral, OKRs violet); Metrics tags them with the goal.  Data: g.mx=[{k:'kpi'|'okr',id,tasks?}]
   2 · New OKR for this goal: the objective and quarter end are filled in; one tap turns the milestones into key results.
   3 · Finish lines: a milestone can finish itself when a number reaches a value.  Data: m.fin={k:'kpi'|'kr',id,okr?,at,hit?}
   Gaps: links work across spaces; ticking a goal's own mini tasks can add 1 to a linked KPI (g.mx[].tasks);
   achieved goals keep their KPIs and OKRs running (Metrics marks them 🏆); deleted KPIs/OKRs quietly drop out. */
const GMX_OKR_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
const GMX_FLAG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4"/><path d="M6 4.5h11l-2.2 4.2L17 13H6"/></svg>';
const gmxKpi=id=>(S.kpis||[]).find(x=>String(x.id)===String(id)&&mxSpOk(x.space));
const gmxOkr=id=>(S.okrs||[]).find(x=>String(x.id)===String(id)&&mxSpOk(x.space));
const gmxLinks=g=>(Array.isArray(g&&g.mx)?g.mx:[]).filter(l=>l.k==='kpi'?gmxKpi(l.id):gmxOkr(l.id));
const gmxGoalsOf=(k,id)=>(S.goals||[]).filter(g=>Array.isArray(g.mx)&&g.mx.some(l=>l.k===k&&String(l.id)===String(id)));
const gmxOn=()=>typeof mxOn==='function'&&mxOn()&&goalsOn();

/* ===== 1 · Measured by, on the goal page ===== */
function gmxSection(g){const ls=gmxLinks(g);if(!ls.length||!mxOn())return '';
  const its=mxHomeItems();
  const rows=ls.map(l=>{if(l.k==='kpi'){const k=gmxKpi(l.id),x=its.find(y=>y.kind==='kpi'&&y.k===k)||{p:mxKpiP(k),behind:0},v=mxKpiNow(k);
      return `<button class="gmx-row kpi${x.behind>.15?' late':''}" data-mxhw="kpi:${k.id}:${k.space}"><span class="gmx-ic">${MX_ICON}</span><span class="gmx-t"><b>${esc(k.name)}</b><small>KPI · ${MX_PER[k.period]||''}</small></span>
        <span class="gmx-v"><b>${v==null&&k.kind==='last'?'—':mxFmt(v??0,k.unit)}</b><small>/ ${mxFmt(+k.target,k.unit)}${mxUw(k.unit)}</small></span><span class="gmx-bar"><span class="mx-bar"><i style="width:${(x.p*100).toFixed(1)}%"></i></span></span></button>`}
    const o=gmxOkr(l.id),p=o.closed?(o.score||0):mxOkrP(o);
    return `<button class="gmx-row okr" data-mxhw="okr:${o.id}:${o.space}"><span class="gmx-ic">${GMX_OKR_I}</span><span class="gmx-t"><b>${esc(o.name)}</b><small>OKR · ${o.closed?'closed':esc(mxOkrWhen(o))}</small></span>
      <span class="gmx-v"><b>${Math.round(p*100)}%</b></span><span class="gmx-bar"><span class="mx-bar"><i style="width:${(p*100).toFixed(1)}%"></i></span></span></button>`}).join('');
  return `<section class="gmx" aria-label="Measured by"><div class="gmx-h"><span>Measured by</span><button class="gmx-ed" data-gmlink>Edit</button></div><div class="gmx-l">${rows}</div></section>`}
/* a finish line chip under the milestone you're looking at */
function gmxFinVal(f){if(!f)return null;if(f.k==='kpi'){const k=gmxKpi(f.id);return k?{name:k.name,v:mxKpiNow(k)??0,unit:k.unit,down:k.better==='down'}:null}
  const o=gmxOkr(f.okr),r=o&&o.krs.find(x=>String(x.id)===String(f.id));return r?{name:r.name,v:mxKrNow(r),unit:r.unit,down:false}:null}
const gmxReached=(f,fv)=>fv&&(fv.down?fv.v<=+f.at:fv.v>=+f.at);
function gmxFinChip(m){const f=m.fin,fv=gmxFinVal(f);if(!fv)return '';
  return `<button class="gfl${m.done?' done':''}" data-gfin="${m.id}" title="Finish line">${GMX_FLAG}<span>${m.done?'Reached':'Done at'} <b>${mxFmt(+f.at,fv.unit)}</b> ${esc(fv.name)}${m.done?'':` · now ${mxFmt(fv.v,fv.unit)}`}</span></button>`}
const _gmxDraw=drawGoal;
/* a redraw never closes the ⋯ menu you just opened */
drawGoal=function(){const p0=$('gdPop'),was=!!(p0&&p0.classList.contains('on'));_gmxDraw.apply(this,arguments);try{gmxPaint()}catch(e){console.error(e)}
  const p1=$('gdPop');if(was&&p1&&p1!==p0)p1.classList.add('on')};
function gmxPaint(){if(!gdOn)return;const g=gById(gdId);if(!g)return;const root=$('gdIn');
  // Measured by
  const html=gmxSection(g),old=root.querySelector('.gmx');
  if(!html){if(old)old.remove()}else if(!old||old.outerHTML!==html.replace(/\n\s*/g,m=>m)){const t=document.createElement('div');t.innerHTML=html;const n=t.firstElementChild;
    if(old)old.replaceWith(n);else{const a=root.querySelector('.gw-l .gw-f')||root.querySelector('.gpp');if(a&&a.classList.contains('gw-f'))a.after(n);else if(a)a.after(n);else root.appendChild(n)}}
  // finish line on the milestone on show
  root.querySelectorAll('.gfl').forEach(x=>x.remove());
  const card=root.querySelector('.gpp-ts[data-gcard]'),m=card&&g.ms.find(x=>String(x.id)===card.dataset.gcard),nm=root.querySelector('.gpp-nm');
  if(m&&m.fin&&nm&&mxOn()){nm.insertAdjacentHTML('beforeend',gmxFinChip(m))}
  // menu items: Measured by (goal), Finish line (milestone, phones)
  const pop=$('gdPop');if(pop&&gmxOn()&&!pop.querySelector('[data-gmlink]')){
    const del=pop.querySelector('[data-gm="del"]');if(del)del.insertAdjacentHTML('beforebegin',`<button data-gmlink role="menuitem"><span class="lpm-i">${MX_ICON}</span>Measured by…</button>`);
    const mdel=pop.querySelector('[data-gmx="del"]'),sm=gSel(g);if(mdel&&sm&&!g.done)mdel.insertAdjacentHTML('beforebegin',`<button data-gfin="${sm.id}" role="menuitem"><span class="lpm-i">${GMX_FLAG}</span>${sm.fin?'Edit finish line':'Finish line…'}</button>`)}}
/* computer milestone ⋯ */
const _gmxMsMenu=gMsMenu;
gMsMenu=function(g,m){const it=_gmxMsMenu(g,m);if(!gmxOn()||g.done)return it;const i=it.findIndex(x=>x.sep);
  it.splice(i<0?it.length:i,0,{t:m.fin?'Edit finish line':'Finish line…',ic:GMX_FLAG,act:()=>gfinOpen(g,m)});return it};
$('gdPg').addEventListener('click',e=>{
  if(e.target.closest('[data-gmlink]')){e.stopPropagation();const p=$('gdPop');if(p)p.classList.remove('on');const g=gById(gdId);if(g)gmxOpen(g);return}
  const f=e.target.closest('[data-gfin]');if(f){e.stopPropagation();const p=$('gdPop');if(p)p.classList.remove('on');const g=gById(gdId),m=g&&g.ms.find(x=>String(x.id)===f.dataset.gfin);if(m)gfinOpen(g,m)}},true);

/* ===== the Measured by picker ===== */
document.body.insertAdjacentHTML('beforeend','<div class="mx-pg" id="gmxPg" role="dialog" aria-modal="true" aria-label="Measured by"><div class="mx-card" id="gmxIn"></div></div>');
let gmxG=null,gfinM=null,gfinDraft=null;
function gmxOpen(g){gmxG=g.id;gfinM=null;gmxDraw();$('gmxPg').classList.add('on');haptic(5)}
function gmxClose(){gmxG=null;gfinM=null;$('gmxPg').classList.remove('on')}
const gmxRowSp=sp=>{if(sp==null)return 'No space · ';const s=spaceOf(sp)||{};return orderedSpaces().length>1?`${s.e?esc(s.e)+' ':''}${esc(s.name||'')} · `:''};
function gmxDraw(){if(gfinM)return gfinDraw();const g=gById(gmxG);if(!g)return gmxClose();
  const on=(k,id)=>(g.mx||[]).find(l=>l.k===k&&String(l.id)===String(id));
  const ks=(S.kpis||[]).filter(k=>mxSpOk(k.space)),os=(S.okrs||[]).filter(o=>!o.closed&&mxSpOk(o.space)||on('okr',o.id));
  const row=(k,x,sub,cls,ico)=>{const l=on(k,x.id);return `<div class="gmx-r ${cls}${l?' on':''}"><button class="gmx-rb" data-gmxt="${k}:${x.id}" aria-pressed="${!!l}"><span class="gmx-k">${DH_CK}</span><span class="gmx-ri">${ico}</span><span class="gmx-rt"><b>${esc(x.name)}</b><small>${sub}</small></span></button>
    ${l&&k==='kpi'?`<button class="gmx-tk" data-gmxtasks="${x.id}" aria-pressed="${!!l.tasks}"><span class="tg${l.tasks?' on':''}" aria-hidden="true"></span>This goal’s own tasks add 1 when done</button>`:''}</div>`};
  $('gmxIn').innerHTML=`${mxHead(`${g.e?esc(g.e)+' ':''}${esc(g.name)}`,'Measured by',true)}
    <p class="gmx-lede">Pick the numbers that show this goal is moving. Optional, and you can change it any time.</p>
    <h3 class="gmx-sh hot">${MX_ICON}KPIs<small>every week or month</small></h3>
    ${ks.length?ks.map(k=>row('kpi',k,`${gmxRowSp(k.space)}${mxFmt(mxKpiNow(k)??0,k.unit)} of ${mxFmt(+k.target,k.unit)} ${MX_PER[k.period]||''}`,'kpi',MX_ICON)).join(''):`<p class="gmx-none">No KPIs yet.</p>`}
    <h3 class="gmx-sh vi">${GMX_OKR_I}OKRs<small>this quarter</small></h3>
    ${os.length?os.map(o=>row('okr',o,`${gmxRowSp(o.space)}${Math.round(mxOkrP(o)*100)}% · ${esc(mxOkrWhen(o))}`,'okr',GMX_OKR_I)).join(''):`<p class="gmx-none">No OKRs yet.</p>`}
    <div class="gmx-news"><button class="gmx-new kpi" data-gmxnew="kpi">${PLUS_S}New KPI for this goal</button><button class="gmx-new" data-gmxnew="okr">${PLUS_S}New OKR for this goal</button></div>
    <p class="gmx-none">New ones can live in a space, or in no space at all.</p>
    <div class="mx-foot"><span></span><button class="primary" data-gmxdone>Done</button></div>`}
$('gmxPg').addEventListener('click',e=>{
  if(e.target===$('gmxPg')||e.target.closest('[data-mxx],[data-gmxdone]'))return gmxClose();
  if(e.target.closest('[data-mxback]'))return gmxClose();
  const g=gById(gmxG);if(!g)return;
  const t=e.target.closest('[data-gmxt]');if(t){const [k,id]=t.dataset.gmxt.split(':');const on=()=>(g.mx||[]).some(l=>l.k===k&&String(l.id)===id);
    commit(()=>{g.mx=Array.isArray(g.mx)?g.mx:[];const i=g.mx.findIndex(l=>l.k===k&&String(l.id)===id);
      if(i>=0)g.mx.splice(i,1);else g.mx.push({k,id:isNaN(+id)?id:+id});if(!g.mx.length)delete g.mx},on()?'Unlinked':'Linked to the goal');haptic(5);return gmxDraw()}
  const tk=e.target.closest('[data-gmxtasks]');if(tk){commit(()=>{const l=(g.mx||[]).find(x=>x.k==='kpi'&&String(x.id)===tk.dataset.gmxtasks);if(l){if(l.tasks)delete l.tasks;else l.tasks=true}},'Saved');gmxTasksSync();return gmxDraw()}
  {const nw=e.target.closest('[data-gmxnew]');if(nw){const gid=g.id;gmxClose();gmxNewFor(gById(gid),nw.dataset.gmxnew||'okr');return}}
  /* finish line */
  const fp=e.target.closest('[data-gfpick]');if(fp&&gfinDraft){const [k,id,okr]=fp.dataset.gfpick.split(':');gfinDraft.k=k;gfinDraft.id=id;gfinDraft.okr=okr||undefined;
    const fv=gmxFinVal(gfinDraft);if(fv&&(gfinDraft.at===''||gfinDraft.at==null))gfinDraft.at='';return gfinDraw()}
  if(e.target.closest('[data-gfsave]'))return gfinSave();
  if(e.target.closest('[data-gfrm]')){const m=g.ms.find(x=>x.id===gfinM);if(m)commit(()=>{delete m.fin},'Finish line removed');return gmxClose()}});
$('gmxPg').addEventListener('input',e=>{if(e.target.id==='gfAt'&&gfinDraft){gfinDraft.at=e.target.value;const er=$('gmxIn').querySelector('.mx-errm');if(er)er.remove()}});
$('gmxPg').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='gfAt'){e.preventDefault();gfinSave()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('gmxPg').classList.contains('on')){e.preventDefault();e.stopImmediatePropagation();gmxClose()}},true);

/* ===== 2 · New OKR for this goal ===== */
function gmxNewFor(g,kind){if(!g)return;const sp=g.space&&spaceOf(g.space)?g.space:'none';
  mxOpenPop(sp);if(!mxOpen)return;mxNew(kind);if(!mxDraft)return;
  if(kind==='okr')mxDraft.v.name=g.name.slice(0,80);mxDraft.fromGoal=g.id;mxDraft.pickSp=true;mxDraw();
  setTimeout(()=>{const i=$('mxIn').querySelector(kind==='okr'?'[data-mxkr="0:name"]':'[data-mxf="name"]');if(i)i.focus()},80)}
const gmxNewOkr=g=>gmxNewFor(g,'okr');
const _gmxKpiForm=mxKpiForm;
mxKpiForm=function(sname){let h=_gmxKpiForm(sname);const g=mxDraft&&mxDraft.fromGoal!=null?gById(mxDraft.fromGoal):null;
  if(g&&!mxDraft.id)h=h.replace('<div class="mx-body mx-form">',`<div class="mx-body mx-form"><p class="gmx-from">${GMX_FLAG}For the goal <b>${g.e?esc(g.e)+' ':''}${esc(g.name)}</b>. It’s linked once you create it.</p>`);return h};
const _gmxOkrForm=mxOkrForm;
mxOkrForm=function(sname){let h=_gmxOkrForm(sname);const g=mxDraft&&mxDraft.fromGoal!=null?gById(mxDraft.fromGoal):null;
  const open=g?g.ms.filter(m=>!m.done):[];
  if(g&&open.length&&!mxDraft.id&&!mxDraft.usedMs)h=h.replace('<div class="mx-f"><span>Key results</span>',`<div class="mx-f"><span>Key results</span><button type="button" class="gmx-ms" data-gmxms>${GMX_FLAG}<span>Use the goal’s ${open.length} open ${open.length===1?'milestone':'milestones'} as key results</span></button>`);
  if(g)h=h.replace('<div class="mx-body mx-form">',`<div class="mx-body mx-form"><p class="gmx-from">${GMX_FLAG}For the goal <b>${g.e?esc(g.e)+' ':''}${esc(g.name)}</b>. It’s linked once you create it.</p>`);
  return h};
$('mxPg').addEventListener('click',e=>{if(!e.target.closest('[data-gmxms]')||!mxDraft)return;e.stopPropagation();const g=gById(mxDraft.fromGoal);if(!g)return;
  const ms=g.ms.filter(m=>!m.done).slice(0,typeof MX_KR_MAX!=='undefined'?MX_KR_MAX:6);
  mxDraft.v.krs=ms.map(m=>({id:null,name:m.t.slice(0,60),from:0,target:1,unit:'',typed:true,ms:m.id}));mxDraft.usedMs=true;haptic(5);mxDraw()},true);
const _gmxSave=mxSave;
mxSave=function(){const d=mxDraft,gid=d&&d.fromGoal,before=new Set((S.okrs||[]).map(o=>String(o.id))),beforeK=new Set((S.kpis||[]).map(k=>String(k.id))),isK=d&&d.kind==='kpi';
  const krMs=d&&d.usedMs?d.v.krs.filter(r=>String(r.name||'').trim()).map(r=>r.ms):null;
  const r=_gmxSave.apply(this,arguments);
  if(gid!=null&&!mxDraft&&mxOpen)setTimeout(()=>{if(mxOpen&&!mxDraft)mxClose()},0); // made from a goal: back to the goal
  if(gid!=null&&!mxDraft&&isK){const k=(S.kpis||[]).find(x=>!beforeK.has(String(x.id))),g=gById(gid);if(k&&g)commit(()=>{g.mx=Array.isArray(g.mx)?g.mx:[];g.mx.push({k:'kpi',id:k.id})},'KPI linked to the goal');return r}
  if(gid!=null&&!mxDraft){const o=(S.okrs||[]).find(x=>!before.has(String(x.id))),g=gById(gid);
    if(o&&g)commit(()=>{g.mx=Array.isArray(g.mx)?g.mx:[];g.mx.push({k:'okr',id:o.id});
      /* milestones turned into key results finish when their key result does */
      if(krMs)krMs.forEach((mid,i)=>{const m=g.ms.find(x=>x.id===mid),kr=o.krs[i];if(m&&kr&&!m.fin)m.fin={k:'kr',okr:o.id,id:kr.id,at:1}})},'OKR linked to the goal')}
  return r};

/* ===== 3 · Finish lines ===== */
function gfinOpen(g,m){gmxG=g.id;gfinM=m.id;gfinDraft=m.fin?{...m.fin,at:String(m.fin.at)}:{k:null,id:null,at:''};
  gfinDraw();$('gmxPg').classList.add('on');haptic(5)}
function gfinChoices(g){const ls=gmxLinks(g),out=[];const add=(k,id,okr,name,sub,cls)=>out.push({k,id,okr,name,sub,cls});
  const pool=ls.length?ls:[...(S.kpis||[]).filter(k=>mxSpOk(k.space)).map(k=>({k:'kpi',id:k.id})),...(S.okrs||[]).filter(o=>!o.closed&&mxSpOk(o.space)).map(o=>({k:'okr',id:o.id}))];
  pool.forEach(l=>{if(l.k==='kpi'){const k=gmxKpi(l.id);if(k)add('kpi',k.id,'',k.name,`KPI · now ${mxFmt(mxKpiNow(k)??0,k.unit)} ${MX_PER[k.period]||''}`,'kpi')}
    else{const o=gmxOkr(l.id);if(o)o.krs.forEach(r=>add('kr',r.id,o.id,r.name,`Key result of ${o.name} · now ${mxFmt(mxKrNow(r),r.unit)}`,'okr'))}});
  return {list:out,linked:ls.length>0}}
function gfinDraw(){const g=gById(gmxG),m=g&&g.ms.find(x=>x.id===gfinM);if(!m)return gmxClose();const d=gfinDraft,ch=gfinChoices(g);
  const sel=c=>d.k===c.k&&String(d.id)===String(c.id)&&(c.k!=='kr'||String(d.okr)===String(c.okr));
  const fv=gmxFinVal(d);
  $('gmxIn').innerHTML=`${mxHead(`Milestone · ${esc(m.t)}`,'Finish line',true)}
    <p class="gmx-lede">This milestone marks itself done when a number gets there.</p>
    ${ch.list.length?`<div class="gfl-l">${ch.list.map(c=>`<button class="gmx-r ${c.cls}${sel(c)?' on':''}" data-gfpick="${c.k}:${c.id}:${c.okr||''}"><span class="gmx-rb"><span class="gmx-k">${DH_CK}</span><span class="gmx-ri">${c.k==='kpi'?MX_ICON:GMX_OKR_I}</span><span class="gmx-rt"><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></span></span></button>`).join('')}</div>
      ${ch.linked?'':'<p class="gmx-none">Tip: link KPIs or OKRs to this goal (⋯ → Measured by) to keep this list short.</p>'}
      <label class="mx-f"><span>Done when it reaches</span><input id="gfAt" type="number" inputmode="decimal" step="any" value="${esc(String(d.at??''))}" placeholder="${fv?'e.g. '+(Math.ceil((+fv.v||0)*1.5)||10):'Pick a number above'}" ${d.k?'':'disabled'}></label>`
    :`<p class="gmx-none">No KPIs or OKRs yet. Add one first, then come back to set a finish line.</p>`}
    <div class="mx-foot">${m.fin?`<button class="ghost-btn warn" data-gfrm>${BIN_S}Remove</button>`:''}<span></span>${ch.list.length?`<button class="primary" data-gfsave>Save</button>`:`<button class="primary" data-gmxdone>Close</button>`}</div>`;
  if(d.k)setTimeout(()=>{const i=$('gfAt');if(i&&document.activeElement!==i)i.focus()},40)}
function gfinSave(){const g=gById(gmxG),m=g&&g.ms.find(x=>x.id===gfinM),d=gfinDraft;if(!m)return;
  if(!d.k){const l=$('gmxIn').querySelector('.gfl-l');if(l)l.insertAdjacentHTML('afterend','<small class="mx-errm" role="alert">Pick a number first</small>');return}
  const at=+d.at;if(d.at===''||!Number.isFinite(at)){const i=$('gfAt');if(i){i.classList.add('mx-bad');i.focus();if(!$('gmxIn').querySelector('.mx-errm'))i.insertAdjacentHTML('afterend','<small class="mx-errm" role="alert">Set the number it should reach</small>')}return}
  const fin={k:d.k,id:isNaN(+d.id)?d.id:+d.id,at};if(d.k==='kr')fin.okr=isNaN(+d.okr)?d.okr:+d.okr;
  const fv=gmxFinVal(fin);if(gmxReached(fin,fv)&&!m.done)fin.hit=true; // already there: no surprise tick now
  commit(()=>{m.fin=fin},'Finish line set');gmxClose()}

/* keep everything in step after each change: drop dead links, sync goal tasks into KPIs, fire finish lines */
let gmxBusy=false;
function gmxTasksSync(){let ch=false;
  (S.goals||[]).forEach(g=>{if(!Array.isArray(g.mx))return;
    const live=g.mx.filter(l=>l.k==='kpi'?gmxKpi(l.id):gmxOkr(l.id)||(S.okrs||[]).some(o=>String(o.id)===String(l.id)));
    if(live.length!==g.mx.length){g.mx=live;if(!g.mx.length)delete g.mx;ch=true}
    const done=new Map();(g.ms||[]).forEach(m=>(m.items||[]).forEach(it=>{if(it.done)done.set(String(it.id),it.doneAt||Date.now())}));
    (g.mx||[]).forEach(l=>{if(l.k!=='kpi')return;const k=gmxKpi(l.id);if(!k)return;k.log=k.log||[];
      const mine=k.log.filter(e=>e.gi!=null&&String(e.goal)===String(g.id));
      if(!l.tasks){if(mine.length){k.log=k.log.filter(e=>!mine.includes(e));ch=true}return}
      mine.forEach(e=>{if(!done.has(String(e.gi))){k.log.splice(k.log.indexOf(e),1);ch=true}});
      done.forEach((at,id)=>{if(!mine.some(e=>String(e.gi)===id)){k.log.push({id:newId(),at,v:1,gi:id,goal:g.id});ch=true}})})});
  (S.goals||[]).forEach(g=>(g.ms||[]).forEach(m=>{if(m.fin&&!gmxFinVal(m.fin)){delete m.fin;ch=true}}));
  if(ch)save();return ch}
function gmxFinCheck(){const fire=[];
  (S.goals||[]).forEach(g=>{if(g.done)return;(g.ms||[]).forEach(m=>{const f=m.fin;if(!f)return;const r=gmxReached(f,gmxFinVal(f));
    if(r&&!m.done&&!f.hit)fire.push([g,m]);else if(!r&&f.hit){delete f.hit;save()}else if(r&&m.done&&!f.hit){f.hit=true;save()}})});
  if(!fire.length)return;
  setTimeout(()=>{fire.forEach(([g,m])=>{if(m.done||!m.fin)return;m.fin.hit=true;gMsToggle(g,m);
    const fv=gmxFinVal(m.fin);toast(`🏁 ${m.t} · done, ${fv?fv.name:'the number'} reached ${mxFmt(+m.fin.at,fv&&fv.unit)}`)})},350)}
const _gmxRender=render;
render=function(d){_gmxRender(d);if(gmxBusy)return;gmxBusy=true;try{if(gmxTasksSync())_gmxRender();if(mxOn())gmxFinCheck();if(gdOn)gmxPaint()}catch(e){console.error(e)}finally{gmxBusy=false}};

/* Metrics: tag KPIs and OKRs with the goal they measure (🏆 once it's achieved) */
const gmxTag=(k,id)=>{const gs=gmxGoalsOf(k,id);return gs.length?`<span class="mt-gl">${gs.map(g=>`<span>${g.done?'🏆 ':g.e?esc(g.e)+' ':''}${esc(g.name)}</span>`).join('')}</span>`:''};
const _gmxKc=mtKpiCard,_gmxOc=mtOkrCard;
mtKpiCard=function(k){return _gmxKc(k).replace('<small class="mt-kf">',gmxTag('kpi',k.id)+'<small class="mt-kf">')};
mtOkrCard=function(o){const h=_gmxOc(o),t=gmxTag('okr',o.id);if(!t)return h;const i=h.lastIndexOf('</button>');return h.slice(0,i)+t+h.slice(i)};
