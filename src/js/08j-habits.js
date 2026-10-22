/* ---------- Modes → Habits (optional; Settings → Modes, off by default) ----------
   Off means every habit screen, card, menu item and widget disappears. The habits themselves are kept,
   so turning the mode back on brings everything back.
   Where habits live (Settings → Modes → Where modes live):
     • In spaces: a Board · Habits switch ("lens") appears inside spaces that have habits.
     • Rhythm page: one page under Inbox (sidebar on computers, a row on the phone's Home).
   Sunrise streaks: a habit's sun rises one notch for each day you keep it and sinks one notch for a missed day,
   never vanishing. Seven notches brings out the rays.
   Optional extras: habit chains (one habit leads to the next), an evening check-in card, and a Home widget.
   Data: S.habits [{id,name,e,space,days:[0-6],done:{'YYYY-MM-DD':1},created,chain?}], S.hchains [{id,name,when,space}].
   Both sync, back up and undo like tasks. */
var rhOn=false,ciOn=false,hbEditing=false; // var: read by other files
const HB_MAX=10,CHAIN_MAX=6;
const HB_ICONS=['💧','🏃','🚶','📖','🧘','📵','🛏️','🥗','🍎','✍️','📝','🧠','🎸','🎨','🌿','☀️','🌙','☕','🧹','💰','📞','🙏','🦷','💪'];
const HB_WORDS=[[/water|drink|hydrat/,'💧'],[/run|jog|workout|gym|train|exercise|sport|swim|bike|cycl/,'🏃'],[/walk|steps/,'🚶'],[/read|book|pages/,'📖'],
  [/meditat|breath|yoga|stretch|calm|mindful/,'🧘'],[/phone|screen|social|scroll/,'📵'],[/sleep|bed|nap/,'🛏️'],[/eat|salad|veg|meal|food|cook/,'🥗'],[/fruit|apple/,'🍎'],
  [/journal|write|writing|diary/,'✍️'],[/plan|review|list/,'📝'],[/learn|study|course|language|lesson/,'🧠'],[/guitar|piano|music|instrument|sing/,'🎸'],
  [/draw|paint|art|sketch/,'🎨'],[/outside|nature|plant|garden/,'🌿'],[/morning|wake|sunlight/,'☀️'],[/evening|night/,'🌙'],[/coffee|tea/,'☕'],
  [/clean|tidy|chores|dishes|laundry/,'🧹'],[/save|money|budget|spend/,'💰'],[/call|family|friend|mom|mum|dad/,'📞'],[/pray|gratitude|grateful|thank/,'🙏'],[/floss|teeth|brush/,'🦷'],[/push|pull|squat|strength|lift/,'💪']];
const hbIcon=n=>{const s=String(n||'').toLowerCase();const m=HB_WORDS.find(([r])=>r.test(s));return m?m[1]:''};
const ICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const RH_ICON='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M12 34a12 12 0 0 1 24 0"/><path d="M5 34h38"/><path d="M24 9v7M12.4 13.4l4 4M35.6 13.4l-4 4"/></svg>';
const UP_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
const DN_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

function habitsOn(){return !!(S.cfg&&S.cfg.habits)}
function modePage(){return C().modePlace==='page'}
function chainsOn(){return habitsOn()&&!!C().hbChains}
/* habits whose space still exists (a deleted or archived space hides its habits; restoring the space brings them back) */
function hbAll(){return (S.habits||[]).filter(h=>h&&spaceOf(h.space))}
function hbIn(sp){return hbAll().filter(h=>h.space===sp)}
const hbById=id=>(S.habits||[]).find(h=>String(h.id)===String(id));
const chById=id=>(S.hchains||[]).find(c=>String(c.id)===String(id));
const hbNoon=d=>{const x=new Date(d);x.setHours(12,0,0,0);return x};
const hbDue=(h,d)=>!Array.isArray(h.days)||h.days.length>=7||h.days.includes(d.getDay());
const hbChainOf=h=>chainsOn()&&h.chain?chById(h.chain):null;
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
function hbBest(hs){let best=0;hs.forEach(h=>{const born=hbNoon(h.created||Date.now());let run=0;
  for(let i=365;i>=0;i--){const d=hbDays(i);if(d<born||!hbDue(h,d))continue;if(h.done[dkey(d)]){run++;if(run>best)best=run}else if(i>0)run=0}});return best}
function hbOpenToday(hs){return (hs||hbAll()).filter(h=>{const s=hbStats(h);return s.due&&!s.dt})}
function hbCount(hs){const due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt});return {total:due.length,done:due.filter(h=>hbStats(h).dt).length}}
const daysLabel=d=>{d=Array.isArray(d)?d:[0,1,2,3,4,5,6];if(d.length>=7)return 'Every day';const k=[...d].sort().join('');
  if(k==='12345')return 'Weekdays';if(k==='06')return 'Weekends';return [1,2,3,4,5,6,0].filter(n=>d.includes(n)).map(n=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n]).join(', ')};
function chainRun(hs){let run=0;for(let i=0;i<400;i++){const d=hbDays(i),due=hs.filter(h=>hbDue(h,d)&&d>=hbNoon(h.created||Date.now()));
  if(!due.length){if(i>60)break;continue}const all=due.every(h=>h.done[dkey(d)]);if(all)run++;else if(i>0)break}return run}

/* ---------- pieces ---------- */
let hbUid=0;
function hbSun(lvl,on,cls=''){const id='hbc'+(++hbUid);
  return `<svg class="hb-sun${on?' on':''}${cls?' '+cls:''}" viewBox="0 0 48 40" aria-hidden="true"><defs><clipPath id="${id}"><rect width="48" height="30"/></clipPath></defs>
  <g class="rays" style="opacity:${lvl>=7?1:0}"><path d="M24 3.5v5M12 8.5l3.4 3.4M36 8.5l-3.4 3.4"/></g>
  <g clip-path="url(#${id})"><g class="dg" style="transform:translateY(${(-lvl*12/7).toFixed(2)}px)"><circle class="disc" cx="24" cy="38" r="10"/></g></g><path class="hz" d="M5 30h38"/></svg>`}
const hbName=h=>`${h.e?esc(h.e)+' ':''}${esc(h.name)}`;
function hbRow(h){const s=hbStats(h);
  return `<button class="hb-row${s.dt?' on':''}${s.due||s.dt?'':' rest'}" ${hbEditing?`data-hbe="${h.id}"`:`data-hbt="${h.id}" aria-pressed="${s.dt}"`}>${hbSun(s.lvl,s.dt)}
    <span class="hb-tx"><b>${hbName(h)}</b><small data-hbs>${hbEditing?daysLabel(h.days):hbText(s)}</small></span><span class="hb-ok">${hbEditing?CHEV:ICK}</span></button>`}
function hbChainCard(c,hs){const run=chainRun(hs);let nx=false;
  return `<div class="hc-card">${hbEditing?`<button class="hc-head" data-hce="${c.id}">`:'<div class="hc-head">'}<span class="hc-tx"><b>${esc(c.name||'Chain')}</b>${c.when?`<small>When ${esc(c.when)}</small>`:''}</span>
    ${hbEditing?CHEV.replace('<svg','<svg class="hc-chev"'):`<span class="hc-run">${run?`${run} ${run===1?'day':'days'} in a row`:'Not finished yet'}</span>`}${hbEditing?'</button>':'</div>'}
    <div class="hc-nodes">${hs.map(h=>{const s=hbStats(h),next=!hbEditing&&!s.dt&&(s.due)&&!nx&&(nx=true);
      return `<button class="hc-node${s.dt?' on':''}" ${hbEditing?`data-hbe="${h.id}"`:`data-hbt="${h.id}" aria-pressed="${s.dt}"`}><span class="hc-dot">${ICK}</span><span class="hb-tx"><b>${hbName(h)}</b><small data-hbs>${hbEditing?daysLabel(h.days):hbText(s)}</small></span>${next?'<span class="hc-next">next</span>':''}${hbEditing?CHEV:''}</button>`}).join('')}</div></div>`}
/* habits in chains first (when chains are on), then the rest as sunrise rows */
function hbBlock(hs){
  if(!chainsOn())return hs.length?`<div class="hb-card${hbEditing?' hb-editing':''}">${hs.map(hbRow).join('')}</div>`:'';
  const order=[],by=new Map(),solo=[];
  hs.forEach(h=>{const c=hbChainOf(h);if(c){if(!by.has(c.id)){by.set(c.id,[]);order.push(c)}by.get(c.id).push(h)}else solo.push(h)});
  return order.map(c=>hbChainCard(c,by.get(c.id))).join('')+(solo.length?`<div class="hb-card${hbEditing?' hb-editing':''}">${solo.map(hbRow).join('')}</div>`:'');
}
function hbAdd(sp){return hbAll().length<HB_MAX?`<button class="hb-add" data-hbnew="${sp||''}">${PLUS_S}New habit</button>`:`<p class="hb-note">${HB_MAX} habits is the most. Fewer habits, kept every day, beat many.</p>`}
/* one list for a set of habits; grouped by space when they come from more than one */
function hbList(hs,grouped,sp){
  const sps=[...new Set(hs.map(h=>h.space))];
  const body=grouped&&sps.length>1?orderedSpaces().filter(x=>sps.includes(x.id)).map(x=>`<div class="hb-grp"><span class="sp-mini" style="background:${x.c}">${x.e?esc(x.e):esc((x.name[0]||'?').toUpperCase())}</span>${esc(x.name)}</div>${hbBlock(hs.filter(h=>h.space===x.id))}`).join(''):hbBlock(hs);
  return body+hbAdd(sp);
}
function hbActs(hs){const left=hbOpenToday(hs).length;
  return `<div class="hb-acts">${left&&!hbEditing?`<button class="hb-ci" data-ciopen>${RH_ICON}Check in</button>`:''}<button class="txt-btn hb-edit" data-hbedit>${hbEditing?'Done':'Edit'}</button></div>`}
function hbSubLine(hs){const c=hbCount(hs),best=hbBest(hs);
  return `${c.total?`<b>${c.done} of ${c.total}</b> done today`:'Nothing due today'}${best>1?` · best run <b>${best}</b> days`:''}`}
function hbHeadBig(hs,eye,title){
  return `<div class="hb-head"><span class="eye">${eye}</span><h1 class="hb-h">${title}</h1>${hs.length?`<div class="hb-sub">${hbSubLine(hs)}</div>${hbActs(hs)}`:''}</div>`}
/* the "year fabric": one square per week for the last 26 weeks, greener = more of that week's days kept */
function hbFabric(hs){
  const W=26,t0=hbNoon(new Date()),mon=new Date(t0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
  const first=new Date(mon);first.setDate(first.getDate()-(W-1)*7);
  const mo=d=>d.toLocaleDateString(undefined,{month:'short'});
  const rows=hs.map(h=>{const born=hbNoon(h.created||Date.now());let cells='';
    for(let w=W-1;w>=0;w--){let due=0,dn=0;for(let k=0;k<7;k++){const d=new Date(mon);d.setDate(d.getDate()-w*7+k);if(d>t0||d<born||!hbDue(h,d))continue;due++;if(h.done[dkey(d)])dn++}
      cells+=`<i class="${!due?'x':!dn?'':dn/due<.34?'a':dn/due<.67?'b':'c'}"></i>`}
    return `<div class="fab-row"><span>${hbName(h)}</span><div class="fab-g">${cells}</div></div>`}).join('');
  return `<div class="hbw-card"><div class="hbw-cap"><span>Last 6 months</span><span>${mo(first)} → ${mo(t0)}</span></div><div class="fab-rows">${rows}</div>
    <div class="fab-leg"><span>Each square is a week. Greener means more days kept.</span><span>Less<i></i><i class="a"></i><i class="b"></i><i class="c"></i>More</span></div></div>`}
function hbKpis(hs){
  const t0=hbNoon(new Date()),mon=new Date(t0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));let due=0,dn=0;
  hs.forEach(h=>{const born=hbNoon(h.created||Date.now());for(let d=new Date(mon);d<=t0;d.setDate(d.getDate()+1)){if(d<born||!hbDue(h,d))continue;due++;if(h.done[dkey(d)])dn++}});
  const up=hs.filter(h=>hbStats(h).lvl>=7).length;
  let steady=null,bestR=-1;hs.forEach(h=>{let a=0,b=0;for(let i=0;i<30;i++){const d=hbDays(i);if(d<hbNoon(h.created||Date.now())||!hbDue(h,d))continue;a++;if(h.done[dkey(d)])b++}const r=a?b/a:0;if(a&&r>bestR){bestR=r;steady=h}});
  const k=(l,v)=>`<div class="hbw-kpi"><small>${l}</small><b>${v}</b></div>`;
  return `<div class="hbw-kpis">${k('This week',`${dn} / ${due}`)}${k('Best run',`${hbBest(hs)} days`)}${k('Suns fully up',`${up} of ${hs.length}`)}${k('Most steady',steady?hbName(steady):'—')}</div>`}

/* ---------- lens: Board · Habits inside a space ---------- */
/* modes that are on and used in a space each add a tab; with none, there is no switch at all */
function lensTabs(sp){if(!sp||sp==='all'||modePage())return [];const t=[];if(habitsOn()&&hbIn(sp).length)t.push('habits');if(goalsOn()&&gIn(sp).length)t.push('goals');if(projectsOn()&&pIn(sp).length)t.push('projects');return t}
const lensAvail=sp=>lensTabs(sp).length>0;
const lensOf=sp=>{const t=lensTabs(sp),v=S.lens&&S.lens[sp];return t.includes(v)?v:'board'};
function lensSwitch(sp){const cur=lensOf(sp),tab=(k,label,badge)=>`<button role="tab" data-lens="${k}" class="${cur===k?'on':''}" aria-selected="${cur===k}">${label}${badge?`<i>${badge}</i>`:''}</button>`;
  return `<div class="lens-sw" role="tablist" aria-label="View">${tab('board','Board')}${lensTabs(sp).map(k=>k==='habits'?tab('habits','Habits',hbOpenToday(hbIn(sp)).length):k==='goals'?tab('goals','Goals'):tab('projects','Projects')).join('')}</div>`}
function modesAny(){return habitsOn()||goalsOn()||projectsOn()}
function rhythmAvail(){return modesAny()&&modePage()}
const weekday=()=>new Date().toLocaleDateString(undefined,{weekday:'long'});
const longDate=()=>new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
function modesRender(){
  if(rhOn&&!rhythmAvail())closeRhythm();
  if(ciOn&&!habitsOn())closeCheckin(true);
  const sp=inSpaceMode()?S.space:null,avail=lensAvail(sp),cur=avail?lensOf(sp):'board',hs=cur==='habits'?hbIn(sp):[];
  if(cur!=='board')root.dataset.lens=cur;else delete root.dataset.lens;
  const m=$('mLens');m.hidden=!avail;m.innerHTML=avail?lensSwitch(sp):'';
  const d=$('dLens');d.hidden=!avail;d.innerHTML=avail?lensSwitch(sp):'';
  const hv=$('hbView'),hd=$('hbDesk');hv.hidden=hd.hidden=cur==='board';
  hv.innerHTML=cur==='habits'?hbHeadBig(hs,`Habits · ${weekday()}`,'Today')+hbList(hs,false,sp):cur==='goals'?goalsLens(sp,false):cur==='projects'?projectsLens(sp,false):'';
  hd.innerHTML=cur==='habits'?`<div class="hbw"><div class="hbw-l"><div class="hbw-bar"><span class="eye">Today · ${weekday()}</span>${hbActs(hs)}</div>${hbList(hs,false,sp)}</div><div class="hbw-r">${hbFabric(hs)}${hbKpis(hs)}</div></div>`:cur==='goals'?goalsLens(sp,true):cur==='projects'?projectsLens(sp,true):'';
  if(cur==='habits')$('mSub').innerHTML=hbSubLine(hs);if(cur==='goals')$('mSub').innerHTML=gSubLine(gIn(sp));if(cur==='projects')$('mSub').innerHTML=pSubLine(pIn(sp));
  if(rhOn)drawRhythm();
  const lh=$('lmHabit');if(lh)lh.hidden=!(habitsOn()&&inSpaceMode());const lg=$('lmGoal');if(lg)lg.hidden=!(goalsOn()&&inSpaceMode());
}
document.querySelector('#spaceView').insertAdjacentHTML('afterbegin','<div class="lens-m" id="mLens" hidden></div>');
document.querySelector('#spaceView').insertAdjacentHTML('beforeend','<div class="hb-view" id="hbView" hidden></div>');
$('srchChip').insertAdjacentHTML('beforebegin','<div class="lens-d" id="dLens" hidden></div>');
$('board').insertAdjacentHTML('afterend','<div class="hb-desk" id="hbDesk" hidden></div>');
$('lmEdit').insertAdjacentHTML('afterend',`<button id="lmHabit" type="button" role="menuitem" hidden><span class="lpm-i">${RH_ICON}</span>Add a habit</button>`);

/* ---------- Home: evening check-in card, habits widget, Inbox/Rhythm rows, sidebar ---------- */
function ciCard(){
  if(!habitsOn()||C().hbCi===false||S.ciSkip===today())return '';
  const at=+C().hbCiAt;if(new Date().getHours()<(Number.isFinite(at)?at:19))return '';
  const n=hbOpenToday().length;if(!n)return '';
  return `<div class="ci-home"><span class="ci-hi">${hbSun(3,false)}</span><span class="ci-ht"><b>Evening check-in</b><small>${n} ${n===1?'habit':'habits'} left today</small></span>
    <button class="rv-skip" data-cilater>Later</button><button class="rv-go" data-ciopen>Start</button></div>`}
function hbWidget(){
  if(!habitsOn()||!C().wHabits)return '';const hs=hbAll();if(!hs.length)return '';
  const left=hbOpenToday(hs).length;
  return `<div class="hbwid"><button class="hbwid-h" data-hbopen><span class="eye">Habits</span><span class="hbwid-n">${left?`${left} left today`:'All done today'}</span>${CHEV}</button>
    <div class="hbwid-suns">${hs.map(h=>{const s=hbStats(h);return `<button class="hbwid-s${s.dt?' on':''}" data-hbt="${h.id}" aria-pressed="${s.dt}" title="${esc(h.name)}" aria-label="${esc(h.name)}">${hbSun(s.lvl,s.dt)}<span>${h.e?esc(h.e):esc((h.name[0]||'•').toUpperCase())}</span></button>`}).join('')}</div></div>`}
function homeNav(){const rows=[];
  if(inboxOn()){const n=inboxItems().length;rows.push(`<button class="ib-entry" id="ibEntry"><span class="ib-entry-i">${IB_ICON}</span><span class="ib-entry-t"><b>Inbox</b><small>${n?`${n} ${n===1?'idea':'ideas'} waiting`:'Drop ideas here'}</small></span>${CHEV}</button>`)}
  if(rhythmAvail()){const n=habitsOn()?hbOpenToday().length:0,has=habitsOn()&&hbAll().length,gs=goalsOn()?gAll().length:0,ps=projectsOn()?pAll().length:0;
    const sub=has?(n?`${n} ${n===1?'habit':'habits'} left today`:'All habits done today'):gs?`${gs} ${gs===1?'goal':'goals'} in progress`:ps?`${ps} ${ps===1?'project':'projects'} active`:'Habits, goals and projects live here';
    rows.push(`<button class="ib-entry" id="rhEntry"><span class="ib-entry-i">${RH_ICON}</span><span class="ib-entry-t"><b>Rhythm</b><small>${sub}</small></span>${CHEV}</button>`)}
  return rows.length?`<div class="hn">${rows.join('')}</div>`:''}
function rhythmSide(){if(!rhythmAvail())return '';const n=habitsOn()?hbOpenToday().length:0;
  return `<button class="s-list s-home s-inbox ${rhOn?'on':''}" id="sRhythm" title="Rhythm">${RH_ICON}<span class="s-name">Rhythm</span>${n?`<span class="n">${n}</span>`:''}</button>`}
function hbPopItem(sp){return (habitsOn()?`<button data-hbadd="${sp}">Add a habit</button>`:'')+(goalsOn()?`<button data-gadd="${sp}">Add a goal</button>`:'')+(projectsOn()?`<button data-padd="${sp}">Add a project</button>`:'')}
/* open "your habits": the Rhythm page, or the space with the most habits left today */
function hbOpenHabits(){
  if(modePage())return openRhythm();
  const hs=hbAll();if(!hs.length)return;
  const best=orderedSpaces().map(x=>[x.id,hbOpenToday(hbIn(x.id)).length,hbIn(x.id).length]).filter(r=>r[2]).sort((a,b)=>b[1]-a[1])[0];
  if(best)hbShowSpace(best[0]);
}
function hbShowSpace(sp){if(ibOn)closeInbox();if(rhOn)closeRhythm();if(S.space!==sp)openSpace(sp);S.lens={[sp]:'habits'};hbEditing=false;render();window.scrollTo(0,0)}

/* ---------- Rhythm page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg" id="rhythmPg" role="region" aria-label="Rhythm"><div class="ib-in" id="rhIn"></div></div>');
function openRhythm(){
  if(!rhythmAvail())return;
  if(ibOn)closeInbox();if(typeof closeSearch==='function')closeSearch();
  rhOn=true;hbEditing=false;drawRhythm();$('rhythmPg').classList.add('on');document.body.classList.add('ib-open');
  $('rhythmPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
}
function closeRhythm(){
  if(!rhOn)return;rhOn=false;hbEditing=false;$('rhythmPg').classList.remove('on');if(!ibOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#rhythmPg'))a.blur();
  if(typeof renderDesk==='function')renderDesk();
}
function drawRhythm(){
  const y=$('rhythmPg').scrollTop,hOn=habitsOn(),hs=hOn?hbAll():[];
  const habits=!hOn?'':hs.length?`<div class="hbw"><div class="hbw-l">${hbList(hs,true,'')}</div><div class="hbw-r">${hbFabric(hs)}${hbKpis(hs)}</div></div>`
      :`<div class="ib-empty rh-empty">${hbSun(4,true)}<b>No habits yet</b><span>Small daily wins, one tap each. Your sun rises a little every day you show up.</span><button class="primary" data-hbnew="">New habit</button></div>`;
  const wide=matchMedia('(min-width:1100px)').matches,gOn=goalsOn(),pOn=projectsOn(),many=[hOn,gOn,pOn].filter(Boolean).length>1;
  const head=hOn?hbHeadBig(hs,longDate(),'Rhythm'):`<div class="hb-head"><span class="eye">${longDate()}</span><h1 class="hb-h">Rhythm</h1><div class="hb-sub">${gOn?gSubLine(gAll()):pSubLine(pAll())}</div></div>`;
  $('rhIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="rhBack" aria-label="Back">${BACK_SVG}</button></div>${head}
    ${hOn&&many?`<h2 class="rh-sec">Habits</h2>`:''}${habits}${gOn?`${many?'<h2 class="rh-sec">Goals</h2>':''}${goalsBlock(gAll(),'',wide)}`:''}${pOn?`${many?'<h2 class="rh-sec">Projects</h2>':''}${projectsBlock(pAll(),'',wide)}`:''}`;
  $('rhythmPg').scrollTop=y;
}
$('rhythmPg').addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('.sheet.on')){e.stopPropagation();closeRhythm()}});

/* ---------- tick a habit: the sun rises in place, the rest of the screen catches up a moment later ---------- */
let hbRefreshT=null;
function hbPaint(el,s){el.classList.toggle('on',s.dt);el.setAttribute('aria-pressed',s.dt);
  const sun=el.querySelector('.hb-sun');if(sun){sun.classList.toggle('on',s.dt);sun.querySelector('.dg').style.transform=`translateY(${(-s.lvl*12/7).toFixed(2)}px)`;sun.querySelector('.rays').style.opacity=s.lvl>=7?1:0}
  const t=el.querySelector('[data-hbs]');if(t)t.textContent=hbText(s)}
function hbToggle(id,force){
  const h=hbById(id);if(!h)return;h.done=h.done||{};const k=today(),on=force===undefined?!h.done[k]:force;
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
$('ciPg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeCheckin()}});

/* ---------- habit editor ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="hbSheet"><div class="sheet-in">
  <div class="grab"></div><h2 id="hbTitle">New habit</h2>
  <div class="sp-form"><span class="sp-prev hb-prev" id="hbPrev" role="button" aria-label="Choose an icon"></span><input class="field sp-name-in" id="hbName" placeholder="Habit name" maxlength="40" autocomplete="off" enterkeyhint="done"></div>
  <div class="le-card sp-opts" id="hbOpts"></div>
  <button class="primary" id="hbSave" disabled>Add habit</button>
  <div class="le-acts" id="hbDelW" hidden><button class="le-btn warn hb-del" id="hbDel" type="button">Delete habit</button></div>
</div></div>
<div class="sheet" id="hcSheet"><div class="sheet-in">
  <div class="grab"></div><h2>Edit chain</h2>
  <div class="lbl">Name</div><input class="field hc-in" id="hcName" maxlength="30" autocomplete="off" placeholder="Morning">
  <div class="lbl">It starts when</div><input class="field hc-in" id="hcWhen" maxlength="40" autocomplete="off" placeholder="I finish my coffee">
  <div class="lbl">Order</div><div class="hc-ord" id="hcOrd"></div>
  <button class="primary" id="hcSave">Save</button>
  <div class="le-acts"><button class="le-btn warn hb-del" id="hcDel" type="button">Remove chain</button></div>
</div></div>`);
let hbDraft=null,hbSub=null,hcDraft=null;
function openHabit(id,sp){
  const h=id?hbById(id):null;
  if(!h&&hbAll().length>=HB_MAX){toast(`Up to ${HB_MAX} habits. Fewer, kept daily, beat many.`);return}
  const sps=orderedSpaces();
  hbDraft=h?{...h,days:[...(h.days||[0,1,2,3,4,5,6])],chain:h.chain||null,newChain:null}
    :{id:null,name:'',e:'',space:(sp&&spaceOf(sp)?sp:inSpaceMode()?S.space:(sps[0]||{}).id),days:[0,1,2,3,4,5,6],chain:null,newChain:null};
  hbDraft.touched=!!(h&&h.e);hbSub=null;
  $('hbTitle').textContent=h?'Edit habit':'New habit';$('hbName').value=hbDraft.name;$('hbDelW').hidden=!h;
  drawHabitSheet();openSheet('hbSheet');setTimeout(()=>{if($('hbSheet').classList.contains('on')&&!h)$('hbName').focus()},300);
}
function drawHabitSheet(){
  const d=hbDraft,sp=spaceOf(d.space)||{};
  $('hbSave').textContent=d.id?'Save':'Add habit';$('hbSave').disabled=!d.name.trim();
  $('hbPrev').innerHTML=d.e?esc(d.e):hbSun(3,true);
  const chs=(S.hchains||[]).filter(c=>c.space===d.space);
  const chName=d.newChain?d.newChain:d.chain?(chById(d.chain)||{}).name:'';
  $('hbOpts').innerHTML=
    lxRow('i','Icon',`<span class="lx-ico">${d.e?esc(d.e):'Auto'}</span>`,`<div class="ico-grid" id="hbIcons"><button data-hbico="" class="ico-none ${!d.e?'on':''}" aria-label="No icon">–</button>${HB_ICONS.map(i=>`<button data-hbico="${i}" class="${d.e===i?'on':''}" aria-label="Icon ${i}">${i}</button>`).join('')}</div>`,hbSub==='i')+
    lxRow('d','Days',`<span class="lx-t">${daysLabel(d.days)}</span>`,`<div class="hb-days">${[1,2,3,4,5,6,0].map(n=>`<button data-hday="${n}" class="${d.days.includes(n)?'on':''}" aria-pressed="${d.days.includes(n)}" aria-label="${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][n]}">${'SMTWTFS'[n]}</button>`).join('')}</div>
      <div class="hb-pre"><button data-hdp="all">Every day</button><button data-hdp="wk">Weekdays</button><button data-hdp="we">Weekends</button></div>`,hbSub==='d')+
    (S.spaces.length>1?lxRow('s','Space',`${spMini(sp)}<span class="lx-t">${esc(sp.name||'')}</span>`,`<div class="lx-list">${orderedSpaces().map(x=>`<button class="lx-opt${d.space===x.id?' on':''}" data-hbsp="${x.id}">${spMini(x)}<span>${esc(x.name)}</span>${d.space===x.id?tick():''}</button>`).join('')}</div>`,hbSub==='s'):'')+
    (chainsOn()?lxRow('c','Chain',`<span class="lx-t">${chName?esc(chName):'None'}</span>`,`<div class="lx-list"><button class="lx-opt${!d.chain&&!d.newChain?' on':''}" data-hbch=""><span>None</span>${!d.chain&&!d.newChain?tick():''}</button>
      ${chs.map(c=>{const on=d.chain===c.id&&!d.newChain,n=(S.habits||[]).filter(x=>x.chain===c.id&&x.id!==d.id).length;return `<button class="lx-opt${on?' on':''}" data-hbch="${c.id}"><span>${esc(c.name)}<small> · ${n} ${n===1?'habit':'habits'}</small></span>${on?tick():''}</button>`}).join('')}
      ${d.newChain?`<button class="lx-opt on" data-hbch="__new"><span>${esc(d.newChain)}<small> · new</small></span>${tick()}</button>`:''}</div>
      <div class="hb-newch"><input id="hbChName" placeholder="New chain, e.g. Morning" maxlength="30" autocomplete="off" enterkeyhint="done"><button id="hbChAdd" type="button">Add</button></div>`,hbSub==='c'):'');
}
function hbNewChain(){const i=$('hbChName'),v=(i&&i.value||'').trim();if(!v)return;hbDraft.newChain=v;hbDraft.chain=null;haptic(5);drawHabitSheet()}
$('hbOpts').addEventListener('click',e=>{
  const t=e.target.closest('[data-lxt]');if(t){lxToggle(t,v=>hbSub=v);return}
  const d=hbDraft;if(!d)return;
  const ic=e.target.closest('[data-hbico]');if(ic){d.e=ic.dataset.hbico;d.touched=true;haptic(5);return drawHabitSheet()}
  const dy=e.target.closest('[data-hday]');if(dy){const n=+dy.dataset.hday;if(d.days.includes(n)){if(d.days.length>1)d.days=d.days.filter(x=>x!==n);else toast('A habit needs at least one day')}else d.days.push(n);haptic(4);return drawHabitSheet()}
  const dp=e.target.closest('[data-hdp]');if(dp){d.days={all:[0,1,2,3,4,5,6],wk:[1,2,3,4,5],we:[0,6]}[dp.dataset.hdp].slice();haptic(4);return drawHabitSheet()}
  const sp=e.target.closest('[data-hbsp]');if(sp){if(d.space!==sp.dataset.hbsp){d.space=sp.dataset.hbsp;d.chain=null;d.newChain=null}haptic(5);return drawHabitSheet()}
  const ch=e.target.closest('[data-hbch]');if(ch){const v=ch.dataset.hbch;if(v!=='__new'){d.chain=v||null;d.newChain=null}haptic(5);return drawHabitSheet()}
  if(e.target.closest('#hbChAdd'))return hbNewChain();
});
$('hbOpts').addEventListener('keydown',e=>{if(e.target.id==='hbChName'&&e.key==='Enter'){e.preventDefault();hbNewChain()}});
$('hbPrev').onclick=()=>{const t=$('hbOpts').querySelector('[data-lxt="i"]');if(t&&hbSub!=='i')lxToggle(t,v=>hbSub=v)};
$('hbName').oninput=e=>{hbDraft.name=e.target.value;if(!hbDraft.touched)hbDraft.e=hbIcon(hbDraft.name);drawHabitSheet()};
$('hbName').onkeydown=e=>{if(e.key==='Enter'&&hbDraft.name.trim())$('hbSave').click()};
function cleanChains(){S.hchains=(S.hchains||[]).filter(c=>(S.habits||[]).some(h=>h.chain===c.id))}
$('hbSave').onclick=()=>{
  const d=hbDraft;if(!d||!d.name.trim()||!spaceOf(d.space))return;
  const name=d.name.trim(),wasNew=!d.id,inSet=settingsOpen();
  let cid=d.newChain?null:d.chain;
  if(cid&&(S.habits||[]).filter(x=>x.chain===cid&&x.id!==d.id).length>=CHAIN_MAX){toast(`A chain holds up to ${CHAIN_MAX} habits`);return}
  closeSheets();
  commit(()=>{
    S.habits=S.habits||[];S.hchains=S.hchains||[];
    if(d.newChain){const c={id:'c'+newId(),name:d.newChain,when:'',space:d.space};S.hchains.push(c);cid=c.id}
    const days=d.days.length?[...d.days].sort():[0,1,2,3,4,5,6];
    if(d.id){const h=hbById(d.id);if(!h)return;Object.assign(h,{name,e:d.e,space:d.space,days});if(cid)h.chain=cid;else delete h.chain}
    else S.habits.push({id:'h'+newId(),name,e:d.e,space:d.space,days,done:{},created:Date.now(),...(cid?{chain:cid}:{})});
    cleanChains();
  },wasNew?`${name} added`:'Habit saved');
  if(inSet)drawSettings();
  else if(wasNew&&!modePage()&&!rhOn)hbShowSpace(d.space);
};
$('hbDel').onclick=()=>{const d=hbDraft;if(!d||!d.id)return;const h=hbById(d.id);if(!h)return;
  confirmAsk({title:`Delete ${h.name}?`,text:'Its streak history goes too. This can’t be undone after you leave.',yes:'Yes, delete',no:'No',
    onYes:()=>{closeSheets();const inSet=settingsOpen();commit(()=>{S.habits=S.habits.filter(x=>x!==h);cleanChains()},`${h.name} deleted`);if(inSet)drawSettings()}})};
/* chain sheet: name, when, order */
function openChain(id){const c=chById(id);if(!c)return;hcDraft={id:c.id,name:c.name||'',when:c.when||'',order:(S.habits||[]).filter(h=>h.chain===c.id).map(h=>h.id)};
  $('hcName').value=hcDraft.name;$('hcWhen').value=hcDraft.when;drawChainOrder();openSheet('hcSheet')}
function drawChainOrder(){const o=hcDraft.order;
  $('hcOrd').innerHTML=o.map((id,i)=>{const h=hbById(id);return h?`<div><span class="hc-i">${i+1}</span><span class="hc-n">${hbName(h)}</span><button data-hcup="${i}" ${i?'':'disabled'} aria-label="Move up">${UP_S}</button><button data-hcdn="${i}" ${i<o.length-1?'':'disabled'} aria-label="Move down">${DN_S}</button></div>`:''}).join('')}
$('hcOrd').onclick=e=>{const u=e.target.closest('[data-hcup]'),d=e.target.closest('[data-hcdn]');if(!u&&!d)return;const i=+(u?u.dataset.hcup:d.dataset.hcdn),j=u?i-1:i+1,o=hcDraft.order;
  if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];haptic(4);drawChainOrder()};
$('hcSave').onclick=()=>{const d=hcDraft;if(!d)return;const name=$('hcName').value.trim()||'Chain',when=$('hcWhen').value.trim().replace(/^when\s+/i,'');closeSheets();
  commit(()=>{const c=chById(d.id);if(!c)return;c.name=name;c.when=when;
    // put the chain's habits in the chosen order, where the first of them sat
    const ids=d.order.map(String),firstAt=S.habits.findIndex(h=>ids.includes(String(h.id)));if(firstAt<0)return;
    const picked=d.order.map(id=>hbById(id)).filter(Boolean),rest=S.habits.filter(h=>!ids.includes(String(h.id)));
    rest.splice(Math.min(firstAt,rest.length),0,...picked);S.habits=rest},'Chain saved');if(settingsOpen())drawSettings()};
$('hcDel').onclick=()=>{const d=hcDraft;if(!d)return;closeSheets();commit(()=>{S.habits.forEach(h=>{if(h.chain===d.id)delete h.chain});cleanChains()},'Chain removed. The habits stay.');if(settingsOpen())drawSettings()};
$('hcSheet').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.hc-in')){e.preventDefault();$('hcSave').click()}});

/* ---------- Settings → Modes ---------- */
function modesSummary(){const on=[habitsOn()&&'Habits',goalsOn()&&'Goals',projectsOn()&&'Projects'].filter(Boolean);return on.length?`${on.length>2?on.slice(0,-1).join(', ')+' and '+on[on.length-1]:on.join(' and ')} on · ${modePage()?'Rhythm page':'in spaces'}`:'All off'}
function modesPage(){
  const c=C(),on=habitsOn(),n=hbAll().length,g=goalsOn(),gn=gAll().length,pj=projectsOn(),pn=pAll().length,any=on||g||pj;
  return `<p class="sub-p">Extra ways to use Windaday. Turn a mode off and it disappears everywhere. Your data stays safe and comes back when you turn it on again.</p>
  <div class="set-sec"><h3>Modes</h3>${row('Habits',tg('habits'),'Small daily wins with gentle sunrise streaks')}${row('Goals',tg('goals'),'Big outcomes, broken into milestones you can climb')}${row('Projects',tg('projects'),'Count what matters each week, or build in phases')}</div>
  ${any?`<div class="set-sec"><h3>Where modes live</h3>${row('Show modes',`<div class="segc">${sOpt('modePlace','spaces','In spaces')}${sOpt('modePlace','page','Rhythm page')}</div>`,modePage()?'One calm page under Inbox for your habits and goals.':'A switch (Board · Habits · Goals · Projects) appears in spaces that use them.')}</div>`:''}
  ${on?`<div class="set-sec"><h3>Habits</h3><button class="link-row" data-page="habits">Your habits<span class="hint">${n?`${n} of ${HB_MAX}`:'None yet'}${CHEV}</span></button>
    ${row('Habit chains',tg('hbChains'),'Link habits so one leads to the next, like coffee → read → plan')}
    ${row('Evening check-in',tg('hbCi'),'A short card on Home in the evening when habits are left')}
</div>
`:''}
  ${g?`<div class="set-sec"><h3>Goals</h3><button class="link-row" data-page="goals">Your goals<span class="hint">${gn?`${gn} of ${G_MAX} active`:'None yet'}${CHEV}</span></button>
    ${row('Goal view',`<div class="segc">${sOpt('gView','climb','The climb')}${sOpt('gView','ladder','Why ladder')}</div>`,'How a goal opens. You can switch inside each goal too.')}</div>`:''}
  ${pj?`<div class="set-sec"><h3>Projects</h3><button class="link-row" data-page="projects">Your projects<span class="hint">${pn?`${pn} of ${P_MAX} active`:'None yet'}${CHEV}</span></button>
    ${row('Numbers view',`<div class="segc">${sOpt('pView','gauges','Gauges')}${sOpt('pView','flow','Flow')}</div>`,'How number projects open. You can switch inside each one.')}
    ${row('Scoreboard',tg('pScore'),'Hits and misses for the last 8 weeks on each project')}</div>`:''}
  ${on||g?`<div class="set-sec"><h3>Home widgets</h3>${g?row('North star',tg('wStar'),'Your starred goal under the Today card'):''}${on?row('Habits today',tg('wHabits'),'Your suns on Home. Tap one to tick it.'):''}</div>`:''}`;
}
function habitsSetPage(){
  const hs=hbAll();
  const groups=orderedSpaces().map(sp=>{const g=hs.filter(h=>h.space===sp.id);if(!g.length)return '';
    return `<div class="set-sec"><h3>${sp.e?esc(sp.e)+' ':''}${esc(sp.name)}</h3>${g.map(h=>`<button class="link-row" data-hbe="${h.id}"><span class="hs-n">${hbName(h)}</span><span class="hint">${daysLabel(h.days)}${CHEV}</span></button>`).join('')}</div>`}).join('');
  const chs=chainsOn()?(S.hchains||[]).filter(c=>hs.some(h=>h.chain===c.id)):[];
  return `<p class="sub-p">Up to ${HB_MAX} habits, so each one gets real attention. Tap one to change it.</p>${groups||'<p class="sub-p hs-none">No habits yet.</p>'}
    ${chs.length?`<div class="set-sec"><h3>Chains</h3>${chs.map(c=>{const n=hs.filter(h=>h.chain===c.id).length;return `<button class="link-row" data-hce="${c.id}">${esc(c.name)}<span class="hint">${n} ${n===1?'habit':'habits'}${CHEV}</span></button>`}).join('')}</div>`:''}
    ${hs.length<HB_MAX?`<button class="primary hs-new" data-hbnew="">New habit</button>`:''}`;
}

/* ---------- taps (capture, so a habit inside a space card or settings row never also opens something else) ---------- */
document.addEventListener('click',e=>{
  if(e.target.closest('#listsMore')){const lh=$('lmHabit');if(lh)lh.hidden=!(habitsOn()&&inSpaceMode());const lg=$('lmGoal');if(lg)lg.hidden=!(goalsOn()&&inSpaceMode());return}
  const el=e.target.closest('[data-hbt],[data-hbe],[data-hce],[data-hbnew],[data-hbedit],[data-ciopen],[data-cilater],button[data-lens],[data-hbadd],[data-hbopen],#rhEntry,#rhBack,#lmHabit,#ciBack,[data-ciyes],[data-cino],[data-ciclose]');
  if(!el)return;
  if(el.closest('.sheet')&&!el.closest('#hbSheet,#hcSheet')&&!el.matches('#lmHabit'))return;
  e.stopPropagation();e.preventDefault();
  if(el.matches('[data-hbt]'))return hbToggle(el.dataset.hbt);
  if(el.matches('[data-hbe]'))return openHabit(el.dataset.hbe);
  if(el.matches('[data-hce]'))return openChain(el.dataset.hce);
  if(el.matches('[data-hbnew]'))return openHabit(null,el.dataset.hbnew||null);
  if(el.matches('[data-hbedit]')){hbEditing=!hbEditing;haptic(5);return render()}
  if(el.matches('[data-ciopen]'))return openCheckin();
  if(el.matches('[data-cilater]')){S.ciSkip=today();save();render();toast('Okay. It’ll be back tomorrow evening.');return}
  if(el.matches("button[data-lens]")){if(!inSpaceMode())return;S.lens={[S.space]:['habits','goals','projects'].includes(el.dataset.lens)?el.dataset.lens:'board'};hbEditing=false;haptic(5);render();window.scrollTo(0,0);return}
  if(el.matches('[data-hbadd]')){closePops();return openHabit(null,el.dataset.hbadd)}
  if(el.matches('[data-hbopen]'))return hbOpenHabits();
  if(el.matches('#rhEntry'))return openRhythm();
  if(el.matches('#rhBack'))return closeRhythm();
  if(el.matches('#lmHabit')){$('listsPop').classList.remove('on');const sp=S.space;closeSheets();setTimeout(()=>openHabit(null,sp),260);return}
  if(el.matches('#ciBack')||el.matches('[data-ciclose]'))return closeCheckin();
  if(el.matches('[data-ciyes]'))return ciAnswer(true);
  if(el.matches('[data-cino]'))return ciAnswer(false);
},true);

/* every space change starts on the Board; the lens and overlays follow every redraw */
const _hbOpenSpace=openSpace;openSpace=function(id){S.lens={};hbEditing=false;return _hbOpenSpace(id)};
const _hbRender=render;render=function(d){_hbRender(d);try{modesRender()}catch(err){console.error(err)}};
const _hbDesk=renderDesk;renderDesk=function(){_hbDesk();try{if(!inSpaceMode())return;if(root.dataset.lens==='habits')$('mSub').innerHTML=hbSubLine(hbIn(S.space));if(root.dataset.lens==='goals')$('mSub').innerHTML=gSubLine(gIn(S.space));if(root.dataset.lens==='projects')$('mSub').innerHTML=pSubLine(pIn(S.space))}catch(err){}};
