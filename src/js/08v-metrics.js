/* ---------- Metrics: one page for every KPI and OKR, across spaces ----------
   Computer: "Metrics" in the sidebar (under Goals) once KPIs & OKRs is on.
   Phone: no extra tab. The flag tab holds Goals and Metrics, with a Goals | Metrics switch at the top;
   if only KPIs & OKRs is on, the tab is Metrics itself (gauge icon).
   KPIs and OKRs look different on purpose: KPIs are coral number tiles (a number per week or month, a trend, + Log);
   OKRs are wide violet cards (an objective for the quarter, a % ring and its key results). */
var mtOn=false,mtSp='all',mtPast=false;
const MT_OKR_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
const mtWide=()=>matchMedia('(min-width:1100px)').matches;
const mtCount=()=>(S.kpis||[]).filter(k=>spaceOf(k.space)).length+(S.okrs||[]).filter(o=>!o.closed&&spaceOf(o.space)).length;
const mtSpaces=()=>orderedSpaces();
const mtIn=sp=>mtSp==='all'||String(sp)===String(mtSp);
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg mt-pg" id="metricsPg" role="region" aria-label="Metrics"><div class="ib-in" id="mtIn"></div></div>');

/* the Goals | Metrics switch (phones and tablets, when both are on) */
const mtSwitch=on=>goalsOn()&&mxOn()&&!mtWide()?`<div class="mt-sw" role="tablist" aria-label="Goals or Metrics"><button role="tab" data-mtsw="goals" aria-selected="${on==='goals'}">Goals</button><button role="tab" data-mtsw="metrics" aria-selected="${on==='metrics'}">Metrics</button></div>`:'';

function mtKpiCard(k){const x=mxHomeItems().find(y=>y.kind==='kpi'&&y.k===k)||{p:mxKpiP(k),behind:0,sp:k.space};const it=mxIt({...x,kind:'kpi',k,sp:k.space});
  const left=mxDays(mxShift(k.period,mxStart(k.period,Date.now()),1)),v=mxKpiNow(k)??0,tg=+k.target,late=x.behind>.15,sp=spaceOf(k.space)||{};
  const togo=k.kind!=='last'&&k.better!=='down'&&tg>v?`${mxFmt(tg-v,k.unit)} to go · `:'';
  return `<div class="mt-k${late?' late':''}"><button class="mt-kb" data-mxhw="${it.id}" aria-label="${esc(k.name)}: ${it.v} of ${it.t}">
      <span class="mt-kt"><span class="mt-per">${MX_PER[k.period]||''}${mtSp==='all'&&mtSpaces().length>1?` · ${sp.e?esc(sp.e)+' ':''}${esc(sp.name||'')}`:''}</span><b>${esc(k.name)}</b></span>
      <span class="mt-kv"><b>${it.v}</b><small>/ ${it.t}${mxUw(k.unit)}</small><span class="mt-sp">${mxSpark(mxKpiHist(k,6),84,30)}</span></span>
      <span class="mx-bar"><i style="width:${(x.p*100).toFixed(1)}%"></i></span>
      <small class="mt-kf">${togo}${left} ${left===1?'day':'days'} left${k.better==='down'?' · lower is better':''}</small></button>
    ${k.src!=='tasks'?`<button class="mt-log" data-mxhw="${it.id}" data-mxhwlog aria-label="Log a number for ${esc(k.name)}">${PLUS_S}</button>`:''}</div>`}
function mtOkrCard(o){const p=o.closed?(o.score||0):mxOkrP(o),sp=spaceOf(o.space)||{},id=`okr:${o.id}:${o.space}`,r=26,C2=2*Math.PI*r;
  return `<button class="mt-o${o.closed?' past':''}" data-mxhw="${id}" aria-label="${esc(o.name)}: ${Math.round(p*100)}%">
    <span class="mt-oh"><span class="mt-ot"><span class="mt-per">${esc(mxOkrWhen(o))}${mtSp==='all'&&mtSpaces().length>1?` · ${sp.e?esc(sp.e)+' ':''}${esc(sp.name||'')}`:''}</span><b>${esc(o.name)}</b></span>
      <span class="mt-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="r0" cx="32" cy="32" r="${r}"/><circle class="r1" cx="32" cy="32" r="${r}" style="stroke-dasharray:${(C2*p).toFixed(1)} ${C2.toFixed(1)}"/></svg><b>${Math.round(p*100)}%</b></span></span>
    ${o.closed?'':`<span class="mt-krs">${o.krs.map(k=>`<span class="mt-kr"><span class="mt-krt"><span>${esc(k.name)}</span><b>${mxFmt(mxKrNow(k),k.unit)}<small> ${mxKrKind(k)==='sum'?'/':'→'} ${mxFmt(+k.target,k.unit)}</small></b></span><span class="mx-bar"><i style="width:${(mxKrP(k)*100).toFixed(1)}%"></i></span></span>`).join('')}</span>`}</button>`}
function drawMetrics(){if(!mtOn)return;const y=$('metricsPg').scrollTop;
  if(mtSp!=='all'&&!spaceOf(mtSp))mtSp='all';
  const ks=(S.kpis||[]).filter(k=>spaceOf(k.space)&&mtIn(k.space)),os=(S.okrs||[]).filter(o=>!o.closed&&spaceOf(o.space)&&mtIn(o.space)),past=(S.okrs||[]).filter(o=>o.closed&&spaceOf(o.space)&&mtIn(o.space));
  const sps=mtSpaces();
  const filt=sps.length>1?`<div class="mt-f" role="tablist" aria-label="Space">${[['all','All spaces'],...sps.map(s=>[s.id,(s.e?s.e+' ':'')+s.name])].map(([v,l])=>`<button role="tab" data-mtsp="${v}" aria-selected="${String(v)===String(mtSp)}">${esc(l)}</button>`).join('')}</div>`:'';
  const head=(ico,cls,t,n,line,kind)=>`<div class="mt-sh"><span class="mt-si ${cls}">${ico}</span><div class="mt-st"><b>${t}${n?`<small>${n}</small>`:''}</b><span>${line}</span></div>${n?`<button class="mt-new" data-mtnew="${kind}">${PLUS_S}New ${t.slice(0,-1)}</button>`:''}</div>`;
  const kSec=`<section class="mt-sec">${head(MX_ICON,'hot','KPIs',ks.length,'Numbers you keep an eye on, every week or month','kpi')}
    ${ks.length?`<div class="mt-kg">${ks.map(mtKpiCard).join('')}</div>`:`<div class="mt-empty">${dhEmpty(MX_ICON,'hot','Track a number','Like messages sent or demos booked. Done tasks can count toward it.',dhBtn('data-mtnew="kpi"','New KPI'))}</div>`}</section>`;
  const oSec=`<section class="mt-sec">${head(MT_OKR_I,'vi','OKRs',os.length,'A goal for the quarter, and the results that prove it','okr')}
    ${os.length?`<div class="mt-og">${os.map(mtOkrCard).join('')}</div>`:`<div class="mt-empty">${dhEmpty(MT_OKR_I,'vi','Aim for the quarter','One objective, like “Win 3 customers”, with a few key results.',dhBtn('data-mtnew="okr"','New OKR'))}</div>`}
    ${past.length?`<button class="mt-pastb" data-mtpast aria-expanded="${mtPast}">Past OKRs<small>${past.length}</small>${CHEV}</button>${mtPast?`<div class="mt-og">${past.map(mtOkrCard).join('')}</div>`:''}`:''}</section>`;
  $('mtIn').innerHTML=`${mtSwitch('metrics')}<div class="hp-head mt-head"><div class="hp-tt"><span class="hp-eye">${ks.length||os.length?`${ks.length} ${ks.length===1?'KPI':'KPIs'} · ${os.length} ${os.length===1?'OKR':'OKRs'}`:'KPIs & OKRs'}</span><h1 class="hp-h">Metrics</h1></div></div>${filt}${kSec}${oSec}`;
  $('metricsPg').scrollTop=y}
function openMetrics(){if(!mxOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof closeSearch==='function')closeSearch();
  mtOn=true;drawMetrics();$('metricsPg').classList.add('on');document.body.classList.add('ib-open');$('metricsPg').scrollTop=0;haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeMetrics(){if(!mtOn)return;mtOn=false;$('metricsPg').classList.remove('on');if(!ibOn&&!rhOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#metricsPg'))a.blur();if(typeof renderDesk==='function')renderDesk()}
$('metricsPg').addEventListener('click',e=>{
  const f=e.target.closest('[data-mtsp]');if(f){mtSp=isNaN(+f.dataset.mtsp)||f.dataset.mtsp==='all'?f.dataset.mtsp:+f.dataset.mtsp;haptic(4);return drawMetrics()}
  if(e.target.closest('[data-mtpast]')){mtPast=!mtPast;return drawMetrics()}
  const n=e.target.closest('[data-mtnew]');if(n){const sp=mtSp!=='all'?mtSp:(mtSpaces()[0]||{}).id;if(sp==null)return;mxOpenPop(sp);if(mxOpen){mxNew(n.dataset.mtnew);if(mxDraft&&mtSp==='all'&&mtSpaces().length>1){mxDraft.pickSp=true;mxDraw()}}}});
/* the Goals | Metrics switch */
document.addEventListener('click',e=>{const b=e.target.closest('[data-mtsw]');if(!b)return;e.preventDefault();haptic(4);
  if(b.dataset.mtsw==='metrics'){if(!mtOn)openMetrics()}else{closeMetrics();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();openGoals()}try{drawTabs()}catch(err){}});
/* New KPI / OKR from "All spaces": the form asks which space it belongs to */
const _mtKpiForm=mxKpiForm,_mtOkrForm=mxOkrForm;
const mtSpField=()=>mxDraft&&mxDraft.pickSp&&!mxDraft.id?mxField('Space',`<div class="segc mx-seg mt-sps">${mtSpaces().map(s=>`<button type="button" class="${String(s.id)===String(mxSpaceNow())?'on':''}" data-mtpick="${s.id}">${s.e?esc(s.e)+' ':''}${esc(s.name)}</button>`).join('')}</div>`):'';
mxKpiForm=function(sname){return _mtKpiForm(sname).replace('<div class="mx-body mx-form">','<div class="mx-body mx-form">'+mtSpField())};
mxOkrForm=function(sname){return _mtOkrForm(sname).replace('<div class="mx-body mx-form">','<div class="mx-body mx-form">'+mtSpField())};
$('mxPg').addEventListener('click',e=>{const b=e.target.closest('[data-mtpick]');if(!b||!mxDraft)return;e.stopPropagation();
  const s=mtSpaces().find(x=>String(x.id)===b.dataset.mtpick);if(s){mxSpPick=s.id;haptic(4);mxDraw()}},true);

/* computer sidebar: Metrics under Goals */
const _mtSide=rhythmSide;
rhythmSide=function(){let h=_mtSide();if(!mxOn())return h;const n=mtCount();
  return h+`<button class="s-list s-home s-inbox ${mtOn?'on':''}" id="sMetrics" title="Metrics">${MX_ICON}<span class="s-name">Metrics</span>${n?`<span class="n">${n}</span>`:''}</button>`};
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sMetrics')){e.stopImmediatePropagation();return mtOn?closeMetrics():openMetrics()}
  if(mtOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l],#sInbox,#sRhythm,#sGoals,[data-sgoal],[data-sgnew]'))closeMetrics()},true);
/* any other page opening closes Metrics */
for(const fn of ['openInbox','openRhythm','openGoals','openGoal','goHome','openSpaceSide']){const f=window[fn];if(typeof f!=='function')continue;
  window[fn]=function(){if(mtOn&&!(fn==='openGoal'&&false))closeMetrics();return f.apply(this,arguments)}}
/* keep the page in step with every change, and Home not lit while Metrics is open */
const _mtRender=render;render=function(d){_mtRender(d);if(mtOn){if(!mxOn())closeMetrics();else drawMetrics()}};
const _mtDesk=renderDesk;renderDesk=function(){_mtDesk.apply(this,arguments);if(mtOn){const h=$('sHome');if(h)h.classList.remove('on')}};
/* Escape closes it (computer) */
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!mtOn||mxOpen||$('dlg').classList.contains('on')||document.querySelector('.sheet.on'))return;if(!mtWide())return;e.preventDefault();closeMetrics()});

/* phones: the flag tab holds Goals and Metrics */
const _mtTabs=tabsList;
tabsList=function(){let t=_mtTabs();if(goalsOn()||!mxOn())return t;
  t=t.length?t:[['home','Home',TB_HOME]];t.push(['metrics','Metrics',MX_ICON]);return t};
const _mtTabNow=tabNow;
tabNow=function(){if(mtOn)return goalsOn()?'goals':'metrics';return _mtTabNow()};
const _mtTbGo=tbGo;
tbGo=function(k){
  if(k==='metrics'){if(!mtOn)openMetrics();else $('metricsPg').scrollTo({top:0,behavior:'smooth'});return drawTabs()}
  if(k==='goals'&&mtOn){if(tabNow()==='goals'){$('metricsPg').scrollTo({top:0,behavior:'smooth'});return}}
  if(mtOn)closeMetrics();return _mtTbGo(k)};
/* the switch also sits on top of the phone Goals page */
const _mtDrawGoals=drawGoals;
drawGoals=function(){_mtDrawGoals.apply(this,arguments);const sw=mtSwitch('goals');if(sw)$('glIn').insertAdjacentHTML('afterbegin',sw)};
/* turning KPIs & OKRs off while the page is open */
const _mtApply=applySettings;applySettings=function(){_mtApply.apply(this,arguments);if(mtOn&&!mxOn())closeMetrics()};
/* the popup opened from Metrics: Back, Escape and Save return to Metrics (not to the space's scoreboard) */
var mtPop=false;
window.addEventListener('click',e=>{if(e.target.closest('#metricsPg [data-mxhw],#metricsPg [data-mtnew]'))mtPop=true},true);
const mtBack=()=>mtPop&&mtOn&&mxOpen;
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&mtBack()&&!$('dlg').classList.contains('on')&&!$('mxAsk').classList.contains('on')){e.preventDefault();e.stopImmediatePropagation();mxClose()}},true);
window.addEventListener('click',e=>{if(mtBack()&&e.target.closest('#mxPg [data-mxback]')){e.preventDefault();e.stopImmediatePropagation();mxClose()}},true);
const _mtSave=mxSave;mxSave=function(){const r=_mtSave.apply(this,arguments);if(mtBack()&&!mxDraft)mxClose();return r};
const _mtClose=mxClose;mxClose=function(){mtPop=false;return _mtClose.apply(this,arguments)};
