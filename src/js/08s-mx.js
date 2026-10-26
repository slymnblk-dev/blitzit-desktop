/* ---------- KPIs & OKRs (Settings → Modes; off by default) ----------
   Each KPI and OKR belongs to one space. A gauge button on the space's page opens one popup:
   "Scoreboard" (every KPI and OKR at once) or "Focus" (one big number at a time). Phones open on Focus,
   computers on Scoreboard; either can switch, and Settings → Modes remembers it per device size.
   A KPI is a number per week / month / quarter (higher or lower is better). It moves with tasks (+N when a linked
   task is done), with numbers you log, or both. "Latest" KPIs (a rate, a level) keep the last number you set.
   An OKR is an objective with 1–5 key results and an end date. A key result that starts at 0 adds up;
   one that starts higher keeps the latest value you set (12% → 25%). Closing an OKR keeps its score under Past.
   Tasks link through t.mx = [{id, okr?, add}] (add: a number, or null = ask when done). Done adds an entry to the
   target's log; reopening takes that entry back off. Everything sits in S.kpis / S.okrs, so sync, backup and undo work. */
var mxOpen=false,mxTab='kpi',mxFocusI=0,mxView=null,mxDraft=null,mxPast=false;
const MX_KPI_MAX=5,MX_OKR_MAX=3,MX_KR_MAX=5;
const MX_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l3.6-4.2"/><circle cx="12" cy="16.5" r="1.1" fill="currentColor"/></svg>';
const MX_LIST='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>';
const MX_ONE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4.5" width="14" height="15" rx="3.5"/><path d="M9 12.5h6"/></svg>';
function mxOn(){return !!(S.cfg&&S.cfg.mx)}
const mxKpis=sp=>(S.kpis||[]).filter(k=>k.space===sp);
const mxOkrs=(sp,closed)=>(S.okrs||[]).filter(o=>o.space===sp&&!!o.closed===!!closed);
const mxSpaceNow=()=>S.space&&S.space!=='all'&&spaceOf(S.space)?S.space:null;
const mxPhone=()=>matchMedia('(max-width:699px)').matches;
const mxLook=()=>{const v=mxPhone()?C().mxPh:C().mxDk;return v==='board'||v==='focus'?v:(mxPhone()?'focus':'board')};
/* ---- numbers ---- */
const mxN=v=>{if(v==null||!Number.isFinite(+v))return '—';const r=Math.round(+v*10)/10;return Math.abs(r)>=10000?Math.round(r).toLocaleString():String(r)};
const mxFmt=(v,unit)=>{const u=(unit||'').trim();if(v==null)return '—';if(u==='%')return mxN(v)+'%';if(u==='€'||u==='$'||u==='£')return u+mxN(v);return mxN(v)};
function mxStart(per,at){const d=new Date(at);d.setHours(0,0,0,0);
  if(per==='week'){const ws=+C().weekStart===0?0:1;d.setDate(d.getDate()-((d.getDay()-ws+7)%7))}
  else if(per==='month')d.setDate(1);else{d.setDate(1);d.setMonth(Math.floor(d.getMonth()/3)*3)}return d.getTime()}
function mxShift(per,start,n){const d=new Date(start);if(per==='week')d.setDate(d.getDate()+7*n);else d.setMonth(d.getMonth()+(per==='month'?1:3)*n);return d.getTime()}
const MX_PER={week:'this week',month:'this month',quarter:'this quarter'};
function mxValIn(item,from,to){const es=(item.log||[]).filter(e=>e.at>=from&&e.at<to);
  if(item.kind==='last'){const all=(item.log||[]).filter(e=>e.at<to);if(!all.length)return null;return all.reduce((a,b)=>b.at>=a.at?b:a).v}
  return es.reduce((s,e)=>s+(+e.v||0),0)}
function mxKpiNow(k){const s=mxStart(k.period,Date.now());return mxValIn(k,s,mxShift(k.period,s,1))}
function mxKpiHist(k,n){const s=mxStart(k.period,Date.now());const out=[];for(let i=n-1;i>=0;i--){const a=mxShift(k.period,s,-i);out.push(mxValIn(k,a,mxShift(k.period,a,1))||0)}return out}
function mxKpiP(k){const v=mxKpiNow(k),t=+k.target;if(v==null||!t)return 0;
  return Math.max(0,Math.min(1,k.better==='down'?(v<=t?1:t/v):v/t))}
const mxKrKind=r=>+r.from?'last':'sum';
function mxKrNow(r){const from=+r.from||0,log=r.log||[];if(mxKrKind(r)==='last'){if(!log.length)return from;return log.reduce((a,b)=>b.at>=a.at?b:a).v}
  return from+log.reduce((s,e)=>s+(+e.v||0),0)}
function mxKrP(r){const from=+r.from||0,t=+r.target,v=mxKrNow(r);if(t===from)return v===t?1:0;return Math.max(0,Math.min(1,(v-from)/(t-from)))}
const mxOkrP=o=>o.krs.length?o.krs.reduce((s,r)=>s+mxKrP(r),0)/o.krs.length:0;
const mxDays=ms=>Math.ceil((ms-Date.now())/DAY);
const mxQ=at=>{const d=new Date(at);return `Q${Math.floor(d.getMonth()/3)+1}`};
function mxQuarterEnd(at){const d=new Date(mxShift('quarter',mxStart('quarter',at||Date.now()),1)-DAY);return dkey(d)}
const mxEndMs=o=>new Date(o.end+'T23:59:59').getTime();
function mxOkrWhen(o){if(o.closed)return `Closed ${new Date(o.closed).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · score ${Math.round((o.score||0)*100)}%`;
  const d=mxDays(mxEndMs(o)),end=new Date(o.end+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
  return d<0?`Ended ${end} · close it out`:d===0?'Ends today':`${mxQ(new Date(o.end+'T12:00'))} · ends ${end}`}
function mxSpark(pts,w,h){w=w||92;h=h||26;const mx=Math.max(...pts),mn=Math.min(...pts),sx=w/(pts.length-1||1),y=p=>h-3-(mx===mn?.5:(p-mn)/(mx-mn))*(h-6);
  const d=pts.map((p,i)=>`${i?'L':'M'}${(i*sx).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
  return `<svg class="mx-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}"/><circle cx="${((pts.length-1)*sx).toFixed(1)}" cy="${y(pts[pts.length-1]).toFixed(1)}" r="2.8"/></svg>`}
const mxSrcTxt=k=>k.src==='log'?(k.kind==='last'?'latest value you set':'numbers you log'):k.src==='both'?'tasks and logging':'done tasks';
/* ---- finding things ---- */
function mxFind(link){if(link.okr!=null){const o=(S.okrs||[]).find(x=>String(x.id)===String(link.okr));const r=o&&o.krs.find(x=>String(x.id)===String(link.id));return r?{kind:'kr',item:r,okr:o,name:r.name}:null}
  const k=(S.kpis||[]).find(x=>String(x.id)===String(link.id));return k?{kind:'kpi',item:k,name:k.name}:null}
const mxKey=l=>l.okr!=null?`kr:${l.okr}:${l.id}`:`kpi:${l.id}`;
function mxCands(t){const sp=(listOf(t.list)||{}).space;const out=[];
  mxKpis(sp).filter(k=>k.src!=='log'&&k.kind!=='last').forEach(k=>out.push({id:k.id,name:k.name,kind:'kpi'}));
  mxOkrs(sp,false).forEach(o=>o.krs.filter(r=>mxKrKind(r)==='sum').forEach(r=>out.push({id:r.id,okr:o.id,name:r.name,kind:'kr',obj:o.name})));
  (t.mx||[]).forEach(l=>{if(!out.some(c=>mxKey(c)===mxKey(l))){const f=mxFind(l);if(f)out.push({id:l.id,okr:l.okr,name:f.name,kind:f.kind})}});
  return out}
/* ---- tasks move numbers ---- */
let mxAskQ=[];
function mxLogTask(t){(t.mx||[]).forEach(l=>{const f=mxFind(l);if(!f)return;
  if(l.add==null||l.add===''){mxAskQ.push({task:t.id,link:{...l},name:f.name});return}
  f.item.log.push({id:newId(),at:Date.now(),v:+l.add||0,task:t.id})});
  if(mxAskQ.length)setTimeout(mxAskNext,420)}
function mxUnlogTask(t){(t.mx||[]).forEach(l=>{const f=mxFind(l);if(!f)return;const mine=f.item.log.filter(e=>e.task===t.id);if(!mine.length)return;
  const last=mine.reduce((a,b)=>b.at>=a.at?b:a);f.item.log=f.item.log.filter(e=>e!==last)})}
const _mxSetStage=setStage;
setStage=function(t,stage){const was=t.stage,sp=t.spawned;_mxSetStage(t,stage);
  try{if(!mxOn()||!Array.isArray(t.mx)||!t.mx.length)return;
    if(stage==='done'&&was!=='done'){mxLogTask(t);if(t.spawned&&t.spawned!==sp){const c=S.tasks.find(x=>x.id===t.spawned);if(c)c.mx=t.mx.map(x=>({...x}))}}
    else if(was==='done'&&stage!=='done'){mxUnlogTask(t);mxAskQ=mxAskQ.filter(q=>q.task!==t.id)}}catch(e){console.error(e)}};
/* "Ask me": a small calm question after the task is done */
document.body.insertAdjacentHTML('beforeend',`<div class="dlg mx-ask" id="mxAsk" role="dialog" aria-modal="true" aria-labelledby="mxAskT"><div class="dlg-in mx-ask-in">
  <span class="mx-eye">${MX_ICON}Counts toward</span><b id="mxAskT"></b><small id="mxAskS"></small>
  <input id="mxAskIn" type="number" inputmode="decimal" step="any" placeholder="How many?" aria-label="Amount">
  <div class="mx-ask-b"><button class="ghost-btn" id="mxAskSkip">Skip</button><button class="primary" id="mxAskGo">Add</button></div></div></div>`);
let mxAskCur=null;
function mxAskNext(){if(mxAskCur||!mxAskQ.length)return;mxAskCur=mxAskQ.shift();const t=S.tasks.find(x=>x.id===mxAskCur.task);
  $('mxAskT').textContent=mxAskCur.name;$('mxAskS').textContent=t?`Done: ${t.title}`:'';$('mxAskIn').value='';$('mxAsk').classList.add('on');setTimeout(()=>$('mxAskIn').focus(),60)}
function mxAskDone(add){const q=mxAskCur;mxAskCur=null;$('mxAsk').classList.remove('on');
  if(add&&q){const v=+$('mxAskIn').value;const f=mxFind(q.link);const t=S.tasks.find(x=>x.id===q.task);
    if(f&&Number.isFinite(v)&&v!==0&&t&&t.stage==='done'){f.item.log.push({id:newId(),at:Date.now(),v,task:q.task});save();render();try{sfx('add')}catch(e){}toast(`+${mxN(v)} · ${f.name}`)}}
  setTimeout(mxAskNext,200)}
$('mxAsk').addEventListener('click',e=>{if(e.target===$('mxAsk')||e.target.closest('#mxAskSkip'))return mxAskDone(false);if(e.target.closest('#mxAskGo'))return mxAskDone(true)});
$('mxAsk').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();mxAskDone(true)}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();mxAskDone(false)}});

/* ---------- the popup ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="mx-pg" id="mxPg" role="dialog" aria-modal="true" aria-label="KPIs and OKRs"><div class="mx-card" id="mxIn"></div></div>');
function mxOpenPop(){const sp=mxSpaceNow();if(!sp||!mxOn())return;mxOpen=true;mxView=null;mxDraft=null;mxPast=false;
  if(typeof closeSearch==='function')closeSearch();mxDraw();$('mxPg').classList.add('on');haptic(5);
  setTimeout(()=>{const b=$('mxIn').querySelector('.mx-x');if(b&&!mxPhone())b.focus()},60)}
function mxClose(){if(!mxOpen)return;mxOpen=false;mxView=null;mxDraft=null;$('mxPg').classList.remove('on');const a=document.activeElement;if(a&&a.closest&&a.closest('#mxPg'))a.blur()}
function mxHead(eye,title,back){return `<div class="mx-h">${back?`<button class="mx-ib mx-back" data-mxback aria-label="Back">${BACK_SVG}</button>`:''}
  <div class="mx-ht"><span class="mx-eye">${eye}</span><b>${title}</b></div>
  ${back?'':`<button class="mx-ib" data-mxlook aria-label="${mxLook()==='board'?'Show one at a time':'Show the scoreboard'}" title="${mxLook()==='board'?'One at a time':'Scoreboard'}">${mxLook()==='board'?MX_ONE:MX_LIST}</button>`}
  <button class="mx-ib mx-x" data-mxx aria-label="Close">${X}</button></div>`}
function mxDraw(){if(!mxOpen)return;const sp=mxSpaceNow();if(!sp){mxClose();return}
  const sname=esc(spaceOf(sp).name);let h;
  if(mxDraft)h=mxDraft.kind==='kpi'?mxKpiForm(sname):mxOkrForm(sname);
  else if(mxView)h=mxItemView(sname);
  else h=mxLook()==='board'?mxBoard(sp,sname):mxFocusView(sp,sname);
  $('mxIn').innerHTML=h;$('mxIn').dataset.look=mxDraft?'form':mxView?'item':mxLook()}
/* ---- Scoreboard ---- */
function mxKpiRow(k){const v=mxKpiNow(k),p=mxKpiP(k);
  return `<button class="mx-kr" data-mxk="${k.id}"><span class="mx-kt"><b>${esc(k.name)}</b><small>${MX_PER[k.period]||''} · ${mxSrcTxt(k)}</small></span>
    <span class="mx-sp${p>=.7?'':' low'}">${mxSpark(mxKpiHist(k,6))}</span><span class="mx-kv"><b>${v==null&&k.kind==='last'?'—':mxFmt(v??0,k.unit)}</b><small>/ ${mxFmt(+k.target,k.unit)}</small></span></button>`}
function mxOkrCard(o){const p=mxOkrP(o);
  return `<div class="mx-okr${o.closed?' past':''}"><button class="mx-oh" data-mxo="${o.id}"><span class="mx-kt"><b>${esc(o.name)}</b><small>${mxOkrWhen(o)}</small></span><span class="mx-op">${Math.round((o.closed?o.score||0:p)*100)}%</span></button>
    ${o.closed?'':o.krs.map(r=>`<button class="mx-krr" data-mxr="${o.id}:${r.id}"><span class="mx-krt"><span>${esc(r.name)}</span><b>${mxFmt(mxKrNow(r),r.unit)}${mxKrKind(r)==='sum'?` <small>/ ${mxFmt(+r.target,r.unit)}</small>`:` <small>→ ${mxFmt(+r.target,r.unit)}</small>`}</b></span>
      <span class="mx-bar"><i style="width:${(mxKrP(r)*100).toFixed(1)}%"></i></span></button>`).join('')}
    ${!o.closed&&mxDays(mxEndMs(o))<0?`<button class="mx-close" data-mxcl="${o.id}">Close it out · keep the ${Math.round(p*100)}% score</button>`:''}</div>`}
function mxBoard(sp,sname){const ks=mxKpis(sp),os=mxOkrs(sp,false),past=mxOkrs(sp,true);
  const kpiSec=`<section class="mx-sec${mxTab==='kpi'?' on':''}" data-sec="kpi"><h3 class="mx-sh">KPIs<small>${ks.length}</small></h3>
    ${ks.length?ks.map(mxKpiRow).join(''):`<p class="mx-empty">Numbers that show how a week is going, like messages sent or demos booked.</p>`}
    ${ks.length<MX_KPI_MAX?`<button class="mx-new" data-mxnew="kpi">${PLUS_S}New KPI</button>`:''}</section>`;
  const okrSec=`<section class="mx-sec${mxTab==='okr'?' on':''}" data-sec="okr"><h3 class="mx-sh">OKRs<small>${os.length}</small></h3>
    ${os.length?os.map(mxOkrCard).join(''):`<p class="mx-empty">One objective for the quarter and the results that prove it, like “Win 3 pilots” with “Book 12 demos”.</p>`}
    ${os.length<MX_OKR_MAX?`<button class="mx-new" data-mxnew="okr">${PLUS_S}New OKR</button>`:''}
    ${past.length?`<button class="mx-pastb" data-mxpast aria-expanded="${mxPast}">Past<small>${past.length}</small>${CHEV}</button>${mxPast?past.map(mxOkrCard).join(''):''}`:''}</section>`;
  return `${mxHead(sname,'Scoreboard')}<div class="mx-tabs" role="tablist">${[['kpi','KPIs'],['okr','OKRs']].map(([k,l])=>`<button role="tab" data-mxtab="${k}" aria-selected="${mxTab===k}">${l}</button>`).join('')}</div>
    <div class="mx-body mx-board">${kpiSec}${okrSec}</div>`}
/* ---- Focus: one big number at a time ---- */
function mxItems(sp){return [...mxKpis(sp).map(k=>({kind:'kpi',k})),...mxOkrs(sp,false).map(o=>({kind:'okr',o}))]}
function mxFocusView(sp,sname){const its=mxItems(sp);
  if(!its.length)return `${mxHead(sname,'Focus')}<div class="mx-body"><div class="mx-fe">${MX_ICON}<b>Nothing to track yet</b><span>Add a KPI for a weekly number, or an OKR for a quarterly result.</span>
    <div class="mx-fe-b"><button class="mx-pill on" data-mxnew="kpi">${PLUS_S}New KPI</button><button class="mx-pill" data-mxnew="okr">${PLUS_S}New OKR</button></div></div></div>`;
  mxFocusI=Math.max(0,Math.min(mxFocusI,its.length-1));const it=its[mxFocusI];let card;
  if(it.kind==='kpi'){const k=it.k,v0=mxKpiNow(k),v=v0??0,p=mxKpiP(k),s=mxStart(k.period,Date.now()),left=mxDays(mxShift(k.period,s,1)),t=+k.target;
    const togo=k.better==='down'||k.kind==='last'?'':Math.max(0,t-v);
    card=`<div class="mx-fc" data-mxswipe><span class="mx-eye hot">KPI · ${MX_PER[k.period]||''}</span><b class="mx-fn">${esc(k.name)}</b>
      <div class="mx-big"><span class="mx-bn">${v0==null&&k.kind==='last'?'—':mxFmt(v,k.unit)}</span><span class="mx-bt">/ ${mxFmt(t,k.unit)}</span><span class="mx-bs">${mxSpark(mxKpiHist(k,6),118,40)}</span></div>
      <span class="mx-bar big"><i style="width:${(p*100).toFixed(1)}%"></i></span>
      <div class="mx-ff"><small>${togo?`${mxFmt(togo,k.unit)} to go · `:''}${left} ${left===1?'day':'days'} left · ${mxSrcTxt(k)}</small>${k.src==='tasks'?`<button class="mx-log" data-mxk="${k.id}">Open</button>`:`<button class="mx-log" data-mxk="${k.id}" data-mxlogfocus>${PLUS_S}Log</button>`}</div></div>`}
  else{const o=it.o,p=mxOkrP(o);
    card=`<div class="mx-fc" data-mxswipe><span class="mx-eye hot">OKR · ${mxOkrWhen(o)}</span><b class="mx-fn">${esc(o.name)}</b>
      <div class="mx-big"><span class="mx-bn">${Math.round(p*100)}%</span></div>
      ${o.krs.map(r=>`<button class="mx-krr" data-mxr="${o.id}:${r.id}"><span class="mx-krt"><span>${esc(r.name)}</span><b>${mxFmt(mxKrNow(r),r.unit)} <small>${mxKrKind(r)==='sum'?'/':'→'} ${mxFmt(+r.target,r.unit)}</small></b></span><span class="mx-bar"><i style="width:${(mxKrP(r)*100).toFixed(1)}%"></i></span></button>`).join('')}
      <div class="mx-ff"><small></small><button class="mx-log" data-mxo="${o.id}">Edit</button></div></div>`}
  const dots=its.length>1?`<div class="mx-dots">${its.map((x,i)=>`<button data-mxdot="${i}" class="${i===mxFocusI?'on':''}" aria-label="Show ${esc(x.kind==='kpi'?x.k.name:x.o.name)}"></button>`).join('')}</div>`:'';
  const rest=its.map((x,i)=>i===mxFocusI?'':x.kind==='kpi'?`<button class="mx-ar" data-mxdot="${i}"><span>${esc(x.k.name)}</span><b>${mxKpiNow(x.k)==null&&x.k.kind==='last'?'—':mxFmt(mxKpiNow(x.k)??0,x.k.unit)}</b><small>/ ${mxFmt(+x.k.target,x.k.unit)}</small></button>`
    :`<button class="mx-ar" data-mxdot="${i}"><span>OKR · ${esc(x.o.name)}</span><b class="hot">${Math.round(mxOkrP(x.o)*100)}%</b></button>`).join('');
  const ks=mxKpis(sp).length,os=mxOkrs(sp,false).length;
  return `${mxHead(sname,'Focus')}<div class="mx-body mx-focus"><div class="mx-fl">${card}${dots}</div>
    <div class="mx-fr">${rest?`<h3 class="mx-sh">Also tracking</h3>${rest}`:''}
    <div class="mx-adds">${ks<MX_KPI_MAX?`<button class="mx-new" data-mxnew="kpi">${PLUS_S}New KPI</button>`:''}${os<MX_OKR_MAX?`<button class="mx-new" data-mxnew="okr">${PLUS_S}New OKR</button>`:''}</div></div></div>`}
/* ---- one KPI or key result: log a number, see what moved it ---- */
function mxViewItem(){if(!mxView)return null;if(mxView.kind==='kpi'){const k=(S.kpis||[]).find(x=>String(x.id)===String(mxView.id));return k?{kind:'kpi',item:k}:null}
  const o=(S.okrs||[]).find(x=>String(x.id)===String(mxView.okr)),r=o&&o.krs.find(x=>String(x.id)===String(mxView.id));return r?{kind:'kr',item:r,okr:o}:null}
function mxItemView(sname){const f=mxViewItem();if(!f){mxView=null;return mxBoard(mxSpaceNow(),sname)}
  const it=f.item,isK=f.kind==='kpi',last=isK?it.kind==='last':mxKrKind(it)==='last',canLog=!isK||it.src!=='tasks';
  let v,t=+it.target,p,sub;
  if(isK){v=mxKpiNow(it)??0;p=mxKpiP(it);const s=mxStart(it.period,Date.now()),left=mxDays(mxShift(it.period,s,1));sub=`${MX_PER[it.period]} · ${left} ${left===1?'day':'days'} left`}
  else{v=mxKrNow(it);p=mxKrP(it);sub=`Key result · ${esc(f.okr.name)}`}
  const ents=(it.log||[]).slice().sort((a,b)=>b.at-a.at).slice(0,12);
  const when=at=>{const d=new Date(at);return d.toDateString()===new Date().toDateString()?d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):d.toLocaleDateString(undefined,{month:'short',day:'numeric'})};
  return `${mxHead(isK?'KPI':'Key result',esc(it.name),true)}<div class="mx-body mx-item">
    <div class="mx-big"><span class="mx-bn">${mxFmt(v,it.unit)}</span><span class="mx-bt">${last&&!isK?'→':'/'} ${mxFmt(t,it.unit)}</span></div>
    <span class="mx-bar big"><i style="width:${(p*100).toFixed(1)}%"></i></span><small class="mx-isub">${sub}</small>
    ${canLog?`<div class="mx-logrow"><input id="mxLogIn" type="number" inputmode="decimal" step="any" placeholder="${last?'New value':'Amount, e.g. 5'}" aria-label="${last?'Set the latest value':'Add an amount'}"><button class="primary" data-mxadd>${last?'Set':'Add'}</button></div>`
      :`<p class="mx-hint">This KPI moves with done tasks. Link a task from its details: “Counts toward”.</p>`}
    <h3 class="mx-sh">History</h3>
    ${ents.length?ents.map(e=>{const tk=e.task!=null?S.tasks.find(x=>x.id===e.task):null;return `<div class="mx-ent"><span class="mx-ev">${last?'=':(e.v>=0?'+':'')}${mxFmt(e.v,it.unit)}</span><span class="mx-es">${tk?esc(tk.title):e.task!=null?'A task':'Logged'}</span><small>${when(e.at)}</small><button class="mx-ib sm" data-mxdel="${e.id}" aria-label="Remove this entry">${X}</button></div>`}).join('')
      :`<p class="mx-empty">Nothing yet.</p>`}
    <div class="mx-foot">${isK?`<button class="ghost-btn" data-mxedit="kpi:${it.id}">${PEN_S}Edit KPI</button>`:`<button class="ghost-btn" data-mxo="${f.okr.id}">${PEN_S}Edit OKR</button>`}</div></div>`}
/* ---- create / edit ---- */
const mxSeg=(field,opts,val)=>`<div class="segc mx-seg">${opts.map(([v,l])=>`<button type="button" class="${String(val)===String(v)?'on':''}" data-mxset="${field}" data-v="${v}">${l}</button>`).join('')}</div>`;
const mxField=(label,inner,hint)=>`<label class="mx-f"><span>${label}</span>${inner}${hint?`<small>${hint}</small>`:''}</label>`;
function mxKpiForm(sname){const d=mxDraft.v;
  return `${mxHead(sname,mxDraft.id?'Edit KPI':'New KPI',true)}<div class="mx-body mx-form">
    ${mxField('Name',`<input data-mxf="name" value="${esc(d.name)}" maxlength="60" placeholder="e.g. Outreach messages" autocomplete="off">`)}
    <div class="mx-two">${mxField('Target',`<input data-mxf="target" type="number" inputmode="decimal" step="any" value="${d.target===''?'':esc(String(d.target))}" placeholder="50">`)}${mxField('Unit',`<input data-mxf="unit" value="${esc(d.unit)}" maxlength="14" placeholder="messages, %, €" autocomplete="off">`)}</div>
    ${mxField('Every',mxSeg('period',[['week','Week'],['month','Month'],['quarter','Quarter']],d.period))}
    ${mxField('Better when',mxSeg('better',[['up','Higher'],['down','Lower']],d.better))}
    ${mxField('Moves with',mxSeg('src',[['tasks','Tasks'],['log','Logging'],['both','Both']],d.src),d.src==='tasks'?'Link tasks from their details: “Counts toward”.':d.src==='both'?'Done tasks add up, and you can log extra.':'')}
    ${d.src==='log'?mxField('Counts as',mxSeg('kind',[['sum','Total'],['last','Latest value']],d.kind),d.kind==='last'?'For rates and levels, like a 25% reply rate.':'Everything you log in a period adds up.'):''}
    <div class="mx-foot">${mxDraft.id?`<button class="ghost-btn warn" data-mxrm>${BIN_S}Delete</button>`:''}<span></span><button class="primary" data-mxsave>${mxDraft.id?'Save':'Create KPI'}</button></div></div>`}
function mxOkrForm(sname){const d=mxDraft.v;
  return `${mxHead(sname,mxDraft.id?'Edit OKR':'New OKR',true)}<div class="mx-body mx-form">
    ${mxField('Objective',`<input data-mxf="name" value="${esc(d.name)}" maxlength="80" placeholder="e.g. Win 3 pilot customers" autocomplete="off">`)}
    ${mxField('Ends on',`<input data-mxf="end" type="date" value="${esc(d.end)}">`)}
    <div class="mx-f"><span>Key results</span>
      ${d.krs.map((r,i)=>`<div class="mx-krf"><input data-mxkr="${i}:name" value="${esc(r.name)}" maxlength="60" placeholder="e.g. Book 12 demos" aria-label="Key result ${i+1}" autocomplete="off">
        <div class="mx-krn"><input data-mxkr="${i}:from" type="number" inputmode="decimal" step="any" value="${esc(String(r.from??0))}" aria-label="Starts at" title="Starts at"><span>→</span><input data-mxkr="${i}:target" type="number" inputmode="decimal" step="any" value="${r.target===''?'':esc(String(r.target))}" placeholder="12" aria-label="Target" title="Target"><input data-mxkr="${i}:unit" value="${esc(r.unit||'')}" maxlength="14" placeholder="unit" aria-label="Unit" autocomplete="off">
        <button type="button" class="mx-ib sm" data-mxkrrm="${i}" aria-label="Remove key result ${i+1}">${X}</button></div></div>`).join('')}
      ${d.krs.length<MX_KR_MAX?`<button type="button" class="mx-new" data-mxkradd>${PLUS_S}Add a key result</button>`:''}
      <small>Starts at 0: it adds up. Starts higher: you set the latest value (12% → 25%).</small></div>
    <div class="mx-foot">${mxDraft.id?`<button class="ghost-btn warn" data-mxrm>${BIN_S}Delete</button>`:''}${mxDraft.id&&!d.closed?`<button class="ghost-btn" data-mxcl="${mxDraft.id}">Close it out</button>`:''}${mxDraft.id&&d.closed?`<button class="ghost-btn" data-mxcopy>Copy to next quarter</button>`:''}<span></span><button class="primary" data-mxsave>${mxDraft.id?'Save':'Create OKR'}</button></div></div>`}
function mxNew(kind){const sp=mxSpaceNow();if(!sp)return;
  if(kind==='kpi'&&mxKpis(sp).length>=MX_KPI_MAX){toast(`${MX_KPI_MAX} KPIs per space keeps it calm`);return}
  if(kind==='okr'&&mxOkrs(sp,false).length>=MX_OKR_MAX){toast(`${MX_OKR_MAX} OKRs at once per space keeps it calm`);return}
  mxDraft=kind==='kpi'?{kind,id:null,v:{name:'',target:'',unit:'',period:'week',better:'up',src:'tasks',kind:'sum'}}
    :{kind,id:null,v:{name:'',end:mxQuarterEnd(),krs:[{id:null,name:'',from:0,target:'',unit:''}]}};
  mxDraw();setTimeout(()=>{const i=$('mxIn').querySelector('[data-mxf="name"]');if(i)i.focus()},60)}
function mxEditOpen(kind,id){if(kind==='kpi'){const k=(S.kpis||[]).find(x=>String(x.id)===String(id));if(!k)return;
    mxDraft={kind,id:k.id,v:{name:k.name,target:k.target,unit:k.unit||'',period:k.period,better:k.better,src:k.src,kind:k.kind||'sum'}}}
  else{const o=(S.okrs||[]).find(x=>String(x.id)===String(id));if(!o)return;
    mxDraft={kind,id:o.id,v:{name:o.name,end:o.end,closed:o.closed||null,krs:o.krs.map(r=>({id:r.id,name:r.name,from:r.from??0,target:r.target,unit:r.unit||''}))}}}
  mxDraw()}
function mxSave(){const d=mxDraft.v,sp=mxSpaceNow(),nm=String(d.name||'').trim();
  if(!nm){toast(mxDraft.kind==='kpi'?'Give the KPI a name':'Give the objective a name');return}
  if(mxDraft.kind==='kpi'){const tg=+d.target;if(d.target===''||!Number.isFinite(tg)||tg<=0){toast('Set a target above 0');return}
    const kind=d.src==='log'?d.kind:'sum',vals={name:nm.slice(0,60),target:tg,unit:String(d.unit||'').trim().slice(0,14),period:d.period,better:d.better,src:d.src,kind};
    const was=mxDraft.id;
    commit(()=>{if(was){const k=S.kpis.find(x=>x.id===was);if(k)Object.assign(k,vals)}else{S.kpis=S.kpis||[];S.kpis.push({id:newId(),space:sp,created:Date.now(),log:[],...vals})}
      if(kind==='last'||d.src==='log')S.tasks.forEach(t=>{if(Array.isArray(t.mx))t.mx=t.mx.filter(l=>!(l.okr==null&&String(l.id)===String(was)))})},was?'KPI saved':'KPI added');
    mxDraft=null;if(!was)mxTab='kpi';try{sfx('add')}catch(e){};return mxDraw()}
  const krs=d.krs.map(r=>({...r,name:String(r.name||'').trim()})).filter(r=>r.name);
  if(!krs.length){toast('Add at least one key result');return}
  for(const r of krs){if(r.target===''||!Number.isFinite(+r.target)){toast(`Set a target for “${r.name}”`);return}if(!Number.isFinite(+r.from)){toast(`Check the start of “${r.name}”`);return}}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.end||'')){toast('Pick an end date');return}
  const was=mxDraft.id;
  commit(()=>{const old=was?S.okrs.find(x=>x.id===was):null;
    const list=krs.map(r=>{const prev=old&&old.krs.find(x=>x.id===r.id);return {id:prev?prev.id:newId(),name:r.name.slice(0,60),from:+r.from||0,target:+r.target,unit:String(r.unit||'').trim().slice(0,14),log:prev?prev.log:[]}});
    if(old){old.name=nm.slice(0,80);old.end=d.end;const gone=old.krs.filter(r=>!list.some(x=>x.id===r.id)).map(r=>String(r.id));old.krs=list;
      if(gone.length)S.tasks.forEach(t=>{if(Array.isArray(t.mx))t.mx=t.mx.filter(l=>!(String(l.okr)===String(old.id)&&gone.includes(String(l.id))))})}
    else{S.okrs=S.okrs||[];S.okrs.push({id:newId(),space:sp,name:nm.slice(0,80),start:dkey(),end:d.end,created:Date.now(),krs:list})}},was?'OKR saved':'OKR added');
  mxDraft=null;if(!was)mxTab='okr';try{sfx('add')}catch(e){};mxDraw()}
function mxRemove(){const dr=mxDraft;if(!dr||!dr.id)return;const isK=dr.kind==='kpi';
  confirmAsk({title:isK?'Delete this KPI?':'Delete this OKR?',text:`“${dr.v.name}” and its history will be deleted. Linked tasks stay; they just stop counting toward it.`,yes:'Yes, delete',no:'No',
    onYes:()=>{try{sfx('remove')}catch(e){}commit(()=>{if(isK)S.kpis=S.kpis.filter(x=>x.id!==dr.id);else S.okrs=S.okrs.filter(x=>x.id!==dr.id);
      S.tasks.forEach(t=>{if(Array.isArray(t.mx)){t.mx=t.mx.filter(l=>isK?!(l.okr==null&&String(l.id)===String(dr.id)):String(l.okr)!==String(dr.id));if(!t.mx.length)delete t.mx}})},isK?'KPI deleted':'OKR deleted');
      mxDraft=null;mxView=null;mxDraw()}})}
function mxCloseOut(id){const o=(S.okrs||[]).find(x=>String(x.id)===String(id));if(!o)return;const sc=mxOkrP(o);
  commit(()=>{o.closed=Date.now();o.score=Math.round(sc*100)/100},`Closed with ${Math.round(sc*100)}% · it’s under Past`);
  try{sfx(sc>=.7?'summit':'milestone',true)}catch(e){}mxDraft=null;mxDraw()}
function mxCopyNext(){const dr=mxDraft;const o=dr&&(S.okrs||[]).find(x=>x.id===dr.id);if(!o)return;const sp=o.space;
  if(mxOkrs(sp,false).length>=MX_OKR_MAX){toast(`${MX_OKR_MAX} OKRs at once per space keeps it calm`);return}
  const endMs=Math.max(Date.now(),mxEndMs(o));
  commit(()=>{S.okrs.push({id:newId(),space:sp,name:o.name,start:dkey(),end:mxQuarterEnd(endMs+DAY),created:Date.now(),
    krs:o.krs.map(r=>({id:newId(),name:r.name,from:mxKrKind(r)==='last'?mxKrNow(r):0,target:r.target,unit:r.unit,log:[]}))})},'Copied to the next quarter');
  mxDraft=null;mxPast=false;mxTab='okr';mxDraw()}
/* ---- clicks, typing, keys ---- */
$('mxPg').addEventListener('click',e=>{
  if(e.target===$('mxPg')||e.target.closest('[data-mxx]'))return mxClose();
  const q=s=>e.target.closest(s);let b;
  if(q('[data-mxback]')){if(mxDraft){mxDraft=null}else mxView=null;haptic(4);return mxDraw()}
  if(q('[data-mxlook]')){const k=mxPhone()?'mxPh':'mxDk';setCfg(k,mxLook()==='board'?'focus':'board');haptic(5);return mxDraw()}
  if((b=q('[data-mxtab]'))){mxTab=b.dataset.mxtab;haptic(4);return mxDraw()}
  if((b=q('[data-mxnew]')))return mxNew(b.dataset.mxnew);
  if((b=q('[data-mxdot]'))){mxFocusI=+b.dataset.mxdot;haptic(4);return mxDraw()}
  if(q('[data-mxpast]')){mxPast=!mxPast;haptic(4);return mxDraw()}
  if((b=q('[data-mxcl]')))return mxCloseOut(b.dataset.mxcl);
  if(q('[data-mxcopy]'))return mxCopyNext();
  if((b=q('[data-mxedit]'))){const [k,id]=b.dataset.mxedit.split(':');return mxEditOpen(k,id)}
  if((b=q('[data-mxk]'))){mxView={kind:'kpi',id:b.dataset.mxk};mxDraw();if(b.hasAttribute('data-mxlogfocus'))setTimeout(()=>{const i=$('mxLogIn');if(i)i.focus()},60);return}
  if((b=q('[data-mxr]'))){const [o,r]=b.dataset.mxr.split(':');mxView={kind:'kr',okr:o,id:r};return mxDraw()}
  if((b=q('[data-mxo]')))return mxEditOpen('okr',b.dataset.mxo);
  if(q('[data-mxadd]'))return mxAddLog();
  if((b=q('[data-mxdel]'))){const f=mxViewItem();if(!f)return;const id=b.dataset.mxdel;commit(()=>{f.item.log=f.item.log.filter(x=>String(x.id)!==id)},'Entry removed');return mxDraw()}
  if((b=q('[data-mxset]'))){mxDraft.v[b.dataset.mxset]=b.dataset.v;haptic(4);return mxDraw()}
  if(q('[data-mxkradd]')){if(mxDraft.v.krs.length<MX_KR_MAX)mxDraft.v.krs.push({id:null,name:'',from:0,target:'',unit:''});mxDraw();const ins=$('mxIn').querySelectorAll('[data-mxkr$=":name"]');if(ins.length)ins[ins.length-1].focus();return}
  if((b=q('[data-mxkrrm]'))){mxDraft.v.krs.splice(+b.dataset.mxkrrm,1);if(!mxDraft.v.krs.length)mxDraft.v.krs.push({id:null,name:'',from:0,target:'',unit:''});return mxDraw()}
  if(q('[data-mxsave]'))return mxSave();
  if(q('[data-mxrm]'))return mxRemove();
});
$('mxPg').addEventListener('input',e=>{if(!mxDraft)return;const f=e.target.dataset.mxf,kr=e.target.dataset.mxkr;
  if(f)mxDraft.v[f]=e.target.value;else if(kr){const [i,k]=kr.split(':');const r=mxDraft.v.krs[+i];if(r)r[k]=e.target.value}});
$('mxPg').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='mxLogIn'){e.preventDefault();return mxAddLog()}
  if(e.key==='Enter'&&e.target.matches('.mx-form input:not([type=date])')){e.preventDefault();mxSave()}
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.target.matches('input')&&$('mxIn').dataset.look==='focus'){mxFocusI+=e.key==='ArrowRight'?1:-1;mxFocusI=Math.max(0,mxFocusI);mxDraw()}});
/* Escape steps back (form or item → list → closed), wherever focus is */
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!mxOpen||$('dlg').classList.contains('on')||$('mxAsk').classList.contains('on'))return;
  e.preventDefault();e.stopPropagation();if(mxDraft){mxDraft=null;return mxDraw()}if(mxView){mxView=null;return mxDraw()}mxClose()},true);
function mxAddLog(){const f=mxViewItem(),i=$('mxLogIn');if(!f||!i)return;const v=+i.value;if(i.value===''||!Number.isFinite(v)){i.focus();return}
  const last=f.kind==='kpi'?f.item.kind==='last':mxKrKind(f.item)==='last';
  commit(()=>{f.item.log.push({id:newId(),at:Date.now(),v})},last?`Set to ${mxFmt(v,f.item.unit)}`:`${v>=0?'+':''}${mxFmt(v,f.item.unit)} · ${f.item.name}`);
  try{sfx('tick')}catch(e){}haptic(8);mxDraw();setTimeout(()=>{const n=$('mxLogIn');if(n)n.focus()},40)}
/* swipe between items in Focus */
(()=>{let x0=null,y0=0;$('mxPg').addEventListener('touchstart',e=>{if(!e.target.closest('[data-mxswipe]')){x0=null;return}x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  $('mxPg').addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.5)return;
    const n=mxItems(mxSpaceNow()).length;const to=mxFocusI+(dx<0?1:-1);if(to<0||to>=n){haptic(3);return}mxFocusI=to;haptic(5);mxDraw()},{passive:true})})();

/* ---------- the gauge button on a space's page (phone header and computer header) ---------- */
document.querySelectorAll('[data-srch]').forEach(s=>s.insertAdjacentHTML('beforebegin',`<button class="icon-btn mx-btn" data-mxopen hidden aria-label="KPIs and OKRs" title="KPIs and OKRs">${MX_ICON}</button>`));
document.addEventListener('click',e=>{if(e.target.closest('[data-mxopen]')){e.preventDefault();mxOpenPop()}});
function mxBtns(){const on=mxOn()&&!!mxSpaceNow();document.querySelectorAll('[data-mxopen]').forEach(b=>{b.hidden=!on})}
const _mxRender=render;
render=function(d){_mxRender(d);try{mxBtns();if(mxOpen){if(!mxOn()||!mxSpaceNow())return mxClose();const a=document.activeElement;if(!(a&&a.closest&&a.closest('#mxPg')&&a.matches('input')))mxDraw()}}catch(err){console.error(err)}};

/* ---------- in a task: "Counts toward" (pill + picker), and a small mark on the row ---------- */
function mxPill(t,P){if(!mxOn()||t.inbox)return '';const links=(t.mx||[]).map(mxFind).filter(Boolean);if(!links.length&&!mxCands(t).length)return '';
  return P('mx',`${MX_ICON}${links.length?esc(links[0].name)+(links.length>1?` +${links.length-1}`:''):'Counts toward'}`,!links.length)}
function mxPicks(t){const cs=mxCands(t);if(!cs.length)return `<p class="mx-pkh">Add a KPI or OKR from the gauge on this space’s page first.</p>`;
  return cs.map(c=>{const l=(t.mx||[]).find(x=>mxKey(x)===mxKey(c));
    return `<span class="mx-pkw${l?' on':''}"><button class="pk ${l?'on':''}" data-v="${mxKey(c)}">${c.kind==='kr'?'KR · ':''}${esc(c.name)}</button>${l?`<label class="mx-amt" title="Adds this much when the task is done. Empty: ask me.">+<input type="number" inputmode="decimal" step="any" min="0" data-mxamt="${mxKey(c)}" value="${l.add==null?'':esc(String(l.add))}" placeholder="ask" aria-label="Adds when done (empty: ask me)"></label>`:''}</span>`}).join('')
    +`<p class="mx-pkh">Done adds the amount. Empty asks you. Reopening takes it back off.</p>`}
function mxPickToggle(t,v){const [kind,a,b]=v.split(':');const link=kind==='kr'?{id:b,okr:a}:{id:a};
  const key=mxKey(link);t.mx=Array.isArray(t.mx)?t.mx:[];const has=t.mx.find(x=>mxKey(x)===key);
  if(has)t.mx=t.mx.filter(x=>x!==has);else{const c=mxCands(t).find(x=>mxKey(x)===key);if(c)t.mx.push(c.okr!=null?{id:c.id,okr:c.okr,add:1}:{id:c.id,add:1})}
  if(!t.mx.length)delete t.mx}
function mxMark(t){if(!mxOn()||!Array.isArray(t.mx)||!t.mx.length)return '';const f=mxFind(t.mx[0]);if(!f)return '';
  const a=t.mx[0].add;return `<span class="mi mx-mi" title="Counts toward ${esc(f.name)}">${MX_ICON}${a==null?'':'+'+mxN(a)+' '}${esc(f.name.length>16?f.name.slice(0,15)+'…':f.name)}${t.mx.length>1?` +${t.mx.length-1}`:''}</span>`}
$('dPicker').addEventListener('input',e=>{const k=e.target.dataset.mxamt;if(!k||!cur)return;const l=(cur.mx||[]).find(x=>mxKey(x)===k);if(!l)return;
  const v=e.target.value;l.add=v===''?null:Math.max(0,+v||0);save()});
$('dPicker').addEventListener('change',e=>{if(e.target.dataset.mxamt)render()});
