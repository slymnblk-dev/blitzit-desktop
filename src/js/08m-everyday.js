/* ---------- Everyday touches (work with any mode, and with none) ----------
   A · One + for everything: the add sheet offers Task · Idea · Habit · Number. Each kind appears only when its
       feature is on, so with everything off it is just "Add task", exactly as before.
   B · Close the day: an optional evening card (Settings → Modes → Everyday). One short page: tick the last habits,
       log today's numbers, pick the task tomorrow starts with.
   C · Starter picks: a mode that is turned on never leaves you on an empty page; Settings → Modes offers a few
       ready-made habits, goals and projects to start from.
   D · Moments: a calm full-screen moment when a habit's sun has been up 7, 30, 100 or 365 days in a row,
       or a goal is achieved. Rare on purpose. */
var moOn=false,cdOn=false,addKind='task';
var HB_STARTERS=[['💧','Drink water'],['🏃','Move 30 minutes'],['📖','Read 20 pages'],['🧘','Meditate'],['📵','Phone away at night'],['🛏️','Bed by 11']];
var G_STARTERS=[['🏃','Run a half marathon'],['📚','Read 12 books'],['💰','Save an emergency fund'],['🧠','Learn Spanish basics']];

/* ---------- A · one + for everything ---------- */
/* the kinds row only appears when a mode adds something; with modes off it is just "Add task", as before */
function addKinds(){const hb=habitsOn(),nm=projectsOn()&&addMetrics().length>0;if(!hb&&!nm)return [['task','Task']];
  const k=[['task','Task']];if(typeof inboxOn==='function'&&inboxOn())k.push(['idea','Idea']);
  if(hb)k.push(['habit','Habit']);if(nm)k.push(['number','Number']);return k}
function addMetrics(){const r=[];pAll().filter(p=>p.kind==='numbers').forEach(p=>p.metrics.forEach(m=>r.push({p,m})));return r}
const AK_IC={task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  idea:IB_ICON,habit:RH_ICON,number:PJ_NUM};
let addHb={days:[0,1,2,3,4,5,6]},addNum=null;
document.querySelector('#addSheet .grab').insertAdjacentHTML('afterend','<div class="ak-row" id="addKinds" role="tablist" aria-label="What to add" hidden></div>');
$('newTitle').insertAdjacentHTML('afterend','<div class="ak-extra" id="addExtra" hidden></div>');
function drawKinds(){
  const ks=addKinds(),row=$('addKinds');if(!ks.some(k=>k[0]===addKind))addKind='task';
  row.hidden=ks.length<2;row.innerHTML=ks.map(([k,l])=>`<button role="tab" data-ak="${k}" class="${addKind===k?'on':''}" aria-selected="${addKind===k}">${AK_IC[k]}${l}</button>`).join('');
  $('addSheet').dataset.kind=addKind;
  const t=$('newTitle'),x=$('addExtra');
  t.placeholder={task:'What needs doing?',idea:'Drop an idea',habit:'New habit, e.g. Read 10 pages',number:'How many?'}[addKind];
  t.inputMode=addKind==='number'?'decimal':'text';
  $('saveBtn').textContent={task:'Add task',idea:'Add idea',habit:'Add habit',number:'Log it'}[addKind];
  if(addKind==='habit'){x.hidden=false;const pre=[['all','Every day',[0,1,2,3,4,5,6]],['wk','Weekdays',[1,2,3,4,5]],['we','Weekends',[0,6]]];
    x.innerHTML=`<div class="lbl">How often</div><div class="opts">${pre.map(([k,l,d])=>`<button class="opt${String(addHb.days)===String(d)?' on':''}" data-akd="${k}">${l}</button>`).join('')}</div>`}
  else if(addKind==='number'){x.hidden=false;const ms=addMetrics();if(!addNum||!ms.some(o=>`${o.p.id}|${o.m.id}`===addNum))addNum=ms.length?`${ms[0].p.id}|${ms[0].m.id}`:null;
    const one=new Set(ms.map(o=>o.p.id)).size===1;
    x.innerHTML=`<div class="lbl">Number</div><div class="opts">${ms.map(o=>{const k=`${o.p.id}|${o.m.id}`,v=mSum(o.m,pPeriod(o.p));return `<button class="opt${addNum===k?' on':''}" data-akn="${k}">${one?'':`${o.p.e?esc(o.p.e)+' ':''}`}${esc(o.m.name)}<small>${fmtN(v)}/${fmtN(o.m.target)}</small></button>`}).join('')}</div>`}
  else {x.hidden=true;x.innerHTML=''}
  $('saveBtn').style.background=addKind==='task'?color(draft?draft.stage:'today'):addKind==='idea'?'var(--done)':addKind==='habit'?'var(--today)':'var(--text)';
  $('saveBtn').style.color=addKind==='number'?'var(--bg)':'';
  $('saveBtn').disabled=!t.value.trim()||(addKind==='number'&&!Number.isFinite(parseFloat(t.value.replace(',','.'))));
}
$('addKinds').addEventListener('click',e=>{const b=e.target.closest('[data-ak]');if(!b)return;addKind=b.dataset.ak;haptic(5);
  if(addKind==='task')drawAdd();drawKinds();$('newTitle').focus()});
$('addExtra').addEventListener('click',e=>{
  const d=e.target.closest('[data-akd]');if(d){addHb.days={all:[0,1,2,3,4,5,6],wk:[1,2,3,4,5],we:[0,6]}[d.dataset.akd];haptic(4);return drawKinds()}
  const n=e.target.closest('[data-akn]');if(n){addNum=n.dataset.akn;haptic(4);drawKinds();$('newTitle').focus()}});
$('newTitle').addEventListener('input',()=>{if(addKind!=='task')drawKinds()});
const _akOpen=$('addBtn').onclick;
$('addBtn').onclick=e=>{addKind='task';addHb={days:[0,1,2,3,4,5,6]};_akOpen(e);drawKinds()};
const _akSave=$('saveBtn').onclick;
$('saveBtn').onclick=()=>{
  if(addKind==='task')return _akSave();
  const v=$('newTitle').value.trim();if(!v)return;
  if(addKind==='idea'){const t={id:newId(),title:v,stage:'backlog',list:null,est:S.cfg.defEst||30,subs:[],notes:'',repeat:'none',inbox:true,created:Date.now()};
    closeSheets();commit(()=>S.tasks.push(t),'Idea saved to Inbox');try{sfx('add')}catch(e){}return}
  if(addKind==='habit'){if(hbAll().length>=HB_MAX){toast(`Up to ${HB_MAX} habits. Fewer, kept daily, beat many.`);return}
    const sp=spaceOf(draft.space)?draft.space:(orderedSpaces()[0]||{}).id,days=[...addHb.days];
    closeSheets();commit(()=>{S.habits=S.habits||[];S.habits.push({id:'h'+newId(),name:v,e:hbIcon(v),space:sp,days,done:{},created:Date.now()})},`${v} added`);try{sfx('add')}catch(e){}return}
  if(addKind==='number'){const n=parseFloat(v.replace(',','.'));if(!Number.isFinite(n)||!addNum)return;const [pid,mid]=addNum.split('|'),p=pById(pid),m=p&&p.metrics.find(x=>x.id===mid);if(!m)return;
    closeSheets();setTimeout(()=>{pLog(p,m,n);const c=mPace(p,m);if(!c.hit)toast(`${m.name}: ${fmtN(c.v)} of ${fmtN(c.t)} ${pPerLabel(p,true)}`)},200)}
};

/* ---------- B · close the day ---------- */
function eveningNow(){const at=+C().hbCiAt;return new Date().getHours()>=(Number.isFinite(at)?at:19)}
function cdCard(){
  if(!C().closeDay||S.cdDone===today()||S.cdSkip===today()||!eveningNow())return '';
  const n=habitsOn()?hbOpenToday().length:0;
  return `<div class="ci-home cd-home"><span class="ci-hi cd-hi">${RH_ICON}</span><span class="ci-ht"><b>Close the day</b><small>${n?`${n} ${n===1?'habit':'habits'} left · `:''}30 seconds</small></span>
    <button class="rv-skip" data-cdlater>Later</button><button class="rv-go" data-cdopen>Start</button></div>`}
/* the evening card: Close the day takes the place of the habits check-in when it's on */
const _cdCi=ciCard;ciCard=function(){return C().closeDay?cdCard():_cdCi()};
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg review-pg cd-pg" id="cdPg" role="dialog" aria-label="Close the day"><div class="ib-in" id="cdIn"></div></div>');
let cdPick=null;
function cdCands(){const sh=t=>shown(t)&&t.stage!=='done';return [...bySpaceOrder(S.tasks.filter(t=>sh(t)&&t.stage==='today')),...bySpaceOrder(S.tasks.filter(t=>sh(t)&&t.stage==='week'))].slice(0,6)}
function openCloseDay(){cdOn=true;cdPick=(cdCands()[0]||{}).id||null;drawCloseDay();$('cdPg').classList.add('on');$('cdPg').scrollTop=0;haptic(6)}
function closeCloseDay(){if(!cdOn)return;cdOn=false;$('cdPg').classList.remove('on')}
function drawCloseDay(){
  const hs=habitsOn()?hbAll().filter(h=>{const s=hbStats(h);return s.due||s.dt}):[],ms=projectsOn()?addMetrics().slice(0,4):[],cs=cdCands();
  $('cdIn').innerHTML=`<div class="set-top"><button class="icon-btn" id="cdBack" aria-label="Close">${BACK_SVG}</button></div>
    <div class="rv-eye">${longDate()}</div><h1 class="rv-h">Close the day.</h1>
    ${hs.length?`<div class="gd-sec"><h2>Habits</h2><span>${hs.filter(h=>hbStats(h).dt).length} of ${hs.length} done</span></div><div class="cd-chips">${hs.map(h=>{const s=hbStats(h);return `<button class="cd-chip${s.dt?' on':''}" data-hbt="${h.id}" aria-pressed="${s.dt}">${h.e?esc(h.e)+' ':''}${esc(h.name)}<span class="cd-ck">${ICK}</span></button>`}).join('')}</div>`:''}
    ${ms.length?`<div class="gd-sec"><h2>Numbers</h2><span>Today</span></div><div class="g-tasks">${ms.map(o=>`<div class="cd-num" data-pjgc="${o.p.id}|${o.m.id}"><span class="g-tx"><b>${esc(o.m.name)}</b><small>${o.p.e?esc(o.p.e)+' ':''}${esc(o.p.name)}</small></span><button data-cdn="${o.p.id}|${o.m.id}|-1" aria-label="Less">−</button><b class="cd-v">${fmtN(mToday(o.m))}</b><button data-cdn="${o.p.id}|${o.m.id}|1" aria-label="More">+</button></div>`).join('')}</div>`:''}
    <div class="gd-sec"><h2>Tomorrow starts with</h2></div>
    ${cs.length?`<div class="g-tasks">${cs.map(t=>`<button class="g-trow cd-pick${cdPick===t.id?' on':''}" data-cdp="${t.id}" aria-pressed="${cdPick===t.id}"><span class="cd-radio"></span><span class="g-tx"><b>${esc(t.title)}</b><small>${esc(listOf(t.list).name)} · ${esc(STAGES[idx(t.stage)].name)}</small></span></button>`).join('')}</div>`
      :`<p class="gd-hint">Nothing planned yet. Add a task for tomorrow and it will be waiting.</p>`}
    <button class="primary gs-next" id="cdGo">Close the day</button>`;
}
function cdFinish(){
  const t=cdPick!=null&&S.tasks.find(x=>x.id===cdPick);
  if(t&&t.stage!=='today'&&!canPut(t.list,'today',t))return;
  closeCloseDay();
  commit(()=>{S.cdDone=today();if(t){if(t.stage!=='today')setStage(t,'today');S.tasks=[t,...S.tasks.filter(x=>x!==t)]}},t?`Day closed. Tomorrow starts with “${t.title}”.`:'Day closed. Rest well.');
  haptic([8,30,12]);
}
$('cdPg').addEventListener('click',e=>{
  if(e.target.closest('#cdBack'))return closeCloseDay();
  if(e.target.closest('#cdGo'))return cdFinish();
  const p=e.target.closest('[data-cdp]');if(p){cdPick=+p.dataset.cdp;haptic(4);return drawCloseDay()}
  const n=e.target.closest('[data-cdn]');if(n){const [pid,mid,d]=n.dataset.cdn.split('|'),pr=pById(pid),m=pr&&pr.metrics.find(x=>x.id===mid);if(m){pLog(pr,m,+d*mStep(m));drawCloseDay()}return}
});
$('cdPg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeCloseDay()}});
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-cdopen],[data-cdlater],[data-hbstart],[data-gstart],[data-pstart]');if(!el)return;
  e.stopPropagation();e.preventDefault();
  if(el.matches('[data-cdopen]'))return openCloseDay();
  if(el.matches('[data-cdlater]')){S.cdSkip=today();save();render();toast('Okay. It’ll be back tomorrow evening.');return}
  if(el.matches('[data-hbstart]'))return hbStartAdd();
  if(el.matches('[data-gstart]')){const [e2,n]=G_STARTERS[+el.dataset.gstart];openSetup();if(gsD){gsD.name=n;gsD.e=e2;gsD.touched=true;drawSetup();$('gsNext').disabled=false}return}
  if(el.matches('[data-pstart]')){openSetupP();const b=$('psPg').querySelector(`[data-pst="${el.dataset.pstart}"]`);if(b)b.click();return}
},true);
/* when the habit chips in Close the day are ticked, redraw the page */
document.addEventListener('click',e=>{if(cdOn&&e.target.closest('#cdPg [data-hbt]'))setTimeout(()=>{if(cdOn)drawCloseDay()},40)});

/* ---------- C · starter picks (Settings → Modes) ---------- */
let hbPicks=new Set();
function hbStarters(){if(hbAll().length)return '';
  return `<div class="st-pick"><b>Start with a few</b><small>Pick up to 3. You can change them any time.</small><div class="st-grid">${HB_STARTERS.map(([e,n],i)=>`<button class="st-c${hbPicks.has(i)?' on':''}" data-hbpick="${i}" aria-pressed="${hbPicks.has(i)}"><em>${e}</em>${n}</button>`).join('')}</div>
    <button class="primary st-go" data-hbstart ${hbPicks.size?'':'disabled'}>${hbPicks.size?`Add ${hbPicks.size} ${hbPicks.size===1?'habit':'habits'}`:'Pick a few'}</button></div>`}
function hbStartAdd(){if(!hbPicks.size)return;const sp=(orderedSpaces()[0]||{}).id;if(!sp)return;const picks=[...hbPicks].map(i=>HB_STARTERS[i]);hbPicks=new Set();
  commit(()=>{S.habits=S.habits||[];picks.forEach(([e,n])=>S.habits.push({id:'h'+newId(),name:n,e,space:sp,days:[0,1,2,3,4,5,6],done:{},created:Date.now()}))},`${picks.length} ${picks.length===1?'habit':'habits'} added`);
  if(settingsOpen())drawSettings()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-hbpick]');if(!b)return;e.stopPropagation();const i=+b.dataset.hbpick;
  if(hbPicks.has(i))hbPicks.delete(i);else if(hbPicks.size<3)hbPicks.add(i);else{toast('Three is a great start');return}haptic(4);drawSettings()},true);
function gStarters(){if(gAll().length||gWon().length)return '';return `<div class="st-pick"><b>Ideas to start</b><small>Tap one to set it up in 30 seconds.</small><div class="st-grid">${G_STARTERS.map(([e,n],i)=>`<button class="st-c" data-gstart="${i}"><em>${e}</em>${n}</button>`).join('')}</div></div>`}
function pStarters(){if(pAll().length||pDone().length)return '';return `<div class="st-pick"><b>Start from</b><small>Ready-made projects you can change.</small><div class="st-grid">${PJ_TPL.map((t,i)=>`<button class="st-c" data-pstart="${i}"><em>${t.e}</em>${esc(t.name)}</button>`).join('')}</div></div>`}

/* ---------- D · moments ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="mo-pg" id="moPg" role="dialog" aria-label="Milestone"></div>');
function showMoment(o){
  if(C().moments===false)return;
  moOn=true;const el=$('moPg');
  el.innerHTML=`<div class="mo-in">${hbSun(7,true,'mo-sun')}<span class="mo-eye">${o.eye}</span><b class="mo-big">${o.big}</b><span class="mo-sub">${o.sub}</span><button class="primary mo-go" id="moGo">${o.btn||'Keep going'}</button></div>`;
  requestAnimationFrame(()=>el.classList.add('on'));haptic([10,60,10,60,30]);setTimeout(()=>{if(moOn&&$('moGo'))$('moGo').focus()},500);
}
function closeMoment(){if(!moOn)return;moOn=false;$('moPg').classList.remove('on')}
$('moPg').addEventListener('click',e=>{if(e.target.closest('#moGo')||!e.target.closest('.mo-in'))closeMoment()});
$('moPg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeMoment()}});
const MO_DAYS={7:['7 days.','Every day this week. The sun is fully up.'],30:['30 days.','A whole month. This is who you are now.'],100:['100 days.','One hundred days in a row. Quietly remarkable.'],365:['A year.','Every single day. Take a moment for this one.']};
const _moToggle=hbToggle;
hbToggle=function(id,force){const h=hbById(id),was=h&&!!(h.done||{})[today()];_moToggle(id,force);
  try{if(!h||was||!(h.done||{})[today()])return;const s=hbStats(h),k=`${today()}:${s.st}`;if(!MO_DAYS[s.st]||h.mo===k)return;h.mo=k;save();
    setTimeout(()=>showMoment({eye:hbName(h),big:MO_DAYS[s.st][0],sub:MO_DAYS[s.st][1]}),ciOn?700:450)}catch(err){}};
const _moWin=gSetWin;
gSetWin=function(g,on){const was=!!g.done;_moWin(g,on);try{if(on&&!was&&g.done)setTimeout(()=>showMoment({eye:gName(g),big:'Achieved.',sub:g.why?esc(g.why):'Every step got you here.',btn:'Done'}),900)}catch(err){}};

/* ---------- Settings → Modes: Everyday section and starter picks ---------- */
const _edModes=modesPage;
modesPage=function(){let h=_edModes();
  const c=C(),ev=c.closeDay||(habitsOn()&&c.hbCi!==false);
  const ins=(after,html)=>{const i=h.indexOf(after);if(i<0||!html)return;const j=i+after.length;h=h.slice(0,j)+html+h.slice(j)};
  if(habitsOn())ins('<h3>Habits</h3>',hbStarters());
  if(goalsOn())ins('<h3>Goals</h3>',gStarters());
  if(projectsOn())ins('<h3>Projects</h3>',pStarters());
  return h+`<div class="set-sec"><h3>Everyday</h3>${row('Close the day',tg('closeDay'),'An evening card: last habits, today’s numbers, tomorrow’s first task')}
    ${ev?row('Evening starts at',`<div class="segc">${[17,19,21].map(x=>sOpt('hbCiAt',x,`${x-12} pm`)).join('')}</div>`):''}
    ${row('Moments',tg('moments'),'A calm full-screen moment for a 7-day sun or a goal reached')}</div>`};
