/* ---------- Modes → Projects (optional; Settings → Modes, off by default) ----------
   Two kinds of project, both optional and hidden everywhere when the mode is off:
   • Numbers — things you count (calls, emails, words). Each number is a small sunrise gauge that fills toward
     its target and turns green with rays when hit (resets every week or month). Tapping one opens its pace coach:
     where you are vs. where you should be, and what to do ("10 a day gets you there"). A Flow view shows numbers
     as steps (calls → meetings → deals) and points at the weakest step. A Scoreboard shows the last 8 periods.
   • Phases — build something step by step (Plan → Build → Launch). Only the current phase's tasks show.
   Data: S.projects [{id,name,e,space,kind,period:'week'|'month',view:'gauges'|'flow',goal,due,created,done,doneAt,
     metrics:[{id,name,target,log:{'YYYY-MM-DD':n}}],phases:[{id,name,done}]}]; tasks link with t.proj + t.phase.
   Sync, backup and undo carry projects like tasks. Constants are var: other files may draw before this one runs. */
var pjOn=false,psOn=false,pjId=null,pjMid=null,pjAnim=false;
var P_MAX=5,MT_MAX=6,PH_MAX=8;
var PJ_TPL=[
  {e:'📈',name:'Outreach',kind:'numbers',period:'week',metrics:[['Emails',100],['Calls',50],['Meetings',8],['Deals',3]]},
  {e:'✍️',name:'Writing',kind:'numbers',period:'week',metrics:[['Words',5000],['Sessions',5]]},
  {e:'🏃',name:'Training',kind:'numbers',period:'week',metrics:[['Workouts',4],['Kilometres',25]]},
  {e:'🚀',name:'App launch',kind:'phases',phases:['Plan','Build','Test','Launch']},
  {e:'🏠',name:'Moving house',kind:'phases',phases:['Find a place','Pack','Move','Settle in']}];
var PJ_ICONS=['📈','🚀','✍️','🏃','💼','💰','📞','✉️','🎯','🛠️','🏠','📚','🎨','🎸','📷','🧪','🌱','🏆','⭐','🧠','💻','📦','🗂️','🎬'];
var PJ_BOLT='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z"/></svg>';
var PJ_NUM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 18l4-5"/></svg>';
var PJ_PH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h4v-4.5h4V10h4V5.5h4"/></svg>';

function projectsOn(){return !!(S.cfg&&S.cfg.projects)}
function pList(){if(!Array.isArray(S.projects))S.projects=[];return S.projects}
function pById(id){return pList().find(p=>p&&String(p.id)===String(id))}
function pAll(){return pList().filter(p=>p&&!p.done&&spaceOf(p.space))}
function pIn(sp){return pAll().filter(p=>p.space===sp)}
function pDone(){return pList().filter(p=>p&&p.done&&spaceOf(p.space)).sort((a,b)=>(b.doneAt||0)-(a.doneAt||0))}
function pDate(k){const a=String(k||'').split('-').map(Number);return a[0]?new Date(a[0],a[1]-1,a[2],12):null}
function pName(p){return `${p.e?esc(p.e)+' ':''}${esc(p.name)}`}
function fmtN(v){v=+v||0;const a=Math.abs(v);return a>=10000?(Math.round(v/100)/10)+'k':String(Math.round(v*10)/10)}
/* the current week (Monday start) or month, or one offset back */
function pPeriod(p,o){o=o||0;const n=new Date();
  if(p.period==='month'){const s=new Date(n.getFullYear(),n.getMonth()+o,1),e=new Date(s.getFullYear(),s.getMonth()+1,1);return {s,e,days:Math.round((e-s)/864e5)}}
  const s=new Date(n.getFullYear(),n.getMonth(),n.getDate()-((n.getDay()+6)%7)+o*7),e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7);return {s,e,days:7}}
function pPerLabel(p,short){return p.period==='month'?(short?'this month':'This month'):(short?'this week':'This week')}
function pResets(p){return p.period==='month'?'Resets on the 1st':'Resets Monday'}
function mSum(m,per){let n=0;for(const k in (m.log||{})){const d=pDate(k);if(d&&d>=per.s&&d<per.e)n+=+m.log[k]||0}return n}
function mToday(m){return +((m.log||{})[today()])||0}
function mBest(m){return Math.max(0,...Object.values(m.log||{}).map(Number).filter(Number.isFinite))}
function mStep(m){const t=+m.target||0;return t>=1000?100:t>=150?10:1}
/* where you are vs. where you should be by now, and what it takes from today */
function mPace(p,m){
  const per=pPeriod(p),now=Date.now(),el=Math.min(1,Math.max(0,(now-per.s)/(per.e-per.s))),v=mSum(m,per),t=+m.target||0;
  const t0=new Date();t0.setHours(0,0,0,0);const left=Math.max(1,Math.round((per.e-t0)/864e5));
  const need=Math.max(0,t-v),perDay=Math.ceil(need/left),diff=Math.round(v-t*el);
  return {v,t,el,diff,left,need,perDay,hit:t>0&&v>=t,per};
}
function pHits(p){const per=pPeriod(p);return p.metrics.filter(m=>(+m.target||0)>0&&mSum(m,per)>=m.target).length}
function pEndWord(p){const per=pPeriod(p),e=new Date(per.e-864e5);return p.period==='month'?e.toLocaleDateString(undefined,{month:'long',day:'numeric'}):'Sunday'}
function pCoach(p,m){const c=mPace(p,m),nm=esc(m.name.toLowerCase());
  if(!c.t)return {k:'ok',t:'No target yet',s:'Set a target to get a pace.'};
  if(c.hit)return {k:'hit',t:'Target hit',s:`${fmtN(c.v)} of ${fmtN(c.t)} ${p.period==='month'?'this month':'this week'}. Anything more is a bonus.`};
  const how=`${fmtN(c.perDay)} a day${c.left>1?' from today':' today'} gets you to ${fmtN(c.t)} ${nm} by ${pEndWord(p)}.`;
  if(c.diff<0)return {k:'behind',t:`${fmtN(-c.diff)} behind pace`,s:how};
  if(c.diff>0)return {k:'ahead',t:`${fmtN(c.diff)} ahead of pace`,s:how};
  return {k:'ok',t:'Right on pace',s:how};
}
function phCur(p){return p.phases.find(f=>!f.done)||null}
function phTasks(p,f){return S.tasks.filter(t=>t.proj!=null&&String(t.proj)===String(p.id)&&t.phase===f.id&&!t.inbox&&!t.archived)}
function phProg(p,f){const ts=phTasks(p,f),d=ts.filter(t=>t.stage==='done').length;return {n:d,of:ts.length,p:ts.length?d/ts.length:0}}
function pDaysLeft(p){const d=pDate(p.due);return d?Math.round((d-new Date(new Date().setHours(12,0,0,0)))/864e5):null}
function pSubLine(ps){
  if(!ps.length)return 'No projects yet';
  const nums=ps.filter(p=>p.kind==='numbers'),hits=nums.reduce((a,p)=>a+pHits(p),0),tot=nums.reduce((a,p)=>a+p.metrics.filter(m=>+m.target>0).length,0);
  return `<b>${ps.length}</b> ${ps.length===1?'project':'projects'}${tot?` · <b>${hits} of ${tot}</b> numbers on target`:''}`}

/* ---------- pieces ---------- */
function pGauge(v,t,cls){const p=t>0?Math.min(v/t,1):0,hit=t>0&&v>=t;
  return `<svg class="pj-g${hit?' hit':''}${cls?' '+cls:''}" viewBox="0 0 120 76" aria-hidden="true"><path class="gr" d="M60 2v7M29 11l4.5 5M91 11l-4.5 5"/>
    <path class="g0" d="M14 68A46 46 0 0 1 106 68" pathLength="100"/><path class="g1" d="M14 68A46 46 0 0 1 106 68" pathLength="100" style="stroke-dasharray:${(p*100).toFixed(1)} 101;opacity:${v>0?1:0}"/>
    <text class="gn" x="60" y="66">${fmtN(v)}</text></svg>`}
function pGaugeCard(p,m){const c=mPace(p,m),st=mStep(m);
  return `<div class="pj-gc${c.hit?' hit':''}" data-pjgc="${p.id}|${m.id}"><button class="pj-gb" data-pjm="${p.id}|${m.id}" aria-label="${esc(m.name)}: ${fmtN(c.v)} of ${fmtN(c.t)}">${pGauge(c.v,c.t)}<b>${esc(m.name)}</b><span data-pjs>${!c.t?'No target':c.hit?'Target hit':`${fmtN(c.t-c.v)} to go`}</span></button>
    <button class="pj-plus" data-pjadd="${p.id}|${m.id}" aria-label="Add ${st} ${esc(m.name)}">+${st}</button></div>`}
function pGauges(p){return p.metrics.length?`<div class="pj-grid n${Math.min(4,p.metrics.length)}">${p.metrics.map(m=>pGaugeCard(p,m)).join('')}</div>`:`<p class="pj-empty">Add the numbers you want to count in Edit project.</p>`}
function pFlow(p){
  if(p.metrics.length<2)return `<div class="pj-coach"><span class="pj-ci">${PJ_BOLT}</span><span class="g-tx"><b>Flow needs two or more numbers</b><small>Put them in order, like Calls → Meetings → Deals.</small></span></div>`;
  const per=pPeriod(p),vs=p.metrics.map(m=>({m,v:mSum(m,per)})),max=Math.max(1,...vs.map(x=>x.v));
  let weak=-1,wr=Infinity;for(let i=1;i<vs.length;i++){if(!vs[i-1].v)continue;const r=vs[i].v/vs[i-1].v;if(r<wr){wr=r;weak=i}}
  const rows=vs.map((x,i)=>`${i?`<div class="pj-cv${i===weak?' weak':''}">${vs[i-1].v&&x.v>vs[i-1].v?'↑':'↓'} ${vs[i-1].v?Math.round(x.v/vs[i-1].v*100)+'%':'—'}${i===weak?' · weakest step':''}</div>`:''}<button class="pj-fb" data-pjm="${p.id}|${x.m.id}" style="width:${Math.max(38,x.v/max*100).toFixed(1)}%"><b>${fmtN(x.v)}</b><span>${esc(x.m.name)}</span></button>`).join('');
  let tip='';if(weak>0){const a=vs[weak-1],b=vs[weak];tip=`<div class="pj-coach"><span class="pj-ci">${PJ_BOLT}</span><span class="g-tx"><b>${esc(a.m.name)} → ${esc(b.m.name)} is the weak step</b><small>${b.v?`About 1 in ${Math.max(1,Math.round(a.v/b.v))} turns into ${esc(b.m.name.toLowerCase())}.`:`None turned into ${esc(b.m.name.toLowerCase())} yet.`} A small fix here lifts everything after it.</small></span></div>`}
  return `<div class="pj-flow">${rows}</div>${tip}`;
}
/* hits and misses for the last 8 weeks (or months) */
function pScore(p){
  if(!p.metrics.length||C().pScore===false)return '';
  const W=8,born=new Date(p.created||Date.now());let best=null;
  const rows=p.metrics.map(m=>{let run=0,top=0;const cells=[];
    for(let o=-(W-1);o<=0;o++){const per=pPeriod(p,o),t=+m.target||0,v=mSum(m,per),pre=per.e<=born&&!v;
      const k=pre||!t?'x':v>=t?'h':o===0?'now':v>=t*.75?'c':'';cells.push(`<i class="${k}" title="${fmtN(v)} of ${fmtN(t)}"></i>`);
      if(k==='h'){run++;top=Math.max(top,run)}else if(k!=='now')run=0}
    if(top>=2&&(!best||top>best.n))best={m,n:top};
    return `<span class="pj-hn">${esc(m.name)}</span>${cells.join('')}`}).join('');
  const unit=p.period==='month'?'months':'weeks';
  return `<div class="pj-sec"><h2>Scoreboard</h2><span>Last 8 ${unit}</span></div>
    <div class="pj-card0"><div class="pj-heat">${rows}</div><div class="pj-hx"><span>8 ${unit} ago</span><span>${p.period==='month'?'this month':'this week'}</span></div>
    <div class="pj-leg"><span><i class="h"></i>Hit</span><span><i class="c"></i>Close</span><span><i></i>Missed</span></div></div>
    ${best?`<div class="gd-next pj-best"><span class="gd-pin">🏆</span><span class="g-tx"><b>${esc(best.m.name)}: ${best.n} ${unit} straight</b><small>Your longest run</small></span></div>`:''}`;
}
function pPhaseBar(p,labels){const cur=phCur(p);
  return `<div class="pj-phs">${p.phases.map(f=>{const st=f.done?'done':f===cur?'cur':'',pr=phProg(p,f);
    return `<div class="${st}"><i>${st==='cur'?`<b style="width:${(pr.p*100).toFixed(0)}%"></b>`:''}</i>${labels?`<span>${esc(f.name)}${f.done?' ✓':st==='cur'&&pr.of?` · ${Math.round(pr.p*100)}%`:''}</span>`:''}</div>`}).join('')}</div>`}
function pCard(p,wide){
  if(p.kind==='phases'){const cur=phCur(p),pr=cur?phProg(p,cur):null,dl=pDaysLeft(p);
    return `<button class="g-card pj-card" data-pjo="${p.id}"><span class="g-ctop"><span class="g-ce">${p.e?esc(p.e):PJ_PH}</span><span class="g-tx"><b>${esc(p.name)}</b><small>${cur?`${esc(cur.name)}${pr.of?` · ${pr.n} of ${pr.of} done`:''}`:'All phases done'}</small></span></span>
      ${pPhaseBar(p,wide)}<span class="g-cmeta"><span>${p.phases.filter(f=>f.done).length} of ${p.phases.length} phases</span><span>${dl===null?'':dl<0?'Past due':`${dl} ${dl===1?'day':'days'} left`}</span></span></button>`}
  const per=pPeriod(p),hits=pHits(p),n=p.metrics.filter(m=>+m.target>0).length;
  return `<button class="g-card pj-card" data-pjo="${p.id}"><span class="g-ctop"><span class="g-ce">${p.e?esc(p.e):PJ_NUM}</span><span class="g-tx"><b>${esc(p.name)}</b><small>${pPerLabel(p)} · ${hits} of ${n} on target</small></span></span>
    <span class="pj-mini">${p.metrics.slice(0,4).map(m=>`<span>${pGauge(mSum(m,per),+m.target||0,'sm')}<small>${esc(m.name)}</small></span>`).join('')}</span></button>`}
function projectsBlock(ps,sp,wide){
  const room=pAll().length<P_MAX,add=room?`<button class="hb-add" data-pnew="${sp||''}">${PLUS_S}New project</button>`:`<p class="hb-note">${P_MAX} projects at once is the most. Finish one to start another.</p>`;
  if(!ps.length&&!sp)return `<div class="ib-empty rh-empty g-empty"><span class="pj-emi">${pGauge(3,4,'')}</span><b>No projects yet</b><span>Count what matters each week, or build something in phases.</span><button class="primary" data-pnew="">New project</button></div>`;
  if(wide)return `<div class="g-grid wide">${ps.map(p=>pCard(p,true)).join('')}${room?`<button class="g-addc" data-pnew="${sp||''}"><span>${PLUS_S}</span>New project</button>`:''}</div>${room?'':add}`;
  return `<div class="g-grid">${ps.map(p=>pCard(p,false)).join('')}</div>${add}`}
function projectsLens(sp,wide){const ps=pIn(sp);
  return wide?`<div class="gl-wide"><div class="hbw-bar"><span class="eye">Projects · ${ps.length} active</span></div>${projectsBlock(ps,sp,true)}</div>`
    :`<div class="hb-head"><span class="eye">Projects · ${esc((spaceOf(sp)||{}).name||'')}</span><h1 class="hb-h">Projects</h1><div class="hb-sub">${pSubLine(ps)}</div></div>${projectsBlock(ps,sp,false)}`}
/* tasks: a small chip on rows; the Project pill and picker in details (phase projects) */
function projChip(t){if(t.proj==null||!projectsOn())return '';const p=pById(t.proj);if(!p||p.done)return '';const f=p.phases.find(x=>x.id===t.phase);if(!f)return '';
  return `<span class="mi pj-st" title="${esc(p.name)} › ${esc(f.name)}">${p.e?esc(p.e):PJ_PH}${esc(f.name)}</span>`}
function projPill(t,P){if(!projectsOn())return '';const ps=pAll().filter(p=>p.kind==='phases'&&p.phases.length);const p=t.proj!=null?pById(t.proj):null,f=p&&p.phases.find(x=>x.id===t.phase);
  if(!f&&!ps.length)return '';return P('proj',`${PJ_PH}${f?`${esc(p.name)} › ${esc(f.name)}`:'Project'}`,!f)}
function projPicks(t,pk){return pk(t.proj==null,'','None')+pAll().filter(p=>p.kind==='phases').map(p=>p.phases.map(f=>pk(String(t.proj)===String(p.id)&&t.phase===f.id,`${p.id}|${f.id}`,`${p.e?p.e+' ':''}${p.name} › ${f.name}${f.done?' ✓':''}`)).join('')).join('')}

/* ---------- pace chart: the dashed line is where you should be, the solid one is you ---------- */
function pPaceSvg(p,m){
  const per=pPeriod(p),D=per.days,t=+m.target||0,c=mPace(p,m),t0=new Date();t0.setHours(0,0,0,0);
  const k=Math.min(D-1,Math.max(0,Math.round((t0-per.s)/864e5))),frac=(Date.now()-t0)/864e5;
  const day=i=>{const d=new Date(per.s);d.setDate(d.getDate()+i);return +((m.log||{})[dkey(d)])||0};
  let cum=0;const pts=[[0,0]];for(let i=0;i<k;i++){cum+=day(i);pts.push([i+1,cum])}cum+=day(k);pts.push([k+Math.max(.15,Math.min(1,frac)),cum]);
  const top=Math.max(t,cum,1)*1.12,X=i=>18+i*(232/D),Y=v=>104-v*(88/top);
  const line=pts.map((q,i)=>`${i?'L':'M'}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(''),me=pts[pts.length-1];
  const lab=p.period==='month'?[0,7,14,21,28].filter(i=>i<D).map(i=>`<text x="${(X(i)+X(i+1))/2}" y="121">${i+1}</text>`).join('')
    :['M','T','W','T','F','S','S'].map((d,i)=>`<text x="${(X(i)+X(i+1))/2}" y="121"${i===k?' class="on"':''}>${d}</text>`).join('');
  return `<svg class="pj-pace" viewBox="0 0 268 126" aria-hidden="true">${(t?[0,t/2,t]:[0]).map(v=>`<path class="gl" d="M18 ${Y(v).toFixed(1)}H250"/>`).join('')}
    ${t?`<text class="tg" x="250" y="${(Y(t)-5).toFixed(1)}">target ${fmtN(t)}</text><path class="id" d="M${X(0)} ${Y(0)}L${X(D)} ${Y(t).toFixed(1)}"/>`:''}
    <path class="ac" pathLength="1" d="${line}"/>${t&&!c.hit?`<path class="cu" d="M${X(me[0]).toFixed(1)} ${Y(me[1]).toFixed(1)}L${X(D)} ${Y(t).toFixed(1)}"/>`:''}
    <circle class="pth" cx="${X(me[0]).toFixed(1)}" cy="${Y(me[1]).toFixed(1)}" r="10"/><circle class="pt" cx="${X(me[0]).toFixed(1)}" cy="${Y(me[1]).toFixed(1)}" r="5"/>${lab}</svg>`;
}

/* ---------- project page (and a number's pace coach inside it) ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg gd-pg pj-pg" id="pjPg" role="region" aria-label="Project"><div class="ib-in" id="pjIn"></div></div>');
function openProject(id,mid){
  if(!projectsOn()||!pById(id))return;
  if(typeof closeSearch==='function')closeSearch();
  pjId=id;pjMid=mid||null;pjOn=true;pjAnim=true;drawProject();pjAnim=false;
  $('pjPg').classList.add('on');$('pjPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
}
function closeProject(){if(!pjOn)return;pjOn=false;pjMid=null;$('pjPg').classList.remove('on');const a=document.activeElement;if(a&&a.closest&&a.closest('#pjPg'))a.blur();if(typeof renderDesk==='function')renderDesk()}
function pjBack(){if(pjMid){pjMid=null;haptic(5);pjAnim=true;drawProject();pjAnim=false;$('pjPg').scrollTop=0}else closeProject()}
function pMenu(p){return `<div class="lh-wrap gd-mw"><button class="lh-more" id="pjMore" type="button" aria-label="Project options" aria-haspopup="menu">${DOTS3}</button>
  <div class="sp-pop lh-pop" id="pjPop" role="menu"><button data-pm="edit" role="menuitem"><span class="lpm-i">${PEN_S}</span>Edit project</button>
  <button data-pm="done" role="menuitem"><span class="lpm-i">${G_FLAG}</span>${p.done?'Bring back':'Finish project'}</button>
  <button data-pm="del" class="warn" role="menuitem"><span class="lpm-i">${BIN_S}</span>Delete project</button></div></div>`}
function drawProject(){
  const p=pById(pjId);if(!p){closeProject();return}
  const y=$('pjPg').scrollTop,wide=matchMedia('(min-width:1100px)').matches,sp=spaceOf(p.space)||{name:'',c:'#888'};
  const m=pjMid&&p.metrics.find(x=>x.id===pjMid);if(pjMid&&!m)pjMid=null;
  const top=`<div class="set-top gd-top"><button class="icon-btn" id="pjBack" aria-label="Back">${BACK_SVG}</button>${m?'':pMenu(p)}</div>`;
  let body='';
  if(m){const c=mPace(p,m),co=pCoach(p,m),qs=mStep(m)===1?[5,10]:mStep(m)===10?[25,50]:[250,500];
    body=`<div class="gd-head pj-mh"><span class="eye">${esc(m.name)} · ${pPerLabel(p,true)}</span><h1 class="pj-big">${fmtN(c.v)}<small> of ${fmtN(c.t)}</small></h1><span class="gd-sp">${p.e?esc(p.e)+' ':''}${esc(p.name)} · ${pResets(p)}</span></div>
      <div class="gd-cols"><div class="gd-l"><div class="pj-chart${pjAnim?' anim':''}">${pPaceSvg(p,m)}</div>
        <div class="pj-coach ${co.k}"><span class="pj-ci">${PJ_BOLT}</span><span class="g-tx"><b>${co.t}</b><small>${co.s}</small></span></div>
        <div class="hbw-kpis gd-kpis"><div class="hbw-kpi"><small>Today</small><b>${fmtN(mToday(m))}</b></div><div class="hbw-kpi"><small>Best day</small><b>${fmtN(mBest(m))}</b></div></div></div>
      <div class="gd-r"><div class="gd-sec"><h2>Log</h2><span>Adds to today</span></div>
        <div class="pj-log"><button data-pjlog="-${mStep(m)}" aria-label="Remove ${mStep(m)}">−</button><div class="pj-lv"><b>${fmtN(mToday(m))}</b><small>today</small></div><button data-pjlog="${mStep(m)}" aria-label="Add ${mStep(m)}">+</button></div>
        <div class="pj-quick">${qs.map(n=>`<button data-pjlog="${n}">+${n}</button>`).join('')}<div class="pj-cust"><input id="pjLogIn" inputmode="decimal" placeholder="Other amount" autocomplete="off" enterkeyhint="done" aria-label="Amount to add"><button id="pjLogGo" type="button">Add</button></div></div></div></div>`;
  } else if(p.kind==='phases'){const cur=phCur(p),pr=cur?phProg(p,cur):null,dl=pDaysLeft(p),ts=cur?phTasks(p,cur):[];
    const open=ts.filter(t=>t.stage!=='done'),dn=ts.filter(t=>t.stage==='done');
    const trow=t=>`<div class="g-trow pj-tr${t.stage==='done'?' on':''}"><button class="pj-tc" data-pjt="${t.id}" aria-pressed="${t.stage==='done'}" aria-label="${t.stage==='done'?'Reopen':'Complete'}: ${esc(t.title)}"><span class="hc-dot">${ICK}</span></button><button class="g-tx pj-to" data-gtask="${t.id}"><b>${esc(t.title)}</b><small>${esc(listOf(t.list).name)} · ${esc(STAGES[idx(t.stage)].name)}</small></button></div>`;
    body=`<div class="gd-head"><span class="eye">Project${p.due?` · ${dl<0?'past due':`${dl} ${dl===1?'day':'days'} left`}`:''}</span><h1 class="gd-h">${p.e?`<span class="gd-e">${esc(p.e)}</span>`:''}${esc(p.name)}</h1><span class="gd-sp">${spMini(sp)}${esc(sp.name)}${p.due?` · by ${gShort(p.due)}`:''}</span></div>
      ${pPhaseBar(p,true)}
      ${cur?`<div class="gd-sec"><h2>${esc(cur.name)}</h2><span>${pr.of?`${pr.n} of ${pr.of}`:''}</span>${pr.of&&pr.n>=pr.of?'':`<button class="txt-btn gd-ed" data-phdone>Finish phase</button>`}</div>
        <div class="g-tasks pj-ts">${open.map(trow).join('')}${dn.map(trow).join('')}<div class="g-msadd"><span class="g-msp">${PLUS_S}</span><input id="pjTaskIn" placeholder="Add a task to ${esc(cur.name)}" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task"></div></div>
        ${pr.of&&pr.n>=pr.of?`<div class="gd-next sum"><span class="gd-pin">✅</span><span class="g-tx"><b>${esc(cur.name)} is done</b><small>${p.phases.indexOf(cur)<p.phases.length-1?`Next up: ${esc(p.phases[p.phases.indexOf(cur)+1].name)}`:'That was the last phase.'}</small></span><button class="gd-mk dark" data-phdone>${p.phases.indexOf(cur)<p.phases.length-1?'Next phase':'Finish'}</button></div>`:''}
        <p class="gd-hint">Only this phase’s tasks show here, so it never feels like too much.</p>`
      :`<div class="gd-next sum"><span class="gd-pin">🎉</span><span class="g-tx"><b>Every phase is done</b><small>Finish the project to move it out of the way.</small></span><button class="gd-mk dark" data-pm="done">Finish project</button></div>`}`;
  } else {const view=p.view||C().pView||'gauges',hits=pHits(p),n=p.metrics.filter(x=>+x.target>0).length;
    const focus=p.metrics.map(x=>({x,c:mPace(p,x)})).filter(o=>o.c.t&&!o.c.hit).sort((a,b)=>a.c.diff/a.c.t-b.c.diff/b.c.t)[0];
    const sw=`<div class="lens-sw gd-sw" role="tablist" aria-label="View">${[['gauges','Gauges'],['flow','Flow']].map(([k,l])=>`<button role="tab" data-pview="${k}" class="${view===k?'on':''}" aria-selected="${view===k}">${l}</button>`).join('')}</div>`;
    const fc=focus&&focus.c.diff<0?pCoach(p,focus.x):null;
    const coach=fc?`<button class="pj-coach behind pj-cbtn" data-pjm="${p.id}|${focus.x.id}"><span class="pj-ci">${PJ_BOLT}</span><span class="g-tx"><b>${esc(focus.x.name)}: ${fc.t}</b><small>${fc.s}</small></span>${CHEV}</button>`
      :n?`<div class="pj-coach hit"><span class="pj-ci">${PJ_BOLT}</span><span class="g-tx"><b>${hits>=n?'Every target is hit':'Every number is on pace'}</b><small>${hits>=n?'Anything more this '+(p.period==='month'?'month':'week')+' is a bonus.':'Nice. Keep the rhythm going.'}</small></span></div>`:'';
    body=`<div class="gd-head"><span class="eye">${p.e?esc(p.e)+' ':''}${esc(sp.name)} · ${pPerLabel(p,true)}</span><h1 class="gd-h">${esc(p.name)}</h1><span class="hb-sub">${pResets(p)}${n?` · <b>${hits} of ${n}</b> on target`:''}</span></div>
      ${sw}<div class="pj-view${pjAnim?' anim':''}">${view==='flow'?pFlow(p):pGauges(p)}</div>
      <div class="gd-cols pj-cols"><div class="gd-l">${view==='flow'?'':coach}${p.goal&&typeof gById==='function'&&goalsOn()&&gById(p.goal)&&!gById(p.goal).done?pFeeds(p):''}</div><div class="gd-r">${pScore(p)}</div></div>`;
  }
  $('pjIn').innerHTML=top+body;$('pjPg').scrollTop=y;
}
function pFeeds(p){const g=gById(p.goal),pr=gProg(g);
  return `<button class="gd-next pj-feeds" data-gopen="${g.id}"><span class="gd-pin pj-star">${G_STAR}</span><span class="g-tx"><b>Feeds: ${gName(g)}</b><small>${pr.of?`${pr.n} of ${pr.of} milestones · `:''}${gLeft(g)}</small></span>${CHEV}</button>`}

/* ---------- logging ---------- */
let pjT=null;
function pLog(p,m,n){n=+n;if(!Number.isFinite(n)||!n)return;
  m.log=m.log||{};const k=today(),was=+m.log[k]||0,v=Math.max(0,Math.round((was+n)*100)/100);if(v===was)return;
  const before=mPace(p,m).hit;if(v)m.log[k]=v;else delete m.log[k];save();
  const c=mPace(p,m);haptic(c.hit&&!before?[10,40,10,40,20]:n>0?8:5);try{sfx(n>0?'add':'undone')}catch(e){}
  if(c.hit&&!before)toast(`🎉 ${m.name}: target hit`);
  document.querySelectorAll(`[data-pjgc="${p.id}|${m.id}"]`).forEach(el=>{el.classList.toggle('hit',c.hit);const g=el.querySelector('.pj-g');if(g){g.classList.toggle('hit',c.hit);const a=g.querySelector('.g1');a.style.strokeDasharray=`${(c.t?Math.min(c.v/c.t,1)*100:0).toFixed(1)} 101`;a.style.opacity=c.v>0?1:0;g.querySelector('.gn').textContent=fmtN(c.v)}
    const s=el.querySelector('[data-pjs]');if(s)s.textContent=!c.t?'No target':c.hit?'Target hit':`${fmtN(c.t-c.v)} to go`});
  if(pjOn&&pjMid===m.id)drawProject();
  clearTimeout(pjT);pjT=setTimeout(()=>{if(!document.querySelector('.sheet.on'))render()},900);
}
function pAddPhaseTask(p,title){
  const cur=phCur(p);if(!cur)return;const ls=S.lists.filter(l=>l.space===p.space),l=ls.find(x=>stageRoom(x.id,'week'))||ls[0];
  if(!l){toast('Add a list to this space first');return}if(!canPut(l.id,'week'))return;
  commit(()=>addTask({id:newId(),title,stage:'week',list:l.id,est:S.cfg.defEst||30,subs:[],notes:'',repeat:'none',proj:p.id,phase:cur.id}),`Added to ${l.name} · My week`);
  if(pjOn){drawProject();const i=$('pjTaskIn');if(i)i.focus()}
}
function pPhaseDone(p){const cur=phCur(p);if(!cur)return;const i=p.phases.indexOf(cur),nx=p.phases[i+1];
  commit(()=>{cur.done=true},nx?`${cur.name} done. On to ${nx.name}.`:`${cur.name} done. Every phase is finished.`);haptic([8,30,12])}
function pSetDone(p,on){
  if(!on&&pAll().length>=P_MAX){toast(`${P_MAX} projects are already active. Finish one first.`);return}
  commit(()=>{if(on){p.done=true;p.doneAt=Date.now()}else{p.done=false;delete p.doneAt}},on?`${p.name} finished`:'Back in progress');
  if(on&&pjId===p.id)closeProject();
}
function pDelete(p){
  confirmAsk({title:`Delete ${p.name}?`,text:p.kind==='numbers'?'Its numbers and history go too.':'Its phases go too. The tasks stay.',yes:'Yes, delete',no:'No',
    onYes:()=>{const inSet=settingsOpen();closeSetupP();if(pjId===p.id)closeProject();
      commit(()=>{S.projects=pList().filter(x=>x!==p);S.tasks.forEach(t=>{if(t.proj!=null&&String(t.proj)===String(p.id)){delete t.proj;delete t.phase}})},`${p.name} deleted`);if(inSet)drawSettings()}});
}
$('pjPg').addEventListener('click',e=>{
  const p=pById(pjId);if(!p)return;
  const pop=$('pjPop');if(pop&&!e.target.closest('#pjPop,#pjMore'))pop.classList.remove('on');
  if(e.target.closest('#pjBack'))return pjBack();
  if(e.target.closest('#pjMore')){e.stopPropagation();const was=pop.classList.contains('on');document.querySelectorAll('.sp-pop.on').forEach(x=>x.classList.remove('on'));if(!was){haptic(5);pop.classList.add('on')}return}
  const pm=e.target.closest('[data-pm]');if(pm){if(pop)pop.classList.remove('on');const a=pm.dataset.pm;if(a==='edit')return openSetupP(null,p.id);if(a==='done')return pSetDone(p,!p.done);if(a==='del')return pDelete(p);return}
  const v=e.target.closest('[data-pview]');if(v){if((p.view||C().pView)!==v.dataset.pview){p.view=v.dataset.pview;haptic(5);save();pjAnim=true;drawProject();pjAnim=false}return}
  const mm=e.target.closest('[data-pjm]');if(mm){pjMid=mm.dataset.pjm.split('|')[1];haptic(5);pjAnim=true;drawProject();pjAnim=false;$('pjPg').scrollTop=0;return}
  const lg=e.target.closest('[data-pjlog]');if(lg){const m=p.metrics.find(x=>x.id===pjMid);if(m)pLog(p,m,+lg.dataset.pjlog);return}
  if(e.target.closest('#pjLogGo')){const m=p.metrics.find(x=>x.id===pjMid),i=$('pjLogIn'),n=parseFloat(String(i.value).replace(',','.'));if(m&&Number.isFinite(n)){pLog(p,m,n);const j=$('pjLogIn');if(j)j.value=''}return}
  const tc=e.target.closest('[data-pjt]');if(tc){const t=S.tasks.find(x=>x.id===+tc.dataset.pjt);if(!t)return;const to=t.stage==='done'?'today':'done';
    if(to==='today'&&!canPut(t.list,'today',t))return;tc.closest('.g-trow').classList.toggle('on',to==='done');setTimeout(()=>commit(()=>setStage(t,to),to==='done'?doneMsg(t):'Moved to Today'),170);return}
  const tk=e.target.closest('[data-gtask]');if(tk){haptic(5);return openDetail(+tk.dataset.gtask)}
  if(e.target.closest('[data-phdone]'))return pPhaseDone(p);
});
$('pjPg').addEventListener('keydown',e=>{
  const p=pById(pjId);
  if(e.key==='Enter'&&p){
    if(e.target.id==='pjLogIn'){e.preventDefault();$('pjLogGo').click();return}
    if(e.target.id==='pjTaskIn'){e.preventDefault();const v=e.target.value.trim();if(v)pAddPhaseTask(p,v);return}
  }
  if(e.key==='Escape'){
    if(document.querySelector('.sheet.on')||$('dlg').classList.contains('on'))return;
    const pop=$('pjPop');if(pop&&pop.classList.contains('on')){pop.classList.remove('on');e.stopPropagation();return}
    e.stopPropagation();pjBack();
  }
});

/* ---------- new / edit project (one calm page) ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg review-pg gs-pg ps-pg" id="psPg" role="dialog" aria-label="Project"><div class="ib-in" id="psIn"></div></div>');
let psD=null;
function openSetupP(sp,id){
  if(!projectsOn())return;const p=id?pById(id):null;
  if(!p&&pAll().length>=P_MAX){toast(`Up to ${P_MAX} projects at once. Finish one to start another.`);return}
  const sps=orderedSpaces();
  psD=p?{id:p.id,name:p.name,e:p.e||'',touched:true,space:p.space,kind:p.kind,period:p.period||'week',due:p.due||'',goal:p.goal||'',
      metrics:p.metrics.map(m=>({id:m.id,name:m.name,target:m.target})),phases:p.phases.map(f=>({id:f.id,name:f.name,done:!!f.done}))}
    :{id:null,name:'',e:'',touched:false,space:sp&&spaceOf(sp)?sp:inSpaceMode()&&spaceOf(S.space)?S.space:(sps[0]||{}).id,kind:'numbers',period:'week',due:'',goal:'',
      metrics:[{id:'k'+newId(),name:'',target:''}],phases:['Plan','Build','Launch'].map(n=>({id:'f'+newId(),name:n,done:false}))};
  psOn=true;drawSetupP();$('psPg').classList.add('on');$('psPg').scrollTop=0;haptic(6);
  setTimeout(()=>{if(psOn&&!p&&$('psName'))$('psName').focus()},330);
}
function closeSetupP(){if(!psOn)return;psOn=false;$('psPg').classList.remove('on');const a=document.activeElement;if(a&&a.closest&&a.closest('#psPg'))a.blur()}
function drawSetupP(){
  const d=psD,edit=!!d.id,tm=new Date();tm.setDate(tm.getDate()+1);
  const tpl=edit?'':`<div class="ps-tpl"><span class="gs-lbl">Start from</span><div class="gs-chips">${PJ_TPL.map((t,i)=>`<button class="gs-chip ps-t" data-pst="${i}"><span class="ps-te">${t.e}</span>${esc(t.name)}</button>`).join('')}</div></div>`;
  const kinds=edit?'':`<div class="gs-lbl">Kind</div><div class="ps-kinds">${[['numbers',PJ_NUM,'Numbers','Things you count, like calls or words'],['phases',PJ_PH,'Phases','Build something step by step']].map(([k,ic,n,s])=>`<button class="ps-kind${d.kind===k?' on':''}" data-psk="${k}"><span class="ps-ki">${ic}</span><b>${n}</b><small>${s}</small></button>`).join('')}</div>`;
  const nums=`<div class="gs-lbl">Resets</div><div class="segc ps-seg"><button data-psp="week" class="${d.period==='week'?'on':''}">Every week</button><button data-psp="month" class="${d.period==='month'?'on':''}">Every month</button></div>
    <div class="gs-lbl">Numbers <span>Name and ${d.period==='month'?'monthly':'weekly'} target</span></div>
    <div class="ps-rows">${d.metrics.map((m,i)=>`<div class="ps-row"><input class="ps-mn" data-psmn="${i}" value="${esc(m.name)}" placeholder="${['Calls','Emails','Meetings','Deals','Words','Sessions'][i]||'Number'}" maxlength="24" autocomplete="off" aria-label="Number name"><input class="ps-mt" data-psmt="${i}" value="${esc(m.target)}" placeholder="Target" inputmode="numeric" maxlength="7" autocomplete="off" aria-label="Target"><button data-psmx="${i}" aria-label="Remove">${X}</button></div>`).join('')}
    ${d.metrics.length<MT_MAX?`<button class="ps-addr" data-psma>${PLUS_S}Add a number</button>`:''}</div>
    <p class="gs-hint">Order matters for the Flow view: first step at the top.</p>`;
  const phs=`<div class="gs-lbl">Phases <span>In order</span></div>
    <div class="ps-rows">${d.phases.map((f,i)=>`<div class="ps-row"><span class="gs-mn">${f.done?'✓':i+1}</span><input class="ps-mn" data-psfn="${i}" value="${esc(f.name)}" placeholder="Phase name" maxlength="24" autocomplete="off" aria-label="Phase name"><button data-psfu="${i}" ${i?'':'disabled'} aria-label="Move up">${UP_S}</button><button data-psfx="${i}" aria-label="Remove">${X}</button></div>`).join('')}
    ${d.phases.length<PH_MAX?`<button class="ps-addr" data-psfa>${PLUS_S}Add a phase</button>`:''}</div>
    <div class="gs-lbl">Finish by <span>Optional</span></div><label class="gs-date ps-date${d.due?' on':''}"><span>${d.due?gShort(d.due):'No date'}</span><input type="date" id="psDue" min="${dkey(tm)}" value="${d.due}" aria-label="Finish by"></label>`;
  const gls=typeof goalsOn==='function'&&goalsOn()?gAll():[];
  const feeds=gls.length?`<div class="gs-lbl">Feeds a goal <span>Optional</span></div><div class="gs-chips"><button class="gs-chip${!d.goal?' on':''}" data-psg="">None</button>${gls.map(g=>`<button class="gs-chip${d.goal===g.id?' on':''}" data-psg="${g.id}">${g.e?esc(g.e)+' ':''}${esc(g.name)}</button>`).join('')}</div>`:'';
  $('psIn').innerHTML=`<div class="set-top gs-top"><button class="icon-btn" id="psBack" aria-label="Close">${X}</button><span class="gs-n">${edit?'':'New project'}</span></div>
    <div class="gs-body"><h1 class="gs-q">${edit?'Edit project':'What are you working on?'}</h1>${tpl}
    <div class="gs-name"><span class="gs-e" id="psE">${d.e?esc(d.e):d.kind==='phases'?PJ_PH:PJ_NUM}</span><input id="psName" value="${esc(d.name)}" placeholder="${d.kind==='phases'?'App launch':'Outreach'}" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Project name"></div>
    ${kinds}${S.spaces.length>1?`<div class="gs-lbl">Space</div><div class="gs-chips">${orderedSpaces().map(x=>`<button class="gs-chip${d.space===x.id?' on':''}" data-pssp="${x.id}">${spMini(x)}${esc(x.name)}</button>`).join('')}</div>`:''}
    ${d.kind==='phases'?phs:nums}${feeds}</div>
    <button class="primary gs-next" id="psGo" ${d.name.trim()?'':'disabled'}>${edit?'Save':'Create project'}</button>
    ${edit?`<div class="le-acts ps-del"><button class="le-btn warn" id="psDel" type="button">Delete project</button></div>`:''}`;
}
function psSave(){
  const d=psD;if(!d||!d.name.trim()||!spaceOf(d.space))return;
  const metrics=d.metrics.filter(m=>String(m.name).trim()).map(m=>({id:m.id,name:String(m.name).trim(),target:Math.max(0,parseFloat(String(m.target).replace(',','.'))||0)}));
  const phases=d.phases.filter(f=>String(f.name).trim()).map(f=>({id:f.id,name:String(f.name).trim(),done:!!f.done}));
  if(d.kind==='numbers'&&!metrics.length){toast('Add at least one number to count');return}
  if(d.kind==='phases'&&!phases.length){toast('Add at least one phase');return}
  const name=d.name.trim(),inSet=settingsOpen(),edit=!!d.id,id=d.id||'p'+newId();
  commit(()=>{
    if(edit){const p=pById(id);if(!p)return;const keep=new Map(p.metrics.map(m=>[m.id,m.log||{}]));
      Object.assign(p,{name,e:d.e,space:d.space,period:d.period,due:d.due||'',goal:d.goal||'',metrics:metrics.map(m=>({...m,log:keep.get(m.id)||{}})),phases});
      const ids=new Set(phases.map(f=>f.id));S.tasks.forEach(t=>{if(t.proj!=null&&String(t.proj)===String(id)&&!ids.has(t.phase)){delete t.proj;delete t.phase}})}
    else pList().push({id,name,e:d.e,space:d.space,kind:d.kind,period:d.period,due:d.kind==='phases'?d.due||'':'',goal:d.goal||'',created:Date.now(),metrics:d.kind==='numbers'?metrics.map(m=>({...m,log:{}})):[],phases:d.kind==='phases'?phases:[]});
  },edit?'Project saved':`${name} added`);
  try{sfx('add')}catch(e){}closeSetupP();
  if(inSet)drawSettings();else if(!edit)setTimeout(()=>openProject(id),140);
}
$('psPg').addEventListener('click',e=>{
  const d=psD;if(!d)return;
  if(e.target.closest('#psBack'))return closeSetupP();
  if(e.target.closest('#psGo'))return psSave();
  if(e.target.closest('#psDel')){const p=pById(d.id);if(p)pDelete(p);return}
  const t=e.target.closest('[data-pst]');if(t){const x=PJ_TPL[+t.dataset.pst];Object.assign(d,{name:x.name,e:x.e,touched:true,kind:x.kind,period:x.period||'week',
    metrics:x.kind==='numbers'?x.metrics.map(([n,v])=>({id:'k'+newId(),name:n,target:v})):d.metrics,phases:x.kind==='phases'?x.phases.map(n=>({id:'f'+newId(),name:n,done:false})):d.phases});haptic(6);return drawSetupP()}
  const k=e.target.closest('[data-psk]');if(k){d.kind=k.dataset.psk;haptic(5);return drawSetupP()}
  const sp=e.target.closest('[data-pssp]');if(sp){d.space=sp.dataset.pssp;haptic(5);return drawSetupP()}
  const pp=e.target.closest('[data-psp]');if(pp){d.period=pp.dataset.psp;haptic(5);return drawSetupP()}
  const g=e.target.closest('[data-psg]');if(g){d.goal=g.dataset.psg;haptic(5);return drawSetupP()}
  if(e.target.closest('[data-psma]')){if(d.metrics.length<MT_MAX)d.metrics.push({id:'k'+newId(),name:'',target:''});drawSetupP();const i=$('psPg').querySelectorAll('.ps-mn');if(i.length)i[i.length-1].focus();return}
  if(e.target.closest('[data-psfa]')){if(d.phases.length<PH_MAX)d.phases.push({id:'f'+newId(),name:'',done:false});drawSetupP();const i=$('psPg').querySelectorAll('.ps-mn');if(i.length)i[i.length-1].focus();return}
  const mx=e.target.closest('[data-psmx]');if(mx){d.metrics.splice(+mx.dataset.psmx,1);haptic(5);return drawSetupP()}
  const fx=e.target.closest('[data-psfx]');if(fx){d.phases.splice(+fx.dataset.psfx,1);haptic(5);return drawSetupP()}
  const fu=e.target.closest('[data-psfu]');if(fu){const i=+fu.dataset.psfu;if(i>0){[d.phases[i-1],d.phases[i]]=[d.phases[i],d.phases[i-1]];haptic(4);drawSetupP()}return}
  if(e.target.closest('#psE')){const i=PJ_ICONS.indexOf(d.e);d.e=PJ_ICONS[(i+1)%PJ_ICONS.length];d.touched=true;$('psE').textContent=d.e;haptic(4)}
});
$('psPg').addEventListener('input',e=>{const d=psD;if(!d)return;const el=e.target;
  if(el.id==='psName'){d.name=el.value;if(!d.touched){const ic=typeof gIcon==='function'?gIcon(d.name):'';d.e=ic;$('psE').innerHTML=ic?esc(ic):d.kind==='phases'?PJ_PH:PJ_NUM}$('psGo').disabled=!d.name.trim();return}
  if(el.dataset.psmn!=null)d.metrics[+el.dataset.psmn].name=el.value;
  if(el.dataset.psmt!=null)d.metrics[+el.dataset.psmt].target=el.value.replace(/[^\d.,]/g,'');
  if(el.dataset.psfn!=null)d.phases[+el.dataset.psfn].name=el.value;
});
$('psPg').addEventListener('change',e=>{if(e.target.id==='psDue'){psD.due=e.target.value||'';drawSetupP()}});
$('psPg').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();closeSetupP();return}
  if(e.key==='Enter'&&e.target.matches('input')&&e.target.type!=='date'){e.preventDefault();
    const ins=[...$('psPg').querySelectorAll('input:not([type=date])')],i=ins.indexOf(e.target);if(ins[i+1])ins[i+1].focus();else e.target.blur()}
});

/* ---------- Settings → Modes → Your projects ---------- */
function projectsSetPage(){
  const ps=pAll(),dn=pDone();
  const r=p=>`<button class="link-row" data-pe="${p.id}"><span class="hs-n">${pName(p)}</span><span class="hint">${p.done?`Finished ${gShort(p.doneAt)}`:p.kind==='phases'?`${p.phases.length} phases`:`${p.metrics.length} ${p.metrics.length===1?'number':'numbers'} · ${p.period==='month'?'monthly':'weekly'}`}${CHEV}</span></button>`;
  return `<p class="sub-p">Up to ${P_MAX} projects at once. Tap one to change it.</p>
    ${ps.length?`<div class="set-sec"><h3>Active</h3>${ps.map(r).join('')}</div>`:'<p class="sub-p hs-none">No projects yet.</p>'}
    ${dn.length?`<div class="set-sec"><h3>Finished</h3>${dn.map(p=>`<div class="link-row ps-fin"><span class="hs-n">${pName(p)}</span><span class="hint">${gShort(p.doneAt)}<button class="txt-btn" data-pback="${p.id}">Bring back</button></span></div>`).join('')}</div>`:''}
    ${ps.length<P_MAX?`<button class="primary hs-new" data-pnew="">New project</button>`:''}`;
}

/* ---------- taps from anywhere ---------- */
$('lmEdit').insertAdjacentHTML('afterend',`<button id="lmProj" type="button" role="menuitem" hidden><span class="lpm-i">${PJ_NUM}</span>Add a project</button>`);
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-pjo],[data-pnew],[data-padd],[data-pe],[data-pback],#lmProj,[data-pjadd],[data-pjm]');if(!el)return;
  if(el.closest('#pjPg')&&!el.matches('[data-pjadd]'))return;
  e.stopPropagation();e.preventDefault();
  if(el.matches('[data-pjo]'))return openProject(el.dataset.pjo);
  if(el.matches('[data-pjm]')){const [pid,mid]=el.dataset.pjm.split('|');return openProject(pid,mid)}
  if(el.matches('[data-pjadd]')){const [pid,mid]=el.dataset.pjadd.split('|'),p=pById(pid),m=p&&p.metrics.find(x=>x.id===mid);if(m)pLog(p,m,mStep(m));return}
  if(el.matches('[data-pnew]'))return openSetupP(el.dataset.pnew||null);
  if(el.matches('[data-padd]')){closePops();return openSetupP(el.dataset.padd)}
  if(el.matches('[data-pe]'))return openSetupP(null,el.dataset.pe);
  if(el.matches('[data-pback]')){const p=pById(el.dataset.pback);if(p){pSetDone(p,false);drawSettings()}return}
  if(el.matches('#lmProj')){$('listsPop').classList.remove('on');const sp=S.space;closeSheets();setTimeout(()=>openSetupP(sp),260);return}
},true);
document.addEventListener('click',e=>{if(e.target.closest('#listsMore')){const lp=$('lmProj');if(lp)lp.hidden=!(projectsOn()&&inSpaceMode())}},true);

/* finishing tasks keeps the phase page in step; the pages follow every redraw */
const _pjRender=render;
render=function(d){_pjRender(d);try{
  if(psOn&&!projectsOn())closeSetupP();
  if(pjOn&&(!projectsOn()||!pById(pjId)))closeProject();
  if(pjOn){const a=document.activeElement;if(!(a&&a.closest&&a.closest('#pjPg')&&a.matches('input,textarea')))drawProject()}
  const lp=$('lmProj');if(lp)lp.hidden=!(projectsOn()&&inSpaceMode());
}catch(err){console.error(err)}};
