/* ---------- Wins (optional mode, Settings → Modes) ----------
   A jar that fills itself. Every week it gathers what you already did — tasks finished, habit streaks that hit
   3, 7, 14, 21, 30, 50, 100… days, milestones climbed, goals achieved, days you won (every Today task done) — plus
   wins you add yourself. Phones: a Wins tab. Computers: "Wins" under Modes in the sidebar.
   Your own wins and won days are kept in S.wins ({id, t, at, kind:'mine'|'day'}): synced, backed up and undoable. */
var wnOn=false,wnWeek=0,wnAdding=false;
function winsOn(){return !!(S.cfg&&S.cfg.wins)}
var WN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4M12 13v4M8 20h8"/></svg>';
const WN_I={
  task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  streak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 18.5h17"/><path d="M7.5 18.5a4.5 4.5 0 0 1 9 0"/><path d="M12 6.5V9M6.2 9.6l1.7 1.7M17.8 9.6l-1.7 1.7"/></svg>',
  ms:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4"/><path d="M6 4.5h11l-2.2 4.2L17 13H6"/></svg>',
  goal:WN_ICON,
  day:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" aria-hidden="true"><path d="M12 36a12 12 0 0 1 24 0"/><path d="M5 36h38"/><path d="M24 11v7"/><path d="M12.4 15.4l4 4"/><path d="M35.6 15.4l-4 4"/></svg>',
  mine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>'};
const WN_STREAKS=[3,7,14,21,30,50,100,150,200,250,300,365,500,730,1000];
/* the order highlights are told in (biggest first) */
const WN_RANK={goal:0,ms:1,streak:2,day:3,mine:4,task:5};

/* a habit's streak on one day: due days in a row, done, ending that day (rest days don't break it) */
function wnStreakAt(h,d){const done=h.done||{},born=dkey(new Date(h.created||0));let n=0;const x=new Date(d);x.setHours(12,0,0,0);
  for(let i=0;i<1100;i++){const k=dkey(x);if(k<born)break;if(done[k])n++;else if(hbDue(h,x)){if(i===0)return 0;break}x.setDate(x.getDate()-1)}return n}
/* everything won in one week (off = 0 this week, -1 last week, …) */
function wnCollect(off){
  const days=hpWeekDays(off),keys=days.map(d=>dkey(d)),first=keys[0],last=keys[6],inW=at=>{if(!at)return null;const k=dkey(at);return k>=first&&k<=last?k:null};
  const out=[],add=(kind,t,sub,at,day,extra)=>out.push({kind,t,sub,at,day,...(extra||{})});
  const spName=t=>{const l=listOf(t.list),sp=l&&spaceOf(l.space);return sp?(sp.e?sp.e+' ':'')+sp.name:''};
  const arch=new Set(S.arch||[]);
  [...S.tasks,...arch].forEach(t=>{if(!t||t.note||t.inbox)return;const day=t.stage==='done'||arch.has(t)?inW(t.doneAt):null;
    if(day)add('task',t.title,['Task',spName(t)].filter(Boolean).join(' · '),t.doneAt,day)});
  gList().forEach(g=>{if(!g)return;
    (g.ms||[]).forEach(m=>{const day=m.done&&inW(m.doneAt);if(day)add('ms',`Milestone: ${m.t}`,g.name,m.doneAt,day);
      (m.items||[]).forEach(it=>{const d2=it.done&&inW(it.doneAt);if(d2)add('task',it.t,`Task · ${g.name}`,it.doneAt,d2)})});
    const day=g.done&&inW(g.doneAt);if(day)add('goal',`Goal achieved: ${g.name}`,g.why||'Every step got you here.',g.doneAt,day)});
  if(typeof hbAll==='function')hbAll().forEach(h=>{days.forEach((d,i)=>{if(keys[i]>today()||!(h.done||{})[keys[i]])return;const n=wnStreakAt(h,d);
    if(WN_STREAKS.includes(n))add('streak',`${n} days in a row: ${h.name}`,'Habit streak',null,keys[i],{n})})});
  (S.wins||[]).forEach(w=>{const day=inW(w.at);if(!day)return;
    if(w.kind==='day')add('day','You won the day',w.t||'Every Today task done',w.at,day,{id:w.id});
    else add('mine',w.t,'Added by you',w.at,day,{id:w.id,mine:true})});
  return {days,keys,list:out}}
const wnCounts=list=>{const c={task:0,streak:0,ms:0,day:0,mine:0};list.forEach(w=>{c[w.kind==='goal'?'ms':w.kind]++});return c};
const wnPerDay=(keys,list)=>keys.map(k=>list.filter(w=>w.day===k).length);
const wnBest=(days,per)=>{const m=Math.max(...per);return m?days[per.indexOf(m)].toLocaleDateString(undefined,{weekday:'long'}):''};
const wnWeekLbl=off=>off===0?'This week':off===-1?'Last week':`${-off} weeks ago`;
const wnRange=days=>{const f=d=>d.toLocaleDateString(undefined,{month:'short',day:'numeric'});return `${f(days[0])} – ${f(days[6])}`};
const wnTime=at=>at?new Date(at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'';
const wnThisWeek=()=>wnCollect(0).list.length;

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg wn-pg" id="winsPg" role="region" aria-label="Wins"><div class="ib-in" id="wnIn"></div></div>');
function wnItem(w){
  return `<div class="wn-it"><span class="wn-ic ${w.kind}">${WN_I[w.kind]}</span><span class="wn-tx"><b>${esc(w.t)}</b><small>${esc(w.sub||'')}</small></span>${w.at&&w.kind!=='day'?`<span class="wn-tm">${wnTime(w.at)}</span>`:''}${w.mine?MORE(`data-wnm="${w.id}"`,`Options for ${esc(w.t)}`):''}</div>`}
function drawWins(){if(!wnOn)return;const y=$('winsPg').scrollTop;
  const {days,keys,list}=wnCollect(wnWeek),per=wnPerDay(keys,list),max=Math.max(1,...per),n=list.length,c=wnCounts(list),best=wnBest(days,per),t=today();
  const prev=wnCollect(wnWeek-1).list.length;
  const bars=days.map((d,i)=>{const k=keys[i],h=per[i]?Math.max(10,Math.round(per[i]/max*100)):4,top=per[i]===max&&per[i]>0;
    return `<span class="wn-bar${top?' top':''}${k===t?' now':''}${k>t?' fut':''}"><i style="height:${h}%"></i><small>${d.toLocaleDateString(undefined,{weekday:'short'})}</small></span>`}).join('');
  const chip=(v,l1,l2)=>v?`<span class="wn-chip"><b>${v}</b> ${v===1?l1:l2}</span>`:'';
  const chips=[chip(c.task,'task','tasks'),chip(c.streak,'streak','streaks'),chip(c.ms,'milestone','milestones'),chip(c.day,'won day','won days'),chip(c.mine,'of yours','of yours')].join('');
  const groups=keys.map((k,i)=>({k,d:days[i],ws:list.filter(w=>w.day===k).sort((a,b)=>(WN_RANK[a.kind]-WN_RANK[b.kind])||((b.at||0)-(a.at||0)))})).filter(g=>g.ws.length).reverse();
  const addRow=wnAdding?`<div class="wn-add on"><span class="wn-ic mine">${WN_I.mine}</span><input id="wnNew" placeholder="What went well?" maxlength="120" enterkeyhint="done" autocomplete="off" aria-label="Your win"><button class="ib-cap-go wn-go" data-wnsave aria-label="Add win">${I_UP}</button></div>`
    :`<button class="wn-add" data-wnadd><span class="wn-pl">${PLUS_S}</span>Add a win of your own</button>`;
  const sum=n?`<b>${n}</b> ${n===1?'win':'wins'}${wnWeek===0?' so far':''}${best?` · best day <b>${best}</b>`:''}`:wnWeek===0?'Nothing in the jar yet this week':'A quiet week';
  const nav=`<div class="hp-nav"><button class="pm-btn" data-wnw="-1" aria-label="Previous week">${ARR_L}</button><button class="pm-btn" data-wnw="1" aria-label="Next week" ${wnWeek>=0?'disabled':''}>${ARR_R}</button></div>`;
  $('wnIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="wnBack" aria-label="Back">${BACK_SVG}</button></div>
    <div class="wn-head"><div><span class="pg-eye">${wnWeekLbl(wnWeek)} · ${wnRange(days)}</span><h1 class="ib-h wn-h">Wins</h1><div class="pg-sum">${sum}</div></div>
      <div class="wn-acts">${nav}${n?`<button class="wn-reelb" data-wnreel>Week reel</button>`:''}</div></div>
    <div class="wn-grid"><div class="wn-l">
      <div class="wn-jar"><div class="wn-jt"><div><span class="pg-eye wn-je">The jar</span><b class="wn-n">${n}</b></div>
        <div class="wn-bars" role="img" aria-label="Wins per day: ${days.map((d,i)=>`${d.toLocaleDateString(undefined,{weekday:'long'})} ${per[i]}`).join(', ')}">${bars}</div></div>
        ${chips?`<div class="wn-chips">${chips}</div>`:''}
        ${!n?`<p class="wn-empty">${wnWeek===0?'Finish a task, keep a habit or climb a milestone and it lands here. Or add a win of your own.':'Nothing was saved that week.'}</p>`:''}</div>
      ${wnWeek===0?addRow:''}
      ${prev||n?`<p class="wn-cmp">${n>prev?`${n-prev} more than the week before.`:n===prev?'Same as the week before.':`The week before had ${prev}. Every win counts.`}</p>`:''}</div>
    <div class="wn-r">${groups.map(g=>`<div class="wn-day"><span class="pg-eye">${g.k===t?'Today':g.d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</span><div class="wn-list">${g.ws.map(wnItem).join('')}</div></div>`).join('')}</div></div>`;
  $('winsPg').scrollTop=y;
  if(wnAdding){const i=$('wnNew');if(i)i.focus({preventScroll:true})}
}
function openWins(){if(!winsOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();if(typeof closeSearch==='function')closeSearch();
  wnOn=true;wnWeek=0;wnAdding=false;drawWins();$('winsPg').classList.add('on');document.body.classList.add('ib-open');$('winsPg').scrollTop=0;haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeWins(){if(!wnOn)return;wnOn=false;wnAdding=false;$('winsPg').classList.remove('on');if(!ibOn&&!rhOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#winsPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function wnSaveNew(){const i=$('wnNew'),v=(i&&i.value||'').trim();if(!v){wnAdding=false;return drawWins()}
  wnAdding=false;S.wins=S.wins||[];const w={id:newId(),t:v.slice(0,120),at:Date.now(),kind:'mine'};
  commit(()=>{S.wins.push(w)},'Win added');try{sfx('done')}catch(e){}haptic([8,30,12]);
  setTimeout(()=>{const el=document.querySelector(`#winsPg [data-wnm="${w.id}"]`);if(el&&typeof moBurst==='function')moBurst(el.closest('.wn-it').querySelector('.wn-ic'),'var(--today)')},60)}
$('winsPg').addEventListener('click',e=>{
  if(e.target.closest('#wnBack'))return closeWins();
  const w=e.target.closest('[data-wnw]');if(w){const nw=wnWeek+ +w.dataset.wnw;if(nw>0)return;wnWeek=nw;wnAdding=false;haptic(4);return drawWins()}
  if(e.target.closest('[data-wnadd]')){wnAdding=true;haptic(4);return drawWins()}
  if(e.target.closest('[data-wnsave]'))return wnSaveNew();
  if(e.target.closest('[data-wnreel]'))return wnReelOpen();
  const m=e.target.closest('[data-wnm]');if(m){e.stopPropagation();const id=+m.dataset.wnm,x=(S.wins||[]).find(v=>v.id===id);if(!x)return;
    cxOpen(m,[{t:'Delete win',ic:BIN_S,warn:1,act:()=>{commit(()=>{S.wins=S.wins.filter(v=>v.id!==id)},'Win deleted');try{sfx('remove')}catch(err){}}}])}});
$('winsPg').addEventListener('keydown',e=>{if(e.target.id!=='wnNew')return;
  if(e.key==='Enter'){e.preventDefault();wnSaveNew()}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();wnAdding=false;drawWins()}});
$('winsPg').addEventListener('focusout',e=>{if(e.target.id!=='wnNew')return;setTimeout(()=>{const i=$('wnNew');if(wnAdding&&i&&document.activeElement!==i&&!i.value.trim()){wnAdding=false;drawWins()}},150)});

/* ---------- the week reel: one warm card with the week's story ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="dlg wn-reel" id="wnReel" role="dialog" aria-modal="true" aria-label="Your week in wins"><div class="dlg-in wn-rin" id="wnRin"></div></div>');
function wnReelOpen(){const {days,keys,list}=wnCollect(wnWeek),per=wnPerDay(keys,list),n=list.length,best=wnBest(days,per),prev=wnCollect(wnWeek-1).list.length;
  const top=list.slice().sort((a,b)=>(WN_RANK[a.kind]-WN_RANK[b.kind])||((b.n||0)-(a.n||0))||((b.at||0)-(a.at||0))).slice(0,3),won=list.filter(w=>w.kind==='day').length;
  const bestN=Math.max(...per);
  $('wnRin').innerHTML=`<div class="wn-rtop"><span class="pg-eye">${wnWeek===0?'Your week in wins':wnWeekLbl(wnWeek)+' in wins'}</span><button class="icon-btn" data-wnrx aria-label="Close">${X}</button></div>
    <div class="wn-rsun">${WN_I.day}</div><b class="wn-rbig">${n}</b><b class="wn-rl">${n===1?'win':'wins'} ${wnWeek===0?'this week':'that week'}</b>
    <p class="wn-rp">${best?`Your best day was <b>${best}</b>, with ${bestN}. `:''}${n>prev?`That's ${n-prev} more than the week before.`:n===prev?'Same as the week before.':'Steady. Every win counts.'}${won?` You won the day ${won} ${won===1?'time':'times'}.`:''}</p>
    <div class="wn-rlist">${top.map(w=>`<div class="wn-rit"><span class="wn-ic ${w.kind}">${WN_I[w.kind]}</span><span class="wn-tx"><b>${esc(w.t)}</b><small>${esc(w.sub||'')}</small></span></div>`).join('')}</div>
    <div class="wn-racts"><button class="primary wn-rgo" data-wnrplan>Plan next week</button><button class="wn-rclose" data-wnrx>Close</button></div>`;
  $('wnReel').classList.add('on');haptic(8);try{sfx('done')}catch(e){}setTimeout(()=>{const b=$('wnRin').querySelector('[data-wnrplan]');b&&b.focus()},80)}
function wnReelClose(){$('wnReel').classList.remove('on')}
$('wnReel').addEventListener('click',e=>{if(e.target.closest('[data-wnrx]')||e.target.id==='wnReel')return wnReelClose();
  if(e.target.closest('[data-wnrplan]')){wnReelClose();closeWins();goHome();const sp=orderedSpaces()[0];if(sp){openSpace(sp.id);S.stage='week';render()}}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('wnReel').classList.contains('on')){e.preventDefault();e.stopImmediatePropagation();wnReelClose()}},true);

/* ---------- a won day goes in the jar: the moment every Today task is done ---------- */
let wnLeft=null;
const _wnRender=render;render=function(d){_wnRender(d);try{
  const left=S.tasks.filter(t=>shown(t)&&t.stage==='today').length;
  if(wnLeft>0&&left===0&&performance.now()-sfxAct<2500&&S.tasks.some(t=>shown(t)&&t.stage==='done'&&t.doneAt&&Date.now()-t.doneAt<4000)){
    S.wins=S.wins||[];const k=today();if(!S.wins.some(w=>w.kind==='day'&&dkey(w.at)===k)){const n=S.tasks.filter(t=>t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===k).length;
      S.wins.push({id:newId(),t:`${n} ${n===1?'task':'tasks'} done`,at:Date.now(),kind:'day'});save()}}
  wnLeft=left;
  if(wnOn){if(!winsOn())closeWins();else drawWins()}}catch(err){console.error(err)}};

/* ---------- computers: "Wins" under Modes in the sidebar ---------- */
const _wnSide=rhythmSide;
rhythmSide=function(){const h=_wnSide();if(!winsOn())return h;const n=wnThisWeek();
  const it=`<button class="s-list s-home s-inbox ${wnOn?'on':''}" id="sWins" title="Wins">${WN_ICON}<span class="s-name">Wins</span>${n?`<span class="n">${n}</span>`:''}</button>`;
  return h?h+it:`<div class="s-lbl2"><span class="s-name">Modes</span></div>${it}`};
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sWins')){e.stopImmediatePropagation();return wnOn?closeWins():openWins()}
  if(wnOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l],#sInbox,#sRhythm,#sGoals,[data-sgoal],[data-sgnew],#sMetrics'))closeWins()},true);
for(const fn of ['openInbox','openRhythm','openGoals','openGoal','goHome','openSpaceSide','openMetrics']){const f=window[fn];if(typeof f!=='function')continue;
  window[fn]=function(){if(wnOn)closeWins();return f.apply(this,arguments)}}
const _wnDesk=renderDesk;renderDesk=function(){_wnDesk.apply(this,arguments);if(wnOn){const h=$('sHome');if(h)h.classList.remove('on')}};
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!wnOn||e.defaultPrevented||$('dlg').classList.contains('on')||document.querySelector('.sheet.on')||$('wnReel').classList.contains('on'))return;
  if(e.target&&e.target.id==='wnNew')return;if(!matchMedia('(min-width:1100px)').matches)return;e.preventDefault();closeWins()});
ESC_PAGES.winsPg=()=>closeWins();

/* ---------- phones: a Wins tab ---------- */
TB_I.wins=WN_ICON;
const _wnTabs=tabsList;
tabsList=function(){let t=_wnTabs();if(!winsOn())return t;t=t.length?t:[['home','Home',TB_HOME]];t.push(['wins','Wins',WN_ICON]);return t};
const _wnTabNow=tabNow;tabNow=function(){return wnOn?'wins':_wnTabNow()};
const _wnTbGo=tbGo;
tbGo=function(k){
  if(k==='wins'){if(wnOn){$('winsPg').scrollTo({top:0,behavior:'smooth'});return}_wnTbGo('home');openWins();return drawTabs()}
  if(wnOn)closeWins();return _wnTbGo(k)};
/* the + on the Wins tab adds a win of your own */
document.addEventListener('click',e=>{if(!wnOn||!e.target.closest('#tbAdd'))return;e.preventDefault();e.stopImmediatePropagation();wnWeek=0;wnAdding=true;drawWins()},true);
const _wnApply=applySettings;applySettings=function(){_wnApply.apply(this,arguments);if(wnOn&&!winsOn())closeWins()};

/* ---------- Settings → Modes: a Wins card ---------- */
const _wnModes=modesPage;
modesPage=function(){const h=_wnModes.apply(this,arguments),on=winsOn(),n=on?wnThisWeek():0;
  const card=`<div class="md-card${on?' on':''}" data-md="wins"><div class="md-head"><span class="md-ic">${WN_ICON}</span><span class="md-t"><b>Wins</b><small>A jar that fills itself with what you got done</small></span>${tg('wins')}</div>
    ${on?`<div class="md-body"><p class="md-note">Tasks you finish, habit streaks, milestones and the days you win all land in the jar. Add your own wins too. ${n?`This week: ${n} so far.`:''}</p></div>`:''}</div>`;
  const i=h.indexOf('<div class="set-sec"><h3>Everyday');if(i<0)return h+card;const j=h.lastIndexOf('</div>',i);return h.slice(0,j)+card+h.slice(j)};
