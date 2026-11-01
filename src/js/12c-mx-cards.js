/* ---------- A space's KPIs & OKRs popup: twin cards (0.262) ----------
   One view on phones and computers (replaces Scoreboard / Focus). KPI and OKR cards share one shape:
   eyebrow (KPI coral, OKR violet) · name · big number · bar · footer with "+ Log". Tap a card to open it.
   The page behind is darkened and blurred (13-mx.css + 26-mx-cards.css). */
/* "10 message" reads wrong: a simple one-word unit gets its plural when the number isn't 1 */
const mxPlural=(u,n)=>{u=(u||'').trim();return n!==1&&/^[a-z]{3,}$/i.test(u)&&!/(s|ss|x|z|ch|sh)$/i.test(u)?u+'s':u};
function mxCardKpi(k){const v0=mxKpiNow(k),v=v0??0,p=mxKpiP(k),left=mxDays(mxShift(k.period,mxStart(k.period,Date.now()),1)),t=+k.target;
  const togo=k.better==='down'||k.kind==='last'?'':Math.max(0,t-v);
  return `<div class="mxc kpi${mxLate(k)?' late':''}"><button class="mxc-open" data-mxk="${k.id}" aria-label="Open ${esc(k.name)}"></button>
    <span class="mxc-eye">KPI · ${MX_PER[k.period]||''}</span><b class="mxc-t">${esc(k.name)}</b>
    <div class="mxc-big"><b>${v0==null&&k.kind==='last'?'—':mxBig(v,k.unit)}</b><span>/ ${mxFmt(t,k.unit)}${mxUw(mxPlural(k.unit,t))}</span></div>
    <span class="mxc-bar"><i style="width:${(p*100).toFixed(1)}%"></i></span>
    <div class="mxc-f"><small>${togo?`${mxFmt(togo,k.unit)} to go · `:''}${left} ${left===1?'day':'days'} left${mxLate(k)?' · behind pace':''}${k.better==='down'?' · lower is better':''}</small>
      ${k.src==='tasks'?`<button class="mxc-log" data-mxk="${k.id}">Open</button>`:`<button class="mxc-log" data-mxk="${k.id}" data-mxlogfocus>${PLUS_S}Log</button>`}</div></div>`}
function mxCardOkr(o){const p=o.closed?(o.score||0):mxOkrP(o),open=o.krs.find(r=>mxKrP(r)<1)||o.krs[0];
  return `<div class="mxc okr${o.closed?' past':''}"><button class="mxc-open" data-mxo="${o.id}" aria-label="Open ${esc(o.name)}"></button>
    <span class="mxc-eye">OKR · ${esc(mxOkrWhen(o))}</span><b class="mxc-t">${esc(o.name)}</b>
    <div class="mxc-big"><b>${Math.round(p*100)}%</b><span>${o.closed?'final score':'done'}</span></div>
    <span class="mxc-bar"><i style="width:${(p*100).toFixed(1)}%"></i></span>
    ${o.closed?'':o.krs.map(r=>`<button class="mxc-kr" data-mxr="${o.id}:${r.id}"><span>${esc(r.name)}</span><b>${mxFmt(mxKrNow(r),r.unit)}</b><small>${mxKrKind(r)==='sum'?'/':'→'} ${mxFmt(+r.target,r.unit)}</small></button>`).join('')}
    ${!o.closed&&mxDays(mxEndMs(o))<0?`<button class="mx-close" data-mxcl="${o.id}">Close it out · keep the ${Math.round(p*100)}% score</button>`:''}
    <div class="mxc-f"><small>${o.krs.length} key ${o.krs.length===1?'result':'results'}</small>${!o.closed&&open?`<button class="mxc-log" data-mxr="${o.id}:${open.id}">${PLUS_S}Log</button>`:''}</div></div>`}
function mxCards(sp,sname){const ks=mxKpis(sp),os=mxOkrs(sp,false),past=mxOkrs(sp,true);
  const adds=`<div class="mxc-adds">${ks.length<MX_KPI_MAX?`<button class="mx-new kpi" data-mxnew="kpi"><b class="mxc-plus">+</b>New KPI</button>`:''}${os.length<MX_OKR_MAX?`<button class="mx-new okr" data-mxnew="okr"><b class="mxc-plus">+</b>New OKR</button>`:''}</div>`;
  if(!ks.length&&!os.length&&!past.length)return `${mxHead(sname,'KPIs & OKRs')}<div class="mx-body"><div class="mx-fe">${MX_ICON}<b>Nothing to track yet</b><span>Add a KPI for a weekly number, or an OKR for a quarterly result.</span>${adds}</div></div>`;
  return `${mxHead(sname,'KPIs & OKRs')}<div class="mx-body mxc-body"><div class="mxc-grid">${ks.map(mxCardKpi).join('')}${os.map(mxCardOkr).join('')}</div>${adds}
    ${past.length?`<button class="mx-pastb" data-mxpast aria-expanded="${mxPast}">Past OKRs<small>${past.length}</small>${CHEV}</button>${mxPast?`<div class="mxc-grid">${past.map(mxCardOkr).join('')}</div>`:''}`:''}</div>`}
/* one view now: the old Scoreboard / Focus switch goes away */
mxBoard=mxCards;mxFocusView=mxCards;
mxLook=()=>'cards';
const _mxcHead=mxHead;
/* the eyebrow says where you are: "Work · Projects" when a list is open (KPIs and OKRs still belong to the space) */
const mxWhereList=()=>{if(mxSpPick||!S.space||S.list==='all')return null;const l=S.lists.find(x=>x.id===S.list);return l&&String(l.space)===String(S.space)?l:null};
mxHead=function(eye,title,back){const l=mxWhereList(),sp=spaceOf(S.space);
  if(l&&sp&&eye===esc(sp.name))eye=`${esc(sp.name)} · ${esc(l.name)}`;
  return _mxcHead(eye,title,back).replace(/<button class="mx-ib" data-mxlook[\s\S]*?<\/button>/,'')};
