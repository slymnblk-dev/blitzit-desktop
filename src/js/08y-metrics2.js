/* ---------- Metrics page, calmer: two views on one page ----------
   List (default): one quiet list — KPIs, then OKRs — each row: name, space · when, the number, a thin bar, the %.
   By space: one card per space with its KPIs and OKRs (and their key results) together.
   One "+ New" (KPI or OKR), a space filter in List, a one-tap view switch. Same on phones, stacked. */
var mtView=(()=>{try{return localStorage.getItem('wd-mtview')==='space'?'space':'list'}catch(e){return 'list'}})();
const MT_KR_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
const mt2Dot=sp=>{const s=sp==null?{name:'No space',c:'transparent;box-shadow:inset 0 0 0 1.5px var(--muted)'}:spaceOf(sp)||{};return `<i class="mt2-dot" style="background:${s.c||'var(--muted)'}"></i>${esc(s.name||'')}`};
const mt2Tag=(k,id)=>typeof gmxTag==='function'?gmxTag(k,id):'';
function mt2KpiRow(k,showSp){const x=mxHomeItems().find(y=>y.kind==='kpi'&&y.k===k)||{p:mxKpiP(k),behind:0};const it=mxIt({...x,kind:'kpi',k,sp:k.space});
  const left=mxDays(mxShift(k.period,mxStart(k.period,Date.now()),1));
  return `<div class="mt-k mt2-r kpi${x.behind>.15?' late':''}"><button class="mt-kb mt2-b" data-mxhw="${it.id}" aria-label="${esc(k.name)}: ${it.v} of ${it.t}">
      <span class="mt2-n"><b>${esc(k.name)}</b><small>${showSp?mt2Dot(k.space)+' · ':''}${MX_PER[k.period]||''} · ${left} ${left===1?'day':'days'} left${mt2Tag('kpi',k.id)}</small></span>
      <span class="mt2-v"><b>${it.v}</b><small>/ ${it.t}${mxUw(k.unit)}</small></span>
      <span class="mt2-bar"><span class="mx-bar"><i style="width:${(x.p*100).toFixed(1)}%"></i></span></span>
      <span class="mt2-p">${Math.round(x.p*100)}%</span></button>
    ${k.src!=='tasks'?`<button class="mt2-log" data-mxhw="${it.id}" data-mxhwlog aria-label="Log a number for ${esc(k.name)}" title="Log a number">${PLUS_S}</button>`:''}</div>`}
function mt2OkrRow(o,showSp,krs){const p=o.closed?(o.score||0):mxOkrP(o),id=`okr:${o.id}:${o.space}`;
  return `<div class="mt-o mt2-r okr${o.closed?' past':''}"><button class="mt2-b" data-mxhw="${id}" aria-label="${esc(o.name)}: ${Math.round(p*100)}%">
      <span class="mt2-n"><b>${esc(o.name)}</b><small>${showSp?mt2Dot(o.space)+' · ':''}${esc(mxOkrWhen(o))}${krs?'':` · ${o.krs.length} key ${o.krs.length===1?'result':'results'}`}${mt2Tag('okr',o.id)}</small></span>
      <span class="mt2-v"><b>${Math.round(p*100)}%</b></span>
      <span class="mt2-bar"><span class="mx-bar"><i style="width:${(p*100).toFixed(1)}%"></i></span></span>
      <span class="mt2-p">${o.closed?'closed':''}</span></button>
    ${krs&&!o.closed?`<div class="mt2-krs">${o.krs.map(r=>`<span class="mt2-kr"><span>${esc(r.name)}</span><span class="mx-bar"><i style="width:${(mxKrP(r)*100).toFixed(1)}%"></i></span><b>${mxFmt(mxKrNow(r),r.unit)}</b><small>${mxKrKind(r)==='sum'?'/':'→'} ${mxFmt(+r.target,r.unit)}</small></span>`).join('')}</div>`:''}</div>`}
drawMetrics=function(){if(!mtOn)return;const y=$('metricsPg').scrollTop;if(mtSp!=='all'&&mtSp!=='none'&&!spaceOf(mtSp))mtSp='all';
  const sps=mtSpaces(),multi=sps.length>1,all=(S.kpis||[]).filter(k=>mxSpOk(k.space)).length+(S.okrs||[]).filter(o=>mxSpOk(o.space)).length;
  const viewSw=`<div class="mt2-seg" role="tablist" aria-label="View"><button role="tab" data-mtview="list" aria-selected="${mtView==='list'}">List</button><button role="tab" data-mtview="space" aria-selected="${mtView==='space'}">By space</button></div>`;
  const filt=mtView==='list'&&multi?`<div class="mt2-seg mt-f" role="tablist" aria-label="Space">${[['all','All'],...sps.map(s=>[s.id,(s.e?s.e+' ':'')+s.name])].map(([v,l])=>`<button role="tab" data-mtsp="${v}" aria-selected="${String(v)===String(mtSp)}">${esc(l)}</button>`).join('')}</div>`:'';
  const tracked=mtCount();
  const head=`${mtSwitch('metrics')}<div class="mt2-head"><div class="mt2-tt"><h1 class="mt2-h">Metrics</h1><span class="mt2-sub">${tracked?`${tracked} tracked${multi?` across ${sps.length} spaces`:''}`:'KPIs and OKRs, all in one place'}</span></div>
    <div class="mt2-acts">${all?viewSw:''}<button class="mt2-new" data-mtnewmenu>${PLUS_S}New</button></div></div>${filt?`<div class="mt2-fw">${filt}</div>`:''}`;
  let body;
  if(!all)body=`<div class="mt-empty mt2-empty">${dhEmpty(MX_ICON,'hot','Nothing tracked yet','KPIs are numbers you keep an eye on every week. OKRs are goals for the quarter.',`<span class="mt2-eb">${dhBtn('data-mtnew="kpi"','New KPI')}${dhBtn('data-mtnew="okr"','New OKR')}</span>`)}</div>`;
  else if(mtView==='space'){
    body=`<div class="mt2-spg">${sps.map(s=>{const ks=(S.kpis||[]).filter(k=>String(k.space??'none')===String(s.id)),os=(S.okrs||[]).filter(o=>!o.closed&&String(o.space??'none')===String(s.id));
      return `<section class="mt2-sp"><div class="mt2-sph"><span class="mt2-spe">${s.e?esc(s.e):`<i class="mt2-dot" style="background:${s.c}"></i>`}</span><b>${esc(s.name)}</b><small>${ks.length+os.length?`${ks.length+os.length} tracked`:''}</small><button class="mt2-spadd" data-mtnewsp="${s.id}" aria-label="New in ${esc(s.name)}" title="New KPI or OKR">${PLUS_S}</button></div>
        ${ks.length+os.length?`${ks.map(k=>mt2KpiRow(k,false)).join('')}${os.map(o=>mt2OkrRow(o,false,true)).join('')}`:`<button class="mt2-none" data-mtnewsp="${s.id}">Nothing tracked here yet · <b>Add</b></button>`}</section>`}).join('')}</div>`}
  else{const ks=(S.kpis||[]).filter(k=>mxSpOk(k.space)&&mtIn(k.space)),os=(S.okrs||[]).filter(o=>!o.closed&&mxSpOk(o.space)&&mtIn(o.space)),past=(S.okrs||[]).filter(o=>o.closed&&mxSpOk(o.space)&&mtIn(o.space));
    const sh=(t,cls,ico,n)=>`<div class="mt2-sh ${cls}">${ico}<span>${t}</span><small>${n}</small></div>`;
    const showSp=multi&&mtSp==='all';
    body=`${sh('KPIs · every week or month','kpi',MX_ICON,ks.length)}${ks.length?ks.map(k=>mt2KpiRow(k,showSp)).join(''):`<button class="mt2-none mt-empty" data-mtnew="kpi">No KPIs here yet · <b>New KPI</b></button>`}
      ${sh('OKRs · this quarter','okr',MT_KR_I,os.length)}${os.length?os.map(o=>mt2OkrRow(o,showSp,false)).join(''):`<button class="mt2-none mt-empty" data-mtnew="okr">Aim for the quarter: no OKRs here yet · <b>New OKR</b></button>`}
      ${past.length?`<button class="mt-pastb" data-mtpast aria-expanded="${mtPast}">Past OKRs<small>${past.length}</small>${CHEV}</button>${mtPast?past.map(o=>mt2OkrRow(o,showSp,false)).join(''):''}`:''}`}
  $('mtIn').innerHTML=head+`<div class="mt2-body">${body}</div>`;$('metricsPg').scrollTop=y};
$('metricsPg').addEventListener('click',e=>{
  const v=e.target.closest('[data-mtview]');if(v){mtView=v.dataset.mtview;try{localStorage.setItem('wd-mtview',mtView)}catch(err){}haptic(4);return drawMetrics()}
  const nm=e.target.closest('[data-mtnewmenu],[data-mtnewsp]');if(nm){e.stopPropagation();const sp=nm.dataset.mtnewsp;
    const go=kind=>{mtPop=true;if(sp!=null){mxOpenPop(isNaN(+sp)?sp:+sp);if(mxOpen)mxNew(kind)}else{const b=document.createElement('button');b.dataset.mtnew=kind;b.hidden=true;$('mtIn').appendChild(b);b.click();b.remove()}};
    cxOpen(nm,[{t:'New KPI',ic:MX_ICON,act:()=>go('kpi')},{t:'New OKR',ic:MT_KR_I,act:()=>go('okr')}])}});

/* computer sidebar: Habits, Goals and Metrics sit under "Modes", like Spaces */
const _mt2Side=rhythmSide;
rhythmSide=function(){const h=_mt2Side();return h?`<div class="s-lbl2"><span class="s-name">Modes</span></div>${h}`:''};
