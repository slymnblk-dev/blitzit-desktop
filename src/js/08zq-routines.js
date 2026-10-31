/* ---------- Routines (optional mode, Settings → Modes) ----------
   Small rituals you run step by step, like a playlist: Morning, Workday shutdown, Evening wind-down.
   S.routines: [{id, name, e, steps:[{id, t, m}], days:[0–6], at:'HH:MM' or '', log:{dayKey:1}, created}] — synced, backed up, undoable.
   Phones: a Routines tab. Computers: "Routines" under Modes in the sidebar, with the list on the left and the steps on the right.
   Start one and it plays full screen: one step at a time, a gentle timer, Done · next step. Finishing it counts toward its streak and lands in Wins. */
var rtOn=false,rtSel=null,rtEdit=false;
function routinesOn(){return !!(S.cfg&&S.cfg.routines)}
var RT_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M4 12h10M4 17h7"/><path d="M17 15l4 2.5-4 2.5z" fill="currentColor"/></svg>';
const RT_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const RT_SKIP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 6v12l9-6zM16 6h2.5v12H16z"/></svg>';
const RT_TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const RT_MINS=[1,2,3,5,10,15,20,30,45,60];
const RT_TPL=[
  {name:'Morning',e:'☀️',at:'07:00',days:[1,2,3,4,5],steps:[['Drink a glass of water',1],['Stretch',5],['Make the bed',2],['Write one journal line',3],['Plan the day',10]]},
  {name:'Workday shutdown',e:'💼',at:'17:30',days:[1,2,3,4,5],steps:[['Clear the inbox',3],['Check tomorrow',3],['Write down loose ends',2],['Tidy the desk',2]]},
  {name:'Evening wind-down',e:'🌙',at:'21:30',days:[0,1,2,3,4,5,6],steps:[['Phone on the charger',1],['Tidy up',5],['Lay out tomorrow',3],['Read',10],['Lights down',1]]}];

/* ---------- helpers ---------- */
const rtAll=()=>S.routines||(S.routines=[]);
const rtById=id=>rtAll().find(r=>r.id===id);
const rtMins=r=>r.steps.reduce((a,x)=>a+(+x.m||0),0);
const rtDue=(r,d)=>r.days.includes((d||new Date()).getDay());
const rtDone=r=>!!(r.log||{})[today()];
const rtNowHM=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
/* streak: due days in a row, done (rest days don't break it; today only counts once done) */
function rtStreak(r){const log=r.log||{},x=new Date();x.setHours(12,0,0,0);let n=0;
  for(let i=0;i<1100;i++){const k=dkey(x);if(log[k])n++;else if(rtDue(r,x)&&i>0)break;else if(r.created&&k<dkey(r.created))break;x.setDate(x.getDate()-1)}return n}
function rtDays(r){const d=[...r.days].sort().join('');
  if(d==='0123456')return 'Every day';if(d==='12345')return 'Weekdays';if(d==='06')return 'Weekends';if(!d)return 'No days';
  return [1,2,3,4,5,6,0].filter(i=>r.days.includes(i)).map(i=>new Date(2024,0,7+i).toLocaleDateString(undefined,{weekday:'short'})).join(', ')}
const rtWhen=r=>rtDays(r)+(r.at?' · '+r.at:'');
const rtMeta=r=>[`${r.steps.length} ${r.steps.length===1?'step':'steps'}`,fmt(rtMins(r)),...(rtStreak(r)>1?[`${rtStreak(r)}-day streak`]:[])].join(' · ');
/* what's up next today: due, not done yet, the earliest time first (routines without a time last) */
function rtNext(){return rtAll().filter(r=>rtDue(r)&&!rtDone(r)&&r.steps.length).sort((a,b)=>(a.at||'99')<(b.at||'99')?-1:(a.at||'99')>(b.at||'99')?1:0)[0]||null}
const rtLeftToday=()=>rtAll().filter(r=>rtDue(r)&&!rtDone(r)&&r.steps.length).length;
function rtFromTpl(tp){return {id:newId(),name:tp.name,e:tp.e,at:tp.at,days:[...tp.days],steps:tp.steps.map(([t,m])=>({id:newId(),t,m})),log:{},created:Date.now()}}
const rtEsc=s=>esc(s).replace(/'/g,'&#39;');
/* "counts as a habit": the routine has its own habit, ticked when you finish the routine */
function rtHabit(r,any){S.habits=S.habits||[];const h=r.habit&&S.habits.find(x=>x.id===r.habit);return h&&(any||hbAll().includes(h))?h:null}
/* Home: the next routine as a gentle card, from 30 minutes before its time (any time of day if it has none) */
let rtLater={};
function rtHomeCard(){if(!routinesOn()||C().rtHome===false)return '';const r=rtNext();if(!r||rtLater[r.id]===today())return '';
  const now=rtNowHM(),soon=!r.at||(()=>{const [h,m]=r.at.split(':').map(Number),d=new Date();d.setHours(h,m-30,0,0);return Date.now()>=d.getTime()})();if(!soon)return '';
  return `<div class="ci-home rt-home"><span class="ci-hi">${RT_ICON}</span><span class="ci-ht"><b>${r.e?esc(r.e)+' ':''}${esc(r.name)}</b><small>${r.at&&r.at>now?`At ${r.at} · `:''}${r.steps.length} ${r.steps.length===1?'step':'steps'} · ${fmt(rtMins(r))}</small></span>
    <button class="rv-skip" data-rthlater="${r.id}">Later</button><button class="rv-go" data-rthstart="${r.id}">Start</button></div>`}
const _rtCi=ciCard;ciCard=function(){return rtHomeCard()||_rtCi()};
document.addEventListener('click',e=>{const s=e.target.closest('[data-rthstart]'),l=e.target.closest('[data-rthlater]');if(!s&&!l)return;e.preventDefault();e.stopPropagation();
  if(s)return rtPlayOpen(+s.dataset.rthstart);rtLater[+l.dataset.rthlater]=today();haptic(4);render()},true);

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg rt-pg" id="routinesPg" role="region" aria-label="Routines"><div class="ib-in" id="rtIn"></div></div>');
const rtDesk=()=>matchMedia('(min-width:1100px)').matches;
function rtCard(r,next){const done=rtDone(r);
  return `<div class="rt-card${rtSel===r.id&&rtDesk()?' sel':''}${done?' done':''}" data-rtopen="${r.id}">
    <button class="rt-ct" data-rtopen="${r.id}"><b>${r.e?`<i class="rt-e">${esc(r.e)}</i>`:''}${esc(r.name)}</b><small>${done?'Done today · ':''}${esc(rtMeta(r))}${r.at||r.days.length<7?' · '+esc(rtWhen(r).toLowerCase()):''}</small></button>
    ${r.steps.length?`<button class="rt-go" data-rtstart="${r.id}" aria-label="Start ${rtEsc(r.name)}">${done?'Again':'Start'}</button>`:''}</div>`}
function rtNextCard(r){const now=r.at&&r.at<=rtNowHM();
  return `<div class="rt-next" data-rtopen="${r.id}"><div class="rt-nt"><div class="rt-nx"><span class="pg-eye rt-ne">${now?'Now':r.at?'Next':'Today'}${r.at?' · '+esc(rtWhen(r).toLowerCase()):''}</span>
      <b class="rt-nn">${r.e?`<i class="rt-e">${esc(r.e)}</i>`:''}${esc(r.name)}</b><small>${esc(rtMeta(r))}</small></div>
      <button class="rt-start" data-rtstart="${r.id}" aria-label="Start ${rtEsc(r.name)}">Start</button></div>
    <div class="rt-chips">${r.steps.map(x=>`<span>${esc(x.t)}${x.m?` <i>${fmt(x.m)}</i>`:''}</span>`).join('')}</div></div>`}
function rtListHTML(){const rs=rtAll(),nx=rtNext();
  if(!rs.length)return `<div class="rt-empty"><span class="pg-eye">Start from one of these</span><div class="rt-tpls">${RT_TPL.map((tp,i)=>`<button class="rt-tpl" data-rttpl="${i}"><span class="rt-te">${tp.e}</span><span class="rt-tt"><b>${tp.name}</b><small>${tp.steps.length} steps · ${fmt(tp.steps.reduce((a,s)=>a+s[1],0))} · ${tp.at}</small></span><span class="rt-ta">${PLUS_S}</span></button>`).join('')}</div>
    <button class="wn-add rt-new" data-rtnew><span class="wn-pl">${PLUS_S}</span>Or build your own</button></div>`;
  const later=rs.filter(r=>r!==nx&&rtDue(r)&&!rtDone(r)),rest=rs.filter(r=>r!==nx&&!later.includes(r));
  const grp=(lbl,arr)=>arr.length?`<span class="pg-eye rt-lbl">${lbl}</span><div class="rt-cards">${arr.map(r=>rtCard(r)).join('')}</div>`:'';
  return `${nx?rtNextCard(nx):`<div class="rt-calm"><b>${rs.some(r=>rtDue(r))?'All done for today':'Nothing due today'}</b><small>${rs.some(r=>rtDue(r))?'Every routine for today is finished. Nice.':'Your routines rest today.'}</small></div>`}
    ${grp(nx?'Later today':'Today',later)}${grp(later.length||nx?'Other routines':'Your routines',rest)}
    <button class="wn-add rt-new" data-rtnew><span class="wn-pl">${PLUS_S}</span>New routine</button>`}
function rtEditorHTML(r){if(!r)return `<div class="rt-ed rt-ed0"><p class="wn-empty">Pick a routine to see its steps.</p></div>`;
  const opts=v=>[0,...RT_MINS].map(m=>`<option value="${m}"${+v===m?' selected':''}>${m?fmt(m):'No timer'}</option>`).join('');
  return `<div class="rt-ed" data-rted="${r.id}">
    <div class="rt-eh"><div class="rt-ehl"><span class="pg-eye">${esc(rtWhen(r))} · ${fmt(rtMins(r))}</span>
      <input class="rt-name" id="rtName" value="${rtEsc(r.name)}" maxlength="40" aria-label="Routine name" autocomplete="off"></div>
      ${MORE(`data-rtm="${r.id}"`,'More for this routine')}</div>
    <div class="rt-steps">${r.steps.map((x,i)=>`<div class="rt-step" data-rtstep="${x.id}"><span class="rt-n">${i+1}</span>
      <input class="rt-st" value="${rtEsc(x.t)}" maxlength="60" aria-label="Step ${i+1}" data-rtst="${x.id}" autocomplete="off">
      <label class="rt-min"><span>${x.m?fmt(x.m):'No timer'}</span><select data-rtmin="${x.id}" aria-label="Time for step ${i+1}">${opts(x.m)}</select></label>
      ${MORE(`data-rtsm="${x.id}"`,'More for this step')}</div>`).join('')}
      <div class="rt-step rt-addst"><span class="wn-pl">${PLUS_S}</span><input id="rtNewStep" placeholder="Add a step" maxlength="60" enterkeyhint="done" autocomplete="off" aria-label="Add a step"></div></div>
    <div class="rt-set"><span class="pg-eye">Days</span><div class="rt-days">${[1,2,3,4,5,6,0].map(d=>`<button class="rt-day${r.days.includes(d)?' on':''}" data-rtday="${d}" aria-pressed="${r.days.includes(d)}">${new Date(2024,0,7+d).toLocaleDateString(undefined,{weekday:'narrow'})}</button>`).join('')}</div></div>
    <div class="rt-set"><span class="pg-eye">Time</span><div class="rt-time"><input type="time" id="rtAt" value="${r.at||''}" aria-label="Time of day">${r.at?`<button class="rt-clr" data-rtat>Any time</button>`:''}</div></div>
    <div class="rt-set"><span class="pg-eye">Reminder</span>${r.at?`<div class="segc rt-seg"><button data-rtrem="0" class="${r.rem?'':'on'}" aria-pressed="${!r.rem}">Off</button><button data-rtrem="1" class="${r.rem?'on':''}" aria-pressed="${!!r.rem}">At ${r.at}</button></div>`:'<small class="rt-hint">Pick a time first</small>'}</div>
    ${typeof habitsOn==='function'&&habitsOn()?`<div class="rt-set"><span class="pg-eye">Counts as a habit</span><div class="segc rt-seg"><button data-rthab="0" class="${rtHabit(r)?'':'on'}" aria-pressed="${!rtHabit(r)}">No</button><button data-rthab="1" class="${rtHabit(r)?'on':''}" aria-pressed="${!!rtHabit(r)}">Yes</button></div></div>`:''}
    ${r.steps.length?`<button class="primary rt-play" data-rtstart="${r.id}">${RT_PLAY}Start routine</button>`:''}</div>`}
function drawRoutines(){if(!rtOn)return;const y=$('routinesPg').scrollTop,rs=rtAll(),desk=rtDesk();
  if(rtSel&&!rtById(rtSel))rtSel=null;if(desk&&!rtSel&&rs.length)rtSel=(rtNext()||rs[0]).id;
  const nx=rtNext(),left=rtLeftToday();
  const sum=!rs.length?'Small rituals that run themselves':nx?`<b>${esc(nx.name)}</b> is up next · <b>${fmt(rtMins(nx))}</b>`:left?'':'All done for today';
  const editing=!desk&&rtEdit&&rtById(rtSel);
  $('rtIn').innerHTML=`<div class="set-top ib-top${editing?' rt-top-on':''}"><button class="icon-btn" id="rtBack" aria-label="Back">${BACK_SVG}</button></div>
    ${editing?rtEditorHTML(rtById(rtSel)):`<div class="rt-head"><span class="pg-eye">${new Date().toLocaleDateString(undefined,{weekday:'long'})} · ${rtNowHM()}</span><h1 class="ib-h wn-h">Routines</h1><div class="pg-sum">${sum}</div></div>
    <div class="rt-grid${rs.length?'':' rt-one'}"><div class="rt-l">${rtListHTML()}</div>${desk&&rs.length?`<div class="rt-r">${rtEditorHTML(rtById(rtSel))}</div>`:''}</div>`}`;
  $('routinesPg').scrollTop=y}
function openRoutines(){if(!routinesOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();if(wnOn)closeWins();if(typeof closeSearch==='function')closeSearch();
  rtOn=true;rtEdit=false;drawRoutines();$('routinesPg').classList.add('on');document.body.classList.add('ib-open');$('routinesPg').scrollTop=0;haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeRoutines(){if(!rtOn)return;rtOn=false;rtEdit=false;$('routinesPg').classList.remove('on');if(!ibOn&&!rhOn&&!wnOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#routinesPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function rtOpenOne(id){rtSel=id;rtEdit=!rtDesk();haptic(4);drawRoutines();if(rtEdit)$('routinesPg').scrollTop=0}
function rtNewRoutine(){const r={id:newId(),name:'New routine',e:'',at:'',days:[0,1,2,3,4,5,6],steps:[],log:{},created:Date.now()};
  commit(()=>{rtAll().push(r)},'Routine added');rtOpenOne(r.id);setTimeout(()=>{const i=$('rtName');if(i){i.focus();i.select()}},40)}
/* small edits save quietly (no Undo toast for every keystroke); bigger ones go through commit() */
function rtSet(fn){fn();save();drawRoutines();try{renderDesk()}catch(e){}}
$('routinesPg').addEventListener('click',e=>{
  if(e.target.closest('#rtBack')){if(rtEdit&&!rtDesk()){rtEdit=false;return drawRoutines()}return closeRoutines()}
  const st=e.target.closest('[data-rtstart]');if(st)return rtPlayOpen(+st.dataset.rtstart);
  const tp=e.target.closest('[data-rttpl]');if(tp){const r=rtFromTpl(RT_TPL[+tp.dataset.rttpl]);commit(()=>{rtAll().push(r)},`${r.name} added`);try{sfx('done')}catch(err){}rtSel=r.id;return drawRoutines()}
  if(e.target.closest('[data-rtnew]'))return rtNewRoutine();
  const m=e.target.closest('[data-rtm]');if(m){e.stopPropagation();const r=rtById(+m.dataset.rtm);if(!r)return;
    return cxOpen(m,[{t:'Duplicate',ic:PLUS_S,act:()=>{const c={...JSON.parse(JSON.stringify(r)),id:newId(),name:r.name+' (copy)',log:{},created:Date.now()};c.steps.forEach(x=>x.id=newId());commit(()=>{rtAll().push(c)},'Routine duplicated');rtSel=c.id;drawRoutines()}},
      {t:'Delete routine',ic:BIN_S,warn:1,act:()=>{commit(()=>{S.routines=rtAll().filter(x=>x.id!==r.id)},'Routine deleted');try{sfx('remove')}catch(err){}rtSel=null;rtEdit=false;drawRoutines()}}])}
  const sm=e.target.closest('[data-rtsm]');if(sm){e.stopPropagation();const r=rtById(rtSel),id=+sm.dataset.rtsm;if(!r)return;const i=r.steps.findIndex(x=>x.id===id);
    const mv=d=>()=>{commit(()=>{const [x]=r.steps.splice(i,1);r.steps.splice(i+d,0,x)},'Step moved');drawRoutines()};
    return cxOpen(sm,[...(i>0?[{t:'Move up',ic:ARR_L,act:mv(-1)}]:[]),...(i<r.steps.length-1?[{t:'Move down',ic:ARR_R,act:mv(1)}]:[]),
      {t:'Delete step',ic:BIN_S,warn:1,act:()=>{commit(()=>{r.steps=r.steps.filter(x=>x.id!==id)},'Step deleted');drawRoutines()}}])}
  const rm=e.target.closest('[data-rtrem]');if(rm){const r=rtById(rtSel);if(!r)return;const on=rm.dataset.rtrem==='1';haptic(4);if(on&&typeof remAsk==='function')remAsk();
    return rtSet(()=>{if(on)r.rem=1;else delete r.rem})}
  const hb=e.target.closest('[data-rthab]');if(hb){const r=rtById(rtSel);if(!r)return;const on=hb.dataset.rthab==='1';if(on===!!rtHabit(r))return;haptic(4);
    if(on){commit(()=>{const h=rtHabit(r,true)||{id:'h'+newId(),name:r.name,e:r.e||'',space:null,days:[...r.days],done:{},created:Date.now()};if(!S.habits.includes(h))S.habits.push(h);r.habit=h.id},`${r.name} counts as a habit`)}
    else{commit(()=>{delete r.habit},'Not a habit any more');toast('The habit stays in Habits, with its streak')}return drawRoutines()}
  const dy=e.target.closest('[data-rtday]');if(dy){const r=rtById(rtSel),d=+dy.dataset.rtday;if(!r)return;haptic(4);return rtSet(()=>{r.days=r.days.includes(d)?r.days.filter(x=>x!==d):[...r.days,d]})}
  if(e.target.closest('[data-rtat]')){const r=rtById(rtSel);if(r)rtSet(()=>{r.at=''});return}
  if(e.target.closest('input,select,label'))return;
  const o=e.target.closest('[data-rtopen]');if(o)return rtOpenOne(+o.dataset.rtopen)});
$('routinesPg').addEventListener('change',e=>{const r=rtById(rtSel);if(!r)return;
  const mn=e.target.closest('[data-rtmin]');if(mn){const x=r.steps.find(s=>s.id===+mn.dataset.rtmin);if(x)rtSet(()=>{x.m=+mn.value});return}
  if(e.target.id==='rtAt'){const v=e.target.value;rtSet(()=>{r.at=/^\d\d:\d\d$/.test(v)?v:''});return}
  const s=e.target.closest('[data-rtst]');if(s){const x=r.steps.find(z=>z.id===+s.dataset.rtst),v=s.value.trim();if(!x)return;if(!v){s.value=x.t;return}if(v!==x.t)rtSet(()=>{x.t=v.slice(0,60)});return}
  if(e.target.id==='rtName'){const v=e.target.value.trim();if(!v){e.target.value=r.name;return}if(v!==r.name)rtSet(()=>{r.name=v.slice(0,40)})}});
$('routinesPg').addEventListener('keydown',e=>{
  if(e.target.id==='rtNewStep'&&e.key==='Enter'){e.preventDefault();const v=e.target.value.trim(),r=rtById(rtSel);if(!v||!r)return;
    commit(()=>{r.steps.push({id:newId(),t:v.slice(0,60),m:5})},'Step added');haptic(5);drawRoutines();setTimeout(()=>{const i=$('rtNewStep');if(i)i.focus()},20);return}
  if((e.target.id==='rtName'||e.target.matches('[data-rtst]'))&&e.key==='Enter'){e.preventDefault();e.target.blur()}
  if(e.target.matches('input')&&e.key==='Escape'){e.preventDefault();e.stopPropagation();e.target.blur()}});

/* ---------- playing a routine: full screen, one step at a time ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="rt-playpg" id="rtPlay" role="dialog" aria-modal="true" aria-label="Routine"><div class="rp-in" id="rpIn"></div></div>');
let RP=null;
function rpLeft(){const x=RP.r.steps[RP.i];if(!x||!x.m)return null;return Math.max(0,x.m*60-Math.floor((RP.paused?RP.pausedAt-RP.t0:Date.now()-RP.t0)/1000))}
const rpClock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function rpDraw(){if(!RP)return;const r=RP.r,n=r.steps.length;
  if(RP.fin){const k=rtStreak(r);
    $('rpIn').innerHTML=`<div class="rp-top"><span class="rp-eye">${esc(r.name)} · done</span><button class="rp-b" data-rpx aria-label="Close">${X}</button></div>
      <div class="rp-fin"><span class="rp-sun">${typeof WN_I!=='undefined'?WN_I.day:RT_TICK}</span><b class="rp-big">${RP.did}<small>/${n}</small></b><b class="rp-fl">${RP.did===n?'Every step done':'Steps done'}</b>
      <p class="rp-p">${k>1?`That's <b>${k} days in a row</b>. Keep it going.`:'A good start. See you next time.'}</p></div>
      <div class="rp-acts"><button class="rp-main" data-rpx>Close</button></div>`;return}
  const x=r.steps[RP.i],left=rpLeft(),pct=x&&x.m?Math.min(100,100-left/(x.m*60)*100):0;
  $('rpIn').innerHTML=`<div class="rp-top"><span class="rp-eye">${esc(r.name)} · ${RP.i+1} of ${n}</span><div class="rp-tb"><button class="rp-b amb-btn" data-amb aria-label="Focus sounds"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg></button><button class="rp-b" data-rpx aria-label="Stop routine">${X}</button></div></div>
    <div class="rp-segs" aria-hidden="true">${r.steps.map((s,i)=>`<i class="${i<RP.i?'on':i===RP.i?'cur':''}"></i>`).join('')}</div>
    <span class="rp-now">${left===0?'Time is up · take your time':'Now'}</span>
    <h1 class="rp-h">${esc(x.t)}</h1>
    ${x.m?`<div class="rp-clock" id="rpClock">${rpClock(left)}</div><div class="rp-bar"><i id="rpBar" style="width:${pct}%"></i></div>`:'<div class="rp-clock rp-nt">No timer</div>'}
    <div class="rp-list">${r.steps.map((s,i)=>`<div class="rp-st${i<RP.i?' did':i===RP.i?' cur':''}"><i>${i<RP.i&&RP.done.has(s.id)?RT_TICK:''}</i><span>${esc(s.t)}</span>${s.m?`<em>${fmt(s.m)}</em>`:''}</div>`).join('')}</div>
    <div class="rp-acts">${x.m?`<button class="rp-b rp-pz" data-rppause aria-label="${RP.paused?'Resume':'Pause'}">${RP.paused?RT_PLAY:PAUSE}</button>`:''}
      <button class="rp-main" data-rpdone>${RP.i<n-1?'Done · next step':'Done · finish'}</button>
      <button class="rp-b" data-rpskip aria-label="Skip step">${RT_SKIP}</button></div>`}
function rpTick(){if(!RP||RP.fin||RP.paused)return;const left=rpLeft();if(left==null)return;
  const c=$('rpClock'),b=$('rpBar'),x=RP.r.steps[RP.i];if(c)c.textContent=rpClock(left);if(b)b.style.width=Math.min(100,100-left/(x.m*60)*100)+'%';
  if(left===0&&!RP.rang){RP.rang=true;try{sfx('start')}catch(e){}haptic([10,40,10]);rpDraw()}}
function rtPlayOpen(id){const r=rtById(id);if(!r||!r.steps.length)return;
  RP={r,i:0,t0:Date.now(),done:new Set(),did:0,paused:false,fin:false,rang:false};
  $('rtPlay').classList.add('on');document.body.classList.add('rp-open');rpDraw();try{sfx('start');ambFocusStart()}catch(e){}haptic(8);
  clearInterval(RP.iv);RP.iv=setInterval(rpTick,500);setTimeout(()=>{const b=$('rpIn').querySelector('[data-rpdone]');b&&b.focus()},60)}
function rpNext(did){const r=RP.r,x=r.steps[RP.i];if(did){RP.done.add(x.id);RP.did++}
  if(RP.i<r.steps.length-1){RP.i++;RP.t0=Date.now();RP.paused=false;RP.rang=false;haptic(6);try{sfx(did?'done':'move')}catch(e){}return rpDraw()}
  rpFinish()}
function rpFinish(){const r=RP.r;RP.fin=true;
  if(RP.did>0){const k=today(),h=rtHabit(r);commit(()=>{r.log=r.log||{};r.log[k]=1;if(h){h.done=h.done||{};h.done[k]=1}},`${r.name} done${h?' · habit ticked':''}`)}
  try{ambFocusEnd()}catch(e){}try{sfx('done')}catch(e){}haptic([8,30,12]);rpDraw();
  setTimeout(()=>{const b=$('rpIn').querySelector('[data-rpx]');b&&b.focus()},60);if(rtOn)drawRoutines()}
function rtPlayClose(){if(!RP)return;clearInterval(RP.iv);if(!RP.fin)try{ambFocusEnd()}catch(e){}RP=null;$('rtPlay').classList.remove('on');document.body.classList.remove('rp-open');if(rtOn)drawRoutines()}
$('rtPlay').addEventListener('click',e=>{if(!RP)return;
  if(e.target.closest('[data-rpx]'))return rtPlayClose();
  if(e.target.closest('[data-rpdone]'))return rpNext(true);
  if(e.target.closest('[data-rpskip]'))return rpNext(false);
  if(e.target.closest('[data-rppause]')){if(RP.paused){RP.t0+=Date.now()-RP.pausedAt;RP.paused=false}else{RP.paused=true;RP.pausedAt=Date.now()}haptic(5);return rpDraw()}});
addEventListener('keydown',e=>{if(!RP||!$('rtPlay').classList.contains('on')||$('ambPop'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return rtPlayClose()}
  if(RP.fin)return;
  if(e.key==='Enter'&&!e.target.closest('button')){e.preventDefault();e.stopImmediatePropagation();return rpNext(true)}
  if(e.key===' '&&!e.target.closest('button')&&RP.r.steps[RP.i].m){e.preventDefault();e.stopImmediatePropagation();$('rpIn').querySelector('[data-rppause]').click()}},true);

/* ---------- keep things fresh ---------- */
const _rtRender=render;render=function(d){_rtRender(d);try{if(rtOn){if(!routinesOn())closeRoutines();else if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest('#routinesPg'))drawRoutines()}}catch(err){console.error(err)}};

/* ---------- computers: "Routines" under Modes in the sidebar ---------- */
const _rtSide=rhythmSide;
rhythmSide=function(){const h=_rtSide();if(!routinesOn())return h;const n=rtLeftToday();
  const it=`<button class="s-list s-home s-inbox ${rtOn?'on':''}" id="sRoutines" title="Routines">${RT_ICON}<span class="s-name">Routines</span>${n?`<span class="n">${n}</span>`:''}</button>`;
  return h?h+it:`<div class="s-lbl2"><span class="s-name">Modes</span></div>${it}`};
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sRoutines')){e.stopImmediatePropagation();return rtOn?closeRoutines():openRoutines()}
  if(rtOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l],#sInbox,#sRhythm,#sGoals,[data-sgoal],[data-sgnew],#sMetrics,#sWins'))closeRoutines()},true);
for(const fn of ['openInbox','openRhythm','openGoals','openGoal','goHome','openSpaceSide','openMetrics','openWins']){const f=window[fn];if(typeof f!=='function')continue;
  window[fn]=function(){if(rtOn)closeRoutines();return f.apply(this,arguments)}}
const _rtDesk=renderDesk;renderDesk=function(){_rtDesk.apply(this,arguments);if(rtOn){const h=$('sHome');if(h)h.classList.remove('on')}};
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!rtOn||e.defaultPrevented||RP||$('dlg').classList.contains('on')||document.querySelector('.sheet.on'))return;
  if(e.target&&e.target.closest&&e.target.closest('#routinesPg input,#routinesPg select'))return;if(!rtDesk())return;e.preventDefault();closeRoutines()});
ESC_PAGES.routinesPg=()=>{if(rtEdit&&!rtDesk()){rtEdit=false;return drawRoutines()}closeRoutines()};

/* ---------- phones: a Routines tab ---------- */
TB_I.routines=RT_ICON;
const _rtTabs=tabsList;
tabsList=function(){let t=_rtTabs();if(!routinesOn())return t;t=t.length?t:[['home','Home',TB_HOME]];t.push(['routines','Routines',RT_ICON]);return t};
const _rtTabNow=tabNow;tabNow=function(){return rtOn?'routines':_rtTabNow()};
const _rtTbGo=tbGo;
tbGo=function(k){
  if(k==='routines'){if(rtOn){if(rtEdit){rtEdit=false;drawRoutines()}$('routinesPg').scrollTo({top:0,behavior:'smooth'});return}_rtTbGo('home');openRoutines();return drawTabs()}
  if(rtOn)closeRoutines();return _rtTbGo(k)};
/* the + on the Routines tab makes a new routine */
document.addEventListener('click',e=>{if(!rtOn||!e.target.closest('#tbAdd'))return;e.preventDefault();e.stopImmediatePropagation();rtNewRoutine()},true);
const _rtApply=applySettings;applySettings=function(){_rtApply.apply(this,arguments);if(rtOn&&!routinesOn())closeRoutines()};

/* ---------- Settings → Modes: a Routines card ---------- */
const _rtModes=modesPage;
modesPage=function(){const h=_rtModes.apply(this,arguments),on=routinesOn(),n=on?rtAll().length:0;
  const card=`<div class="md-card${on?' on':''}" data-md="routines"><div class="md-head"><span class="md-ic">${RT_ICON}</span><span class="md-t"><b>Routines</b><small>Small rituals you run step by step</small></span>${tg('routines')}</div>
    ${on?`<div class="md-body"><p class="md-note">Morning, workday shutdown, evening wind-down: a few steps with a gentle timer each. Finish one and it counts toward its streak${typeof winsOn==='function'?' and lands in Wins':''}. ${n?`You have ${n}.`:''}</p>
      <div class="md-sub"><span><b>Next routine on Home</b><small>A small card with Start, from half an hour before its time.</small></span>${tg('rtHome')}</div></div>`:''}</div>`;
  const i=h.indexOf('<div class="set-sec"><h3>Everyday');if(i<0)return h+card;const j=h.lastIndexOf('</div>',i);return h.slice(0,j)+card+h.slice(j)};
