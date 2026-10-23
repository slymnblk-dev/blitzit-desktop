/* ---------- Modes → Habits (optional; Settings → Modes, off by default) ----------
   Off means every habit screen, card, menu item and widget disappears. The habits themselves are kept,
   so turning the mode back on brings everything back.
   Habits live on their own page, like Inbox: a row on the phone's Home and an item in the sidebar on computers.
   (The page's element ids still say "rhythm" from an earlier name.)
   Sunrise streaks: a habit's sun rises one notch for each day you keep it and sinks one notch for a missed day,
   never vanishing. Seven notches brings out the rays.
   Optional extras: an evening check-in card and a Home widget. The page views and the widget are drawn in 08n-pages.js.
   Data: S.habits [{id,name,e,space,days:[0-6],done:{'YYYY-MM-DD':1},created}]; syncs, backs up and undoes like tasks.
   (S.hchains and a habit's chain field are left from the removed habit chains; they are only carried along, never shown.) */
var rhOn=false,ciOn=false; // var: read by other files
const HB_MAX=10;
const HB_ICONS=['💧','🏃','🚶','📖','🧘','📵','🛏️','🥗','🍎','✍️','📝','🧠','🎸','🎨','🌿','☀️','🌙','☕','🧹','💰','📞','🙏','🦷','💪'];
const HB_WORDS=[[/water|drink|hydrat/,'💧'],[/run|jog|workout|gym|train|exercise|sport|swim|bike|cycl/,'🏃'],[/walk|steps/,'🚶'],[/read|book|pages/,'📖'],
  [/meditat|breath|yoga|stretch|calm|mindful/,'🧘'],[/phone|screen|social|scroll/,'📵'],[/sleep|bed|nap/,'🛏️'],[/eat|salad|veg|meal|food|cook/,'🥗'],[/fruit|apple/,'🍎'],
  [/journal|write|writing|diary/,'✍️'],[/plan|review|list/,'📝'],[/learn|study|course|language|lesson/,'🧠'],[/guitar|piano|music|instrument|sing/,'🎸'],
  [/draw|paint|art|sketch/,'🎨'],[/outside|nature|plant|garden/,'🌿'],[/morning|wake|sunlight/,'☀️'],[/evening|night/,'🌙'],[/coffee|tea/,'☕'],
  [/clean|tidy|chores|dishes|laundry/,'🧹'],[/save|money|budget|spend/,'💰'],[/call|family|friend|mom|mum|dad/,'📞'],[/pray|gratitude|grateful|thank/,'🙏'],[/floss|teeth|brush/,'🦷'],[/push|pull|squat|strength|lift/,'💪']];
const hbIcon=n=>{const s=String(n||'').toLowerCase();const m=HB_WORDS.find(([r])=>r.test(s));return m?m[1]:''};
const ICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const RH_ICON='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M12 34a12 12 0 0 1 24 0"/><path d="M5 34h38"/><path d="M24 9v7M12.4 13.4l4 4M35.6 13.4l-4 4"/></svg>';

function habitsOn(){return !!(S.cfg&&S.cfg.habits)}
/* a habit needs no space; one in a space hides while that space is archived or deleted (restoring it brings it back) */
function hbAll(){return (S.habits||[]).filter(h=>h&&(!h.space||spaceOf(h.space)))}
const hbById=id=>(S.habits||[]).find(h=>String(h.id)===String(id));
const hbNoon=d=>{const x=new Date(d);x.setHours(12,0,0,0);return x};
const hbDue=(h,d)=>!Array.isArray(h.days)||h.days.length>=7||h.days.includes(d.getDay());
const hbDays=n=>{const d=hbNoon(new Date());d.setDate(d.getDate()-n);return d};

/* lvl: the sun's height 0–7 (up one for a kept day, down one for a missed one, over the last two weeks);
   st: the strict streak of due days in a row; dt: done today; due: due today */
function hbStats(h){
  const done=h.done||{},t0=hbNoon(new Date()),born=hbNoon(h.created||Date.now()),dt=!!done[dkey(t0)];
  let lvl=0;
  for(let i=13;i>=1;i--){const d=hbDays(i);if(d<born||!hbDue(h,d))continue;lvl=done[dkey(d)]?Math.min(7,lvl+1):Math.max(0,lvl-1)}
  if(dt)lvl=Math.min(7,lvl+1);
  let st=0;for(let i=dt?0:1;i<400;i++){const d=hbDays(i);if(d<born)break;if(!hbDue(h,d))continue;if(done[dkey(d)])st++;else break}
  return {lvl,st,dt,due:hbDue(h,t0)};
}
const hbText=s=>!s.due&&!s.dt?'Rest day':s.st?`${s.st}-day streak${s.lvl>=7?' · sun is up':''}`:'Start today';
function hbOpenToday(hs){return (hs||hbAll()).filter(h=>{const s=hbStats(h);return s.due&&!s.dt})}
const daysLabel=d=>{d=Array.isArray(d)?d:[0,1,2,3,4,5,6];if(d.length>=7)return 'Every day';const k=[...d].sort().join('');
  if(k==='12345')return 'Weekdays';if(k==='06')return 'Weekends';return [1,2,3,4,5,6,0].filter(n=>d.includes(n)).map(n=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n]).join(', ')};

/* ---------- pieces ---------- */
let hbUid=0;
function hbSun(lvl,on,cls=''){const id='hbc'+(++hbUid);
  return `<svg class="hb-sun${on?' on':''}${cls?' '+cls:''}" viewBox="0 0 48 40" aria-hidden="true"><defs><clipPath id="${id}"><rect width="48" height="30"/></clipPath></defs>
  <g class="rays" style="opacity:${lvl>=7?1:0}"><path d="M24 3.5v5M12 8.5l3.4 3.4M36 8.5l-3.4 3.4"/></g>
  <g clip-path="url(#${id})"><g class="dg" style="transform:translateY(${(-lvl*12/7).toFixed(2)}px)"><circle class="disc" cx="24" cy="38" r="10"/></g></g><path class="hz" d="M5 30h38"/></svg>`}
const hbName=h=>`${h.e?esc(h.e)+' ':''}${esc(h.name)}`;
/* ---------- where habits live: one dedicated page (like Inbox), opened from Home or the sidebar ---------- */
const longDate=()=>new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
function modesRender(){
  if(rhOn&&!habitsOn())closeRhythm();
  if(ciOn&&!habitsOn())closeCheckin(true);
  if(rhOn)drawRhythm();
}

/* ---------- Home: evening check-in card, Inbox/Habits/Goals rows, sidebar ---------- */
function ciCard(){
  if(!habitsOn()||C().hbCi===false||S.ciSkip===today())return '';
  const at=+C().hbCiAt;if(new Date().getHours()<(Number.isFinite(at)?at:19))return '';
  const n=hbOpenToday().length;if(!n)return '';
  return `<div class="ci-home"><span class="ci-hi">${hbSun(3,false)}</span><span class="ci-ht"><b>Evening check-in</b><small>${n} ${n===1?'habit':'habits'} left today</small></span>
    <button class="rv-skip" data-cilater>Later</button><button class="rv-go" data-ciopen>Start</button></div>`}
function homeNav(){const rows=[],r=(id,ic,t,sub)=>`<button class="ib-entry" id="${id}"><span class="ib-entry-i">${ic}</span><span class="ib-entry-t"><b>${t}</b><small>${sub}</small></span>${CHEV}</button>`;
  if(inboxOn()){const n=inboxItems().length,m=inboxNotes().length;rows.push(r('ibEntry',IB_ICON,'Inbox',n||m?[n&&`${n} ${n===1?'task':'tasks'} waiting`,m&&`${m} ${m===1?'note':'notes'}`].filter(Boolean).join(' · '):'Drop tasks and notes here'))}
  if(habitsOn()&&!hbWidget()){const n=hbOpenToday().length,has=hbAll().length;rows.push(r('rhEntry',RH_ICON,'Habits',!has?'Small daily wins':n?`${n} left today`:'All done today'))}
  if(goalsOn()&&!(nsCard()&&gAll().length<2)){const n=gAll().length;rows.push(r('glEntry',G_FLAG,'Goals',n?`${n} in progress`:'Big outcomes, step by step'))}
  return rows.length?`<div class="hn">${rows.join('')}</div>`:''}
function rhythmSide(){let h='';
  if(habitsOn()){const n=hbOpenToday().length;h+=`<button class="s-list s-home s-inbox ${rhOn?'on':''}" id="sRhythm" title="Habits">${RH_ICON}<span class="s-name">Habits</span>${n?`<span class="n">${n}</span>`:''}</button>`}
  if(goalsOn()){const n=gAll().length;h+=`<button class="s-list s-home s-inbox ${typeof glOn!=='undefined'&&glOn?'on':''}" id="sGoals" title="Goals">${G_FLAG}<span class="s-name">Goals</span>${n?`<span class="n">${n}</span>`:''}</button>`}
  return h}
function hbOpenHabits(){openRhythm()}

/* ---------- Habits page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg" id="rhythmPg" role="region" aria-label="Habits"><div class="ib-in" id="rhIn"></div></div>');
function openRhythm(){
  if(!habitsOn())return;
  if(ibOn)closeInbox();if(typeof closeGoals==='function')closeGoals();if(typeof closeSearch==='function')closeSearch();
  rhOn=true;drawRhythm();$('rhythmPg').classList.add('on');document.body.classList.add('ib-open');
  $('rhythmPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
}
function closeRhythm(){
  if(!rhOn)return;rhOn=false;$('rhythmPg').classList.remove('on');if(!ibOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#rhythmPg'))a.blur();
  if(typeof renderDesk==='function')renderDesk();
}

/* ---------- tick a habit: the sun rises in place, the rest of the screen catches up a moment later ---------- */
let hbRefreshT=null;
function hbPaint(el,s){el.classList.toggle('on',s.dt);el.setAttribute('aria-pressed',s.dt);
  const sun=el.querySelector('.hb-sun');if(sun){sun.classList.toggle('on',s.dt);sun.querySelector('.dg').style.transform=`translateY(${(-s.lvl*12/7).toFixed(2)}px)`;sun.querySelector('.rays').style.opacity=s.lvl>=7?1:0}
  const t=el.querySelector('[data-hbs]');if(t)t.textContent=hbText(s)}
let hbTapAt={};
function hbToggle(id,force){
  const h=hbById(id);if(!h)return;
  if(force===undefined){const now=Date.now();if(now-(hbTapAt[id]||0)<350)return;hbTapAt[id]=now}h.done=h.done||{};const k=today(),on=force===undefined?!h.done[k]:force;
  if(on)h.done[k]=1;else delete h.done[k];
  haptic(on?[8,30,12]:6);try{sfx(on?'done':'undone')}catch(e){}
  save();const s=hbStats(h);document.querySelectorAll(`[data-hbt="${h.id}"]`).forEach(el=>hbPaint(el,s));
  clearTimeout(hbRefreshT);hbRefreshT=setTimeout(()=>{if(!document.querySelector('.sheet.on'))render()},900);
}

/* ---------- evening check-in: one habit per card, Done or Not today ---------- */
let ciQ=[],ciI=0,ciN=0;
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg review-pg ci-pg" id="ciPg" role="dialog" aria-label="Evening check-in"><div class="ib-in" id="ciIn"></div></div>');
function openCheckin(){
  ciQ=hbOpenToday().map(h=>h.id);if(!ciQ.length){toast('All habits are done for today');return}
  ciI=0;ciN=0;ciOn=true;drawCi();$('ciPg').classList.add('on');$('ciPg').scrollTop=0;haptic(6);
}
function closeCheckin(quiet){if(!ciOn)return;ciOn=false;$('ciPg').classList.remove('on');if(!quiet){S.ciSkip=today();save();render()}}
function drawCi(){
  const n=ciQ.length,end=ciI>=n;
  const card=(id,k)=>{const h=hbById(id);if(!h)return '';const s=hbStats(h);
    return `<div class="ci-card" style="--k:${k};z-index:${5-k}">${k===0?`<span class="ci-e">${h.e?esc(h.e):hbSun(s.lvl,false)}</span><span class="ci-q">Did you do this today?</span><b class="ci-n">${esc(h.name)}</b><small>${hbText(s)}</small>
      <div class="ci-b"><button data-cino>Not today</button><button class="yes" data-ciyes>Done</button></div>`:''}</div>`};
  $('ciIn').innerHTML=`<div class="set-top"><button class="icon-btn" id="ciBack" aria-label="Close check-in">${BACK_SVG}</button></div>
    <div class="rv-eye">Evening check-in</div><h1 class="rv-h">${end?(ciN?'All checked in.':'Tomorrow, then.'):'Quick one.'}</h1>
    <div class="ci-prog">${ciQ.map((_,i)=>`<i class="${i<ciI?'on':''}"></i>`).join('')}</div>
    <div class="ci-stack">${end?`<div class="ci-end">${hbSun(ciN?7:2,!!ciN)}<b>${ciN?`${ciN} done tonight`:'Nothing ticked tonight'}</b><span>${ciN?'Your suns rose a little. See you tomorrow evening.':'No guilt. Your suns only sink a little.'}</span><button class="primary" data-ciclose>Close</button></div>`
      :ciQ.slice(ciI,ciI+3).map(card).join('')}</div>`;
}
function ciAnswer(yes){
  const top=$('ciPg').querySelector('.ci-card');if(!top||top.classList.contains('out-yes')||top.classList.contains('out-no'))return;
  if(yes){const h=hbById(ciQ[ciI]);if(h&&!(h.done||{})[today()])hbToggle(h.id,true);ciN++}else haptic(5);
  top.classList.add(yes?'out-yes':'out-no');ciI++;
  setTimeout(()=>{drawCi();if(ciI>=ciQ.length){S.ciSkip=today();save()}},280);
}

/* ---------- habit editor ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="hbSheet"><div class="sheet-in">
  <div class="grab"></div><h2 id="hbTitle">New habit</h2>
  <div class="sp-form"><span class="sp-prev hb-prev" id="hbPrev" role="button" aria-label="Choose an icon"></span><input class="field sp-name-in" id="hbName" placeholder="Habit name" maxlength="40" autocomplete="off" enterkeyhint="done"></div>
  <div class="le-card sp-opts" id="hbOpts"></div>
  <button class="primary" id="hbSave" disabled>Add habit</button>
  <div class="le-acts" id="hbDelW" hidden><button class="le-btn warn hb-del" id="hbDel" type="button">Delete habit</button></div>
</div></div>`);
let hbDraft=null,hbSub=null;
function openHabit(id,sp){
  const h=id?hbById(id):null;
  if(!h&&hbAll().length>=HB_MAX){toast(`Up to ${HB_MAX} habits. Fewer, kept daily, beat many.`);return}
  const sps=orderedSpaces();
  hbDraft=h?{...h,days:[...(h.days||[0,1,2,3,4,5,6])]}
    :{id:null,name:'',e:'',space:sp&&spaceOf(sp)?sp:inSpaceMode()&&spaceOf(S.space)?S.space:null,days:[0,1,2,3,4,5,6]};
  hbDraft.touched=!!(h&&h.e);hbSub=null;
  $('hbTitle').textContent=h?'Edit habit':'New habit';$('hbName').value=hbDraft.name;$('hbDelW').hidden=!h;
  drawHabitSheet();openSheet('hbSheet');setTimeout(()=>{if($('hbSheet').classList.contains('on')&&!h)$('hbName').focus()},300);
}
function drawHabitSheet(){
  const d=hbDraft,sp=spaceOf(d.space)||{};
  $('hbSave').textContent=d.id?'Save':'Add habit';$('hbSave').disabled=!d.name.trim();
  $('hbPrev').innerHTML=d.e?esc(d.e):hbSun(3,true);
  $('hbOpts').innerHTML=
    lxRow('i','Icon',`<span class="lx-ico">${d.e?esc(d.e):'Auto'}</span>`,`<div class="ico-grid" id="hbIcons"><button data-hbico="" class="ico-none ${!d.e?'on':''}" aria-label="No icon">–</button>${HB_ICONS.map(i=>`<button data-hbico="${i}" class="${d.e===i?'on':''}" aria-label="Icon ${i}">${i}</button>`).join('')}</div>`,hbSub==='i')+
    lxRow('d','Days',`<span class="lx-t">${daysLabel(d.days)}</span>`,`<div class="hb-days">${[1,2,3,4,5,6,0].map(n=>`<button data-hday="${n}" class="${d.days.includes(n)?'on':''}" aria-pressed="${d.days.includes(n)}" aria-label="${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][n]}">${'SMTWTFS'[n]}</button>`).join('')}</div>
      <div class="hb-pre"><button data-hdp="all">Every day</button><button data-hdp="wk">Weekdays</button><button data-hdp="we">Weekends</button></div>`,hbSub==='d')+
    (S.spaces.length?lxRow('s','Space',d.space&&sp.id?`${spMini(sp)}<span class="lx-t">${esc(sp.name||'')}</span>`:'<span class="lx-t">No space</span>',`<div class="lx-list"><button class="lx-opt${!d.space?' on':''}" data-hbsp=""><span>No space</span>${!d.space?tick():''}</button>${orderedSpaces().map(x=>`<button class="lx-opt${d.space===x.id?' on':''}" data-hbsp="${x.id}">${spMini(x)}<span>${esc(x.name)}</span>${d.space===x.id?tick():''}</button>`).join('')}</div>`,hbSub==='s'):'');
}
$('hbOpts').addEventListener('click',e=>{
  const t=e.target.closest('[data-lxt]');if(t){lxToggle(t,v=>hbSub=v);return}
  const d=hbDraft;if(!d)return;
  const ic=e.target.closest('[data-hbico]');if(ic){d.e=ic.dataset.hbico;d.touched=true;haptic(5);return drawHabitSheet()}
  const dy=e.target.closest('[data-hday]');if(dy){const n=+dy.dataset.hday;if(d.days.includes(n)){if(d.days.length>1)d.days=d.days.filter(x=>x!==n);else toast('A habit needs at least one day')}else d.days.push(n);haptic(4);return drawHabitSheet()}
  const dp=e.target.closest('[data-hdp]');if(dp){d.days={all:[0,1,2,3,4,5,6],wk:[1,2,3,4,5],we:[0,6]}[dp.dataset.hdp].slice();haptic(4);return drawHabitSheet()}
  const sp=e.target.closest('[data-hbsp]');if(sp){d.space=sp.dataset.hbsp||null;haptic(5);return drawHabitSheet()}
});
$('hbPrev').onclick=()=>{const t=$('hbOpts').querySelector('[data-lxt="i"]');if(t&&hbSub!=='i')lxToggle(t,v=>hbSub=v)};
$('hbName').oninput=e=>{hbDraft.name=e.target.value;if(!hbDraft.touched)hbDraft.e=hbIcon(hbDraft.name);drawHabitSheet()};
$('hbName').onkeydown=e=>{if(e.key==='Enter'&&hbDraft.name.trim())$('hbSave').click()};
$('hbSave').onclick=()=>{
  const d=hbDraft;if(!d||!d.name.trim())return;if(d.space&&!spaceOf(d.space))d.space=null;
  const name=d.name.trim(),wasNew=!d.id,inSet=settingsOpen();
  closeSheets();
  commit(()=>{
    S.habits=S.habits||[];
    const days=d.days.length?[...d.days].sort():[0,1,2,3,4,5,6];
    if(d.id){const h=hbById(d.id);if(!h)return;Object.assign(h,{name,e:d.e,space:d.space,days})}
    else S.habits.push({id:'h'+newId(),name,e:d.e,space:d.space,days,done:{},created:Date.now()});
  },wasNew?`${name} added`:'Habit saved');
  if(inSet)drawSettings();
  else if(wasNew&&!rhOn)openRhythm();
};
$('hbDel').onclick=()=>{const d=hbDraft;if(!d||!d.id)return;const h=hbById(d.id);if(!h)return;
  confirmAsk({title:`Delete ${h.name}?`,text:'Its streak history goes too. This can’t be undone after you leave.',yes:'Yes, delete',no:'No',
    onYes:()=>{closeSheets();const inSet=settingsOpen();commit(()=>{S.habits=S.habits.filter(x=>x!==h)},`${h.name} deleted`);if(inSet)drawSettings()}})};

/* ---------- Settings → Modes ---------- */
function modesSummary(){const on=[habitsOn()&&'Habits',goalsOn()&&'Goals'].filter(Boolean);return on.length?`${on.join(' and ')} on`:'All off'}
function habitsSetPage(){
  const hs=hbAll();
  const row=h=>`<button class="link-row" data-hbe="${h.id}"><span class="hs-n">${hbName(h)}</span><span class="hint">${daysLabel(h.days)}${CHEV}</span></button>`,free=hs.filter(h=>!h.space);
  const groups=(free.length?`<div class="set-sec"><h3>${S.spaces.length&&hs.some(h=>h.space)?'No space':'Your habits'}</h3>${free.map(row).join('')}</div>`:'')+orderedSpaces().map(sp=>{const g=hs.filter(h=>h.space===sp.id);if(!g.length)return '';
    return `<div class="set-sec"><h3>${sp.e?esc(sp.e)+' ':''}${esc(sp.name)}</h3>${g.map(h=>`<button class="link-row" data-hbe="${h.id}"><span class="hs-n">${hbName(h)}</span><span class="hint">${daysLabel(h.days)}${CHEV}</span></button>`).join('')}</div>`}).join('');
  return `<p class="sub-p">Up to ${HB_MAX} habits, so each one gets real attention. Tap one to change it.</p>${groups||'<p class="sub-p hs-none">No habits yet.</p>'}
    ${hs.length<HB_MAX?`<button class="primary hs-new" data-hbnew="">New habit</button>`:''}`;
}

/* ---------- taps (capture, so a habit inside a space card or settings row never also opens something else) ---------- */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-hbt],[data-hbe],[data-hbnew],[data-ciopen],[data-cilater],[data-hbopen],#rhEntry,#rhBack,#ciBack,[data-ciyes],[data-cino],[data-ciclose]');
  if(!el)return;
  if(el.closest('.sheet')&&!el.closest('#hbSheet'))return;
  e.stopPropagation();e.preventDefault();
  if(el.matches('[data-hbt]'))return hbToggle(el.dataset.hbt);
  if(el.matches('[data-hbe]'))return openHabit(el.dataset.hbe);
  if(el.matches('[data-hbnew]'))return openHabit(null,el.dataset.hbnew||null);
  if(el.matches('[data-ciopen]'))return openCheckin();
  if(el.matches('[data-cilater]')){S.ciSkip=today();save();render();toast('Okay. It’ll be back tomorrow evening.');return}
  if(el.matches('[data-hbopen]'))return hbOpenHabits();
  if(el.matches('#rhEntry'))return openRhythm();
  if(el.matches('#rhBack'))return closeRhythm();
  if(el.matches('#ciBack')||el.matches('[data-ciclose]'))return closeCheckin();
  if(el.matches('[data-ciyes]'))return ciAnswer(true);
  if(el.matches('[data-cino]'))return ciAnswer(false);
},true);

/* the habits page and cards follow every redraw */
const _hbRender=render;render=function(d){_hbRender(d);try{modesRender()}catch(err){console.error(err)}};
