/* ---------- Flow: a second design you can switch on (0.302) ----------
   Settings → Appearance → Design: Classic (the app as it was) or Flow. Nothing of Classic is removed or changed:
   every Flow change is guarded by flowOn(part), and the CSS lives under :root[data-fl~="part"].
   Flow is made of parts, each with its own switch, so they can be judged (and later merged) one by one:
     next    Home: the Up next card gets Start / Done / Later
     plus    one + everywhere: the computer's floating + on every board; on Habits and Goals the + opens the menu with that kind first
     shell   every page header looks the same (Back left, ⋯ right, same buttons)
     presets Settings → Modes starts with Simple / Planner / Everything
     shapes  spaces are squares, lists are dots, everywhere
     thumb   phones: the stage tabs sit at the bottom, near your thumb
     panel   computers: task details dock on the right, the board stays visible
     inline  computers: double-click the board title to rename the space or list
     wins    a small burst when you tick a task; a weekly recap card on Home (Sunday and Monday)
     empty   empty stages show an example and one clear button
     kit     one set of corners, buttons and focus rings */
const FL_PARTS=[
  ['next','Up next actions','Start, Done and Later right on Home'],
  ['plus','One + everywhere','The + opens the same menu on every page'],
  ['shell','Same page headers','Back on the left, ⋯ on the right, on every page'],
  ['presets','Mode presets','Simple, Planner or Everything in one tap'],
  ['shapes','Shapes','Spaces are squares, lists are dots'],
  ['thumb','Thumb-first (phone)','Stage tabs at the bottom, near your thumb'],
  ['panel','Side panel (computer)','Task details dock on the right; the board stays visible'],
  ['inline','Rename in place (computer)','Double-click a title to rename it'],
  ['wins','Wins','A small burst on each tick, and a weekly recap'],
  ['empty','Helpful empty pages','An example and one clear button'],
  ['kit','One consistent kit','Same corners, buttons and focus rings']];
const flKey=p=>'fl'+p[0].toUpperCase()+p.slice(1);
const flowUI=()=>!!(S.cfg&&S.cfg.ui==='flow');
const flowOn=p=>flowUI()&&S.cfg[flKey(p)]!==false;
function flFont(){if(document.getElementById('flFont'))return;const l=document.createElement('link');l.id='flFont';l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';document.head.appendChild(l)}
function flPaint(){if(!flowUI()){delete root.dataset.ui;delete root.dataset.fl;return}try{flFont()}catch(e){}
  root.dataset.ui='flow';root.dataset.fl=FL_PARTS.map(([p])=>p).filter(flowOn).join(' ')}
const _flApply=applySettings;
applySettings=function(){if(S.cfg&&S.cfg.ui!=='flow')S.cfg.ui='classic';if(S.cfg)FL_PARTS.forEach(([p])=>{if(S.cfg[flKey(p)]===undefined)S.cfg[flKey(p)]=true});const r=_flApply.apply(this,arguments);try{flPaint()}catch(e){}return r};
flPaint();

/* Settings → Appearance: Design (Classic | Flow), and when Flow is on, its parts */
const _flPage=settingsPage;
settingsPage=function(id){const h=_flPage.apply(this,arguments);if(id!=='appearance')return h;
  const on=flowUI(),sec=`<div class="set-sec fl-sec" id="flSec"><h3>Design</h3>
    ${row('Design',`<div class="segc">${sOpt('ui','classic','Classic')}${sOpt('ui','flow','Flow')}</div>`,on?'Flow is on. Switch back to Classic any time: nothing is lost.':'Try Flow, the new design. Switch back any time.')}
    ${on?`<p class="sub-p fl-p">Flow parts. Turn any part off to see Classic for that part.</p>${FL_PARTS.map(([p,n,s])=>row(n,tg(flKey(p)),s)).join('')}`:''}</div>`;
  const i=h.indexOf('<div class="set-sec');return i<0?h+sec:h.slice(0,i)+sec+h.slice(i)};
const _flSum=pageSummary;
pageSummary=function(id){const s=_flSum.apply(this,arguments);if(id!=='appearance'||!flowUI())return s;const c=C();return `Flow design · ${{system:'Auto',light:'Light',dark:'Dark'}[c.theme]}`};

/* ---------- next: Start / Done / Later on the Up next card ---------- */
const FL_GO='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const FL_CK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const FL_LATER='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h12M13 7l5 5-5 5"/></svg>';
function flNextTask(card){const td=bySpaceOrder(S.tasks.filter(t=>shown(t)&&t.stage==='today'));if(!td.length)return null;
  if(card.classList.contains('td-card')){const sp=focusSpace(td),mine=sp?td.filter(t=>listOf(t.list).space===sp.id):td;return {t:mine[0],n:td.length}}
  return {t:td[0],n:td.length}}
const flActs=(t,n)=>`<div class="fl-acts" data-flt="${t.id}"><span class="fl-of">1 of ${n} today</span>
  <button class="fl-go" data-flgo>${FL_GO}<span>Start</span></button><button class="fl-sq" data-fldone aria-label="Done" title="Done">${FL_CK}</button><button class="fl-sq" data-fllater aria-label="Later: move to ${esc(STAGES[1].name)}" title="Later">${FL_LATER}</button></div>`;
function flNextPaint(){if(!flowOn('next'))return;
  document.querySelectorAll('#homeView .td-card:not(.td-empty), #dHome .cm-up:not(.is-empty)').forEach(c=>{if(c.querySelector('.fl-acts'))return;const x=flNextTask(c);if(!x||!x.t)return;
    c.classList.add('fl-next');c.insertAdjacentHTML('beforeend',flActs(x.t,x.n))})}
document.addEventListener('click',e=>{const a=e.target.closest('.fl-acts');if(!a)return;const b=e.target.closest('button');e.stopPropagation();if(!b)return;
  const t=S.tasks.find(x=>String(x.id)===a.dataset.flt);if(!t)return;haptic(6);
  if(b.hasAttribute('data-flgo'))return startBlitz([t]);
  if(b.hasAttribute('data-fldone')){return commit(()=>setStage(t,'done'),`Done: ${t.title}`)}
  if(b.hasAttribute('data-fllater'))return commit(()=>setStage(t,'week'),`Moved to ${STAGES[1].name}`)},true);

/* ---------- plus: on Habits and Goals the + opens the menu with that kind first ---------- */
var flSug=null;
const _flOpenNw=openNw;
openNw=function(anchor){const r=_flOpenNw.apply(this,arguments);const k=flSug;flSug=null;
  if(k&&flowOn('plus')){const m=$('nwMenu'),b=m.querySelector(`[data-nwk="${k}"]`);if(b){m.appendChild(b);b.classList.add('fl-sug');const l=b.querySelector('.nw-l');if(l)l.insertAdjacentHTML('beforeend','<small class="fl-sugl">Suggested</small>')}}
  return r};
document.addEventListener('click',e=>{const b=e.target.closest('#addBtn,#tbAdd');if(!b||!e.isTrusted||!flowOn('plus'))return;
  const k=typeof rhOn!=='undefined'&&rhOn?'habit':typeof glOn!=='undefined'&&glOn&&!(typeof gdOn!=='undefined'&&gdOn)?'goal':null;
  if(!k||!addKinds().some(x=>x[0]===k))return;
  e.preventDefault();e.stopImmediatePropagation();if(nwOn)return closeNw();nwFromFab=false;flSug=k;openNw(b)},true);

/* ---------- presets: Simple / Planner / Everything at the top of Modes ---------- */
const FL_MODES=['inbox','plan','habits','goals','mx','wins','routines','journal'];
const FL_PRESETS=[
  {id:'simple',n:'Simple',s:'Just tasks and lists. Nothing else.',on:[],tags:['Tasks','Lists']},
  {id:'planner',n:'Planner',s:'Plan your week, with an Inbox for quick notes.',on:['inbox','plan'],tags:['Tasks','Inbox','Week plan']},
  {id:'all',n:'Everything',s:'Goals, habits, journal, metrics. The full toolkit.',on:FL_MODES,tags:['Goals','Habits','Journal','Metrics']}];
const flModeOn=k=>k==='inbox'?S.cfg.inbox!==false:!!S.cfg[k];
const flPresetNow=()=>{const p=FL_PRESETS.find(p=>FL_MODES.every(k=>flModeOn(k)===p.on.includes(k)));return p?p.id:'custom'};
const _flModes=modesPage;
modesPage=function(){const h=_flModes.apply(this,arguments);if(!flowOn('presets'))return h;const cur=flPresetNow();
  return `<div class="fl-pre"><p class="sub-p">How do you work? Pick one. You can still turn each mode on or off below.</p>
    ${FL_PRESETS.map(p=>`<button class="fl-pc${cur===p.id?' on':''}" data-flpre="${p.id}" aria-pressed="${cur===p.id}"><span class="fl-pt"><b>${p.n}</b><i class="fl-rad" aria-hidden="true">${FL_CK}</i></span><small>${p.s}</small><span class="fl-tags">${p.tags.map(t=>`<em>${t}</em>`).join('')}</span></button>`).join('')}
    ${cur==='custom'?'<p class="sub-p fl-cus">Custom: your own mix.</p>':''}</div>`+h};
document.addEventListener('click',e=>{const b=e.target.closest('#setIn [data-flpre]');if(!b)return;e.stopPropagation();
  const p=FL_PRESETS.find(x=>x.id===b.dataset.flpre);if(!p||flPresetNow()===p.id)return;
  const was=Object.fromEntries(FL_MODES.map(k=>[k,S.cfg[k]]));haptic(6);try{sfx('toggle')}catch(err){}
  FL_MODES.forEach(k=>{S.cfg[k]=p.on.includes(k)});S.cfgU=Date.now();applySettings();save();render();drawSettings();
  toast(`${p.n} is on`,()=>{Object.assign(S.cfg,was);S.cfgU=Date.now();applySettings();save();render();drawSettings()})},true);

/* ---------- thumb: phones keep the stage tabs just above the bottom bar ---------- */
function flThumbPaint(){if(!flowOn('thumb')){root.style.removeProperty('--fl-dock');return}
  const d=document.querySelector('.dock');if(d&&d.offsetHeight)root.style.setProperty('--fl-dock',d.offsetHeight+'px')}
addEventListener('resize',()=>{try{flThumbPaint()}catch(e){}});

/* ---------- inline: rename the space or list right in the title (computers) ----------
   The board's top bar gets a small pencil next to the space / list name; the plain title (when it shows) also takes a double-click. */
const FL_PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
function flRenameTarget(){if(S.list&&S.list!=='all'){const l=S.lists.find(x=>x.id===S.list);if(l)return {kind:'list',o:l}}
  const sp=S.space&&S.space!=='all'?spaceOf(S.space):null;return sp?{kind:'space',o:sp}:null}
function flRename(el){const tg=flRenameTarget();if(!tg||!tg.o)return;const old=tg.o.name;
  const i=document.createElement('input');i.className='fl-ren';i.id='flRen';i.value=old;i.maxLength=60;i.setAttribute('aria-label',`Rename ${tg.kind}`);
  el.replaceWith(i);i.focus();i.select();let done=false;
  const end=keep=>{if(done)return;done=true;const v=i.value.trim();if(keep&&v&&v!==old)commit(()=>{tg.o.name=v},`Renamed to ${v}`);else render()};
  i.addEventListener('keydown',k=>{k.stopPropagation();if(k.key==='Enter'){k.preventDefault();end(true)}if(k.key==='Escape'){k.preventDefault();end(false)}});
  i.addEventListener('blur',()=>end(true))}
const _flFw=renderFullWidth;
renderFullWidth=function(){const r=_flFw.apply(this,arguments);try{if(flowOn('inline')&&fwOn()&&flRenameTarget()){const p=document.querySelector('#fwNav .fw-pill');
  if(p&&!document.querySelector('#fwNav [data-flren]'))p.insertAdjacentHTML('afterend',`<button class="fl-renb" data-flren aria-label="Rename this ${flRenameTarget().kind}" title="Rename">${FL_PEN}</button>`)}}catch(e){}return r};
document.addEventListener('click',e=>{const b=e.target.closest('[data-flren]');if(!b)return;e.stopPropagation();haptic(4);
  const p=document.querySelector('#fwNav .fw-pill');if(p){b.remove();flRename(p)}},true);
$('mDate').addEventListener('dblclick',e=>{if(!flowOn('inline')||!flRenameTarget())return;e.preventDefault();const s=document.createElement('span');$('mDate').textContent='';$('mDate').appendChild(s);flRename(s)});

/* ---------- wins: a small burst when you tick a task ---------- */
document.addEventListener('click',e=>{const c=e.target.closest('[data-check]');if(!c||!flowOn('wins')||!C().motion)return;
  const row=c.closest('[data-id]'),t=row&&S.tasks.find(x=>String(x.id)===row.dataset.id);if(!t||t.stage==='done')return;
  const r=c.getBoundingClientRect(),b=document.createElement('span');b.className='fl-burst';b.setAttribute('aria-hidden','true');
  b.style.left=r.left+r.width/2+'px';b.style.top=r.top+r.height/2+'px';b.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i>';
  document.body.appendChild(b);setTimeout(()=>b.remove(),800)},true);
/* the weekly recap: Sunday and Monday, on Home, until you close it */
const flWeekKey=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)-(d.getDay()===1?7:0));return dkey(d.getTime())};
function flRecapOn(){if(!flowOn('wins'))return false;const day=window.__flDay!=null?window.__flDay:new Date().getDay();
  return (day===0||day===1)&&C().flRecapX!==flWeekKey()}
function flRecapHTML(){const now=new Date();now.setHours(23,59,59,999);const days=[];
  for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);days.push(d)}
  const per=days.map(d=>S.tasks.filter(t=>t.doneAt&&dkey(t.doneAt)===dkey(d.getTime())).length),tot=per.reduce((a,b)=>a+b,0),mx=Math.max(1,...per);
  const bi=per.indexOf(Math.max(...per)),mins=S.tasks.filter(t=>t.doneAt&&t.doneAt>now.getTime()-7*DAY).reduce((a,t)=>a+(+t.est||0),0);
  return `<section class="fl-recap" aria-label="Your week"><button class="fl-rx" data-flrx aria-label="Close the weekly recap">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'}</button>
    <span class="fl-re">Your week</span><b class="fl-rn">${tot}</b><span class="fl-rs">${tot===1?'task':'tasks'} done${mins?` · ${fmt(mins)} of work`:''}</span>
    <div class="fl-bars" aria-hidden="true">${per.map((n,i)=>`<i class="${i===bi&&tot?'best':''}" style="height:${Math.max(6,n/mx*100)}%"></i>`).join('')}</div>
    <span class="fl-rs">${tot?`Best day: ${days[bi].toLocaleDateString(undefined,{weekday:'long'})}`:'A fresh week starts now.'}</span></section>`}
function flRecapPaint(){if(!flRecapOn()||!S.tasks.some(t=>t.doneAt&&t.doneAt>Date.now()-7*DAY))return; /* nothing done this week: no card */
  const ph=document.querySelector('#homeView .td-card');if(ph&&!document.querySelector('#homeView .fl-recap'))ph.insertAdjacentHTML('afterend',flRecapHTML());
  const dk=document.querySelector('#dHome .cm-up');if(dk&&!document.querySelector('#dHome .fl-recap'))dk.insertAdjacentHTML('afterend',flRecapHTML())}
document.addEventListener('click',e=>{if(!e.target.closest('[data-flrx]'))return;e.stopPropagation();S.cfg.flRecapX=flWeekKey();S.cfgU=Date.now();save();haptic(4);
  document.querySelectorAll('.fl-recap').forEach(x=>x.remove())},true);

/* ---------- empty: an example row and one clear button ---------- */
function flEmptyPaint(){if(!flowOn('empty')||!S.space||S.stage==='done')return;const li=document.querySelector('#list > li.empty');if(!li||li.querySelector('.fl-ex'))return;
  li.classList.add('fl-empty');
  li.insertAdjacentHTML('afterbegin',`<span class="fl-ex" aria-hidden="true"><span class="fl-exl">Example</span><span class="fl-exr"><i></i>Call the dentist<small>15m</small></span></span>`);
  li.insertAdjacentHTML('beforeend',`<button class="fl-eb" data-fladd>${PLUS_S}Add a task</button>`)}
document.addEventListener('click',e=>{if(!e.target.closest('[data-fladd]'))return;e.stopPropagation();$('addBtn').click()},true);

/* every draw: add the Flow pieces (inside the page-motion layer, so they arrive with the page) */
const _flRender=render;
function flPaintAll(){if(!flowUI())return;try{if(S.space){root.style.setProperty('--accent-btn','var(--accent)');root.style.setProperty('--on-accent','var(--fl-ink)')}flNextPaint();flRecapPaint();flEmptyPaint();flThumbPaint()}catch(e){}}
render=function(){const r=_flRender.apply(this,arguments);flPaintAll();return r};
const _flDesk=renderDesk;
renderDesk=function(){const r=_flDesk.apply(this,arguments);flPaintAll();return r};

/* ---------- the Flow look: buttons on the coral (and other stage colours) use dark ink, like the mockups ----------
   Classic paints white text on its deeper gradients. Flow's colours are brighter, so white text would be hard to read.
   Instead of copying dozens of selectors, read the stylesheet once: every rule that puts white text on a stage colour
   gets a Flow twin with --fl-ink (dark on the dark look, white on the light look, where the colours are deeper). */
(function flInk(){try{const sels=[],bgRe=/var\(--(today|week|done|backlog|accent|accent-btn|cta|win-[a-z]+)\)/,whRe=/^(#fff|#ffffff|white|rgb\(255, 255, 255\))$/i;
  const walk=rules=>{for(const r of rules){if(r.cssRules&&!r.selectorText){walk(r.cssRules);continue}if(!r.style||!r.selectorText)continue;
    const c=(r.style.getPropertyValue('color')||'').trim(),bg=r.style.getPropertyValue('background')+' '+r.style.getPropertyValue('background-color')+' '+r.style.getPropertyValue('background-image');
    if(whRe.test(c)&&bgRe.test(bg)&&!/data-ui/.test(r.selectorText))sels.push(r.selectorText)}};
  for(const sh of document.styleSheets){try{walk(sh.cssRules)}catch(e){}}
  const extra='.go,#goBtn';
  const st=document.createElement('style');st.id='flInk';
  st.textContent=`:root[data-ui="flow"] :is(${[...new Set(sels)].join(',')},${extra}){color:var(--fl-ink)!important}
:root[data-ui="flow"]{--win-backlog:var(--backlog);--win-week:var(--week);--win-today:var(--today);--win-done:var(--done)}`;
  document.head.appendChild(st);window.__flInkN=sels.length}catch(e){}})();
