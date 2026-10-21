/* ---------- analytics ---------- */
let setView='main',anRange=7;
function bestStreak(){
  const ks=[...doneDays()].sort();let best=0,run=0,prev=null;
  ks.forEach(k=>{const t=new Date(k+'T12:00').getTime();run=(prev&&t-prev<1.5*DAY)?run+1:1;best=Math.max(best,run);prev=t});
  return best;
}
function drawStats(){
  const N=anRange,days=[...Array(N)].map((_,i)=>dkey(Date.now()-(N-1-i)*DAY));
  const inRange=(ts,from,to)=>{const k=dkey(ts);return k>=from&&k<=to};
  const from=days[0],to=days[N-1],pFrom=dkey(Date.now()-(2*N-1)*DAY),pTo=dkey(Date.now()-N*DAY);
  const done=S.tasks.filter(t=>t.doneAt&&inRange(t.doneAt,from,to));
  const prev=S.tasks.filter(t=>t.doneAt&&inRange(t.doneAt,pFrom,pTo)).length;
  const focusSec=days.reduce((a,k)=>a+((S.focusLog||{})[k]||0),0);
  const per=days.map(k=>done.filter(t=>dkey(t.doneAt)===k).length);
  const maxD=Math.max(1,...per);
  const diff=done.length-prev;
  const cmp=prev||done.length?(diff===0?'Same as the period before':`${diff>0?'+':''}${diff} vs the period before`):'No tasks finished yet';
  const wdNames=['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  const wdCount=[0,0,0,0,0,0,0];S.tasks.forEach(t=>{if(t.doneAt)wdCount[new Date(t.doneAt).getDay()]++});
  const bestWd=wdCount.some(Boolean)?wdNames[wdCount.indexOf(Math.max(...wdCount))]:'—';
  const byList=S.lists.map(l=>({l,n:done.filter(t=>t.list===l.id).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n);
  const maxL=Math.max(1,...byList.map(x=>x.n));
  const open=STAGES.filter(s=>s.id!=='done').map(s=>({s,n:S.tasks.filter(t=>shown(t)&&t.stage===s.id).length}));
  const lbl=k=>{const d=new Date(k+'T12:00');return N===7?d.toLocaleDateString(undefined,{weekday:'narrow'}):(d.getDate()===1||k===days[0]||k===to?String(d.getDate()):'')};
  $('setIn').innerHTML=`
  <div class="set-top"><button class="icon-btn" id="anBack" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div class="segc" id="anRange"><button data-r="7" class="${N===7?'on':''}">7 days</button><button data-r="30" class="${N===30?'on':''}">30 days</button></div></div>
  <h1>Analytics</h1>
  <div class="an-hero"><b>${done.length}</b><span>${done.length===1?'task':'tasks'} finished</span><small>${cmp}</small></div>
  <div class="an-chart ${N===30?'thin':''}">${per.map((n,i)=>`<div class="an-col ${days[i]===today()?'now':''}"><div class="an-bar"><span style="height:${n?Math.max(6,n/maxD*100):0}%"></span></div><em>${lbl(days[i])}</em></div>`).join('')}</div>
  <div class="an-grid">
    <div><b>${fmt(Math.round(focusSec/60))}</b><span>Focus time</span></div>
    <div><b>${fmt(done.reduce((a,t)=>a+t.est,0))}</b><span>Work planned and done</span></div>
    <div><b>${streak()}</b><span>Day streak</span></div>
    <div><b>${bestStreak()}</b><span>Best streak</span></div>
  </div>
  <div class="set-sec"><h3>By list</h3>
    ${byList.length?byList.map(x=>`<div class="an-list"><span class="an-ln"><i style="background:${x.l.c}"></i>${esc(x.l.name)}</span><div class="an-lb"><span style="width:${x.n/maxL*100}%;background:${x.l.c}"></span></div><b>${x.n}</b></div>`).join(''):`<p class="an-empty">Finish a task to see where your time goes.</p>`}
  </div>
  <div class="set-sec"><h3>Right now</h3>
    <div class="an-open">${open.map(o=>`<div><b style="color:var(--${o.s.id})">${o.n}</b><span>${esc(o.s.name)}</span></div>`).join('')}</div>
  </div>
  <div class="ver">You get the most done on ${bestWd}.</div>`;
}
/* ---------- settings ---------- */
const STAGE_PALETTE=['#9C95FF','#5AB8F5','#34D399','#A3E635','#FFB547','#F5A35A','#FF5B47','#F472B6','#E879C8','#C4B5FD'];
const DEF_CFG={fullWidth:true,lightTheme:'default',darkTheme:'default',trayKeep:true,welcome:true,priSort:true,ambShow:true,ambSound:'off',ambVol:.6,search:true,idleHide:true,priStyle:'bars',celebrate:false,celebEvery:3,celebStyle:'halo',uiSounds:true,sfxStyle:'glass',sfxVol:'normal',doneFold:false,doneOpen:false,sections:false,collapseLong:false,collapseAt:5,theme:'system',size:'default',density:'comfortable',motion:true,haptics:true,showEst:true,checkin:true,weekStart:1,addTo:'top',
  defEst:30,defList:null,backupRemind:true,pipFade:true,todayGlint:true,homeStyle:'calm',bars:'tabs',showDone:true,cleanup:'never',cleanupAfter:7,focusMode:'free',focusStyle:'classic',pipMode:'compact',tideMin:25,focusColor:'red',focusShuffle:true,pomoWork:25,pomoBreak:5,wake:true,sound:true,
  names:{backlog:'Backlog',week:'My week',today:'Today',done:'Done'},colors:{backlog:null,week:null,today:null,done:null}};
S.cfg=Object.assign({},DEF_CFG,S.cfg||{});
/* Full width became the default: turn it on once, then the choice you make in Settings is remembered */
if(S.cfg.fwDefault!==1){S.cfg.fullWidth=true;S.cfg.fwDefault=1}
S.cfg.names=Object.assign({},DEF_CFG.names,S.cfg.names);S.cfg.colors=Object.assign({},DEF_CFG.colors,S.cfg.colors);
if(S.theme&&S.cfg.theme==='system'){S.cfg.theme=S.theme;delete S.theme}
if(!S.cfg.shuffleDefault){S.cfg.shuffleDefault=1;S.cfg.focusShuffle=true}
if(!S.cfg.fadeDefault){S.cfg.fadeDefault=1;S.cfg.pipFade=true} // see-through mini timer is on for everyone once
if(S.pomo!==undefined){S.cfg.focusMode=S.pomo?'pomo':'free';delete S.pomo}
const C=()=>S.cfg;
let audio=null;
function chime(){
  if(!C().sound||!audio)return;
  try{[0,.2].forEach((t,i)=>{const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime+t;
    o.type='sine';o.frequency.value=i?880:660;g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(.18,n+.02);
    g.gain.exponentialRampToValueAtTime(.0001,n+.55);o.connect(g).connect(audio.destination);o.start(n);o.stop(n+.6)})}catch(e){}
}
function buildShells(){
  $('gauge').innerHTML=STAGES.map(s=>`<button class="seg" data-s="${s.id}" style="--c:${color(s.id)}">
    <div class="bar"><span></span></div><div class="seg-l"><em>${esc(s.short)}</em><b class="seg-n"></b></div></button>`).join('');
  prevCounts={};
  $('board').innerHTML=STAGES.map(s=>`<section class="col" data-s="${s.id}" style="--c:${color(s.id)}">
    <header class="col-h"><div class="col-t"><h2 title="Focus on ${esc(s.name)}">${esc(s.name)}</h2>
      <button class="col-fx" aria-label="Focus on ${esc(s.name)}"><svg class="ic-max" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg><svg class="ic-min" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg></button></div><span class="col-n"></span></header>
    <div class="col-sum"></div>
    <div class="col-scroll"><ul class="list col-list"></ul>
    ${s.id!=='done'?`<div class="col-add"><button class="ca-btn">${PLUS_S}Add task</button><div class="ca-row" hidden><span class="ca-dot"></span><input class="ca-in" placeholder="New task" autocomplete="off" enterkeyhint="next"><span class="ca-hint">Enter</span></div><button class="ca-sec" data-secnew="${s.id}" hidden>${PLUS_S}Section</button></div>`:''}
    </div>${s.id==='today'?`<span class="glint" aria-hidden="true"><i></i></span><button class="col-go" id="colGo" hidden>${sunIcon()}<span>Win the day</span></button>`:''}</section>`).join('');
  applyColFocus(false);
}
/* focus page colours: [background, text, break colour] */
const FOCUS_COLORS={
  red:{n:'Red',bg:null,ink:'#0F1013'},
  orange:{n:'Orange',bg:'#FF8A3D',ink:'#0F1013'},
  yellow:{n:'Yellow',bg:'#FFC94A',ink:'#0F1013'},
  green:{n:'Green',bg:'#2ECF8B',ink:'#0F1013',brk:'#5AB8F5'},
  blue:{n:'Blue',bg:'#5AB8F5',ink:'#0F1013'},
  violet:{n:'Violet',bg:'#9C95FF',ink:'#0F1013'},
  pink:{n:'Pink',bg:'#FF7AC6',ink:'#0F1013'},
  teal:{n:'Teal',bg:'#2EC8C0',ink:'#0F1013'},
  lime:{n:'Lime',bg:'#B6E04B',ink:'#0F1013',brk:'#5AB8F5'},
  peach:{n:'Peach',bg:'#FFA98A',ink:'#0F1013'},
  indigo:{n:'Indigo',bg:'#4B4FD8',ink:'#F3F2EE'},
  forest:{n:'Forest',bg:'#1E6B4F',ink:'#F3F2EE',brk:'#5AB8F5'},
  midnight:{n:'Midnight',bg:'#0F1013',ink:'#F3F2EE'},
  paper:{n:'Paper',bg:'#F3F2EE',ink:'#0F1013'}
};
let focusLive=null; // colour picked by shuffle during a blitz (not saved)
function applyFocusColor(){setTimeout(syncPip,0);
  const key=focusLive||S.cfg.focusColor||'red',f=FOCUS_COLORS[key]||FOCUS_COLORS.red,st=document.documentElement.style;
  document.documentElement.dataset.focusdark=f.ink==='#F3F2EE'?'1':'0';
  f.bg?st.setProperty('--fbg',f.bg):st.removeProperty('--fbg');
  st.setProperty('--fink',f.ink);document.documentElement.dataset.focuscol=key;
  f.brk?st.setProperty('--fbrk',f.brk):st.removeProperty('--fbrk');
}
/* shuffle: new random colour each time a task or step is finished during a blitz */
function shuffleFocus(){
  if(!S.cfg.focusShuffle)return;
  const cur=focusLive||S.cfg.focusColor||'red',keys=Object.keys(FOCUS_COLORS).filter(k=>k!==cur&&k!=='paper');
  focusLive=keys[Math.floor(Math.random()*keys.length)];applyFocusColor();
}
function applySettings(){try{srchApply()}catch(e){}try{ambApply()}catch(e){}
  root.dataset.pri=(S.cfg&&S.cfg.priStyle)||'bars';
  try{applyFocusColor()}catch(e){}
  root.dataset.canpip=('documentPictureInPicture' in window||DESK())?'1':'0';
  if(DESK()){trayInit();traySync();try{window.__TAURI__.core.invoke('set_sounds',{on:S.cfg.uiSounds!==false}).catch(()=>{});window.__TAURI__.core.invoke('set_splash',{on:S.cfg.welcome!==false}).catch(()=>{})}catch(e){}}
  if(DESK()&&!window.__updT){window.__updT=1;setTimeout(()=>checkUpdate(false),4000);setInterval(()=>checkUpdate(false),6*3600e3)}
  const c=C();
  if(c.theme==='system')delete root.dataset.theme;else root.dataset.theme=c.theme;
  try{themeApply()}catch(e){}
  root.dataset.size=c.size;root.dataset.density=c.density;
  root.dataset.done=c.showDone?'on':'off';if(!c.showDone&&S.stage==='done')S.stage='today';
  root.dataset.bars=c.bars||'tabs';
  root.dataset.home=c.homeStyle||'calm';
  root.dataset.motion=c.motion?'on':'off';root.dataset.est=c.showEst?'on':'off';
  STAGES.forEach(s=>{s.name=c.names[s.id]||DEF_CFG.names[s.id];s.short=s.name;
    if(c.colors[s.id])root.style.setProperty('--'+s.id,c.colors[s.id]);else root.style.removeProperty('--'+s.id)});
  POMO.work=c.pomoWork*60;POMO.break=c.pomoBreak*60;
  buildShells();syncPip();
}
const sOpt=(key,val,label)=>`<button data-k="${key}" data-v="${val}" class="${String(C()[key])===String(val)?'on':''}">${label}</button>`;
const tg=(key)=>`<button class="tg" data-tg="${key}" aria-pressed="${!!C()[key]}" aria-label="Toggle"></button>`;
/* one rule for every settings row: switches, values and arrows sit on the right;
   choices (segments, chips) get their own full-width line under the label */
const row=(label,ctrl,sub)=>{const stack=/^\s*<div class="(segc|chips)/.test(ctrl);
  return `<div class="set-row ${stack?'r-stack':'r-side'}"><div class="set-l">${label}${sub?`<small>${sub}</small>`:''}</div><div class="set-c">${ctrl}</div></div>`};
let openSw=null;
const HAS_KEYS=()=>matchMedia('(min-width:1100px)').matches||matchMedia('(hover:hover) and (pointer:fine)').matches;
const BACK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
const PAGES=[
  {id:'account',name:'Account',hidden:true},
  {id:'stats',name:'Analytics',hidden:true},
  {id:'appearance',name:'Appearance'},
  {id:'stages',name:'Stages'},
  {id:'tasks',name:'Tasks'},
  {id:'focus',name:'Focus'},
  {id:'lists',name:'Lists'},
  {id:'shortcuts',name:'Keyboard shortcuts'},
  {id:'archive',name:'Archived',hidden:true},
  {id:'sounds',name:'Sounds',hidden:true},
  {id:'data',name:'Data'}
];
let lastView='main';
/* Settings home: two calm groups, each row with a small coloured icon */
const SET_GROUPS=[['App',['appearance','stages','tasks','focus']],['Organise',['lists','shortcuts','data']]];
const SET_IC={appearance:['#9C95FF','pal'],stages:['#FFB547','bars'],tasks:['#34D399','chk'],focus:['#FF5B47','sun'],lists:['#5AB8F5','list'],shortcuts:['#A1A1AA','key'],data:['#3EC6C6','db']};
const SET_P={pal:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-1 1-2s0-2 1.5-2H17a4 4 0 0 0 4-4c0-5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16.5" cy="11" r="1.1"/>',
  bars:'<path d="M4 6h16M4 12h11M4 18h6"/>',chk:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',sun:'<path d="M4 18h16M8 18a4 4 0 0 1 8 0M12 6v3M6.5 9.5l2 2M17.5 9.5l-2 2"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',key:'<rect x="3" y="6.5" width="18" height="11" rx="2.5"/><path d="M7 10.5h.01M11 10.5h.01M15 10.5h.01M8 14h8"/>',
  db:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'};
const setIco=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${SET_P[k]}</svg>`;
function drawSettings(){
  try{listsBack()}catch(e){}
  const el=$('setIn'),anim=lastView!==setView;
  const dir=setView==='main'?'in-l':'in-r';lastView=setView;
  if(setView==='account'||setView==='stats'){youTab=setView==='stats'?'stats':'account';setView='you'} // these now live in You
  if(setView==='you')youBody();else el.innerHTML=setView==='main'?settingsMain():settingsPage(setView);
  if(setView==='lists'&&$('picksSlot'))listsToSettings($('picksSlot'));
  if(anim){el.classList.remove('in-l','in-r');void el.offsetWidth;el.classList.add(dir)}
}
function pageSummary(id){
  const c=C();
  const wk=S.tasks.filter(t=>t.doneAt&&t.doneAt>Date.now()-7*DAY).length;
  return {
    account:!CLOUD?'Preview here, works in the installed app':user?esc(user.email||'Signed in'):'Sign in to sync your devices',
    stats:`${wk} done in the last 7 days`,
    appearance:`${{system:'Auto',light:'Light',dark:'Dark'}[c.theme]} · ${themeOf(modeNow(),modeNow()==='light'?c.lightTheme:c.darkTheme).name} look, ${c.size==='large'?'large':'default'} text`,
    stages:`<span class="cat-dots">${STAGES.map(s=>`<i style="background:var(--${s.id})"></i>`).join('')}</span>`,
    tasks:`${fmt(c.defEst)} default, new tasks on ${c.addTo}`,
    focus:`${c.focusMode==='pomo'?'Pomodoro':'Free timer'}, ${c.pomoWork} / ${c.pomoBreak} min`,
    lists:`${S.lists.length} ${S.lists.length===1?'list':'lists'}`,
    shortcuts:'N, B, 1–4 and more',
    data:'Backup, restore and reset'
  }[id];
}
function settingsMain(){
  return `<div class="set-top"><button class="icon-btn" id="setBack" aria-label="Close settings">${BACK_SVG}</button></div>
  <h1>Settings</h1>
  <button class="you-card" id="youOpen">${avatarHTML()}<span><b>${esc(meName()||'Your profile')}</b><small>${esc(meSub())} · stats, account</small></span>${CHEV}</button>
  ${SET_GROUPS.map(([g,ids])=>{const ps=ids.map(id=>PAGES.find(p=>p.id===id)).filter(p=>p&&!p.hidden&&(p.id!=='shortcuts'||HAS_KEYS()));
    return ps.length?`<h3 class="cat-cap">${g}</h3><div class="cats">${ps.map(p=>`<button class="cat" data-page="${p.id}"><span class="cat-ic" style="--ic:${SET_IC[p.id][0]}">${setIco(SET_IC[p.id][1])}</span><span class="cat-t">${p.name}<small>${pageSummary(p.id)}</small></span>${CHEV}</button>`).join('')}</div>`:''}).join('')}
  <div class="ver">Windaday, version ${VER}. ${user?'Your tasks sync to your account.':'Your data stays on this device.'}</div>`;
}
function settingsPage(id){
  const c=C(),title=PAGES.find(p=>p.id===id).name;
  const head=`<div class="set-top"><button class="icon-btn" id="subBack" aria-label="Back">${BACK_SVG}</button></div><h1 class="sub-h">${title}</h1>`;
  let body='';
  if(id==='appearance')body=`<div class="set-sec">
    ${row('Mode',`<div class="segc">${sOpt('theme','system','Auto')}${sOpt('theme','light','Light')}${sOpt('theme','dark','Dark')}</div>`,'Auto follows your device')}</div>
    ${themesSection()}<div class="set-sec"><h3>Text and layout</h3>
    ${row('Text size',`<div class="segc">${sOpt('size','default','Default')}${sOpt('size','large','Large')}</div>`)}
    ${row('Density',`<div class="segc">${sOpt('density','comfortable','Roomy')}${sOpt('density','compact','Compact')}</div>`)}
    ${row('Home style',`<div class="segc">${sOpt('homeStyle','calm','Calm')}${sOpt('homeStyle','colorful','Colourful')}</div>`,(c.homeStyle||'calm')==='calm'?'A quiet list of spaces. Only Today stands out.':'Colourful space cards with stage bars.')}
    </div>${(matchMedia('(min-width:1100px)').matches||DESK())?`<div class="set-sec"><h3>Layout on computers</h3>
    <div class="lay-pick">${[[0,'With sidebar','Spaces and lists on the left.'],[1,'Full width','Hides the sidebar inside a space. Switch spaces and lists from the top.']].map(([v,n,d])=>`<button class="lay ${!!c.fullWidth===!!v?'on':''}" data-fw="${v}">
      <span class="lay-th ${v?'full':''}"><i class="lt-side"></i><span class="lt-main"><i class="lt-top"></i><span class="lt-cols"><i></i><i></i><i></i><i></i></span></span></span>
      <b>${n}</b><small>${d}</small></button>`).join('')}</div></div>`:''}<div class="set-sec"><h3>Feel</h3>
    ${row('Animations',tg('motion'))}
    ${row('Welcome animation',`<div class="wl-set">${tg('welcome')}<button class="ghost-btn wl-replay" id="wlPlay" type="button">Play</button></div>`,DESK()?'The sunrise splash each time you open Windaday':'The sunrise logo, once a day when you open Windaday')}
    ${HAS_KEYS()?row('Today highlight',tg('todayGlint'),'A light runs around Today when you open a space'):''}
    ${HAS_KEYS()?row('Quiet when idle',tg('idleHide'),'After 5 seconds without moving, the day’s summary and Add task fade away. Move the mouse to bring them back.'):''}
    ${row('Sounds',tg('uiSounds'),'Soft sounds when you add, move or finish tasks')}
    <button class="link-row" data-page="sounds">Sound style<span class="hint">${esc(sfxStyle().name)}${CHEV}</span></button>
    ${row('Haptics',tg('haptics'),'Vibration on Android')}</div>`;
  if(id==='stages')body=`<p class="sub-p">Tap a colour to change it. Tap a name to rename it.</p><div class="set-sec">
    ${STAGES.map(s=>`<div class="stg"><button class="stg-dot" data-sw="${s.id}" style="background:var(--${s.id})" aria-label="Change colour"></button>
      <input data-name="${s.id}" value="${esc(s.name)}" maxlength="12" aria-label="Stage name"></div>
      <div class="stg-sw ${openSw===s.id?'on':''}" data-for="${s.id}">
        <button class="auto ${!c.colors[s.id]?'on':''}" data-c="" aria-label="Default colour">A</button>
        ${STAGE_PALETTE.map(p=>`<button data-c="${p}" class="${c.colors[s.id]===p?'on':''}" style="background:${p}" aria-label="Colour"></button>`).join('')}
      </div>`).join('')}</div>
    <button class="ghost-btn" id="stReset">Reset to default</button>`;
  if(id==='tasks')body=`<div class="set-sec"><h3>New tasks</h3>
    ${row('Default estimate',`<div class="segc">${[15,30,60,120].map(m=>sOpt('defEst',m,fmt(m))).join('')}</div>`)}
    ${row('Add to',`<div class="segc">${sOpt('addTo','top','Top')}${sOpt('addTo','bottom','Bottom')}</div>`)}
    ${row('Default list',`<div class="chips">${[{id:'',name:'First list'},...S.lists].map(l=>`<button class="opt ${(c.defList||'')===l.id?'on':''}" data-deflist="${l.id}">${l.c?`<i style="background:${l.c}"></i>`:''}${esc(l.name)}</button>`).join('')}</div>`)}
    </div><div class="set-sec"><h3>Display</h3>
    ${row('Stage bars',`<div class="segc">${sOpt('bars','tabs','Tabs')}${sOpt('bars','today','Progress')}${sOpt('bars','load','Workload')}</div>`,{tabs:'Simple tabs to switch stages. Shown on phones.',today:'The Today bar fills up as you finish today’s tasks.',load:'Bars show how full each stage is, with task counts.'}[c.bars||'tabs'])}
    ${row('Show time estimates',tg('showEst'))}
    ${row('Search & filter',tg('search'),'A search button at the top. Find any task and filter the board by priority or tags.')}
    ${row('Sections',tg('sections'),'Group tasks into named sections you can fold away.')}
    ${row('Fold long columns',tg('collapseLong'),'Show only the first few tasks. The rest wait under “more”.')}
    ${c.collapseLong?row('Show first',`<div class="segc">${[3,5,7,10].map(n=>sOpt('collapseAt',n,String(n))).join('')}</div>`):''}
    ${row('Sort by priority',tg('priSort'),'High priority tasks go to the top, then Medium, then Low.')}
    <div class="set-row"><div class="set-l">Priority look<small>How High, Medium and Low show on your tasks.</small></div>
      <div class="pri-pick">${[['bars','Label','Bars and the word.'],['marks','Marks','!!! / !! / ! after the name.'],['ring','Ring','The circle takes the colour.'],['edge','Edge','A coloured line at the start.'],['tint','Tint','The whole row softly takes the colour.']].map(([v,n,d])=>`<button class="prp ${v} ${((c.priStyle==='dot'?'marks':c.priStyle)||'bars')===v?'on':''}" data-k="priStyle" data-v="${v}">
        <span class="prp-row"><span class="pc"></span><span class="pt"><span>Call the bank${v==='marks'?'<i class="pri-mk high">!!!</i>':''}</span>${v==='bars'?`<em>${priIcon(3)}High</em>`:''}</span></span><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>
    ${row('Week starts on',`<div class="segc">${sOpt('weekStart',1,'Monday')}${sOpt('weekStart',0,'Sunday')}</div>`)}
    </div><div class="set-sec"><h3>Celebrations</h3>
    ${row('Celebrate finished tasks',tg('celebrate'),'A short, quiet moment, with a sound if sounds are on.')}
    ${c.celebrate?row('Every',`<div class="segc">${sOpt('celebEvery',1,'1 task')}${sOpt('celebEvery',3,'3 tasks')}</div>`):''}
    ${c.celebrate?`<p class="sub-p snd-p">Tap a style to see it.</p><div class="snd-list">${CELEBS.map(s=>`<button class="snd ${s.id===celebOf().id?'on':''}" data-celeb="${s.id}"><span class="snd-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg></span><span class="snd-t"><b>${s.name}</b><small>${s.d}</small></span><span class="snd-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></button>`).join('')}</div>`:''}
    </div><div class="set-sec"><h3>Daily</h3>
    ${row('Morning check-in',tg('checkin'),'Ask about leftover tasks each day')}</div>
    <div class="set-sec"><h3>Finished tasks</h3>
    ${row('Show Done',tg('showDone'),'Hide it to keep your board focused')}
    ${row('Tuck away finished tasks',tg('doneFold'),'Keep finished tasks under one “Completed” section in Done.')}
    ${row('Clean up',`<div class="segc">${sOpt('cleanup','never','Never')}${sOpt('cleanup','archive','Archive')}${sOpt('cleanup','delete','Delete')}</div>`,c.cleanup==='delete'?'Deleted tasks also leave your analytics':c.cleanup==='archive'?'Archived tasks still count in analytics':'')}
    ${c.cleanup!=='never'?row('After',`<div class="segc">${[1,7,30].map(d=>sOpt('cleanupAfter',d,d===1?'1 day':d+' days')).join('')}</div>`):''}
    ${(()=>{const n=S.tasks.filter(t=>t.archived).length;return n||c.cleanup==='archive'?`<button class="link-row" data-page="archive" data-arct="tasks">Archived tasks<span class="hint">${n}</span></button>`:''})()}
    </div>`;
  if(id==='focus')body=`<div class="set-sec"><h3>Timer</h3>
    ${row('Default timer',`<div class="segc">${sOpt('focusMode','free','Free')}${sOpt('focusMode','pomo','Pomodoro')}</div>`)}
    ${row('Focus length',`<div class="segc">${[15,25,45,50].map(m=>sOpt('pomoWork',m,m+'m')).join('')}</div>`)}
    ${row('Break length',`<div class="segc">${[5,10,15].map(m=>sOpt('pomoBreak',m,m+'m')).join('')}</div>`)}
    </div><div class="set-sec"><h3>Style</h3>
    ${row('Focus sounds',tg('ambShow'),'A 🎧 button in focus mode with calm sounds: rain, ocean, café, fireplace or brown noise.')}
    ${row('Timer look',`<div class="segc">${sOpt('focusStyle','classic','Digits')}${sOpt('focusStyle','tide','Wave')}</div>`,(c.focusStyle||'classic')==='tide'?'A circle that fills like a wave as time runs.':'Big clear numbers, with your task steps.')}
    </div><div class="set-sec"><h3>Look</h3>
    <div class="fc-prev ${(c.focusStyle||'classic')==='tide'?'wave':''}" style="--pb:${(FOCUS_COLORS[c.focusColor]||{}).bg||'var(--today)'};--pi:${(FOCUS_COLORS[c.focusColor]||FOCUS_COLORS.red).ink}">${(c.focusStyle||'classic')==='tide'
      ?`<span class="fw-orb"><i></i><b>25<small>min</small></b></span><span class="fw-t">Deep work</span><span class="fc-b">Begin</span>`
      :`<span class="fc-t">25:00</span><span class="fc-b">Done</span>`}</div>
    <div class="fc-sw">${Object.entries(FOCUS_COLORS).map(([k,f])=>`<button data-fcol="${k}" class="${(c.focusColor||'red')===k?'on':''}" style="--sb:${f.bg||'var(--today)'}" aria-label="${f.n}" title="${f.n}"></button>`).join('')}</div>
    <p class="fc-name">${(FOCUS_COLORS[c.focusColor]||FOCUS_COLORS.red).n}${(c.focusColor||'red')==='red'?' (default)':''}${c.focusShuffle?' · starting colour':''}</p>
    ${row('Shuffle colours',tg('focusShuffle'),'New colour after each finished step')}
    </div>${HAS_KEYS()?`<div class="set-sec"><h3>Pop-out window</h3>
    ${row('Size',`<div class="segc">${sOpt('pipMode','compact','Compact')}${sOpt('pipMode','mini','Timer only')}</div>`,(c.pipMode||'compact')==='mini'?'Just the countdown, very small.':'Task name and timer.')}
    ${DESK()?row('See-through while working',tg('pipFade'),'The mini timer turns solid when you point at it'):''}</div>`:''}<div class="set-sec"><h3>During a session</h3>
    ${row('Sound at end of round',tg('sound'))}
    ${row('Keep screen awake',tg('wake'))}</div>`;
  if(id==='archive')body=archivePage();
  if(id==='lists')body=`<p class="sub-p">Lists sit inside your spaces. Tap a list to rename, recolour, move, tag or archive it.</p><div class="lists-slot" id="picksSlot"></div>`;
  if(id==='sounds'){const cur=sfxStyle().id,PLAY='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    body=`<div class="set-sec">${row('Sounds',tg('uiSounds'),c.uiSounds===false?'Off. You can still try styles below.':'Soft sounds when you add, move or finish tasks')}
      ${row('Volume',`<div class="segc">${sOpt('sfxVol','quiet','Quiet')}${sOpt('sfxVol','normal','Normal')}${sOpt('sfxVol','loud','Loud')}</div>`)}</div>
    <div class="set-sec"><h3>Style</h3><p class="sub-p snd-p">Tap a style to hear it.</p><div class="snd-list">${SFX_STYLES.map(s=>`<button class="snd ${s.id===cur?'on':''}" data-snd="${s.id}" aria-pressed="${s.id===cur}"><span class="snd-play">${PLAY}</span><span class="snd-t"><b>${s.name}</b><small>${s.d}</small></span><span class="snd-ck">${TICK}</span></button>`).join('')}</div></div>
    <div class="set-sec"><h3>Try each sound</h3><div class="snd-try">${[['done','Finish a task'],['tick','Tick a step'],['add','Add a task'],['move','Move a task'],['remove','Delete'],['undo','Undo'],['fold','Open a section'],['start','Start focus'],['win','Finish the day']].map(([k,n])=>`<button class="snd-chip" data-sndtry="${k}">${PLAY}${n}</button>`).join('')}</div></div>`}
  if(id==='shortcuts'){
    const K=(keys,label)=>`<div class="kb-row"><span>${label}</span><span class="kb-keys">${keys.map(k=>k==='–'?'<span>to</span>':`<kbd>${k}</kbd>`).join('')}</span></div>`;
    body=`<div class="set-sec"><h3>Tasks</h3>${K(['H'],'Home')}${K(['N'],'New task')}${K(['1','–','4'],'Focus on a column')}${K(['Esc'],'Back to the board')}</div>
    <div class="set-sec"><h3>Focus</h3>${K(['B'],'Win the day (start)')}${K(['Space'],'Pause or resume')}${K(['Enter'],'Mark task done')}${K(['Esc'],'Close')}</div>
    <div class="set-sec"><h3>App</h3>${K(['['],'Collapse or expand sidebar')}${K([','],'Open settings')}${K(['?'],'Show these shortcuts')}</div>`;
  }
  if(id==='data')body=`<div class="set-sec"><h3>Backup</h3>
    ${canDownload()?`<button class="link-row" id="bkFile">Save backup file<span class="hint">.json</span></button>`:''}
    <button class="link-row" id="bkCopy">Copy backup<span class="hint">To clipboard</span></button>
    <button class="link-row" id="bkOpen">Restore from backup<span class="hint">Paste</span></button>
    <div class="restore" id="bkBox"><textarea id="bkTxt" placeholder="Paste your backup here"></textarea><button class="primary" id="bkGo">Restore</button>
      <label class="bk-filein">Or choose a backup file<input type="file" id="bkFileIn" accept=".json,application/json"></label></div>
    ${row('Last backup',`<span class="acc-val bk-last">${(a=>a[0].toUpperCase()+a.slice(1))(ago(S.lastBackup))}</span>`)}
    ${row('Backup reminders',tg('backupRemind'),'Shown on Home when you’re not signed in')}
    </div><div class="set-sec"><h3>Archive</h3>
    <button class="link-row" data-page="archive">Archived<span class="hint">${(()=>{const n=arcTotal();return n?`${n} ${n===1?'item':'items'}`:'Empty'})()}</span></button></div>
    ${hasData()?'':`<div class="set-sec"><h3>Tasks</h3><button class="link-row" id="demo">Load demo tasks<span class="hint">2 spaces · 18 tasks</span></button></div>`}
    ${DESK()&&TRAY.ok?`<div class="set-sec"><h3>Windows app</h3>
    ${row('Keep in tray when closed',tg('trayKeep'),'Closing the window keeps Windaday ready in the tray, so it opens instantly. Quit from the tray icon.')}
    ${row('Start with Windows',`<button class="tg" id="autoStart" aria-pressed="${TRAY.auto}" aria-label="Toggle"></button>`,'Starts quietly in the tray when you sign in to your computer')}</div>`:''}
    <div class="set-sec"><h3>Help</h3><button class="link-row" id="replayIntro">Replay intro</button></div>
    <div class="set-sec"><h3>About</h3>
    ${row('Version',`<span class="acc-val bk-last">${VER}${BUILD?` <span class="build">(build ${BUILD})</span>`:''}</span>`)}
    ${DESK()?`${row('Desktop app',`<span class="acc-val">${UPD.current||'…'}</span>`)}<button class="link-row" id="updCheck">${UPD.latest?`Update to ${UPD.latest}`:'Check for updates'}<span class="hint">${UPD.busy?'Updating…':UPD.latest?'Restarts Windaday':UPD.checked?'Up to date':''}</span></button>`:''}</div>`;
  if(id==='data')body+=`<div class="set-sec dz-sec"><h3>Danger zone</h3><p class="dz-note">These can’t be undone. You’ll type a word to confirm.</p>
    ${dzOpen?dzBox(dzOpen):`<div class="le-acts dz-acts">${S.tasks.length?`<button class="le-btn warn" id="wipe" type="button">Delete all tasks</button>`:''}<button class="le-btn warn" id="resetAll" type="button">Reset app</button></div>`}</div>`;
  return head+body;
}

function openSettings(){setView='main';lastView='main';drawSettings();$('settings').classList.add('on');$('scrim').classList.add('on');$('settings').scrollTop=0;haptic(5)}
function closeSettings(){try{listsBack()}catch(e){}try{dzOpen=null}catch(e){}
  const ae=document.activeElement;if(ae&&ae.closest&&ae.closest('.settings'))ae.blur();
  $('settings').classList.remove('on');
  if(!document.querySelector('.sheet.on'))$('scrim').classList.remove('on');
  openSw=null;setView='main';render();
}
const settingsOpen=()=>$('settings').classList.contains('on');

