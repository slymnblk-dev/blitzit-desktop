/* ---------- KPIs & OKRs on tasks, calmer ----------
   Task rows: just an icon — a coral gauge when the task counts toward a KPI, a violet target for a key result.
   Task details: the pill says how many it counts toward; the picker lists KPIs and key results as clear rows,
   each with its own "+ amount".
   The gauge on a space's page wears a thin ring with the space's overall progress; when a number moves
   (a linked task done, a log), the ring glides to the new value, the gauge glows once and a small "+1" floats up. */
const MXP_KR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
const mxpLinks=t=>(Array.isArray(t.mx)?t.mx:[]).map(l=>({l,f:mxFind(l)})).filter(x=>x.f);
/* rows */
mxMark=function(t){if(!mxOn())return '';const ls=mxpLinks(t);if(!ls.length)return '';
  const k=ls.some(x=>x.f.kind==='kpi'),r=ls.some(x=>x.f.kind==='kr');
  const tip='Counts toward '+ls.map(x=>`${x.f.name}${x.l.add!=null&&x.l.add!==''?` (+${mxN(x.l.add)})`:''}`).join(', ');
  return `<span class="mi mxp-mi" title="${esc(tip)}" aria-label="${esc(tip)}">${k?`<i class="k">${MX_ICON}</i>`:''}${r?`<i class="r">${MXP_KR}</i>`:''}</span>`};
/* details pill */
mxPill=function(t,P){if(!mxOn()||t.inbox)return '';const ls=mxpLinks(t);if(!ls.length&&!mxCands(t).length)return '';
  if(!ls.length)return P('mx',`${MX_ICON}Counts toward`,true);
  const k=ls.filter(x=>x.f.kind==='kpi').length,r=ls.length-k;
  const lbl=ls.length===1?esc(ls[0].f.name):`${k?`${k} ${k===1?'KPI':'KPIs'}`:''}${k&&r?' · ':''}${r?`${r} ${r===1?'key result':'key results'}`:''}`;
  return P('mx',`<span class="mxp-pi">${k?`<i class="k">${MX_ICON}</i>`:''}${r?`<i class="r">${MXP_KR}</i>`:''}</span>${lbl}`,false)};
/* the picker */
mxPicks=function(t){const cs=mxCands(t);if(!cs.length)return `<p class="mx-pkh">Add a KPI or OKR from the gauge on this space’s page first.</p>`;
  const row=c=>{const l=(t.mx||[]).find(x=>mxKey(x)===mxKey(c)),f=mxFind(c);let sub='';
    if(c.kind==='kpi'&&f)sub=`${MX_PER[f.item.period]||''}`;else if(c.kind==='kr'){const o=(S.okrs||[]).find(x=>String(x.id)===String(c.okr));sub=o?`OKR · ${esc(o.name)}`:'Key result'}
    return `<div class="mxp-r ${c.kind}${l?' on':''}"><button class="pk mxp-b${l?' on':''}" data-v="${mxKey(c)}" aria-pressed="${!!l}"><span class="mxp-k">${DH_CK}</span><span class="mxp-ic">${c.kind==='kr'?MXP_KR:MX_ICON}</span><span class="mxp-t"><b>${esc(c.name)}</b>${sub?`<small>${sub}</small>`:''}</span></button>
      ${l?`<label class="mxp-amt" title="Adds this much when the task is done. Empty: ask me.">+<input type="number" inputmode="decimal" step="any" min="0" data-mxamt="${mxKey(c)}" value="${l.add==null?'':esc(String(l.add))}" placeholder="ask" aria-label="Adds when done (empty: ask me)"></label>`:''}</div>`};
  const ks=cs.filter(c=>c.kind==='kpi'),rs=cs.filter(c=>c.kind==='kr');
  return `<div class="mxp">${ks.length?`<span class="mxp-h k">${MX_ICON}KPIs</span>${ks.map(row).join('')}`:''}${rs.length?`<span class="mxp-h r">${MXP_KR}Key results</span>${rs.map(row).join('')}`:''}
    <p class="mx-pkh">Done adds the number. Leave it empty to be asked.</p></div>`};

/* the gauge: a progress ring that moves when a number does */
const mxpProg=sp=>{const its=[...mxKpis(sp).map(k=>mxKpiP(k)),...mxOkrs(sp,false).map(o=>mxOkrP(o))];return its.length?its.reduce((a,b)=>a+b,0)/its.length:null};
const mxpSum=sp=>[...mxKpis(sp).map(k=>(k.log||[]).length),...mxOkrs(sp,false).flatMap(o=>o.krs.map(r=>(r.log||[]).length))].reduce((a,b)=>a+b,0);
let mxpLast={sp:null,p:null,n:null};
const _mxpBtns=mxBtns;
mxBtns=function(){_mxpBtns();const sp=mxOn()?mxSpaceIn():null;
  const p=sp!=null?mxpProg(sp):null,n=sp!=null?mxpSum(sp):null,r=19,C2=2*Math.PI*r;
  const grew=sp!=null&&mxpLast.sp===sp&&mxpLast.n!=null&&n>mxpLast.n;
  document.querySelectorAll('[data-mxopen]').forEach(b=>{
    let ring=b.querySelector('.mxp-ring');
    if(p==null){if(ring)ring.remove();b.classList.remove('has-ring');return}
    if(!ring){b.insertAdjacentHTML('beforeend',`<svg class="mxp-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="r0" cx="22" cy="22" r="${r}"/><circle class="r1" cx="22" cy="22" r="${r}" style="stroke-dasharray:0 ${C2.toFixed(1)}"/></svg>`);ring=b.querySelector('.mxp-ring')}
    b.classList.add('has-ring');b.title=`KPIs and OKRs · ${Math.round(p*100)}% overall`;
    const arc=ring.querySelector('.r1'),to=`${(C2*Math.max(.02,p)).toFixed(1)} ${C2.toFixed(1)}`;
    if(arc.style.strokeDasharray!==to)requestAnimationFrame(()=>{arc.style.strokeDasharray=to});
    if(grew&&b.offsetParent){b.classList.remove('mxp-hit');void b.offsetWidth;b.classList.add('mxp-hit');
      const d=n-mxpLast.n;const fl=document.createElement('span');fl.className='mxp-fl';fl.textContent='+'+d;b.appendChild(fl);setTimeout(()=>fl.remove(),1300);
      setTimeout(()=>b.classList.remove('mxp-hit'),1300)}});
  const sm=$('sMetrics');if(grew&&sm){sm.classList.remove('mxp-hit');void sm.offsetWidth;sm.classList.add('mxp-hit');setTimeout(()=>sm.classList.remove('mxp-hit'),1300)}
  mxpLast={sp,p,n}};
