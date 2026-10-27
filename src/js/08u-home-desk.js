/* ---------- computer Home: two looks (Settings → Appearance → Layout on computers → Home) ----------
   Bento (default): a tall Today card with the real tasks, beside small cards for the goal, habits, a KPI and an OKR.
   Calm column: one centred column: a coral Up next card, a few quiet rows, then spaces.
   Every card has its own empty state, so a new person sees what each one is for. A card only shows when its
   mode is on (Goals, Habits, KPIs & OKRs). The old Spaces grid and Today-first layouts are gone. */
const dhLook=()=>C().homeLayout==='calm'?'calm':'bento';
const DH_CK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const DH_PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const DH_I={
  goal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4"/><path d="M6 4.5h11l-2.2 4.2L17 13H6"/></svg>',
  hab:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 18.5h17"/><path d="M7.5 18.5a4.5 4.5 0 0 1 9 0"/><path d="M12 6.5V9M6.2 9.6l1.7 1.7M17.8 9.6l-1.7 1.7"/></svg>',
  kpi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l3.6-4.2"/><circle cx="12" cy="16.5" r="1.2"/></svg>',
  okr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg>'};
/* a ring: p 0..1, label inside */
function dhRing(p,s,sw,cls,label){const r=s/2-sw/2-1,C2=2*Math.PI*r;
  return `<span class="dh-ring ${cls||''}" style="width:${s}px;height:${s}px"><svg viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle class="r0" cx="${s/2}" cy="${s/2}" r="${r}" style="stroke-width:${sw}"/><circle class="r1" cx="${s/2}" cy="${s/2}" r="${r}" style="stroke-width:${sw};stroke-dasharray:${(C2*Math.max(0,Math.min(1,p))).toFixed(1)} ${C2.toFixed(1)}"/></svg>${label!=null?`<b>${label}</b>`:''}</span>`}
/* an empty state: a soft icon in a dashed ring, a title, one line, one button */
const dhEmpty=(ico,tone,title,line,btn)=>`<div class="dh-empty"><span class="dh-ei ${tone}">${ico}</span><b>${title}</b><span>${line}</span>${btn||''}</div>`;
const dhBtn=(attr,label)=>`<button class="dh-eb" ${attr}>${DH_PLUS}${label}</button>`;
const dhEye=(t,tone)=>`<span class="dh-eye ${tone||''}">${t}</span>`;
/* what we show today */
function dhToday(){const td=bySpaceOrder(S.tasks.filter(t=>shown(t)&&t.stage==='today'));
  const dn=S.tasks.filter(t=>shown(t)&&t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===today()).length;
  return {td,dn,m:td.reduce((a,t)=>a+t.est,0)}}
function dhGoal(){if(!goalsOn()||C().wStar===false)return null;return gStarred()||gAll()[0]||false}
function dhHabits(){if(!habitsOn()||!C().wHabits)return null;const hs=hbAll();if(!hs.length)return {none:true};
  const due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt});return {due,dn:due.filter(h=>hbStats(h).dt)}}
function dhMx(){if(typeof mxOn!=='function'||!mxOn()||C().wMx===false)return null;const its=mxHomeItems();
  return {k:its.find(x=>x.kind==='kpi')||null,o:its.find(x=>x.kind==='okr')||null,n:its.length}}

/* ===== Bento ===== */
function bnToday(){const {td,dn,m}=dhToday();const MAX=6,list=td.slice(0,MAX),more=td.length-list.length;
  const head=`<div class="bn-h">${dhEye('Today','hot')}<span class="bn-hr">${td.length?`${td.length} ${td.length===1?'task':'tasks'} · ${fmt(m)}`:dn?`${dn} done`:''}</span></div>`;
  if(!td.length)return `<section class="bn-c bn-today is-empty">${head}${dn?dhEmpty(sunIcon(),'hot','You won the day',`${dn} ${dn===1?'task':'tasks'} done. Rest, or plan tomorrow.`,dhBtn('data-bnadd','Add a task'))
    :dhEmpty(DH_I.task,'hot','Nothing planned yet','Add a task for today, or move a few from your spaces.',dhBtn('data-bnadd','Add a task'))}</section>`;
  const rows=list.map((t,i)=>{const l=listOf(t.list)||{},sp=spaceOf(l.space)||{};
    return `<div class="bn-tk${i===0?' first':''}" data-hft="${t.id}" role="button" tabindex="0"><button class="hf-ck" data-hfdone="${t.id}" aria-label="Complete ${esc(t.title)}"></button>
      <span class="bn-tt"><b>${esc(t.title)}</b>${i===0?`<small>Up next · ${sp.e?esc(sp.e)+' ':''}${esc(sp.name||'')}</small>`:''}</span><span class="bn-te">${fmt(t.est)}</span></div>`}).join('');
  return `<section class="bn-c bn-today">${head}<div class="bn-tl">${rows}${more?`<button class="bn-more" data-bnall>+${more} more</button>`:''}</div>
    <div class="bn-go"><button class="ts-go" data-bngo>${sunIcon()}Win the day</button></div></section>`}
function bnGoal(g){
  if(!g)return `<section class="bn-c is-empty">${dhEye('Goal','gold')}${dhEmpty(DH_I.goal,'gold','One big goal','Pick an outcome and climb it in milestones.',dhBtn('data-gnew=""','Set a goal'))}</section>`;
  const pr=gProg(g),left=gLeft(g,true),nx=typeof gNext==='function'?gNext(g):null;
  return `<section class="bn-c bn-goal" data-gopen="${g.id}" role="button" tabindex="0">${dhEye(g.star?'North star':'Goal','gold')}<b class="bn-big">${gName(g)}</b>
    <small class="bn-sub">${pr.of?`${pr.n} of ${pr.of} milestones`:'No milestones yet'}${left?` · ${left}`:''}</small>
    <div class="bn-gr">${dhRing(pr.p,88,8,'gold',pr.of?`${pr.n}/${pr.of}`:'0')}<span class="bn-gn">${pr.of&&pr.n>=pr.of?`Ready to mark<br><b>achieved ›</b>`:nx?`Next<br><b>${esc(nx.t)}</b>`:`Add a first<br><b>milestone ›</b>`}</span></div></section>`}
function bnHabits(h){
  const head=x=>`<div class="bn-h">${dhEye('Habits')}<span class="bn-hr">${x}</span></div>`;
  if(h.none)return `<section class="bn-c is-empty">${head('')}${dhEmpty(DH_I.hab,'hot','Small daily wins','Add a habit to tick off each day.',dhBtn('data-hbnew=""','New habit'))}</section>`;
  if(!h.due.length)return `<section class="bn-c is-empty">${head('')}${dhEmpty(DH_I.hab,'calm','Rest day','No habits due today. See you tomorrow.','<button class="dh-eb ghost" data-hbopen>See habits</button>')}</section>`;
  const list=h.due.slice(0,6),more=h.due.length-list.length;
  return `<section class="bn-c bn-hab">${head(`<b>${h.dn.length}</b> of ${h.due.length}`)}<div class="bn-hl">${list.map(x=>{const s=hbStats(x);
      return `<button class="bn-hb${s.dt?' on':''}" data-hbt="${x.id}" aria-pressed="${s.dt}"><span class="bn-hk">${DH_CK}</span><span class="bn-hn">${x.e?esc(x.e)+' ':''}${esc(x.name)}</span>${s.st>1?`<small>${s.st}d</small>`:''}</button>`}).join('')}</div>
    ${more?`<button class="bn-more" data-hbopen>+${more} more</button>`:h.dn.length===h.due.length?`<span class="bn-alld">All done today</span>`:''}</section>`}
function bnKpi(x){
  if(!x)return `<section class="bn-c is-empty">${dhEye('KPI')}${dhEmpty(DH_I.kpi,'hot','Track a number','Like messages sent or demos booked, week by week.',dhBtn('data-bnmx="kpi"','New KPI'))}</section>`;
  const k=x.k,it=mxIt(x),left=mxDays(mxShift(k.period,mxStart(k.period,Date.now()),1)),v=mxKpiNow(k)??0,tg=+k.target,late=x.behind>.15;
  const togo=k.kind!=='last'&&k.better!=='down'&&tg>v?`${mxFmt(tg-v,k.unit)} to go · `:'';
  return `<section class="bn-c bn-kpi${late?' late':''}" data-mxhw="${it.id}" role="button" tabindex="0">${dhEye(`KPI · ${MX_PER[k.period]||''}`)}<span class="bn-kn">${esc(k.name)}</span>
    <div class="bn-kv"><b>${it.v}</b><small>/ ${it.t}${mxUw(k.unit)}</small></div><span class="mx-bar"><i style="width:${(x.p*100).toFixed(1)}%"></i></span>
    <small class="bn-sub">${togo}${left} ${left===1?'day':'days'} left</small></section>`}
function bnOkr(x){
  if(!x)return `<section class="bn-c is-empty">${dhEye('OKR')}${dhEmpty(DH_I.okr,'vi','Aim for the quarter','One objective, a few key results that prove it.',dhBtn('data-bnmx="okr"','New OKR'))}</section>`;
  const o=x.o,it=mxIt(x),done=o.krs.filter(r=>mxKrP(r)>=1).length;
  return `<section class="bn-c bn-okr${x.behind>.15?' late':''}" data-mxhw="${it.id}" role="button" tabindex="0">${dhEye(`OKR · ${mxQ(new Date(o.end+'T12:00'))}`)}<span class="bn-kn">${esc(o.name)}</span>
    <div class="bn-gr">${dhRing(x.p,92,8,x.behind>.15?'gold':'vi',it.v)}<span class="bn-gn">${done} of ${o.krs.length} results<br>${esc(mxOkrWhen(o))}</span></div></section>`}
function bnSpaces(){return `<div class="bn-sps">${orderedSpaces().map(sp=>{const st=spaceStats(sp);
    return `<button class="bn-sp" data-space="${sp.id}"><span class="bn-spi">${sp.e?esc(sp.e):`<i style="background:${sp.c}"></i>`}</span><b>${esc(sp.name)}</b><small>${st.today?`${st.today} today · `:''}${st.open} open</small></button>`}).join('')}
  <button class="bn-sp new" id="spNew">${DH_PLUS}New space</button></div>`}
function bentoHome(){
  const g=dhGoal(),h=dhHabits(),mx=dhMx(),cards=[];
  if(g!==null)cards.push(bnGoal(g));if(h)cards.push(bnHabits(h));
  if(mx){cards.push(bnKpi(mx.k));cards.push(bnOkr(mx.o))}
  return `${homeNudge()}<div class="bn bn-n${cards.length}">${bnToday()}${cards.join('')}</div>${bnSpaces()}`}

/* ===== Calm column ===== */
function calmHome(){const {td,dn}=dhToday(),nx=td[0];
  const hero=nx?`<div class="cm-up"><div class="cm-ut">${dhEye('Up next')}<b>${esc(nx.title)}</b><small>${fmt(nx.est)}${td.length>1?` · then ${td.length-1} more`:''}</small></div><button class="cm-go" data-bngo>${sunIcon()}Win the day</button></div>`
    :`<div class="cm-up is-empty">${dhEmpty(dn?sunIcon():DH_I.task,'hot',dn?'You won the day':'Nothing up next',dn?`${dn} ${dn===1?'task':'tasks'} done today.`:'Add a task for today and it shows up here.',dhBtn('data-bnadd','Add a task'))}</div>`;
  const rows=[];const g=dhGoal(),h=dhHabits(),mx=dhMx();
  if(g!==null)rows.push(g?(()=>{const pr=gProg(g),left=gLeft(g,true);return `<button class="cm-r" data-gopen="${g.id}">${dhRing(pr.p,42,4,'gold',`${pr.n}/${pr.of}`)}<span class="cm-rt"><b>${gName(g)}</b><small>${g.star?'North star':'Goal'}${left?` · ${left}`:''}</small></span><span class="cm-chev">${CHEV}</span></button>`})()
    :`<button class="cm-r cm-add" data-gnew=""><span class="cm-ai gold">${DH_I.goal}</span><span class="cm-rt"><b>Set a goal</b><small>One big outcome, climbed in milestones</small></span><span class="cm-chev">${CHEV}</span></button>`);
  if(h){if(h.none)rows.push(`<button class="cm-r cm-add" data-hbnew=""><span class="cm-ai hot">${DH_I.hab}</span><span class="cm-rt"><b>Add a habit</b><small>Small daily wins to tick off</small></span><span class="cm-chev">${CHEV}</span></button>`);
    else{const open=h.due.filter(x=>!hbStats(x).dt),n=open[0];
      rows.push(`<div class="cm-r"><button class="cm-rl" data-hbopen>${dhRing(h.due.length?h.dn.length/h.due.length:1,42,4,'hot',`${h.dn.length}/${h.due.length}`)}<span class="cm-rt"><b>${n?`${n.e?esc(n.e)+' ':''}${esc(n.name)}`:h.due.length?'All habits done':'Rest day'}</b><small>${n?`Next habit${open.length>1?` · +${open.length-1} more`:''}`:h.due.length?'Nice. See you tomorrow.':'Nothing due today'}</small></span></button>${n?`<button class="hw-done" data-hbt="${n.id}" aria-pressed="false">Done</button>`:''}</div>`)}}
  if(mx){if(mx.n)rows.push(`<div class="cm-r cm-mx">${mxRingRow(mxHomeItems())}</div>`);
    else rows.push(`<button class="cm-r cm-add" data-bnmx="kpi"><span class="cm-ai hot">${DH_I.kpi}</span><span class="cm-rt"><b>Track a KPI</b><small>A number that shows how the week is going</small></span><span class="cm-chev">${CHEV}</span></button>`)}
  return `<div class="cm"><div class="cm-hd">${sunIcon('cm-sun')}<h1>${meName()?esc(greeting()):'Home'}</h1><p>${td.length?`<b>${td.length} ${td.length===1?'task':'tasks'}</b> and <b>${fmt(td.reduce((a,t)=>a+t.est,0))}</b> left today`:esc(new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}))}</p></div>
    ${hero}${rows.length?`<div class="cm-list">${rows.join('')}</div>`:''}${homeNudge()?`<div class="cm-nd">${homeNudge()}</div>`:''}
    <div class="cm-sps">${orderedSpaces().map(sp=>{const st=spaceStats(sp);return `<button class="cm-sp" data-space="${sp.id}"><b>${sp.e?esc(sp.e)+' ':''}${esc(sp.name)}</b><small>${st.today?`${st.today} today`:`${st.open} open`}</small></button>`}).join('')}<button class="cm-sp new" id="spNew">${DH_PLUS}New space</button></div></div>`}

function deskHome(){root.dataset.dhome=dhLook();return dhLook()==='calm'?calmHome():bentoHome()}
$('dHome').addEventListener('click',e=>{
  if(e.target.closest('[data-bngo]'))return $('goBtn').click();
  if(e.target.closest('[data-bnadd]'))return $('addBtn').click();
  if(e.target.closest('[data-bnall]'))return openSpaceSide('all');
  const m=e.target.closest('[data-bnmx]');if(m){const sp=(orderedSpaces()[0]||{}).id;if(!sp)return;mxOpenPop(sp);if(mxOpen)mxNew(m.dataset.bnmx)}});
$('dHome').addEventListener('keydown',e=>{const c=e.target.closest('.bn-c[role="button"]');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();c.click()}});
