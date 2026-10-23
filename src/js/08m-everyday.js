/* ---------- Everyday touches (work with any mode, and with none) ----------
   A · One + for everything: the add sheet offers Task · Note · Habit · Goal. Each kind appears only when its
       feature is on (Inbox, Habits, Goals), so with everything off it is just "Add task", exactly as before.
   B · Close the day: an optional evening card (Settings → Modes → Everyday). One short page: tick the last habits,
       pick the task tomorrow starts with.
   C · Starter picks: a mode that is turned on never leaves you on an empty page; Settings → Modes offers a few
       ready-made habits and goals to start from.
   D · Moments: a calm full-screen moment when a habit's sun has been up 7, 30, 100 or 365 days in a row,
       or a goal is achieved. Rare on purpose. */
var moOn=false,cdOn=false,addKind='task',addKindNext=null;
var HB_STARTERS=[['💧','Drink water'],['🏃','Move 30 minutes'],['📖','Read 20 pages'],['🧘','Meditate'],['📵','Phone away at night'],['🛏️','Bed by 11']];
var G_STARTERS=[['🏃','Run a half marathon'],['📚','Read 12 books'],['💰','Save an emergency fund'],['🧠','Learn Spanish basics']];

/* ---------- A · one + for everything ---------- */
/* the kinds row only appears when a mode adds something; with modes off it is just "Add task", as before */
function addKinds(){const k=[['task','Task']];
  if(typeof inboxOn==='function'&&inboxOn())k.push(['note','Note']);if(habitsOn())k.push(['habit','Habit']);if(goalsOn())k.push(['goal','Goal']);return k}
const AK_IC={task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  note:I_NOTE2,habit:RH_ICON,goal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/></svg>'};
let addHb={days:[0,1,2,3,4,5,6],space:null},addG={m:3,space:null},addNote={pin:false};
document.querySelector('#addSheet .grab').insertAdjacentHTML('afterend','<div class="ak-row" id="addKinds" role="tablist" aria-label="What to add" hidden></div>');
$('newTitle').insertAdjacentHTML('afterend','<div class="ak-extra" id="addExtra" hidden></div>');
/* a habit or a goal can sit in a space, but doesn't have to */
const akSpaces=(cur,attr)=>S.spaces.length?`<div class="lbl">Space <span class="ak-opt">Optional</span></div><div class="opts row-scroll"><button class="opt${!cur?' on':''}" data-${attr}="">No space</button>${orderedSpaces().map(sp=>`<button class="opt sp-opt${cur===sp.id?' on':''}" data-${attr}="${sp.id}">${spMini(sp)}${esc(sp.name)}</button>`).join('')}</div>`:'';
/* typing "#work" or "30m" in a new task picks that space (or list) and time; the words come out of the title */
function akTag(w){const k=srchNorm(w),n=x=>srchNorm(x.name).replace(/\s+/g,'');
  const ls=inSpaceMode()?S.lists.filter(l=>l.space===S.space):S.lists,sps=inSpaceMode()?[]:orderedSpaces();
  const hit=a=>a.find(x=>n(x)===k)||a.find(x=>n(x).startsWith(k));
  const sp=hit(sps);if(sp){const l=S.lists.filter(x=>x.space===sp.id),d=S.cfg.defList;return {space:sp.id,list:(l.find(x=>x.id===d)||l[0]||{}).id}}
  const l=hit(ls);return l?{space:l.space,list:l.id}:null}
function akParse(v){const out={};let t=String(v||'');
  t=t.replace(/(^|\s)(\d{1,3}(?:[.,]\d)?)\s?(m|min|mins|h|hr|hrs)(?=\s|$)/i,(all,pre,n,u)=>{const x=parseFloat(n.replace(',','.')),m=Math.round(/^h/i.test(u)?x*60:x);if(m>0&&m<=600){out.est=m;return pre}return all});
  t=t.replace(/(^|\s)#([^\s#]+)(?=\s|$)/,(all,pre,w)=>{const h=akTag(w);if(h&&h.list){Object.assign(out,h);return pre}return all});
  out.title=t.replace(/\s{2,}/g,' ').trim();return out}
let akBase=null; // the picks before anything was typed, so deleting "#work" puts them back
function akApply(){if(addKind!=='task'||!draft)return;if(!akBase)akBase={space:draft.space,list:draft.list,est:draft.est};
  const p=akParse($('newTitle').value);Object.assign(draft,akBase,p.list?{space:p.space,list:p.list}:{},p.est?{est:p.est}:{});drawAdd();$('saveBtn').disabled=!p.title}
function drawKinds(){
  const ks=addKinds(),row=$('addKinds');if(!ks.some(k=>k[0]===addKind))addKind='task';
  row.hidden=ks.length<2;row.innerHTML=ks.map(([k,l])=>`<button role="tab" data-ak="${k}" class="${addKind===k?'on':''}" aria-selected="${addKind===k}">${AK_IC[k]}${l}</button>`).join('');
  $('addSheet').dataset.kind=addKind;
  const t=$('newTitle'),x=$('addExtra');
  t.placeholder={task:'What needs doing?',note:'',habit:'New habit, e.g. Read 10 pages',goal:'What do you want to achieve?'}[addKind];
  $('saveBtn').textContent={task:'Add task',note:'Save note',habit:'Add habit',goal:'Next: milestones'}[addKind];
  x.hidden=false;
  if(addKind==='task'){const multi=inSpaceMode()?S.lists.filter(l=>l.space===S.space).length>1:S.spaces.length>1;
    x.innerHTML=`<p class="ak-tip">Tip: type ${multi?`<b>#${inSpaceMode()?'list':'space'}</b> or `:''}<b>30m</b> and it’s set for you.</p>`}
  else if(addKind==='note'){const a=$('akNote'),keep=a?a.value:'';
    x.innerHTML=`<textarea class="field ak-note" id="akNote" rows="5" placeholder="Write anything. The first line becomes the title." aria-label="Note"></textarea>
      <div class="opts ak-nrow"><button class="opt${addNote.pin?' on':''}" data-akpin aria-pressed="${addNote.pin}">${I_PIN}Pin to top</button><span class="ak-where">Saved to Inbox › Notes</span></div>`;
    $('akNote').value=keep}
  else if(addKind==='habit'){const pre=[['all','Every day',[0,1,2,3,4,5,6]],['wk','Weekdays',[1,2,3,4,5]],['we','Weekends',[0,6]]];
    x.innerHTML=`<div class="lbl">How often</div><div class="opts">${pre.map(([k,l,d])=>`<button class="opt${String(addHb.days)===String(d)?' on':''}" data-akd="${k}">${l}</button>`).join('')}</div>${akSpaces(addHb.space,'akhs')}`}
  else if(addKind==='goal')x.innerHTML=`<div class="lbl">By when</div><div class="opts">${[1,3,6,12].map(m=>`<button class="opt${addG.m===m?' on':''}" data-akgm="${m}">${m===12?'1 year':`${m} ${m===1?'month':'months'}`}</button>`).join('')}</div>
      ${akSpaces(addG.space,'akgs')}<p class="ak-tip">Next you’ll add a few milestones.</p>`;
  const sb=$('saveBtn'),ink=addKind==='note'||addKind==='goal';
  sb.style.background=addKind==='task'?color(draft?draft.stage:'today'):ink?'var(--text)':'var(--today)';sb.style.color=ink?'var(--bg)':'';
  sb.disabled=!(addKind==='note'?($('akNote').value.trim()):t.value.trim());
}
$('addKinds').addEventListener('click',e=>{const b=e.target.closest('[data-ak]');if(!b)return;const was=addKind;addKind=b.dataset.ak;haptic(5);
  /* what's typed comes along when you switch between a one-line kind and a note */
  const a=$('akNote'),i=$('newTitle');if(addKind==='note'&&was!=='note'&&a&&!a.value.trim()&&i.value.trim())a.value=i.value;else if(was==='note'&&addKind!=='note'&&a&&!i.value.trim()&&a.value.trim())i.value=nbTitle(a.value);
  if(addKind==='task'){drawAdd();akApply()}drawKinds();(addKind==='note'?$('akNote'):$('newTitle')).focus()});
$('addExtra').addEventListener('click',e=>{
  const d=e.target.closest('[data-akd]');if(d){addHb.days={all:[0,1,2,3,4,5,6],wk:[1,2,3,4,5],we:[0,6]}[d.dataset.akd];haptic(4);return drawKinds()}
  const hs=e.target.closest('[data-akhs]');if(hs){addHb.space=hs.dataset.akhs||null;haptic(4);return drawKinds()}
  const gs=e.target.closest('[data-akgs]');if(gs){addG.space=gs.dataset.akgs||null;haptic(4);return drawKinds()}
  const gm=e.target.closest('[data-akgm]');if(gm){addG.m=+gm.dataset.akgm;haptic(4);return drawKinds()}
  if(e.target.closest('[data-akpin]')){addNote.pin=!addNote.pin;haptic(4);return drawKinds()}});
$('addExtra').addEventListener('input',e=>{if(e.target.id==='akNote')$('saveBtn').disabled=!e.target.value.trim()});
$('addExtra').addEventListener('keydown',e=>{if(e.target.id==='akNote'&&e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&e.target.value.trim()){e.preventDefault();$('saveBtn').click()}});
$('newTitle').addEventListener('input',()=>{if(addKind==='task')akApply();else drawKinds()});
const _akOpen=$('addBtn').onclick;
$('addBtn').onclick=e=>{addKind=addKindNext||'task';addKindNext=null;akBase=null;const sp=inSpaceMode()&&spaceOf(S.space)?S.space:null; // inside a space, a new habit or goal starts there
  addHb={days:[0,1,2,3,4,5,6],space:sp};addG={m:3,space:sp};addNote={pin:false};const a=$('akNote');if(a)a.value='';_akOpen(e);drawKinds()};
/* picking a space, list or time by hand makes it the new starting point for what's typed */
['optSpace','optList','optEst'].forEach(id=>$(id).addEventListener('click',()=>{if(draft)akBase={space:draft.space,list:draft.list,est:draft.est}}));
const _akSave=$('saveBtn').onclick;
$('saveBtn').onclick=()=>{
  if(addKind==='task'){const i=$('newTitle'),p=akParse(i.value);if(!p.title)return;i.value=p.title;return _akSave()}
  if(addKind==='note'){const v=($('akNote').value||'').trim();if(!v)return;
    const t={id:newId(),title:nbTitle(v),stage:'backlog',list:null,est:0,subs:[],notes:v,repeat:'none',inbox:true,note:true,created:Date.now(),...(addNote.pin?{pin:true}:{})};
    closeSheets();commit(()=>S.tasks.push(t),'Note saved to Inbox');try{sfx('add')}catch(e){}return}
  const v=$('newTitle').value.trim();if(!v)return;
  if(addKind==='habit'){if(hbAll().length>=HB_MAX){toast(`Up to ${HB_MAX} habits. Fewer, kept daily, beat many.`);return}
    const sp=addHb.space&&spaceOf(addHb.space)?addHb.space:null,days=[...addHb.days];
    closeSheets();commit(()=>{S.habits=S.habits||[];S.habits.push({id:'h'+newId(),name:v,e:hbIcon(v),space:sp,days,done:{},created:Date.now()})},`${v} added`);try{sfx('add')}catch(e){}return}
  if(addKind==='goal'){if(gAll().length>=G_MAX){toast(`Up to ${G_MAX} goals at once. Finish one to start another.`);return}
    const g={...addG};closeSheets();
    /* the rest of the goal (milestones, north star) is the usual setup, already on its last step */
    setTimeout(()=>{openSetup(g.space);if(!gsOn)return;Object.assign(gsD,{name:v,e:gIcon(v),pick:g.m,due:gPlus(g.m)});gsStep(3)},260)}
};

/* ---------- B · close the day ---------- */
function eveningNow(){const at=+C().hbCiAt;return new Date().getHours()>=(Number.isFinite(at)?at:19)}
function cdCard(){
  if(!C().closeDay||S.cdDone===today()||S.cdSkip===today()||!eveningNow())return '';
  const n=habitsOn()?hbOpenToday().length:0;
  return `<div class="ci-home cd-home"><span class="ci-hi cd-hi">${RH_ICON}</span><span class="ci-ht"><b>Close the day</b><small>${n?`${n} ${n===1?'habit':'habits'} left`:'Takes 30 seconds'}</small></span>
    <button class="rv-skip" data-cdlater>Later</button><button class="rv-go" data-cdopen>Start</button></div>`}
/* the evening card: Close the day takes the place of the habits check-in when it's on */
const _cdCi=ciCard;ciCard=function(){return C().closeDay?cdCard():_cdCi()};
/* Home shows one nudge at a time, the most timely first: tonight's check-in, then the weekly review, then the backup reminder */
function homeNudge(){return ciCard()||reviewCard()||backupCard()}
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg review-pg cd-pg" id="cdPg" role="dialog" aria-label="Close the day"><div class="ib-in" id="cdIn"></div></div>');
let cdPick=null;
function cdCands(){const sh=t=>shown(t)&&t.stage!=='done';return [...bySpaceOrder(S.tasks.filter(t=>sh(t)&&t.stage==='today')),...bySpaceOrder(S.tasks.filter(t=>sh(t)&&t.stage==='week'))].slice(0,6)}
function openCloseDay(){cdOn=true;cdPick=(cdCands()[0]||{}).id||null;drawCloseDay();$('cdPg').classList.add('on');$('cdPg').scrollTop=0;haptic(6)}
function closeCloseDay(){if(!cdOn)return;cdOn=false;$('cdPg').classList.remove('on')}
function drawCloseDay(){
  const hs=habitsOn()?hbAll().filter(h=>{const s=hbStats(h);return s.due||s.dt}):[],cs=cdCands();
  $('cdIn').innerHTML=`<div class="set-top"><button class="icon-btn" id="cdBack" aria-label="Close">${BACK_SVG}</button></div>
    <div class="rv-eye">${longDate()}</div><h1 class="rv-h">Close the day.</h1>
    ${hs.length?`<div class="gd-sec"><h2>Habits</h2><span>${hs.filter(h=>hbStats(h).dt).length} of ${hs.length} done</span></div><div class="cd-chips">${hs.map(h=>{const s=hbStats(h);return `<button class="cd-chip${s.dt?' on':''}" data-hbt="${h.id}" aria-pressed="${s.dt}">${h.e?esc(h.e)+' ':''}${esc(h.name)}<span class="cd-ck">${ICK}</span></button>`}).join('')}</div>`:''}
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
});
$('cdPg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeCloseDay()}});
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-cdopen],[data-cdlater],[data-hbstart],[data-gstart]');if(!el)return;
  e.stopPropagation();e.preventDefault();
  if(el.matches('[data-cdopen]'))return openCloseDay();
  if(el.matches('[data-cdlater]')){S.cdSkip=today();save();render();toast('Okay. It’ll be back tomorrow evening.');return}
  if(el.matches('[data-hbstart]'))return hbStartAdd();
  if(el.matches('[data-gstart]')){const [e2,n]=G_STARTERS[+el.dataset.gstart];openSetup();if(gsD){gsD.name=n;gsD.e=e2;gsD.touched=true;drawSetup();$('gsNext').disabled=false}return}
},true);
/* when the habit chips in Close the day are ticked, redraw the page */
document.addEventListener('click',e=>{if(cdOn&&e.target.closest('#cdPg [data-hbt]'))setTimeout(()=>{if(cdOn)drawCloseDay()},40)});

/* ---------- C · starter picks (Settings → Modes) ---------- */
let hbPicks=new Set();
function hbStarters(){if(hbAll().length)return '';
  return `<div class="st-pick"><b>Start with a few</b><small>Pick up to 3. You can change them any time.</small><div class="st-grid">${HB_STARTERS.map(([e,n],i)=>`<button class="st-c${hbPicks.has(i)?' on':''}" data-hbpick="${i}" aria-pressed="${hbPicks.has(i)}"><em>${e}</em>${n}</button>`).join('')}</div>
    <button class="primary st-go" data-hbstart ${hbPicks.size?'':'disabled'}>${hbPicks.size?`Add ${hbPicks.size} ${hbPicks.size===1?'habit':'habits'}`:'Pick a few'}</button></div>`}
function hbStartAdd(){if(!hbPicks.size)return;const sp=null;const picks=[...hbPicks].map(i=>HB_STARTERS[i]);hbPicks=new Set();
  commit(()=>{S.habits=S.habits||[];picks.forEach(([e,n])=>S.habits.push({id:'h'+newId(),name:n,e,space:sp,days:[0,1,2,3,4,5,6],done:{},created:Date.now()}))},`${picks.length} ${picks.length===1?'habit':'habits'} added`);
  if(settingsOpen())drawSettings()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-hbpick]');if(!b)return;e.stopPropagation();const i=+b.dataset.hbpick;
  if(hbPicks.has(i))hbPicks.delete(i);else if(hbPicks.size<3)hbPicks.add(i);else{toast('Three is a great start');return}haptic(4);drawSettings()},true);
function gStarters(){if(gAll().length||gWon().length)return '';return `<div class="st-pick"><b>Ideas to start</b><small>Tap one to set it up in 30 seconds.</small><div class="st-grid">${G_STARTERS.map(([e,n],i)=>`<button class="st-c" data-gstart="${i}"><em>${e}</em>${n}</button>`).join('')}</div></div>`}

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

/* ---------- Settings → Modes: one card per mode; turning a mode on unfolds its own options inside its card ---------- */
var mdJust=null;
document.addEventListener('click',e=>{const t=e.target.closest('#setIn .md-card [data-tg]');if(t&&['habits','goals','closeDay'].includes(t.dataset.tg)&&!C()[t.dataset.tg])mdJust=t.dataset.tg},true);
const MD_GOAL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
modesPage=function(){
  const c=C(),hOn=habitsOn(),gOn=goalsOn(),n=hbAll().length,gn=gAll().length;
  const card=(k,ic,name,sub,on,body)=>`<div class="md-card${on?' on':''}" data-md="${k}"><div class="md-head"><span class="md-ic">${ic}</span><span class="md-t"><b>${name}</b><small>${sub}</small></span>${tg(k)}</div>
    ${on?`<div class="md-body${mdJust===k?' in':''}">${body}</div>`:''}</div>`;
  const link=(page,label,hint)=>`<button class="link-row md-link" data-page="${page}">${label}<span class="hint">${hint}${CHEV}</span></button>`;
  const ev=c.closeDay||(hOn&&c.hbCi!==false);
  const html=`<p class="sub-p">Extra ways to use Windaday. Turn a mode off and it disappears everywhere. Your data stays safe and comes back when you turn it on again.</p>
  <div class="md-list">
  ${card('habits',RH_ICON,'Habits','Small daily wins with gentle sunrise streaks',hOn,
    `${hbStarters()}${link('habits','Your habits',n?`${n} of ${HB_MAX}`:'None yet')}
     ${row('Page view',`<div class="segc">${sOpt('hbView','grid','Week grid')}${sOpt('hbView','sun','Sunrise')}</div>`)}
     ${row('Evening check-in',tg('hbCi'),c.closeDay?'Close the day covers this while it’s on':'A short card on Home when habits are left')}
     ${row('On Home',tg('wHabits'),'A habits card on Home. Tap to tick.')}
     ${c.wHabits?row('Widget style',`<div class="segc">${sOpt('hwStyle','auto','Default')}${sOpt('hwStyle','one','One at a time')}${sOpt('hwStyle','tiles','Big tiles')}${sOpt('hwStyle','pills','Pills')}</div>`,'Default: one at a time on phones, big tiles on computers'):''}`)}
  ${card('goals',MD_GOAL,'Goals','Big outcomes, broken into milestones you can climb',gOn,
    `${gStarters()}${link('goals','Your goals',gn?`${gn} of ${G_MAX} active`:'None yet')}
     ${row('Opens as',`<div class="segc">${sOpt('gView','climb','The climb')}${sOpt('gView','path','Path')}${sOpt('gView','poster','Poster')}</div>`)}
     ${row('North star on Home',tg('wStar'),'Your starred goal under the Today card')}`)}
  </div>
  <div class="set-sec"><h3>Everyday</h3><div class="md-list">
  ${card('closeDay',RH_ICON.replace('M24 9v7','M24 9v0'),'Close the day','Last habits and tomorrow’s first task',!!c.closeDay,'')}
  ${ev?`<div class="md-card md-plain">${row('Evening starts at',`<div class="segc">${[17,19,21].map(x=>sOpt('hbCiAt',x,`${x-12} pm`)).join('')}</div>`,'When evening cards appear on Home')}</div>`:''}
  ${card('moments','<span class="md-emo">☀️</span>','Moments','A calm full-screen moment for a 7-day sun or a goal reached',false,'')}
  </div></div>`;
  mdJust=null;return html};
