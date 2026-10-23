/* ---------- Habits page and Goal page: calm views with motion ----------
   Habits: Week grid (default) or Sunrise, picked under ⋯ → View (Settings → Modes too).
   Goal:   The climb (default), Path or Poster, picked under ⋯ → View (per goal; default in Settings → Modes).
   Completed things use the brand colour (--today); green stays for switches in Settings.
   Data, sheets and actions live in 08j-habits.js and 08k-goals.js. */
var hpWeek=0,hpMenu=false,hgT=null,hpHtml='',hpTapAt={},gbPrev=null,gdHtml='',gTickBusy=false;
const CK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const DOTS_V='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
const ARR_L='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const ARR_R='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const hpView=()=>C().hbView==='sun'?'sun':'grid';
const mItem=(attr,label,on)=>`<button ${attr} role="menuitemradio" aria-checked="${!!on}" class="pm-opt${on?' on':''}"><span class="pm-ck">${on?CK:''}</span>${label}</button>`;
/* count numbers up when a view opens: small, quick, feels alive */
function countUp(root){root.querySelectorAll('[data-cnt]').forEach(el=>{const to=+el.dataset.cnt;if(!(to>1)||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const t0=performance.now(),d=Math.min(900,300+to*12);
  const step=t=>{const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(step)};el.textContent='0';requestAnimationFrame(step)})}

/* ================= Habits ================= */
function hpWeekDays(off){const t=new Date();t.setHours(12,0,0,0);const ws=+C().weekStart===0?0:1,s=new Date(t);s.setDate(t.getDate()-((t.getDay()-ws+7)%7)+off*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d})}
function hpCell(h,d){
  const k=dkey(d),t=today(),born=dkey(new Date(h.created||0));
  if(k>t)return `<span class="hg-c fut" aria-hidden="true"></span>`;
  if(k<born&&!(h.done||{})[k])return `<span class="hg-c pre" aria-hidden="true"></span>`;
  const due=hbDue(h,d),on=!!(h.done||{})[k];
  if(!due&&!on)return `<span class="hg-c rest" title="Rest day" aria-hidden="true"><i></i></span>`;
  const lbl=`${esc(h.name)}, ${d.toLocaleDateString(undefined,{weekday:'long'})}`;
  return `<button class="hg-c${on?' on':''}${k===t?' now':''}${!on&&k<t?' miss':''}" data-hgd="${h.id}|${k}" aria-pressed="${on}" aria-label="${lbl}">${CK}</button>`}
function hpStreak(h){const s=hbStats(h);return s.st>1?`<b>${s.st}</b> days`:s.st===1?'1 day':s.due||s.dt?'—':'Rest'}
function hpGrid(hs){
  const days=hpWeekDays(hpWeek),t=today();
  const head=`<div class="hg hg-head"><span></span>${days.map(d=>{const k=dkey(d);return `<span class="hg-d${k===t?' now':''}"><small>${d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3)}</small><b>${d.getDate()}</b></span>`}).join('')}<span></span></div>`;
  const rows=hs.map((h,i)=>`<div class="hg hg-row" style="--i:${i}"><button class="hg-n" data-hbe="${h.id}"><span class="hg-e">${h.e?esc(h.e):''}</span>${esc(h.name)}</button>${days.map(d=>hpCell(h,d)).join('')}<span class="hg-s" data-hgs="${h.id}">${hpStreak(h)}</span></div>`).join('');
  return `<div class="hg-card">${head}${rows}</div>
    <div class="hg-foot"><span><i class="hg-lg on"></i>Kept</span><span><i class="hg-lg miss"></i>Missed</span><span><i class="hg-lg rest"></i>Rest day</span><span class="hg-tip">Tap a circle to tick it. Names open the habit.</span></div>`}
function hpWeekCount(hs){const days=hpWeekDays(hpWeek),t=today();let due=0,dn=0;
  hs.forEach(h=>days.forEach(d=>{const k=dkey(d);if(k>t||k<dkey(new Date(h.created||0)))return;if(hbDue(h,d)||(h.done||{})[k]){due++;if((h.done||{})[k])dn++}}));return {due,dn}}
function hpSunSvg(p,all,cls){const y=Math.round(96*(1-p))-26;
  return `<svg class="hs-svg${cls?' '+cls:''}" viewBox="0 0 420 250" aria-hidden="true"><defs><radialGradient id="hsG"><stop offset=".45" style="stop-color:var(--today);stop-opacity:.25"/><stop offset="1" style="stop-color:var(--today);stop-opacity:0"/></radialGradient><clipPath id="hsClip"><rect x="0" y="0" width="420" height="220"/></clipPath></defs>
    <path class="hs-arc" d="M30 220a180 180 0 0 1 360 0"/>
    <g clip-path="url(#hsClip)"><g class="hs-dg" style="--sy:${y}px"><circle class="hs-glow" cx="210" cy="178" r="100" fill="url(#hsG)"/><circle class="hs-disc" cx="210" cy="178" r="54"/></g></g>
    <path class="hs-hz" d="M20 220h380"/><g class="hs-rays${all?' on':''}"><path d="M210 48v-20M136 76l-14-14M284 76l14-14M92 128l-18-6M328 128l18-6"/></g></svg>`}
function hpSun(hs){
  const due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt}),dn=due.filter(h=>hbStats(h).dt),p=due.length?dn.length/due.length:0;
  const rest=hs.filter(h=>!due.includes(h)); // chips keep your order, so a ticked one stays where you tapped it
  const chip=(h,i)=>{const s=hbStats(h);return `<button class="hs-chip${s.dt?' on':''}" data-hst="${h.id}" aria-pressed="${s.dt}" style="--i:${i}"><span class="hs-k">${CK}</span><span class="hs-n">${h.e?esc(h.e)+' ':''}${esc(h.name)}</span><small>${s.st>1?`${s.st} days`:s.dt?'Done':'Today'}</small></button>`};
  return `<div class="hs"><div class="hs-l">${hpSunSvg(p,due.length&&p>=1)}<b class="hs-big"><span data-hsn>${dn.length}</span> of ${due.length}</b><span class="hs-cap" data-hscap>${!due.length?'A rest day. Enjoy it.':p>=1?'Every habit kept. The sun is up.':'Your sun rises with every habit you keep today.'}</span></div>
    <div class="hs-r">${due.map(chip).join('')}${rest.length?`<div class="hs-rest">Resting today: ${rest.map(h=>esc(h.name)).join(', ')}</div>`:''}</div></div>`}
function hpMenuHTML(){const v=hpView(),left=hbOpenToday().length;
  return `<div class="lh-wrap hp-mw"><button class="pm-btn" id="hpMore" type="button" aria-label="Habits options" aria-haspopup="menu" aria-expanded="${hpMenu}">${DOTS_V}</button>
    <div class="sp-pop lh-pop pm-pop${hpMenu?' on':''}" id="hpPop" role="menu"><span class="pm-lbl">View</span>${mItem('data-hpv="grid"','Week grid',v==='grid')}${mItem('data-hpv="sun"','Sunrise',v==='sun')}
    <span class="pm-sep"></span><button data-hbnew="" role="menuitem"><span class="lpm-i">${PLUS_S}</span>New habit</button>${hbAll().length>1?`<button data-hbord role="menuitem"><span class="lpm-i">${GRIP}</span>Reorder habits</button>`:''}${left?`<button data-ciopen role="menuitem"><span class="lpm-i">${RH_ICON}</span>Evening check-in</button>`:''}</div></div>`}
function drawRhythm(){
  const y=$('rhythmPg').scrollTop,hs=hbAll(),v=hpView(),anim=!$('rhIn').dataset.v||$('rhIn').dataset.v!==v||$('rhIn').dataset.fresh==='1';
  let head,body;
  if(!hs.length){head=`<span class="hp-eye">Habits</span><h1 class="hp-h">Habits</h1>`;
    body=`<div class="ib-empty rh-empty">${hbSun(4,true)}<b>No habits yet</b><span>Small daily wins, one tap each. Your sun rises a little every day you show up.</span><button class="primary" data-hbnew="">New habit</button></div>`}
  else if(v==='grid'){const days=hpWeekDays(hpWeek),c=hpWeekCount(hs),f=d=>d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    head=`<span class="hp-eye">Habits · ${f(days[0])} – ${f(days[6])}</span><h1 class="hp-h">${hpWeek===0?'This week':hpWeek===-1?'Last week':`${-hpWeek} weeks ago`}</h1><span class="hp-sub"><b>${c.dn} of ${c.due}</b> kept${hpWeek===0?' so far':''}</span>`;
    body=hpGrid(hs)}
  else{const due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt});
    head=`<span class="hp-eye">Habits · ${longDate()}</span><h1 class="hp-h">Today</h1><span class="hp-sub">${due.length?`<b>${due.filter(h=>hbStats(h).dt).length} of ${due.length}</b> done`:'Rest day'}</span>`;body=hpSun(hs)}
  const nav=hs.length&&v==='grid'?`<div class="hp-nav"><button class="pm-btn" data-hpw="-1" aria-label="Previous week">${ARR_L}</button><button class="pm-btn" data-hpw="1" aria-label="Next week" ${hpWeek>=0?'disabled':''}>${ARR_R}</button></div>`:'';
  const html=`<div class="set-top ib-top"><button class="icon-btn" id="rhBack" aria-label="Back">${BACK_SVG}</button></div>
    <div class="hp-head"><div class="hp-tt">${head}</div><div class="hp-acts">${nav}${hpMenuHTML()}</div></div><div class="hp-body${anim?' anim':''}">${body}</div>`;
  $('rhIn').dataset.v=v;$('rhIn').dataset.fresh='';
  if(!anim&&html===hpHtml)return; // nothing changed: leave the page (and its motion) alone
  hpHtml=html;$('rhIn').innerHTML=html;$('rhythmPg').scrollTop=y;
}
const _hpOpen=openRhythm;openRhythm=function(){hpWeek=0;hpMenu=false;$('rhIn').dataset.fresh='1';_hpOpen()};
function hpRefreshSoon(){clearTimeout(hgT);hgT=setTimeout(()=>{if(!document.querySelector('.sheet.on'))render()},1100)}
function hpSetDay(id,k){
  const h=hbById(id);if(!h)return;const now=Date.now();if(now-(hpTapAt[id+k]||0)<350)return;hpTapAt[id+k]=now;
  if(k===today()){hbToggle(id)}else{h.done=h.done||{};const on=!h.done[k];if(on)h.done[k]=1;else delete h.done[k];haptic(on?[8,30,12]:6);try{sfx(on?'done':'undone')}catch(e){}save();
    const day=new Date(k+'T12:00').toLocaleDateString(undefined,{weekday:'long'});
    toast(`${h.name} · ${on?'kept':'cleared'} on ${day}`,()=>{const x=hbById(id);if(!x)return;x.done=x.done||{};if(on)delete x.done[k];else x.done[k]=1;save();render()})}
  const on=!!(h.done||{})[k];document.querySelectorAll(`[data-hgd="${id}|${k}"]`).forEach(b=>{b.classList.toggle('on',on);b.classList.toggle('miss',!on&&k<today());b.setAttribute('aria-pressed',on);b.classList.remove('pop');void b.offsetWidth;if(on)b.classList.add('pop')});
  const s=document.querySelector(`[data-hgs="${id}"]`);if(s)s.innerHTML=hpStreak(h);
  hpRefreshSoon();
}
function hpSunTick(id){
  hbToggle(id);const hs=hbAll(),due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt}),dn=due.filter(h=>hbStats(h).dt).length,p=due.length?dn/due.length:0,h=hbById(id),s=hbStats(h);
  const c=document.querySelector(`[data-hst="${id}"]`);if(c){c.classList.toggle('on',s.dt);c.setAttribute('aria-pressed',s.dt);c.querySelector('small').textContent=s.st>1?`${s.st} days`:s.dt?'Done':'Today'}
  const g=document.querySelector('#rhythmPg .hs-dg');if(g)g.style.setProperty('--sy',`${Math.round(96*(1-p))-26}px`);
  const r=document.querySelector('#rhythmPg .hs-rays');if(r)r.classList.toggle('on',due.length>0&&p>=1);
  const n=document.querySelector('#rhythmPg [data-hsn]');if(n)n.textContent=dn;
  const cap=document.querySelector('#rhythmPg [data-hscap]');if(cap)cap.textContent=p>=1?'Every habit kept. The sun is up.':'Your sun rises with every habit you keep today.';
  hpRefreshSoon();
}
$('rhythmPg').addEventListener('click',e=>{
  const pop=$('hpPop');if(hpMenu&&!e.target.closest('#hpPop,#hpMore')){hpMenu=false;if(pop)pop.classList.remove('on')}
  if(e.target.closest('#hpMore')){e.stopPropagation();hpMenu=!hpMenu;haptic(5);pop.classList.toggle('on',hpMenu);$('hpMore').setAttribute('aria-expanded',hpMenu);return}
  const v=e.target.closest('[data-hpv]');if(v){hpMenu=false;haptic(5);setCfg('hbView',v.dataset.hpv);return}
  const w=e.target.closest('[data-hpw]');if(w&&!w.disabled){hpWeek=Math.min(0,hpWeek+(+w.dataset.hpw));haptic(4);$('rhIn').dataset.fresh='1';drawRhythm();return}
  const c=e.target.closest('[data-hgd]');if(c){const [id,k]=c.dataset.hgd.split('|');return hpSetDay(id,k)}
  const s=e.target.closest('[data-hst]');if(s)return hpSunTick(s.dataset.hst);
  if(e.target.closest('#hpPop [data-hbord]')){hpMenu=false;return openReorder()}
  if(e.target.closest('#hpPop [data-hbnew],#hpPop [data-ciopen]')){hpMenu=false}
});

/* ---------- reorder habits: drag a row by its handle (or focus the handle and use the arrow keys) ---------- */
var GRIP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="hoSheet"><div class="sheet-in"><div class="grab"></div><h2>Reorder habits</h2>
  <p class="ho-tip">Drag to set the order. The first ones show on Home.</p><div class="ho-list" id="hoList"></div><button class="primary" id="hoDone">Done</button></div></div>`);
let hoDrag=null;
function openReorder(){if(hbAll().length<2)return;drawReorder(hbAll().map(h=>h.id));openSheet('hoSheet')}
function drawReorder(ids,focus){
  $('hoList').innerHTML=ids.map((id,i)=>{const h=hbById(id);return h?`<div class="ho-row" data-hoid="${h.id}"><span class="ho-i">${i+1}</span><span class="ho-n">${hbName(h)}</span><button class="ho-grip" type="button" aria-label="Move ${esc(h.name)}, number ${i+1} of ${ids.length}. Arrow keys move it.">${GRIP}</button></div>`:''}).join('');
  if(focus!=null){const b=$('hoList').querySelector(`[data-hoid="${focus}"] .ho-grip`);if(b)b.focus()}}
const hoIds=()=>[...$('hoList').querySelectorAll('.ho-row')].map(r=>r.dataset.hoid);
/* the visible habits take the new order; hidden ones (in archived spaces) keep their places */
function hoApply(ids){const cur=hbAll().map(h=>String(h.id));if(ids.join()===cur.join())return;
  const slots=[];S.habits.forEach((h,i)=>{if(cur.includes(String(h.id)))slots.push(i)});
  const moved=ids.map(id=>hbById(id)).filter(Boolean),out=S.habits.slice();slots.forEach((s,i)=>out[s]=moved[i]);S.habits=out;save();render()}
$('hoList').addEventListener('pointerdown',e=>{const g=e.target.closest('.ho-grip');if(!g)return;e.preventDefault();
  const row=g.closest('.ho-row');hoDrag={row,pid:e.pointerId,off:e.clientY-row.getBoundingClientRect().top};row.classList.add('lifted');haptic(10);try{g.setPointerCapture(e.pointerId)}catch(_){}});
/* the dragged row itself never moves in the page (that would drop the pointer); its neighbours step around it */
addEventListener('pointermove',e=>{const d=hoDrag;if(!d||e.pointerId!==d.pid)return;const row=d.row,p=row.previousElementSibling,n=row.nextElementSibling,mid=el=>{const b=el.getBoundingClientRect();return b.top+b.height/2};
  if(p&&e.clientY<mid(p)){row.after(p);haptic(4)}else if(n&&e.clientY>mid(n)){row.before(n);haptic(4)}
  row.style.transform='';row.style.transform=`translateY(${e.clientY-d.off-row.getBoundingClientRect().top}px)`});
const hoEnd=e=>{const d=hoDrag;if(!d||(e&&e.pointerId!==d.pid))return;hoDrag=null;d.row.style.transform='';d.row.classList.remove('lifted');const ids=hoIds();drawReorder(ids);hoApply(ids)};
addEventListener('pointerup',hoEnd);addEventListener('pointercancel',hoEnd);
$('hoList').addEventListener('keydown',e=>{const g=e.target.closest('.ho-grip');if(!g||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;e.preventDefault();
  const ids=hoIds(),id=g.closest('.ho-row').dataset.hoid,i=ids.indexOf(id),j=e.key==='ArrowUp'?i-1:i+1;if(j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];haptic(4);drawReorder(ids,id);hoApply(ids)});
$('hoDone').onclick=()=>closeSheets();

/* Escape on the Habits page: closes the ⋯ menu first, then the check-in, then the page, wherever focus is */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||!(rhOn||ciOn))return;
  if(document.querySelector('.sheet.on')||$('dlg').classList.contains('on')||moOn||cdOn||gdOn||(typeof srchOpen!=='undefined'&&srchOpen))return;
  e.stopPropagation();
  if(rhOn&&hpMenu){hpMenu=false;const p=$('hpPop');if(p)p.classList.remove('on');const b=$('hpMore');if(b){b.setAttribute('aria-expanded','false');b.focus()}return}
  if(ciOn)return closeCheckin();
  closeRhythm();
});

/* ================= Goal ================= */
const gView=g=>{const v=g.view||C().gView;return ['climb','path','poster'].includes(v)?v:'climb'};
function gMenuHTML(g){const v=gView(g);
  return `<div class="lh-wrap gd-mw"><button class="pm-btn" id="gdMore" type="button" aria-label="Goal options" aria-haspopup="menu">${DOTS_V}</button>
    <div class="sp-pop lh-pop pm-pop" id="gdPop" role="menu"><span class="pm-lbl">View</span>${mItem('data-gview="climb"','The climb',v==='climb')}${mItem('data-gview="path"','Path',v==='path')}${mItem('data-gview="poster"','Poster',v==='poster')}
    <span class="pm-sep"></span><button data-gm="edit" role="menuitem"><span class="lpm-i">${PEN_S}</span>Edit goal</button>
    ${g.ms.length?`<button data-gedit role="menuitem"><span class="lpm-i">${UP_S}</span>${gdEdit?'Done editing milestones':'Edit milestones'}</button>`:''}
    ${g.done?'':`<button data-gm="star" role="menuitem"><span class="lpm-i">${G_STAR}</span>${g.star?'Remove north star':'Make it my north star'}</button>`}
    <button data-gm="win" role="menuitem"><span class="lpm-i">${G_FLAG}</span>${g.done?'Back in progress':'Mark as achieved'}</button>
    <button data-gm="del" class="warn" role="menuitem"><span class="lpm-i">${BIN_S}</span>Delete goal</button></div></div>`}
/* days left as a number and its label; a past-due goal counts the days over instead of showing 0 */
function gDays(g){const dl=gDaysLeft(g);return dl===null?{n:'—',t:'no date set'}:dl<0?{n:-dl,t:dl===-1?'day past due':'days past due'}:{n:dl,t:dl===1?'day left':'days left'}}
function gPaceTxt(g){const pc=gPace(g);return `<span class="gp-${pc.k}">${pc.t}</span>`}
/* the climb: a soft mountain, the trail drawn up to where you are, the sun rising behind the summit */
function gbScene(g,anim){
  const W=matchMedia('(max-width:699px)').matches?680:1200,H=440,N=Math.max(1,g.ms.length),pr=gProg(g),top=g.done||(g.ms.length>0&&pr.n>=g.ms.length);
  const P=[];for(let i=0;i<=N+1;i++){const f=i/(N+1),w=i>0&&i<=N?(i%2?-1:1)*H*.03:0;P.push([W*(.07+.72*f),H*(.9-.7*f)+w])}
  const sm=pts=>{let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`}return d};
  const route=sm(P),S=P[N+1];
  const seg=[0];for(let i=1;i<P.length;i++)seg.push(seg[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
  const idx=top?N+1:pr.n,p=seg[idx]/seg[seg.length-1],me=P[idx];
  const sunY=(top?0:(1-pr.p))*H*.22,SX=S[0]+W*.11,SY=S[1]-H*.01;
  const prev=gbPrev&&gbPrev.id===g.id&&!anim?gbPrev:{p:0,x:P[0][0],y:P[0][1],s:H*.3};
  gbPrev={id:g.id,p,x:me[0],y:me[1],s:sunY};
  const far=`M0 ${H*.62} C${W*.18} ${H*.5} ${W*.3} ${H*.58} ${W*.46} ${H*.42} S${W*.72} ${H*.3} ${W*.86} ${H*.36} S${W} ${H*.44} ${W} ${H*.44} L${W} ${H} L0 ${H}Z`;
  return `<svg class="gb-svg${anim?' anim':''}${top?' top':''}${g.done?' won':''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"
    style="--pa:${prev.p.toFixed(4)};--pb:${p.toFixed(4)};--ax:${prev.x.toFixed(1)}px;--ay:${prev.y.toFixed(1)}px;--bx:${me[0].toFixed(1)}px;--by:${me[1].toFixed(1)}px;--sa:${prev.s.toFixed(1)}px;--sb:${sunY.toFixed(1)}px">
    <defs><linearGradient id="gbM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--gb-m1)"/><stop offset="1" style="stop-color:var(--bg)"/></linearGradient>
      <radialGradient id="gbG"><stop offset=".35" style="stop-color:var(--week);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--week);stop-opacity:0"/></radialGradient>
      <linearGradient id="gbF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--gb-f1)"/><stop offset="1" style="stop-color:var(--bg)"/></linearGradient></defs>
    <g class="gb-sun"><circle class="gb-glow" cx="${SX.toFixed(1)}" cy="${SY.toFixed(1)}" r="${(H*.26).toFixed(1)}" fill="url(#gbG)"/><circle class="gb-disc" cx="${SX.toFixed(1)}" cy="${SY.toFixed(1)}" r="${(H*.1).toFixed(1)}"/>
      <g class="gb-rays" transform="translate(${SX.toFixed(1)} ${SY.toFixed(1)})">${[0,1,2,3,4].map(i=>{const a=(-160+i*35)*Math.PI/180,r1=H*.14,r2=H*.19;return `<path d="M${(Math.cos(a)*r1).toFixed(1)} ${(Math.sin(a)*r1).toFixed(1)}L${(Math.cos(a)*r2).toFixed(1)} ${(Math.sin(a)*r2).toFixed(1)}"/>`}).join('')}</g></g>
    <path class="gb-far" d="${far}" fill="url(#gbF)"/>
    <path class="gb-mtn" d="${route} L${(S[0]+W*.06).toFixed(1)} ${(S[1]+H*.14).toFixed(1)} L${W} ${(H*.7).toFixed(1)} L${W} ${H} L0 ${H} L0 ${P[0][1].toFixed(1)}Z" fill="url(#gbM)"/>
    <path class="gb-rt0" d="${route}"/><path class="gb-rt1" pathLength="1" d="${route}"/>
    ${g.ms.map((m,i)=>`<circle class="gb-ms${m.done?' on':''}${!m.done&&i===pr.n&&!top?' nx':''}" style="--d:${i}" cx="${P[i+1][0].toFixed(1)}" cy="${P[i+1][1].toFixed(1)}" r="7"/>`).join('')}
    ${g.ms.map((m,i)=>`<circle class="gb-hit" data-gsel="${m.id}" cx="${P[i+1][0].toFixed(1)}" cy="${P[i+1][1].toFixed(1)}" r="30"><title>${esc(m.t)}</title></circle>`).join('')}
    <g class="gb-flag" transform="translate(${S[0].toFixed(1)} ${S[1].toFixed(1)})"><path class="gb-pole" d="M0 0V-46"/><path class="gb-cloth" d="M0 -46l30 10 -30 10z"/></g>
    <g class="gb-me"><circle class="gb-halo" r="22"/><circle class="gb-dot" r="10"/></g></svg>`}
function gTasksSec(g){const moved=gMoved(g),open=gTasks(g).filter(t=>t.stage!=='done'&&shown(t));if(!open.length&&!moved.length)return '';
  const row=t=>`<button class="g-trow${t.stage==='done'?' on':''}" data-gtask="${t.id}"><span class="hc-dot">${ICK}</span><span class="g-tx"><b>${esc(t.title)}</b><small>${esc(listOf(t.list).name)} · ${esc(STAGES[idx(t.stage)].name)}</small></span>${CHEV}</button>`;
  return `<div class="gv-sec"><h2>Linked tasks</h2><span>${moved.length?`${moved.length} moved it this week`:''}</span></div><div class="g-tasks">${open.slice(0,8).map(row).join('')}${moved.slice(0,5).map(row).join('')}</div>`}
function gEditSec(g){return gdEdit?`<div class="gv-sec"><h2>Milestones</h2><button class="txt-btn gd-ed" data-gedit>Done</button></div><div class="g-mslist editing">${gMsRows(g)}</div>`:''}
function gAddInput(ph){return `<input id="gMsIn" class="gv-add" placeholder="${ph}" maxlength="80" autocomplete="off" enterkeyhint="done" aria-label="Add a milestone">`}
function gNextAct(g,m){const tk=gTaskOf(m);return tk?`<button class="gv-link" data-gtask="${tk.id}">Linked to “${esc(tk.title)}”</button>`:`<button class="gv-link" data-gmk="${m.id}">Make it a task</button>`}
const gSmooth=()=>matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
/* a soft fade on the edge that still has steps behind it, so it's clear the row scrolls */
function gsFade(row){const x=row.scrollLeft,max=row.scrollWidth-row.clientWidth;row.classList.toggle('fl',x>4);row.classList.toggle('fr',x<max-4)}
/* tapping a dot on the hill brings its step into view and lights it up for a moment (it never ticks it) */
function gsShow(id){const b=document.querySelector(`#gdPg .gs-row [data-gtk="${id}"]`),st=b&&b.closest('.gs-step');if(!st)return;haptic(5);
  const row=st.parentElement;row.scrollTo({left:row.scrollLeft+st.getBoundingClientRect().left-row.getBoundingClientRect().left-14,behavior:gSmooth()});st.classList.remove('flash');void st.offsetWidth;st.classList.add('flash');setTimeout(()=>st.classList.remove('flash'),1400)}
function gClimbView(g,anim){
  const pr=gProg(g),dd=gDays(g),nx=gNext(g),top=pr.of>0&&pr.n>=pr.of&&!g.done;
  const steps=g.ms.map((m,i)=>{const k=m.done?'done':m===nx?'now':'';
    return `<div class="gs-step ${k}" style="--i:${i}"><span class="gs-bar"><i></i></span><button class="gs-tk" data-gtk="${m.id}" aria-pressed="${!!m.done}" aria-label="${m.done?'Reopen':'Tick'}: ${esc(m.t)}"><span class="gs-ring">${CK}</span><span class="gs-lb">${m.done?(m.doneAt?gShort(m.doneAt):'Done'):m===nx?'Next':`Step ${i+1}`}</span></button>
      <span class="gs-t">${esc(m.t)}</span>${m===nx&&!g.done?gNextAct(g,m):''}</div>`}).join('');
  return `<div class="gb-stage">${gbScene(g,anim)}<div class="gb-head"><span class="hp-eye">${g.done?`Achieved · ${gShort(g.doneAt)}`:`Goal${g.due?` · by ${gLong(g.due)}`:''}`}${g.star&&!g.done?`<span class="gd-ns">${G_STAR}North star</span>`:''}</span>
      <h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1>${g.why?`<button class="gv-why" data-gwhy>${esc(g.why)}</button>`:`<button class="gv-why add" data-gwhy>Add why it matters</button>`}</div></div>
    <div class="gb-stats"><span><b data-cnt="${pr.n}">${pr.n}</b><small>of ${pr.of} milestones</small></span>${g.done?'':`<span><b ${typeof dd.n==='number'?`data-cnt="${dd.n}"`:''}>${dd.n}</b><small>${dd.t}</small></span>`}${top?'':`<span><b class="gb-pace">${gPaceTxt(g)}</b><small>pace</small></span>`}
      ${top?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div>
    ${g.ms.length<MS_MAX&&!g.done&&g.ms.length?`<div class="gs-head"><button class="gs-addb" data-gaddms>${PLUS_S}Milestone</button></div>`:''}
    <div class="gs-row">${steps}${g.ms.length<MS_MAX&&!g.done?`<div class="gs-step add"><span class="gs-bar"></span>${gAddInput(g.ms.length?'New milestone':'Add your first milestone')}</div>`:''}</div>`}
function gPathView(g){
  const pr=gProg(g),dd=gDays(g),nx=gNext(g);
  const st=g.ms.map((m,i)=>{const k=m.done?'done':m===nx?'now':'';
    return `<div class="gpth ${k}" style="--i:${i}"><span class="gpth-ln"><button class="gpth-k" data-gtk="${m.id}" aria-pressed="${!!m.done}" aria-label="${m.done?'Reopen':'Tick'}: ${esc(m.t)}">${CK}<i></i></button><b></b></span>
      <span class="gpth-tx">${m===nx&&!g.done?'<span class="gpth-nx">Next</span>':''}<span class="gpth-t">${esc(m.t)}</span>${m.done&&m.doneAt?`<small>Done ${gShort(m.doneAt)}</small>`:''}${m===nx&&!g.done?gNextAct(g,m):''}</span></div>`}).join('');
  return `<div class="gpv"><span class="hp-eye">${g.done?`Achieved · ${gShort(g.doneAt)}`:`${esc((spaceOf(g.space)||{}).name||'Goal')}${g.due?` · by ${gLong(g.due)}`:''}`}</span>
    <h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1>${g.why?`<button class="gv-why q" data-gwhy>“${esc(g.why)}”</button>`:`<button class="gv-why add" data-gwhy>Add why it matters</button>`}
    <div class="gpv-bar"><i style="--w:${(pr.p*100).toFixed(1)}%"></i></div>
    <div class="gpv-meta"><span><b>${pr.n} of ${pr.of}</b> milestones</span><span>${gPaceTxt(g)}${g.done||dd.n==='—'?'':gDaysLeft(g)<0?` · ${dd.n} ${dd.n===1?'day':'days'} over`:` · ${dd.n} ${dd.t}`}</span></div>
    <div class="gpth-list">${st}${g.ms.length<MS_MAX&&!g.done?`<div class="gpth add"><span class="gpth-ln"><span class="gpth-k ghost"></span></span><span class="gpth-tx">${gAddInput(g.ms.length?'Add a milestone':'Add your first milestone')}</span></div>`:''}</div>
    ${pr.of&&pr.n>=pr.of&&!g.done?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div>`}
function gPosterView(g){
  const pr=gProg(g),dl=gDaysLeft(g),nx=gNext(g),big=g.done?'Done':dl===null?'—':Math.abs(dl);
  return `<div class="gpo"><div class="gpo-l"><span class="hp-eye">${esc(g.name)}${g.due?` · ${gLong(g.due)}`:''}</span>
      <div class="gpo-num"><b ${typeof big==='number'?`data-cnt="${big}"`:''}>${big}</b><span>${g.done?'Goal achieved.':dl===null?'No date set.':dl===0?'Today is the day.':dl<0?`${dl===-1?'day':'days'} past due.`:`${dl===1?'day':'days'} to go.`}</span></div>
      <div class="gpo-segs">${(g.ms.length?g.ms:[{}]).map((m,i)=>`<i class="${m.done?'on':''}" style="--i:${i}"></i>`).join('')}</div>
      <div class="gpv-meta"><span><b>${pr.n} of ${pr.of}</b> milestones</span><span>${gPaceTxt(g)}</span></div></div>
    <div class="gpo-r">${nx&&!g.done?`<div class="gpo-next"><span>Next step</span><b>${esc(nx.t)}</b>${gTaskOf(nx)?`<button class="gpo-btn" data-gtask="${gTaskOf(nx).id}">Open the task</button>`:`<button class="gpo-btn" data-gmk="${nx.id}">Make it a task</button>`}</div>`
      :pr.of&&!g.done?`<div class="gpo-next"><span>Summit reached</span><b>Every milestone is done.</b><button class="gpo-btn" data-gwin>Mark achieved</button></div>`:''}
      <div class="gpo-list">${g.ms.map(m=>`<button class="gpo-m${m.done?' on':''}" data-gtk="${m.id}" aria-pressed="${!!m.done}"><span class="gpo-k">${CK}</span>${esc(m.t)}</button>`).join('')}${g.ms.length<MS_MAX&&!g.done?gAddInput(g.ms.length?'Add a milestone':'Add your first milestone'):''}</div></div></div>`}
function drawGoal(){
  const g=gById(gdId);if(!g){closeGoal();return}
  const y=$('gdPg').scrollTop,v=gView(g),anim=gdAnim;
  const body=v==='path'?gPathView(g):v==='poster'?gPosterView(g):gClimbView(g,anim);
  const html=`<div class="set-top gd-top"><button class="icon-btn" id="gdBack" aria-label="Back">${BACK_SVG}</button>${gMenuHTML(g)}</div>
    <div class="gv gv-${v}${anim?' anim':''}">${body}${gEditSec(g)}${gTasksSec(g)}</div>`;
  if(!anim&&html===gdHtml)return;
  const old=$('gdIn').querySelector('.gs-row'),sl=old?old.scrollLeft:0;
  gdHtml=html;$('gdIn').innerHTML=html;$('gdPg').scrollTop=y;if(anim)countUp($('gdIn'));
  /* the milestone row: on open, if "Next" is out of sight, start one step before it so the last win shows too;
     on later redraws stay put, gliding only if "Next" moved out of sight */
  const row=$('gdIn').querySelector('.gs-row'),now=row&&row.querySelector('.gs-step.now');if(!row)return;
  row.addEventListener('scroll',()=>gsFade(row),{passive:true});requestAnimationFrame(()=>gsFade(row));
  if(!anim)row.scrollLeft=sl;gsFade(row);if(!now)return;
  const r=row.getBoundingClientRect(),n=now.getBoundingClientRect(),prev=now.previousElementSibling;
  const hid=n.left<r.left||n.right>r.right;
  if(anim){if(hid)row.scrollLeft=Math.max(0,row.scrollLeft+(prev||now).getBoundingClientRect().left-r.left-14);return}
  if(hid)row.scrollTo({left:row.scrollLeft+n.left-r.left-14,behavior:gSmooth()});
}
$('gdPg').addEventListener('click',e=>{
  const g=gById(gdId);if(!g)return;
  const dot=e.target.closest('[data-gsel]');if(dot)return gsShow(dot.dataset.gsel);
  if(e.target.closest('[data-gaddms]')){const i=$('gMsIn');if(i){haptic(5);i.closest('.gs-step').scrollIntoView({behavior:gSmooth(),block:'nearest',inline:'end'});i.focus({preventScroll:true})}return}
  const t=e.target.closest('[data-gtk]');if(t){const m=g.ms.find(x=>x.id===t.dataset.gtk);if(!m||gTickBusy)return;gTickBusy=true;const el=t.closest('.gs-step,.gpth,.gpo-m')||t;el.classList.toggle('done',!m.done);el.classList.toggle('on',!m.done);
    setTimeout(()=>{try{gMsToggle(g,m)}finally{setTimeout(()=>gTickBusy=false,250)}},200);return}
});

/* Escape on the Goal and Goals pages, wherever focus is: the ⋯ menu first, then the goal, then the Goals page.
   (With focus inside the goal page its own handler runs first and also clears a milestone being typed.) */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||!(gdOn||glOn))return;
  if(document.querySelector('.sheet.on')||$('dlg').classList.contains('on')||moOn||cdOn||gsOn||(typeof srchOpen!=='undefined'&&srchOpen))return;
  e.stopPropagation();
  const pop=$('gdPop');if(gdOn&&pop&&pop.classList.contains('on')){pop.classList.remove('on');const b=$('gdMore');if(b)b.focus();return}
  if(gdOn)return closeGoal();
  closeGoals();
});

/* ================= Home habits widget: One at a time · Big tiles · Tap pills ================= */
/* Default: One at a time on phones, Big tiles on computers. Settings → Modes → Habits → Widget style.
   Tiles and pills show up to HW_MAX habits in your order; a ticked one stays in place (in coral) and the rest fold into "+N more". */
const HW_MAX=6;
function hwStyle(){const v=C().hwStyle;if(v==='one'||v==='tiles'||v==='pills')return v;return matchMedia('(min-width:1100px)').matches?'tiles':'one'}
function hbWidget(){
  if(!habitsOn()||!C().wHabits)return '';const hs=hbAll();if(!hs.length)return '';
  const due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt}),dn=due.filter(h=>hbStats(h).dt),open=due.filter(h=>!hbStats(h).dt),st=hwStyle();
  const head=`<button class="hw-head" data-hbopen><b>Habits</b><span>${due.length?`<em>${dn.length}</em> of ${due.length} today`:'Rest day'}</span>${CHEV}</button>`;
  if(st==='one'){const nx=open[0],C2=2*Math.PI*31,p=due.length?dn.length/due.length:1;
    return `<div class="hw hw-one"><button class="hw-ring" data-hbopen aria-label="Open habits"><svg viewBox="0 0 76 76" aria-hidden="true"><circle class="hw-r0" cx="38" cy="38" r="31"/><circle class="hw-r1" cx="38" cy="38" r="31" style="stroke-dasharray:${(C2*p).toFixed(1)} ${C2.toFixed(1)}"/></svg><b>${dn.length}/${due.length}</b></button>
      <button class="hw-tx" data-hbopen>${nx?`<small>Next habit</small><b>${nx.e?esc(nx.e)+' ':''}${esc(nx.name)}</b><span>${(st=>st>1?`<em class="hw-st">${st} days in a row</em>${open.length>1?` · +${open.length-1} more`:''}`:open.length>1?`+${open.length-1} more today`:'Last one today')(hbStats(nx).st)}</span>`:`<small>Habits</small><b>${due.length?'All done today':'Rest day'}</b><span>${due.length?'Nice. See you tomorrow.':'Nothing due today'}</span>`}</button>
      ${nx?`<button class="hw-done" data-hbt="${nx.id}" aria-pressed="false">Done</button>`:''}</div>`}
  const ck='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const list=due.slice(0,HW_MAX),more=due.length-list.length;
  const mr=more?`<button class="hw-more" data-hbopen>+${more} more</button>`:'';
  if(st==='pills')return `<div class="hw hw-pills">${head}<div class="hw-pl">${list.map(h=>{const s=hbStats(h);return `<button class="hw-pill${s.dt?' on':''}" data-hbt="${h.id}" aria-pressed="${s.dt}"><span class="hw-k">${ck}</span>${h.e?esc(h.e)+' ':''}${esc(h.name)}</button>`}).join('')}${mr}</div></div>`;
  return `<div class="hw hw-tiles">${head}<div class="hw-tl">${list.map(h=>{const s=hbStats(h);return `<button class="hw-tile${s.dt?' on':''}" data-hbt="${h.id}" aria-pressed="${s.dt}"><span class="hw-k">${ck}</span><span class="hw-tt"><b>${h.e?esc(h.e)+' ':''}${esc(h.name)}</b><small>${s.st>1?`${s.st} days`:s.dt?'Done':'Today'}</small></span></button>`}).join('')}</div>${mr}</div>`;
}
