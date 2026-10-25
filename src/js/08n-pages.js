/* ---------- Habits page and Goal page: calm views with motion ----------
   Habits: Week grid (default) or Sunrise, picked under ⋯ → View (Settings → Modes too).
   Goal:   The climb (default), Path or Poster, picked under ⋯ → View (per goal; default in Settings → Modes).
   Completed things use the brand colour (--today); green stays for switches in Settings.
   Data, sheets and actions live in 08j-habits.js and 08k-goals.js. */
var gRen=null,gSubAdd=null,hpWeek=0,hpMenu=false,hgT=null,hpHtml='',hpTapAt={},gbPrev=null,gdHtml='',gTickBusy=new Set(),gSelId=null,gAddMs=false,gmeOn=false,gSubOpen=new Set();
const CK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const DOTS_V='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
const ARR_L='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const ARR_R='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const hpView=()=>C().hbView==='sun'?'sun':'grid';
const mItem=(attr,label,on)=>`<button ${attr} role="menuitemradio" aria-checked="${!!on}" class="pm-opt${on?' on':''}"><span class="pm-ck">${on?CK:''}</span>${label}</button>`;
/* ---------- one small ⋯ menu for any row or card: cxOpen(button, [{t,ic,act,warn,sub:()=>items}, {sep:1}, {lbl}]) ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="cx-pop" id="cxPop" role="menu"></div>');
let cxIt=null,cxAt=null;
function cxOpen(at,items){
  if(cxAt&&cxAt!==at)cxAt.setAttribute('aria-expanded','false');cxAt=at;cxIt=items;const p=$('cxPop');
  p.innerHTML=items.map((it,i)=>it.sep?'<span class="pm-sep"></span>':it.lbl?`<span class="pm-lbl">${esc(it.lbl)}</span>`
    :`<button role="menuitem" data-cx="${i}"${it.warn?' class="warn"':''}${it.dis?' disabled':''}><span class="lpm-i">${it.ic||''}</span><span class="cx-t">${esc(it.t)}</span>${it.sub?'<span class="cx-go">›</span>':''}</button>`).join('');
  p.classList.add('on');at.setAttribute('aria-expanded','true');cxPlace();
  haptic(5);const b=p.querySelector('button:not([disabled])');if(b)b.focus({preventScroll:true});
}
/* sit under the button (or above it near the bottom of the screen) and follow it when the page scrolls */
function cxPlace(){const p=$('cxPop'),at=cxAt;if(!at||!at.isConnected)return cxClose();const r=at.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return cxClose();
  const w=p.offsetWidth,h=p.offsetHeight;p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';p.style.top=(r.bottom+6+h>innerHeight-8?Math.max(8,r.top-h-6):r.bottom+6)+'px'}
function cxClose(){if(!cxIt)return;$('cxPop').classList.remove('on');if(cxAt)cxAt.setAttribute('aria-expanded','false');cxIt=null;cxAt=null}
$('cxPop').addEventListener('click',e=>{const b=e.target.closest('[data-cx]');if(!b||!cxIt)return;e.stopPropagation();const it=cxIt[+b.dataset.cx];
  if(it.sub){const at=cxAt;cxOpen(at,it.sub());return}const at=cxAt;cxClose();if(at&&at.isConnected)at.focus({preventScroll:true});it.act()});
document.addEventListener('pointerdown',e=>{if(cxIt&&!e.target.closest('#cxPop')&&e.target.closest('[aria-haspopup]')!==cxAt)cxClose()},true);
document.addEventListener('keydown',e=>{if(!cxIt)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();const at=cxAt;cxClose();if(at&&at.isConnected)at.focus({preventScroll:true});return}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){const bs=[...$('cxPop').querySelectorAll('button:not([disabled])')],i=bs.indexOf(document.activeElement);e.preventDefault();
    const n=bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length];if(n)n.focus()}},true);
addEventListener('resize',cxClose);document.addEventListener('scroll',e=>{if(cxIt&&!(e.target.closest&&e.target.closest('#cxPop')))cxPlace()},true);
const MORE=(attr,lbl)=>`<button class="gm-more" ${attr} aria-label="${lbl}" aria-haspopup="menu" aria-expanded="false">${DOTS_V}</button>`;

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
    <div class="hg-foot"><span><i class="hg-lg on"></i>Kept</span><span><i class="hg-lg miss"></i>Missed</span><span><i class="hg-lg rest"></i>Rest day</span></div>`}
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
    <span class="pm-sep"></span><button data-hbnew="" role="menuitem"><span class="lpm-i">${PLUS_S}</span>New habit</button>${hbAll().length?`<button data-hbord role="menuitem"><span class="lpm-i">${PEN_S}</span>Edit habits</button>`:''}${left?`<button data-ciopen role="menuitem"><span class="lpm-i">${RH_ICON}</span>Evening check-in</button>`:''}</div></div>`}
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
  if(e.target.closest('#hpPop [data-hbord]')){hpMenu=false;const p=$('hpPop');if(p)p.classList.remove('on');return openReorder()}
  if(e.target.closest('#hpPop [data-hbnew],#hpPop [data-ciopen]')){hpMenu=false}
});

/* a soft fade at the top or bottom of a list that scrolls inside itself, where more rows wait */
function vFade(el){const x=el.scrollTop,max=el.scrollHeight-el.clientHeight;el.classList.toggle('ft',x>4);el.classList.toggle('fb',x<max-4)}
/* drag a row by its handle (.ho-grip) to reorder a list; with the handle focused, the arrow keys move it too.
   The dragged row never moves in the page itself (that would drop the pointer): its neighbours step around it. */
function sortable(list,rowSel,idOf,onOrder){let d=null;const ids=()=>[...list.querySelectorAll(rowSel)].map(idOf);
  list.addEventListener('pointerdown',e=>{const g=e.target.closest('.ho-grip');if(!g)return;e.preventDefault();const row=g.closest(rowSel);
    d={row,pid:e.pointerId,off:e.clientY-row.getBoundingClientRect().top};row.classList.add('lifted');haptic(10)});
  addEventListener('pointermove',e=>{if(!d||e.pointerId!==d.pid)return;const row=d.row,p=row.previousElementSibling,n=row.nextElementSibling,mid=el=>{const b=el.getBoundingClientRect();return b.top+b.height/2};
    if(p&&p.matches(rowSel)&&e.clientY<mid(p)){row.after(p);haptic(4)}else if(n&&n.matches(rowSel)&&e.clientY>mid(n)){row.before(n);haptic(4)}
    row.style.transform='';row.style.transform=`translateY(${e.clientY-d.off-row.getBoundingClientRect().top}px)`});
  const end=e=>{if(!d||(e&&e.pointerId!==d.pid))return;const row=d.row;d=null;row.style.transform='';row.classList.remove('lifted');onOrder(ids())};
  addEventListener('pointerup',end);addEventListener('pointercancel',end);
  list.addEventListener('keydown',e=>{const g=e.target.closest('.ho-grip');if(!g||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;e.preventDefault();
    const row=g.closest(rowSel),sib=e.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;if(!sib||!sib.matches(rowSel))return;
    if(e.key==='ArrowUp')sib.before(row);else sib.after(row);haptic(4);onOrder(ids(),idOf(row))});
}

/* ---------- edit milestones: a calm popup in the middle of the screen ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="dlg gme" id="gmEd" role="dialog" aria-modal="true" aria-labelledby="gmeT"><div class="dlg-in gme-in">
  <div class="gme-h"><h3 id="gmeT">Milestones</h3><button class="icon-btn gme-x0" id="gmeClose" aria-label="Close">${X}</button></div>
  <p class="gme-tip">Drag to reorder. Click a name to rename it.</p><div class="gme-list" id="gmeList"></div>
  <div class="gme-add" id="gmeAddW"><span class="gm-plus">${PLUS_S}</span><input id="gmeAdd" placeholder="New milestone" maxlength="80" autocomplete="off" enterkeyhint="done" aria-label="New milestone"><button class="gme-addb" id="gmeAddB" type="button">Add</button></div>
  <button class="primary" id="gmeDone">Done</button></div></div>`);
function openMsEdit(focus){const g=gById(gdId);if(!g)return;gmeOn=true;drawMsEdit();$('gmEd').classList.add('on');haptic(5);
  setTimeout(()=>{if(!gmeOn)return;const i=focus&&$('gmeList').querySelector(`[data-mren="${focus}"]`);if(i){i.focus();i.select()}else if(!g.ms.length)$('gmeAdd').focus()},60)}
function gmeAddNow(){const g=gById(gdId),i=$('gmeAdd'),v=i.value.trim();if(!g||!v){i.focus();return}if(g.ms.length>=MS_MAX){toast(`Up to ${MS_MAX} milestones. Keep them big.`);return}
  g.ms.push({id:'m'+newId(),t:v,done:false});save();try{sfx('add')}catch(err){}haptic(8);render();drawMsEdit();i.value='';i.focus();const l=$('gmeList');l.scrollTop=l.scrollHeight}
function closeMsEdit(){if(!gmeOn)return;const a=document.activeElement;if(a&&a.closest&&a.closest('#gmEd'))a.blur();gmeOn=false;$('gmEd').classList.remove('on');if(gdOn)drawGoal()}
function drawMsEdit(focus){const g=gById(gdId);if(!g)return closeMsEdit();
  $('gmeList').innerHTML=g.ms.map((m,i)=>{const ts=gKids(m),dn=ts.filter(x=>x.done).length;
    return `<div class="gme-r${m.done?' done':''}" data-mid="${m.id}"><button class="ho-grip" type="button" aria-label="Move ${esc(m.t)}, number ${i+1} of ${g.ms.length}. Arrow keys move it.">${GRIP}</button>
      <span class="gme-i">${m.done?CK:i+1}</span><input class="gme-n" data-mren="${m.id}" value="${esc(m.t)}" maxlength="80" autocomplete="off" enterkeyhint="done" aria-label="Milestone ${i+1} name">
      ${ts.length?`<small>${dn}/${ts.length}</small>`:''}<button class="gme-del" data-mdel="${m.id}" aria-label="Delete ${esc(m.t)}">${BIN_S}</button></div>`}).join('')||'<p class="gme-none">No milestones yet. Add the first one below.</p>';
  $('gmeAddW').style.display=g.ms.length>=MS_MAX||g.done?'none':'';
  if(focus!=null){const b=$('gmeList').querySelector(`[data-mid="${focus}"] .ho-grip`);if(b)b.focus()}}
sortable($('gmeList'),'.gme-r',r=>r.dataset.mid,(ids,focus)=>{const g=gById(gdId);if(!g)return;const by=new Map(g.ms.map(m=>[m.id,m]));
  const next=ids.map(id=>by.get(id)).filter(Boolean);if(next.map(m=>m.id).join()===g.ms.map(m=>m.id).join())return;g.ms=next;save();render();drawMsEdit(focus)});
$('gmEd').addEventListener('click',e=>{
  if(e.target===$('gmEd')||e.target.closest('#gmeDone,#gmeClose'))return closeMsEdit();
  if(e.target.closest('#gmeAddB'))return gmeAddNow();
  const dl=e.target.closest('[data-mdel]');if(dl){const g=gById(gdId),m=g&&g.ms.find(x=>x.id===dl.dataset.mdel);if(m){gMsDelete(g,m);drawMsEdit()}}
});
$('gmEd').addEventListener('change',e=>{const id=e.target.dataset.mren;if(!id)return;const g=gById(gdId),m=g&&g.ms.find(x=>x.id===id),v=e.target.value.trim();if(!m)return;
  if(v&&v!==m.t){m.t=v;save();render()}else e.target.value=m.t});
$('gmEd').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.matches('.gme-n')){e.preventDefault();e.target.blur();return}
  if(e.key==='Enter'&&e.target.id==='gmeAdd'){e.preventDefault();return gmeAddNow()}
  if(e.key==='Escape'){if($('dlg').classList.contains('on'))return;e.preventDefault();e.stopPropagation();if(e.target.matches('input')&&e.target.value&&e.target.id==='gmeAdd'){e.target.value='';return}closeMsEdit()}
});
/* undo, sync and edits elsewhere keep the popup current (but never while you type in it) */
const _gmeRender=render;render=function(d){_gmeRender(d);try{if(gmeOn){const a=document.activeElement;if(!(a&&a.closest&&a.closest('#gmEd')&&a.matches('input')))drawMsEdit()}}catch(err){console.error(err)}};

var GRIP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
/* ---------- edit habits: a calm popup like the milestone editor. Add, rename, drag to reorder, delete; ✎ opens a habit's full settings ---------- */
let hbeOn=false;
document.body.insertAdjacentHTML('beforeend',`<div class="dlg gme" id="hbEd" role="dialog" aria-modal="true" aria-labelledby="hbeT"><div class="dlg-in gme-in">
  <div class="gme-h"><h3 id="hbeT">Habits</h3><button class="icon-btn gme-x0" id="hbeClose" aria-label="Close">${X}</button></div>
  <p class="gme-tip">Drag to reorder: the first ones show on Home. Click a name to rename it.</p><div class="gme-list" id="hbeList"></div>
  <div class="gme-add" id="hbeAddW"><span class="gm-plus">${PLUS_S}</span><input id="hbeAdd" placeholder="New habit, e.g. Read 10 pages" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="New habit"><button class="gme-addb" id="hbeAddB" type="button">Add</button></div>
  <button class="primary" id="hbeDone">Done</button></div></div>`);
function openReorder(){if(!habitsOn())return;hbeOn=true;drawHbEdit();$('hbEd').classList.add('on');haptic(5);setTimeout(()=>{if(hbeOn&&!hbAll().length)$('hbeAdd').focus()},60)}
function closeHbEdit(){if(!hbeOn)return;const a=document.activeElement;if(a&&a.closest&&a.closest('#hbEd'))a.blur();hbeOn=false;$('hbEd').classList.remove('on');render()}
function drawHbEdit(focus){const hs=hbAll();
  $('hbeList').innerHTML=hs.map((h,i)=>`<div class="gme-r" data-hoid="${h.id}"><button class="ho-grip" type="button" aria-label="Move ${esc(h.name)}, number ${i+1} of ${hs.length}. Arrow keys move it.">${GRIP}</button>
    <span class="gme-i hbe-e">${h.e?esc(h.e):i+1}</span><input class="gme-n" data-hren="${h.id}" value="${esc(h.name)}" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Habit ${i+1} name">
    <button class="gme-days" data-hopen="${h.id}" aria-label="All settings for ${esc(h.name)}">${daysLabel(h.days)}${PEN_S}</button><button class="gme-del" data-hdel="${h.id}" aria-label="Delete ${esc(h.name)}">${BIN_S}</button></div>`).join('')||'<p class="gme-none">No habits yet. Add the first one below.</p>';
  $('hbeAddW').style.display=hs.length>=HB_MAX?'none':'';
  if(focus!=null){const b=$('hbeList').querySelector(`[data-hoid="${focus}"] .ho-grip`);if(b)b.focus()}}
/* the visible habits take the new order; hidden ones (in archived spaces) keep their places */
function hoApply(ids){const cur=hbAll().map(h=>String(h.id));if(ids.join()===cur.join())return;
  const slots=[];S.habits.forEach((h,i)=>{if(cur.includes(String(h.id)))slots.push(i)});
  const moved=ids.map(id=>hbById(id)).filter(Boolean),out=S.habits.slice();slots.forEach((s,i)=>out[s]=moved[i]);S.habits=out;save();render()}
sortable($('hbeList'),'.gme-r',r=>r.dataset.hoid,(ids,focus)=>{hoApply(ids);drawHbEdit(focus)});
function hbeAddNow(){const i=$('hbeAdd'),v=i.value.trim();if(!v){i.focus();return}if(hbAll().length>=HB_MAX){toast(`Up to ${HB_MAX} habits. Fewer, kept daily, beat many.`);return}
  const sp=inSpaceMode()&&spaceOf(S.space)?S.space:null; // no space unless you add it inside one
  S.habits=S.habits||[];S.habits.push({id:'h'+newId(),name:v,e:hbIcon(v),space:sp,days:[0,1,2,3,4,5,6],done:{},created:Date.now()});save();try{sfx('add')}catch(err){}haptic(8);render();drawHbEdit();i.value='';i.focus();const l=$('hbeList');l.scrollTop=l.scrollHeight}
$('hbEd').addEventListener('click',e=>{
  if(e.target===$('hbEd')||e.target.closest('#hbeDone,#hbeClose'))return closeHbEdit();
  if(e.target.closest('#hbeAddB'))return hbeAddNow();
  const o=e.target.closest('[data-hopen]');if(o){e.stopPropagation();const id=o.dataset.hopen;closeHbEdit();return openHabit(id)}
  const d=e.target.closest('[data-hdel]');if(d){e.stopPropagation();const h=hbById(d.dataset.hdel);if(!h)return;
    confirmAsk({title:`Delete ${h.name}?`,text:'Its streak history goes too.',yes:'Yes, delete',no:'No',onYes:()=>{commit(()=>{S.habits=S.habits.filter(x=>x!==h)},`${h.name} deleted`);drawHbEdit()}})}
},true);
$('hbEd').addEventListener('change',e=>{const id=e.target.dataset.hren;if(!id)return;const h=hbById(id),v=e.target.value.trim();if(!h)return;if(v&&v!==h.name){h.name=v;save();render()}else e.target.value=h.name});
$('hbEd').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.matches('.gme-n')){e.preventDefault();e.target.blur();return}
  if(e.key==='Enter'&&e.target.id==='hbeAdd'){e.preventDefault();return hbeAddNow()}
  if(e.key==='Escape'){if($('dlg').classList.contains('on'))return;e.preventDefault();e.stopPropagation();if(e.target.id==='hbeAdd'&&e.target.value){e.target.value='';return}closeHbEdit()}
});
const _hbeRender=render;render=function(d){_hbeRender(d);try{if(hbeOn){const a=document.activeElement;if(!(a&&a.closest&&a.closest('#hbEd')&&a.matches('input')))drawHbEdit()}}catch(err){console.error(err)}};

/* Escape on the Habits page: closes the ⋯ menu first, then the check-in, then the page, wherever focus is */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||!(rhOn||ciOn))return;
  if(hbeOn){if($('dlg').classList.contains('on'))return;e.stopPropagation();return closeHbEdit()}
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
    ${g.star&&!g.done&&gView(g)==='climb'?`<button data-gm="nsky" role="menuitem"><span class="lpm-i">${G_SPARK}</span>${g.hideNs?'Show the star in the sky':'Hide the star in the sky'}</button>`:''}
    ${g.why?`<button data-gm="why" role="menuitem"><span class="lpm-i">${g.hideWhy?CK:X}</span>${g.hideWhy?'Show why on the page':'Hide why on the page'}</button>`:''}
    ${g.done&&!g.ms.length?'':`<button data-gedit role="menuitem"><span class="lpm-i">${PEN_S}</span>${g.ms.length?'Edit milestones':'Add milestones'}</button>`}
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
  const SY0=S[1]-H*(W<1000?.1:.01),sunY=Math.max((top?0:(1-pr.p))*H*.22,H*.22-SY0), /* the sun never rises past the frame, so its glow and rays are never clipped */SX=Math.min(S[0]+W*(W<1000?.05:.11),W-H*.21),SY=SY0;
  const prev=gbPrev&&gbPrev.id===g.id&&!anim?gbPrev:{p:0,x:P[0][0],y:P[0][1],s:H*.3};
  gbPrev={id:g.id,p,x:me[0],y:me[1],s:sunY};
  const far=`M0 ${H*.62} C${W*.18} ${H*.5} ${W*.3} ${H*.58} ${W*.46} ${H*.42} S${W*.72} ${H*.3} ${W*.86} ${H*.36} S${W} ${H*.44} ${W} ${H*.44} L${W} ${H} L0 ${H}Z`;
  return `<svg class="gb-svg${anim?' anim':''}${top?' top':''}${g.done?' won':''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"
    style="--pa:${prev.p.toFixed(4)};--pb:${p.toFixed(4)};--ax:${prev.x.toFixed(1)}px;--ay:${prev.y.toFixed(1)}px;--bx:${me[0].toFixed(1)}px;--by:${me[1].toFixed(1)}px;--sa:${prev.s.toFixed(1)}px;--sb:${sunY.toFixed(1)}px">
    <defs><linearGradient id="gbM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--gb-m1)"/><stop offset="1" style="stop-color:var(--bg)"/></linearGradient>
      <radialGradient id="gbG"><stop offset=".35" style="stop-color:var(--week);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--week);stop-opacity:0"/></radialGradient>
      <linearGradient id="gbF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--gb-f1)"/><stop offset="1" style="stop-color:var(--bg)"/></linearGradient></defs>
    <g class="gb-sun"><circle class="gb-glow" cx="${SX.toFixed(1)}" cy="${SY.toFixed(1)}" r="${(H*.2).toFixed(1)}" fill="url(#gbG)"/><circle class="gb-disc" cx="${SX.toFixed(1)}" cy="${SY.toFixed(1)}" r="${(H*.1).toFixed(1)}"/>
      <g class="gb-rays" transform="translate(${SX.toFixed(1)} ${SY.toFixed(1)})">${[0,1,2,3,4].map(i=>{const a=(-160+i*35)*Math.PI/180,r1=H*.14,r2=H*.19;return `<path d="M${(Math.cos(a)*r1).toFixed(1)} ${(Math.sin(a)*r1).toFixed(1)}L${(Math.cos(a)*r2).toFixed(1)} ${(Math.sin(a)*r2).toFixed(1)}"/>`}).join('')}</g></g>
    <path class="gb-far" d="${far}" fill="url(#gbF)"/>
    <path class="gb-mtn" d="${route} L${(S[0]+W*.06).toFixed(1)} ${(S[1]+H*.14).toFixed(1)} L${W} ${(H*.7).toFixed(1)} L${W} ${H} L0 ${H} L0 ${P[0][1].toFixed(1)}Z" fill="url(#gbM)"/>
    <path class="gb-rt0" d="${route}"/><path class="gb-rt1" pathLength="1" d="${route}"/>
    ${g.ms.map((m,i)=>`<circle class="gb-ms${m.done?' on':''}${!m.done&&i===pr.n&&!top?' nx':''}" style="--d:${i}" cx="${P[i+1][0].toFixed(1)}" cy="${P[i+1][1].toFixed(1)}" r="7"/>`).join('')}
    ${g.ms.map((m,i)=>`<circle class="gb-hit" data-gsel="${m.id}" cx="${P[i+1][0].toFixed(1)}" cy="${P[i+1][1].toFixed(1)}" r="30"><title>${esc(m.t)}</title></circle>`).join('')}
    <g class="gb-flag" transform="translate(${S[0].toFixed(1)} ${S[1].toFixed(1)})"><path class="gb-pole" d="M0 0V-46"/><path class="gb-cloth" d="M0 -46l30 10 -30 10z"/></g>
    <g class="gb-me"><circle class="gb-halo" r="22"/><circle class="gb-dot" r="10"/></g></svg>`}
/* tasks linked to the goal but to no milestone */
function gTasksSec(g){const lo=gLoose(g),wk=gMon(),moved=lo.filter(t=>t.stage==='done'&&(t.doneAt||0)>=wk),open=lo.filter(t=>t.stage!=='done'&&shown(t));if(!open.length&&!moved.length)return '';
  const row=t=>`<div class="g-tr2"><button class="g-trow${t.stage==='done'?' on':''}" data-gtask="${t.id}"><span class="hc-dot">${ICK}</span><span class="g-tx"><b>${esc(t.title)}</b><small>${esc(listOf(t.list).name)} · ${esc(STAGES[idx(t.stage)].name)}</small></span>${CHEV}</button>${MORE(`data-gtm="t${t.id}"`,`Options for ${esc(t.title)}`)}</div>`;
  return `<div class="gv-sec"><h2>Other tasks</h2><span>${moved.length?`${moved.length} done this week`:''}</span></div><div class="g-tasks">${gCap('other',[...open,...moved],row,3,t=>'t'+t.id)}</div>`}
function gAddInput(ph){return `<input id="gMsIn" class="gv-add" placeholder="${ph}" maxlength="80" autocomplete="off" enterkeyhint="done" aria-label="Add a milestone">`}
const gSmooth=()=>matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
/* the selected milestone (tap one on the track, the hill or the path); by default the next one */
function gSel(g){return g.ms.find(m=>m.id===gSelId)||gNext(g)||g.ms[g.ms.length-1]||null}
const gRing=p=>`<svg viewBox="0 0 20 20" aria-hidden="true"><circle class="r0" cx="10" cy="10" r="7.5"/><circle class="r1" cx="10" cy="10" r="7.5" pathLength="100" style="stroke-dasharray:${(p*100).toFixed(1)} 100"/></svg>`;
function gRow(r){const on=r.done,subs=r.subs,n=subs.length,d=subs.filter(s=>s.done).length,k=r.k,open=gSubOpen.has(k)&&(n||gSubAdd===k),ren=gRen===k,l=r.kind==='t'&&listOf(r.t.list);
  const meta=r.kind==='t'?`<small class="gm-in"><i style="background:${l.c}"></i>${esc(l.name)} · ${on?'Done':esc(STAGES[idx(r.t.stage)].name)}</small>`:'';
  return `<div class="gm-t${on?' on':''}${open?' open':''}"><button class="gm-k" data-gmt="${k}" aria-pressed="${on}" aria-label="${on?'Reopen':'Done'}: ${esc(r.title)}">${CK}</button>
    ${ren?`<input class="gm-ren" data-gren="${k}" value="${esc(r.title)}" maxlength="200" autocomplete="off" enterkeyhint="done" aria-label="Task name">`
      :r.kind==='t'?`<button class="gm-tt" data-gtask="${r.t.id}" title="Open details"><b>${esc(r.title)}</b>${meta}</button>`
      :`<button class="gm-tt" data-gedt="${k}" title="Rename"><b>${esc(r.title)}</b></button>`}
    ${n?`<button class="gm-sub${d===n?' all':''}" data-gsubs="${k}" aria-expanded="${!!open}" aria-label="${d} of ${n} subtasks done. ${open?'Hide':'Show'} subtasks">${gRing(d/n)}<span>${d}/${n}</span></button>`:''}
    ${MORE(`data-gtm="${k}"`,`Options for ${esc(r.title)}`)}
    ${open?`<div class="gm-subs">${subs.map(s=>`<div class="gm-sr"><button class="gm-s${s.done?' on':''}" data-gsub="${k}|${s.id}" aria-pressed="${!!s.done}"><span class="gm-sk">${CK}</span><span class="gm-st">${esc(s.t||'')}</span></button><button class="gm-sx" data-gsdel="${k}|${s.id}" aria-label="Delete subtask ${esc(s.t||'')}">${X}</button></div>`).join('')}
      ${n<SUB_MAX?`<label class="gm-sadd"><span class="gm-plus">${PLUS_S}</span><input data-gsadd="${k}" placeholder="Add a subtask" maxlength="200" autocomplete="off" enterkeyhint="done" aria-label="Add a subtask to ${esc(r.title)}"></label>`:''}</div>`:''}</div>`}
/* a milestone's card: its tasks (in the order you added them), add a task, mark it done */
/* long lists show 3 and a "+N more" toggle, so the cards stay even */
var gOpenLists=new Set();
var gTouch=null; // the last task or milestone you acted on: a capped list opens if it would hide it
function gCap(key,items,render,n,keyOf){n=n||3;if(items.length<=n+1)return items.map(render).join('');
  if(gTouch&&keyOf&&items.findIndex(x=>keyOf(x)===gTouch)>=n)gOpenLists.add(key);const open=gOpenLists.has(key);
  return (open?items:items.slice(0,n)).map(render).join('')+`<button class="gm-cap" data-gmore="${key}" aria-expanded="${open}">${open?'Show less':`+${items.length-n} more`}</button>`}
function gMsCard(g,m,cls){if(!m)return '';
  const i=g.ms.indexOf(m),ts=gKids(m),dn=ts.filter(x=>x.done).length,nx=gNext(g),live=!m.done&&!g.done;
  return `<div class="gm-card${cls?' '+cls:''}" data-gcard="${m.id}"><div class="gm-h"><div class="gm-hx"><span class="gm-tag">${m.done?(m.doneAt?`Done · ${gShort(m.doneAt)}`:'Done'):m===nx?'Next':`Milestone ${i+1}`}</span><b>${esc(m.t)}</b>
      <small>${ts.length?`${dn} of ${ts.length} ${ts.length===1?'task':'tasks'} done`:'No tasks yet'}</small></div>
    ${g.done?'':`<button class="gm-done${m.done?' on':''}" data-gtk="${m.id}" aria-pressed="${!!m.done}">${m.done?CK+'Done':'Mark done'}</button>`}${MORE(`data-gmm="${m.id}"`,`Options for milestone ${esc(m.t)}`)}</div>
    ${ts.length?`<div class="gm-bar"><i style="width:${(dn/ts.length*100).toFixed(1)}%"></i></div><div class="gm-ts">${gCap('ms-'+m.id,ts,gRow,3,r=>r.k)}</div>`
      :''}
    ${live?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${m.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(m.t)}"></label>`:''}</div>`}
/* every milestone on one track that always fits: the first one is always in view, nothing scrolls sideways */
function gTrack(g){const sel=gSel(g),nx=gNext(g),N=g.ms.length,last=g.ms.map(m=>!!m.done).lastIndexOf(true),f=N>1&&last>0?last/(N-1):0;
  return `    <div class="gm-tw"><div class="gm-track${N>6?' many':''}" style="--n:${N};--f:${f.toFixed(4)}"><i class="gm-fill"></i>${g.ms.map((m,i)=>{const ts=gKids(m),dn=ts.filter(x=>x.done).length;
    return `<button class="gm-n${m.done?' done':''}${m===nx&&!g.done?' now':''}${m===sel?' sel':''}" data-gsel="${m.id}" aria-pressed="${m===sel}" aria-label="Milestone ${i+1}: ${esc(m.t)}" style="--i:${i}"><span class="gm-nk">${m.done?CK:i+1}</span><span class="gm-nl">${esc(m.t)}</span>${ts.length?`<span class="gm-np">${dn}/${ts.length} tasks</span>`:''}</button>`}).join('')}</div></div>`}
function gAddMsRow(g,ph){return (gAddMs||!g.ms.length)&&g.ms.length<MS_MAX&&!g.done?`<div class="gm-addms">${gAddInput(ph||(g.ms.length?'New milestone':'Add your first milestone'))}</div>`:''}
/* ---------- Goals page: each goal's ⋯ menu ---------- */
function gGoalMenu(g){return [{t:'Open',ic:CHEV,act:()=>openGoal(g.id)},{t:'Edit goal',ic:PEN_S,act:()=>openGoalSheet(g.id)},
  ...(g.done?[]:[{t:g.star?'Remove north star':'Make it my north star',ic:G_STAR,act:()=>gToggleStar(g)}]),
  {t:g.done?'Back in progress':'Mark as achieved',ic:G_FLAG,act:()=>gSetWin(g,!g.done)},{sep:1},{t:'Delete goal',ic:BIN_S,warn:1,act:()=>gDelete(g)}]}
$('goalsPg').addEventListener('click',e=>{const b=e.target.closest('[data-gcm]');if(!b)return;e.stopPropagation();const g=gById(b.dataset.gcm);if(g)cxOpen(b,gGoalMenu(g))});

/* ---------- goal page: what the ⋯ menus do ---------- */
function gDelTask(t){confirmAsk({title:'Delete this task?',text:`“${t.title||'Untitled'}” will be deleted for good.`,yes:'Yes, delete',no:'No',
  onYes:()=>{try{sfx('remove')}catch(e){}commit(()=>{S.tasks=S.tasks.filter(x=>x!==t);gList().forEach(g=>g.ms.forEach(m=>{if(m.task===t.id)delete m.task}))},'Task deleted')}})}
/* move a task (either kind) to another milestone; a list task can also go to Other tasks. The milestones it leaves and joins catch up */
function gMoveKid(g,r,to){const from=r.m;commit(()=>{
  if(r.kind==='i'){from.items=from.items.filter(x=>x!==r.it);to.items=to.items||[];to.items.push(r.it)}
  else{g.ms.forEach(m=>{if(m.task===r.t.id)delete m.task});if(to){r.t.goal=g.id;r.t.ms=to.id}else delete r.t.ms}
  if(to)gMsSync(to);if(from)gMsSync(from)},to?`Moved to ${to.t}`:'Moved to Other tasks');haptic(6)}
function gFocus(sel){const i=$('gdIn').querySelector(sel);if(i){i.focus();if(i.select&&i.value)i.select()}}
/* "Add to a list": every list, grouped by space (the goal's space first) */
function gListPicks(g,r){const sps=orderedSpaces().slice().sort((a,b)=>(b.id===g.space)-(a.id===g.space)),out=[];
  sps.forEach(sp=>{const ls=S.lists.filter(l=>l.space===sp.id);if(!ls.length)return;out.push({lbl:sp.name});ls.forEach(l=>out.push({t:l.name,act:()=>gItemToList(g,r.m,r.it,l)}))});
  return out.length?out:[{lbl:'No lists yet'}]}
function gTaskMenu(g,r){const m=r.m,dest=g.ms.filter(x=>x!==m),k=r.k;
  return [{t:'Rename',ic:PEN_S,act:()=>{gRen=k;drawGoal();gFocus(`[data-gren="${k}"]`)}},
    {t:'Add a subtask',ic:PLUS_S,dis:r.subs.length>=SUB_MAX,act:()=>{gSubOpen.add(k);gSubAdd=k;drawGoal();gFocus(`[data-gsadd="${k}"]`)}},
    ...(dest.length||(m&&r.kind==='t')?[{t:'Move to',ic:G_FLAG,sub:()=>[{lbl:'Move to'},...dest.map(x=>({t:x.t,act:()=>gMoveKid(g,r,x)})),...(m&&r.kind==='t'?[{sep:1},{t:'Other tasks (no milestone)',act:()=>gMoveKid(g,r,null)}]:[])]}]:[]),
    {sep:1},
    ...(r.kind==='i'?[{t:'Add to a list…',ic:CHEV,sub:()=>[{lbl:'Add to a list'},...gListPicks(g,r)]}]
      :[{t:'Open details',ic:CHEV,act:()=>openDetail(r.t.id)},...(m?[{t:'Keep in the goal only',ic:G_FLAG,act:()=>gTaskToGoal(g,m,r.t)}]:[{t:'Remove from this goal',ic:X,act:()=>commit(()=>{delete r.t.goal;delete r.t.ms},'Removed from the goal · the task stays')}])]),
    {sep:1},{t:'Delete task',ic:BIN_S,warn:1,act:()=>r.kind==='t'?gDelTask(r.t):commit(()=>{r.m.items=r.m.items.filter(x=>x!==r.it);gMsSync(r.m)},'Task deleted')}]}
function gMsMenu(g,m){const live=!m.done&&!g.done;
  return [{t:'Rename',ic:PEN_S,act:()=>openMsEdit(m.id)},
    ...(live?[{t:'Add a task',ic:PLUS_S,act:()=>{gSelId=m.id;drawGoal();gFocus('#gMtIn')}}]:[]),
    ...(g.done?[]:[{t:m.done?'Reopen milestone':'Mark milestone done',ic:CK,act:()=>gMsToggle(g,m)}]),
    {t:'Edit all milestones',ic:GRIP,act:()=>openMsEdit()},
    {sep:1},{t:'Delete milestone',ic:BIN_S,warn:1,act:()=>gMsDelete(g,m)}]}
/* tick a task of either kind; a list task that reopens goes back to My week (or Later when My week is full) */
function gKidToggle(g,r){if(r.kind==='t')return gTaskToggle(r.t.id);const on=!r.it.done;
  commit(()=>{r.it.done=on;if(on)r.it.doneAt=Date.now();else delete r.it.doneAt;gMsSync(r.m)},on?'Task done':'Task reopened');if(on){haptic([8,30,12]);try{sfx('done')}catch(e){}}}
/* inline: rename a task, add a subtask (Enter saves; Escape cancels without leaving the page) */
function gRenSave(el){const g=gById(gdId),r=g&&gKid(g,el.dataset.gren),v=el.value.trim();gRen=null;
  if(r&&v&&v!==r.title){if(r.kind==='t')r.t.title=v;else r.it.t=v;save();render()}drawGoal()}
$('gdPg').addEventListener('keydown',e=>{const el=e.target;
  if(el.matches('[data-gren]')){if(e.key==='Enter'){e.preventDefault();e.stopPropagation();gRenSave(el)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();gRen=null;drawGoal()}return}
  if(el.matches('[data-gsadd]')){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(el.value){el.value='';return}gSubAdd=null;el.blur();drawGoal();return}
    if(e.key!=='Enter')return;e.preventDefault();e.stopPropagation();const g=gById(gdId),r=g&&gKid(g,el.dataset.gsadd),v=el.value.trim();if(!r||!v)return;
    if(r.subs.length>=SUB_MAX){toast(`Up to ${SUB_MAX} steps per task. Keep it focused.`);return}
    const o=r.kind==='t'?r.t:r.it;o.subs=o.subs||[];o.subs.push({id:newId(),t:v,done:false});haptic(6);try{sfx('add')}catch(err){}save();render();gSubAdd=r.k;drawGoal();gFocus(`[data-gsadd="${r.k}"]`)}
},true);
$('gdPg').addEventListener('focusout',e=>{if(e.target.matches('[data-gren]')&&gRen!=null)setTimeout(()=>{if(gRen!=null&&!document.activeElement.matches('[data-gren]'))gRenSave(e.target)},0)});

/* the milestone card and Other tasks: side by side on computers */
function gCols(c,o){return c||o?`<div class="gm-cols${c&&o?' two':''}">${c}${o?`<div class="gm-other">${o}</div>`:''}</div>`:''}
/* the goal's "why": a soft note under the name; plain by default, or with a heart or an emoji you pick (Edit goal).
   Optional: hide it from the page (⋯ or Edit goal); it stays in the goal */
var G_HEART='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';
function gWhyIcon(g){return !g.whyE?'':g.whyE==='h'?`<i class="gw-i" aria-hidden="true">${G_HEART}</i>`:`<i class="gw-i e" aria-hidden="true">${esc(g.whyE)}</i>`}
function gWhy(g){if(g.hideWhy)return '';return g.why?`<button class="gv-why note${g.whyE?'':' plain'}" data-gwhy aria-label="Why it matters: ${esc(g.why)}. Edit">${gWhyIcon(g)}<span>${esc(g.why)}</span></button>`
  :`<button class="gv-why add" data-gwhy>${PLUS_S}Why it matters</button>`}
/* one calm line of facts: 1/5 milestones · 41 days to Dec 3 · On track */
function gFacts(g){const pr=gProg(g),dd=gDays(g),dl=gDaysLeft(g),top=pr.of>0&&pr.n>=pr.of&&!g.done,due=g.due?gShort(g.due):'';
  const days=g.done?`<span>Achieved ${gShort(g.doneAt)}</span>`:`<span><b>${dd.n}</b> ${dl!==null&&dl>=0&&due?`${dd.n===1?'day':'days'} to ${due}`:dd.t}</span>`;
  return `<div class="gb-facts"><div class="gb-line"><span><b>${pr.n}/${pr.of}</b> milestones</span>${days}${top||g.done?'':`<span class="gb-pace">${gPaceTxt(g)}</span>`}</div>${top?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div>`}
var G_SPARK='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5C11.5 16.9 7.1 12.5 1.5 12 7.1 11.5 11.5 7.1 12 1.5z"/></svg>';
/* your north star: a small gold star twinkling in the sky above the summit; hide it from the goal's ⋯ menu */
const gNsSky=g=>g.star&&!g.done&&!g.hideNs?`<span class="gb-ns" role="img" aria-label="North star">${G_SPARK}<small>North star</small></span>`:'';
/* computers: the selected milestone's tasks on the left; every milestone (tick, pick, add) and Other tasks on the right,
   so the tasks sit right under the hero and nothing scrolls sideways. Phones keep the track above the card. */
const gWide=()=>matchMedia('(min-width:1100px)').matches;
function gMsList(g){if(!g.ms.length)return '';const sel=gSel(g),nx=gNext(g),pr=gProg(g);
  return `<div class="gm-msl"><div class="gv-sec"><h2>Milestones</h2><span>${pr.n} of ${pr.of} done</span></div><div class="gpo-list">${gCap('msl',g.ms,(m,i)=>{const n=gKids(m).length;
    return `<div class="gpo-m${m.done?' on':''}${m===sel?' sel':''}${m===nx&&!g.done?' nx':''}"><button class="gpo-k" data-gtk="${m.id}" aria-pressed="${!!m.done}" aria-label="${m.done?'Reopen':'Tick'}: ${esc(m.t)}">${CK}</button><button class="gpo-ml" data-gsel="${m.id}" aria-pressed="${m===sel}" aria-label="Milestone ${i+1}: ${esc(m.t)}. Show its tasks">${esc(m.t)}${n?`<small>${gKids(m).filter(x=>x.done).length}/${n}</small>`:''}</button></div>`},3,m=>m.id)}
    ${g.ms.length<MS_MAX&&!g.done?gAddInput('Add a milestone'):''}</div></div>`}
/* phones: a hero card that stays pinned while you scroll (its sky slides under the top bar, the name and facts stay),
   then one roadmap: every milestone on a line, the selected one open with its tasks */
const gPhone=()=>matchMedia('(max-width:699px)').matches;
function gHeroFacts(g){const pr=gProg(g),dl=gDaysLeft(g),pc=gPace(g);
  const d=g.done?`Achieved ${gShort(g.doneAt)}`:dl===null?'No date':dl<0?`<b>${-dl}</b> ${dl===-1?'day':'days'} over`:`<b>${dl}</b> ${dl===1?'day':'days'} left`;
  return `<span><b>${pr.n} of ${pr.of}</b></span><span>${d}</span>`}
var gDoneOpen=false; // phones: finished milestones fold into one line until you open them
function gRoadView(g,anim){const sel=gSel(g),nx=gNext(g),pr=gProg(g),top=pr.of>0&&pr.n>=pr.of&&!g.done;
  const done=g.ms.filter(m=>m.done),fold=done.length>0&&!gDoneOpen&&!(sel&&sel.done);
  const row=m=>{const i=g.ms.indexOf(m),ts=gKids(m),dn=ts.filter(x=>x.done).length,open=m===sel,live=!m.done&&!g.done;
    const k=`<button class="gr-k" data-gtk="${m.id}" aria-pressed="${!!m.done}" aria-label="${m.done?'Reopen':'Mark done'}: ${esc(m.t)}">${m.done?CK:`<span>${i+1}</span>`}</button>`;
    if(!open)return `<div class="gr-ms${m.done?' on':''}${m===nx&&!g.done?' nx':''}">${k}<button class="gr-t" data-gsel="${m.id}" aria-label="Milestone ${i+1}: ${esc(m.t)}. Show its tasks"><b>${esc(m.t)}</b><small>${ts.length?`${dn}/${ts.length}`:''}</small></button></div>`;
    return `<div class="gr-ms sel${m.done?' on':''}${m===nx&&!g.done?' nx':''}" data-gcard="${m.id}">${k}<div class="gr-o">
      <div class="gr-oh"><b>${esc(m.t)}</b>${MORE(`data-gmm="${m.id}"`,`Options for milestone ${esc(m.t)}`)}</div>
      <small class="gr-os">${m.done?(m.doneAt?`Done ${gShort(m.doneAt)}`:'Done'):ts.length?`${dn} of ${ts.length} ${ts.length===1?'task':'tasks'}`:'No tasks yet'}</small>
      ${ts.length?`<div class="gm-ts">${gCap('ms-'+m.id,ts,gRow,3,r=>r.k)}</div>`:''}
      ${live?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${m.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(m.t)}"></label>`:''}</div></div>`};
  const rows=(fold?`<div class="gr-ms gr-fold"><span class="gr-k done">${CK}</span><button class="gr-t" data-gfold aria-expanded="false"><b>${done.length} done</b>${CHEV}</button></div>`+gCap('road',g.ms.filter(m=>!m.done),row,3,m=>m.id)
    :(done.length&&gDoneOpen&&!(sel&&sel.done)?`<div class="gr-ms gr-fold open"><span class="gr-k done">${CK}</span><button class="gr-t" data-gfold aria-expanded="true"><b>Hide ${done.length} done</b>${CHEV}</button></div>`:'')+g.ms.map(row).join(''));
  /* the facts and the why sit small in the top-left corner (no Back on phones: the Goals tab is there) */
  return `<div class="gr-meta"><div class="gr-f">${gHeroFacts(g)}</div>${g.why&&!g.hideWhy?`<button class="gr-why" data-gwhy aria-label="Why it matters: ${esc(g.why)}. Edit">${esc(g.why)}</button>`:''}</div>
    <div class="gr-hero">${gbScene(g,anim)}${gNsSky(g)}<div class="gr-hx"><h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1></div></div>
    <div class="gr-list">${rows}${g.ms.length<MS_MAX&&!g.done?`<div class="gr-ms add"><span class="gr-k ghost"></span>${gAddInput(g.ms.length?'Add a milestone':'Add your first milestone')}</div>`:''}</div>
    ${top?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}
    ${gTasksSec(g)}`}
$('gdPg').addEventListener('click',e=>{const b=e.target.closest('[data-gfold]');if(!b)return;e.stopPropagation();gDoneOpen=!gDoneOpen;haptic(4);drawGoal()});
matchMedia('(max-width:699px)').addEventListener('change',()=>{if(gdOn)drawGoal()});
function gClimbView(g,anim){const wide=gWide(),sel=gSel(g);if(gPhone())return gRoadView(g,anim);
  return `<div class="gb-stage">${gNsSky(g)}${gbScene(g,anim)}<div class="gb-head">
      <h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1>${gWhy(g)}</div></div>
    ${gFacts(g)}
    ${wide?gCols(sel?gMsCard(g,sel):gAddMsRow(g),gMsList(g)+gTasksSec(g))
      :`${g.ms.length?gTrack(g):''}${gAddMsRow(g)}${gCols(gMsCard(g,sel),gTasksSec(g))}`}`}
/* crossing between phone and computer layouts redraws the open goal */
matchMedia('(min-width:1100px)').addEventListener('change',()=>{if(gdOn)drawGoal()});
/* phones, Path: a calm sunrise (the arc fills as you go), then one milestone at a time on a step bar */
function gSunrise(g){const p=gProg(g).p,a=Math.PI*p,x=195-120*Math.cos(a),y=229-120*Math.sin(a),sy=262-p*44;
  return `<svg class="gpp-sun" viewBox="0 0 390 230" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs><radialGradient id="gppG" cx="50%" cy="100%" r="70%"><stop offset="0" style="stop-color:var(--week);stop-opacity:.26"/><stop offset="1" style="stop-color:var(--week);stop-opacity:0"/></radialGradient>
      <clipPath id="gppC"><rect width="390" height="229.5"/></clipPath></defs>
    <rect width="390" height="230" fill="url(#gppG)"/>
    <circle class="gpp-disc" cx="195" cy="${sy.toFixed(1)}" r="46" clip-path="url(#gppC)"/>
    <path class="gpp-a0" d="M75 229 A120 120 0 0 1 315 229"/>
    ${p>0?`<path class="gpp-a1" d="M75 229 A120 120 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}"/><circle class="gpp-me" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>`:''}
    <path class="gpp-hz" d="M0 229.5H390"/></svg>`}
function gPathPhone(g){const sel=gSel(g),nx=gNext(g),pr=gProg(g),top=pr.of>0&&pr.n>=pr.of&&!g.done,i=sel?g.ms.indexOf(sel):-1,pv=g.ms[i-1],nxm=g.ms[i+1];
  const steps=g.ms.map((m,k)=>`<button class="gpp-st${m.done?' on':''}${m===nx&&!g.done?' nx':''}${m===sel?' sel':''}" data-gsel="${m.id}" aria-pressed="${m===sel}" aria-label="Milestone ${k+1}: ${esc(m.t)}${m.done?', done':''}"><i></i></button>`).join('');
  let body='';
  if(sel){const ts=gKids(sel),dn=ts.filter(x=>x.done).length,live=!sel.done&&!g.done;
    body=`<div class="gpp-sw"><button class="gpp-ar" ${pv?`data-gsel="${pv.id}"`:'disabled'} aria-label="Previous milestone">${BACK_SVG}</button>
        <div class="gpp-nm"><span class="gpp-eye${sel.done?' done':''}">Milestone ${i+1} · ${sel.done?'done':sel===nx?'now':'later'}</span><b>${esc(sel.t)}</b>
          <span class="gpp-sub">${ts.length?`${dn} of ${ts.length} ${ts.length===1?'task':'tasks'}`:'No tasks yet'}${MORE(`data-gmm="${sel.id}"`,`Options for milestone ${esc(sel.t)}`)}</span></div>
        <button class="gpp-ar nx" ${nxm?`data-gsel="${nxm.id}"`:'disabled'} aria-label="Next milestone">${BACK_SVG}</button></div>
      <div class="gpp-ts" data-gcard="${sel.id}">${ts.length?`<div class="gm-ts">${gCap('ms-'+sel.id,ts,gRow,3,r=>r.k)}</div>`:''}
        ${live?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${sel.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(sel.t)}"></label>`:''}
        ${g.done?'':`<button class="gpp-done${sel.done?' on':''}" data-gtk="${sel.id}" aria-pressed="${!!sel.done}"><span class="gpp-dk">${CK}</span>${sel.done?'Milestone done · tap to reopen':'Mark milestone done'}</button>`}</div>`}
  return `<div class="gpp"><div class="gr-meta"><div class="gr-f">${gHeroFacts(g)}</div></div>
    ${gSunrise(g)}
    <div class="gpp-hd"><h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1>${g.why&&!g.hideWhy?`<button class="gpp-why" data-gwhy aria-label="Why it matters: ${esc(g.why)}. Edit">${esc(g.why)}</button>`:''}</div>
    ${g.ms.length?`<div class="gpp-bar" role="group" aria-label="Milestones">${steps}</div>`:''}
    ${body}
    ${!g.ms.length||(gAddMs&&g.ms.length<MS_MAX)?gAddMsRow(g):''}
    ${top?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div>`}
function gPathView(g){if(gPhone())return gPathPhone(g);
  const pr=gProg(g),dd=gDays(g),nx=gNext(g),sel=gSel(g);
  const st=g.ms.map((m,i)=>{const k=`${m.done?'done':m===nx?'now':''}${m===sel?' sel':''}`;
    return `<div class="gpth ${k}" style="--i:${i}"><span class="gpth-ln"><button class="gpth-k" data-gtk="${m.id}" aria-pressed="${!!m.done}" aria-label="${m.done?'Reopen':'Tick'}: ${esc(m.t)}">${CK}<i></i></button><b></b></span>
      <span class="gpth-tx">${m===nx&&!g.done?'<span class="gpth-nx">Next</span>':''}<button class="gpth-t" data-gsel="${m.id}" aria-expanded="${m===sel}">${esc(m.t)}</button>${m.done&&m.doneAt?`<small>Done ${gShort(m.doneAt)}</small>`:''}${m===sel?gMsCard(g,m,'in'):(n=>n?`<small>${gKids(m).filter(x=>x.done).length} of ${n} tasks</small>`:'')(gKids(m).length)}</span></div>`}).join('');
  return `<div class="gpv"><span class="hp-eye">${g.done?`Achieved · ${gShort(g.doneAt)}`:`${esc((spaceOf(g.space)||{}).name||'Goal')}${g.due?` · by ${gLong(g.due)}`:''}`}</span>
    <h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1>${gWhy(g)}
    <div class="gpv-bar"><i style="--w:${(pr.p*100).toFixed(1)}%"></i></div>
    <div class="gpv-meta"><span><b>${pr.n} of ${pr.of}</b> milestones</span><span>${gPaceTxt(g)}${g.done||dd.n==='—'?'':gDaysLeft(g)<0?` · ${dd.n} ${dd.n===1?'day':'days'} over`:` · ${dd.n} ${dd.t}`}</span></div>
    <div class="gpth-list">${st}${g.ms.length<MS_MAX&&!g.done?`<div class="gpth add"><span class="gpth-ln"><span class="gpth-k ghost"></span></span><span class="gpth-tx">${gAddInput(g.ms.length?'Add a milestone':'Add your first milestone')}</span></div>`:''}</div>
    ${pr.of&&pr.n>=pr.of&&!g.done?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div>`}
function gPosterView(g){
  const pr=gProg(g),dl=gDaysLeft(g),nx=gNext(g),sel=gSel(g),big=g.done?'Done':dl===null?'—':Math.abs(dl);
  return `<div class="gpo"><div class="gpo-l"><span class="hp-eye">${esc(g.name)}${g.due?` · ${gLong(g.due)}`:''}</span>
      <div class="gpo-num"><b ${typeof big==='number'?`data-cnt="${big}"`:''}>${big}</b><span>${g.done?'Goal achieved.':dl===null?'No date set.':dl===0?'Today is the day.':dl<0?`${dl===-1?'day':'days'} past due.`:`${dl===1?'day':'days'} to go.`}</span></div>
      <div class="gpo-segs">${(g.ms.length?g.ms:[{}]).map((m,i)=>`<i class="${m.done?'on':''}" style="--i:${i}"></i>`).join('')}</div>
      <div class="gpv-meta"><span><b>${pr.n} of ${pr.of}</b> milestones</span><span>${gPaceTxt(g)}</span></div></div>
    <div class="gpo-r">${pr.of&&!nx&&!g.done&&gSelId==null?`<div class="gpo-next"><span>Summit reached</span><b>Every milestone is done.</b><button class="gpo-btn" data-gwin>Mark achieved</button></div>`
      :g.ms.length&&!g.done?gMsCard(g,sel,'hot'):''}
      <div class="gpo-list">${g.ms.map(m=>`<div class="gpo-m${m.done?' on':''}${m===sel&&!g.done?' sel':''}"><button class="gpo-k" data-gtk="${m.id}" aria-pressed="${!!m.done}" aria-label="${m.done?'Reopen':'Tick'}: ${esc(m.t)}">${CK}</button><button class="gpo-ml" data-gsel="${m.id}">${esc(m.t)}${(n=>n?`<small>${gKids(m).filter(x=>x.done).length}/${n}</small>`:'')(gKids(m).length)}</button></div>`).join('')}${g.ms.length<MS_MAX&&!g.done?gAddInput(g.ms.length?'Add a milestone':'Add your first milestone'):''}</div></div></div>`}
function drawGoal(){
  const g=gById(gdId);if(!g){closeGoal();return}
  const y=$('gdPg').scrollTop,v=gView(g),anim=gdAnim;
  const body=v==='path'?gPathView(g):v==='poster'?gPosterView(g):gClimbView(g,anim);
  const html=`<div class="set-top gd-top"><button class="icon-btn" id="gdBack" aria-label="Back">${BACK_SVG}</button>${gMenuHTML(g)}</div>
    <div class="gv gv-${v}${anim?' anim':''}">${body}${v==='climb'?'':gTasksSec(g)}</div>`;
  if(!anim&&html===gdHtml)return;
  // the task lists scroll inside themselves: keep where you were in them across redraws
  const keep=[...$('gdIn').querySelectorAll('[data-sk]')].map(el=>[el.dataset.sk,el.scrollTop]);
  gdHtml=html;$('gdIn').innerHTML=html;$('gdPg').scrollTop=y;if(anim)countUp($('gdIn'));
  keep.forEach(([k,s])=>{const el=$('gdIn').querySelector(`[data-sk="${k}"]`);if(el)el.scrollTop=s});
  $('gdIn').querySelectorAll('[data-sk]').forEach(el=>{vFade(el);el.addEventListener('scroll',()=>vFade(el),{passive:true})});
}
/* while you type, outside changes wait; once you leave the field the page catches up */
$('gdPg').addEventListener('focusout',e=>{if(!e.target.matches('input,textarea'))return;setTimeout(()=>{const a=document.activeElement;if(gdOn&&!(a&&a.closest&&a.closest('#gdPg')&&a.matches('input,textarea')))drawGoal()},0)});
$('gdPg').addEventListener('click',e=>{
  const g=gById(gdId);if(!g)return;
  const sl=e.target.closest('[data-gsel]');if(sl){gSelId=sl.dataset.gsel;haptic(5);drawGoal();
    if(sl.closest('.gb-svg')){const c=$('gdIn').querySelector('.gm-card');if(c)c.scrollIntoView({behavior:gSmooth(),block:'nearest'})}return}
  const tm=e.target.closest('[data-gtm]');if(tm){const r=gKid(g,tm.dataset.gtm);if(r)cxOpen(tm,gTaskMenu(g,r));return}
  const ed=e.target.closest('[data-gedt]');if(ed){gRen=ed.dataset.gedt;drawGoal();gFocus(`[data-gren="${gRen}"]`);return}
  const mm=e.target.closest('[data-gmm]');if(mm){const m=g.ms.find(x=>x.id===mm.dataset.gmm);if(m)cxOpen(mm,gMsMenu(g,m));return}
  const sx=e.target.closest('[data-gsdel]');if(sx){const [k,sid]=sx.dataset.gsdel.split('|'),r=gKid(g,k);if(!r)return;const o=r.kind==='t'?r.t:r.it,s=(o.subs||[]).find(x=>String(x.id)===sid);if(!s)return;
    commit(()=>{o.subs=o.subs.filter(x=>x!==s)},'Subtask deleted');return}
  const sb=e.target.closest('[data-gsubs]');if(sb){const k=sb.dataset.gsubs;gSubOpen.has(k)?gSubOpen.delete(k):gSubOpen.add(k);haptic(5);return drawGoal()}
  const su=e.target.closest('[data-gsub]');if(su){const [k,sid]=su.dataset.gsub.split('|'),r=gKid(g,k),s=r&&r.subs.find(x=>String(x.id)===sid);if(!s)return;
    s.done=!s.done;haptic(s.done?[6,20,8]:5);try{sfx(s.done?'done':'undone')}catch(err){}su.classList.toggle('on',s.done);save();render();return}
  const mt=e.target.closest('[data-gmt]');if(mt){const r=gKid(g,mt.dataset.gmt),bk=mt.dataset.gmt;if(!r||gTickBusy.has(bk))return;gTickBusy.add(bk);const m=r.m;
    if(m)gSelId=m.id;mt.closest('.gm-t').classList.toggle('on');
    setTimeout(()=>{try{const r2=gKid(g,mt.dataset.gmt);if(r2)gKidToggle(g,r2);
      // the milestone just finished: let the moment show, then move on to the next one
      if(m&&m.done)setTimeout(()=>{if(gdOn&&gSelId===m.id){gSelId=null;drawGoal()}},1200)}finally{setTimeout(()=>gTickBusy.delete(bk),250)}},180);return}
  const t=e.target.closest('[data-gtk]');if(t){const m=g.ms.find(x=>x.id===t.dataset.gtk),bk='m'+t.dataset.gtk;if(!m||gTickBusy.has(bk))return;gTickBusy.add(bk);const el=t.closest('.gpth,.gpo-m,.gm-card')||t;el.classList.toggle('done',!m.done);el.classList.toggle('on',!m.done);
    setTimeout(()=>{try{gMsToggle(g,m)}finally{setTimeout(()=>gTickBusy.delete(bk),250)}},200);return} // one tap per item at a time: a double tap ticks once
});

/* Escape on the Goal and Goals pages, wherever focus is: the ⋯ menu first, then the goal, then the Goals page.
   (With focus inside the goal page its own handler runs first and also clears a milestone being typed.) */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||!(gdOn||glOn))return;
  if(gmeOn){if($('dlg').classList.contains('on'))return;e.stopPropagation();return closeMsEdit()}
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
/* the last 7 days as tiny dots under a tile (computers only): kept = soft coral, missed = faint, rest day = tiny, today ringed.
   Today's dot follows the tile's tick right away (CSS), the rest catch up on the next redraw */
function hwWeek(h){const done=h.done||{},born=dkey(new Date(h.created||0));
  return `<span class="hw-wk" aria-hidden="true">${[6,5,4,3,2,1,0].map(i=>{const d=hbDays(i),k=dkey(d),on=!!done[k];
    return i===0?'<i class="t"></i>':`<i class="${on?'k':k<born?'':!hbDue(h,d)?'r':''}"></i>`}).join('')}</span>`}
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
  return `<div class="hw hw-tiles">${head}<div class="hw-tl">${list.map(h=>{const s=hbStats(h);return `<button class="hw-tile${s.dt?' on':''}" data-hbt="${h.id}" aria-pressed="${s.dt}"><span class="hw-k">${ck}</span><span class="hw-tt"><b>${h.e?esc(h.e)+' ':''}${esc(h.name)}</b><small>${s.st>1?`${s.st} days`:s.dt?'Done':'Today'}</small>${hwWeek(h)}</span></button>`}).join('')}</div>${mr}</div>`;
}

/* Escape closes the page on top, wherever focus is. Clicking an empty spot moves focus off a page, so its own
   Escape handler never hears the key. Runs first (capture) but only steps in then; pages and popups that already
   listen app-wide (Habits, Goals, their popups, menus, dialogs, Settings) are left to their own handlers. */
const ESC_PAGES={nbEd:()=>closeNote(),moPg:()=>closeMoment(),gsPg:()=>closeSetup(),cdPg:()=>closeCloseDay(),reviewPg:()=>closeReview(),inboxPg:()=>closeInbox()};
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||cxIt)return;
  if($('dlg').classList.contains('on')||document.querySelector('.sheet.on')||(typeof srchOpen!=='undefined'&&srchOpen)||$('focus').classList.contains('on'))return;
  const z=el=>parseInt(getComputedStyle(el).zIndex,10)||0;
  const top=[...document.querySelectorAll('.inbox-pg.on,.mo-pg.on,.dlg.on,#settings.on')]
    .sort((a,b)=>z(a)-z(b)||(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1)).pop();
  if(!top||!ESC_PAGES[top.id]||top.contains(e.target))return;
  e.preventDefault();e.stopImmediatePropagation();ESC_PAGES[top.id]();
},true);

$('gdPg').addEventListener('click',e=>{const b=e.target.closest('[data-gmore]');if(!b)return;e.stopPropagation();const k=b.dataset.gmore;gTouch=null;
  if(gOpenLists.has(k))gOpenLists.delete(k);else gOpenLists.add(k);haptic(4);drawGoal()});

/* remember what you touch, and open a capped list when you add to it, so nothing you act on hides under "+N more" */
$('gdPg').addEventListener('click',e=>{const b=e.target.closest('[data-gmt],[data-gtm],[data-gedt],[data-gsubs],[data-gtk],[data-gsel],[data-gtask]');if(!b)return;
  const d=b.dataset;gTouch=d.gmt||d.gtm||d.gedt||d.gsubs||d.gtk||d.gsel||(d.gtask?'t'+d.gtask:null)},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='gMtIn'&&e.target.value.trim())gOpenLists.add('ms-'+e.target.dataset.gms)},true);
