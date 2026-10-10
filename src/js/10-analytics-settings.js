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
const DEF_CFG={theme:'system',size:'default',density:'comfortable',motion:true,haptics:true,showEst:true,checkin:true,weekStart:1,addTo:'top',
  defEst:30,defList:null,backupRemind:true,pipFade:true,todayGlint:true,homeStyle:'calm',bars:'tabs',showDone:true,cleanup:'never',cleanupAfter:7,focusMode:'free',focusStyle:'classic',pipMode:'compact',tideMin:25,focusColor:'red',focusShuffle:true,pomoWork:25,pomoBreak:5,wake:true,sound:true,
  names:{backlog:'Backlog',week:'My week',today:'Today',done:'Done'},colors:{backlog:null,week:null,today:null,done:null}};
S.cfg=Object.assign({},DEF_CFG,S.cfg||{});
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
    ${s.id!=='done'?`<div class="col-add"><button class="ca-btn">${PLUS_S}Add task</button><input class="ca-in" placeholder="Task name, then Enter" hidden autocomplete="off"></div>`:''}
    </div>${s.id==='today'?`<span class="glint" aria-hidden="true"><i></i></span><button class="col-go" id="colGo" hidden><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg><span>Win the day</span></button>`:''}</section>`).join('');
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
function applySettings(){
  try{applyFocusColor()}catch(e){}
  root.dataset.canpip=('documentPictureInPicture' in window||DESK())?'1':'0';
  if(DESK()&&!window.__updT){window.__updT=1;setTimeout(()=>checkUpdate(false),4000);setInterval(()=>checkUpdate(false),6*3600e3)}
  const c=C();
  if(c.theme==='system')delete root.dataset.theme;else root.dataset.theme=c.theme;
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
const row=(label,ctrl,sub)=>`<div class="set-row"><div class="set-l">${label}${sub?`<small>${sub}</small>`:''}</div>${ctrl}</div>`;
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
  {id:'archive',name:'Archive',hidden:true},
  {id:'data',name:'Data'}
];
let lastView='main';
function drawSettings(){
  const el=$('setIn'),anim=lastView!==setView;
  const dir=setView==='main'?'in-l':'in-r';lastView=setView;
  if(setView==='account'||setView==='stats'){youTab=setView==='stats'?'stats':'account';setView='you'} // these now live in You
  if(setView==='you')youBody();else el.innerHTML=setView==='main'?settingsMain():settingsPage(setView);
  if(anim){el.classList.remove('in-l','in-r');void el.offsetWidth;el.classList.add(dir)}
}
function pageSummary(id){
  const c=C();
  const wk=S.tasks.filter(t=>t.doneAt&&t.doneAt>Date.now()-7*DAY).length;
  return {
    account:!CLOUD?'Preview here, works in the installed app':user?esc(user.email||'Signed in'):'Sign in to sync your devices',
    stats:`${wk} done in the last 7 days`,
    appearance:`${{system:'Auto',light:'Light',dark:'Dark'}[c.theme]} theme, ${c.size==='large'?'large':'default'} text`,
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
  <div class="cats">${PAGES.filter(p=>!p.hidden&&(p.id!=='shortcuts'||HAS_KEYS())).map(p=>`<button class="cat" data-page="${p.id}"><span class="cat-t">${p.name}<small>${pageSummary(p.id)}</small></span>${CHEV}</button>`).join('')}</div>
  <div class="ver">Windaday, version ${VER}. ${user?'Your tasks sync to your account.':'Your data stays on this device.'}</div>`;
}
function settingsPage(id){
  const c=C(),title=PAGES.find(p=>p.id===id).name;
  const head=`<div class="set-top"><button class="icon-btn" id="subBack" aria-label="Back">${BACK_SVG}</button></div><h1 class="sub-h">${title}</h1>`;
  let body='';
  if(id==='appearance')body=`<div class="set-sec">
    ${row('Theme',`<div class="segc">${sOpt('theme','system','Auto')}${sOpt('theme','light','Light')}${sOpt('theme','dark','Dark')}</div>`)}
    ${row('Text size',`<div class="segc">${sOpt('size','default','Default')}${sOpt('size','large','Large')}</div>`)}
    ${row('Density',`<div class="segc">${sOpt('density','comfortable','Roomy')}${sOpt('density','compact','Compact')}</div>`)}
    ${row('Home style',`<div class="segc">${sOpt('homeStyle','calm','Calm')}${sOpt('homeStyle','colorful','Colourful')}</div>`,(c.homeStyle||'calm')==='calm'?'A quiet list of spaces. Only Today stands out.':'Colourful space cards with stage bars.')}
    </div><div class="set-sec"><h3>Feel</h3>
    ${row('Animations',tg('motion'))}
    ${HAS_KEYS()?row('Today highlight',tg('todayGlint'),'A light runs around Today when you open a space'):''}
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
    ${row('Stage bars',`<div class="segc">${sOpt('bars','tabs','Tabs')}${sOpt('bars','today','Today progress')}${sOpt('bars','load','Workload')}</div>`,{tabs:'Simple tabs to switch stages. Shown on phones.',today:'The Today bar fills up as you finish today’s tasks.',load:'Bars show how full each stage is, with task counts.'}[c.bars||'tabs'])}
    ${row('Show time estimates',tg('showEst'))}
    ${row('Week starts on',`<div class="segc">${sOpt('weekStart',1,'Monday')}${sOpt('weekStart',0,'Sunday')}</div>`)}
    </div><div class="set-sec"><h3>Daily</h3>
    ${row('Morning check-in',tg('checkin'),'Ask about leftover tasks each day')}</div>
    <div class="set-sec"><h3>Finished tasks</h3>
    ${row('Show Done',tg('showDone'),'Hide it to keep your board focused')}
    ${row('Clean up',`<div class="segc">${sOpt('cleanup','never','Never')}${sOpt('cleanup','archive','Archive')}${sOpt('cleanup','delete','Delete')}</div>`,c.cleanup==='delete'?'Deleted tasks also leave your analytics':c.cleanup==='archive'?'Archived tasks still count in analytics':'')}
    ${c.cleanup!=='never'?row('After',`<div class="segc">${[1,7,30].map(d=>sOpt('cleanupAfter',d,d===1?'1 day':d+' days')).join('')}</div>`):''}
    ${(()=>{const n=S.tasks.filter(t=>t.archived).length;return n||c.cleanup==='archive'?`<button class="link-row" data-page="archive">Archive<span class="hint">${n} ${n===1?'task':'tasks'}</span></button>`:''})()}
    </div>`;
  if(id==='focus')body=`<div class="set-sec"><h3>Timer</h3>
    ${row('Default timer',`<div class="segc">${sOpt('focusMode','free','Free')}${sOpt('focusMode','pomo','Pomodoro')}</div>`)}
    ${row('Focus length',`<div class="segc">${[15,25,45,50].map(m=>sOpt('pomoWork',m,m+'m')).join('')}</div>`)}
    ${row('Break length',`<div class="segc">${[5,10,15].map(m=>sOpt('pomoBreak',m,m+'m')).join('')}</div>`)}
    </div><div class="set-sec"><h3>Style</h3>
    ${row('Focus style',`<div class="segc">${sOpt('focusStyle','classic','Classic')}${sOpt('focusStyle','tide','Tide')}</div>`,(c.focusStyle||'classic')==='tide'?'One task, a filling circle and a countdown.':'Your task queue with steps and a timer.')}
    </div><div class="set-sec"><h3>Look</h3>
    <div class="fc-prev" style="--pb:${(FOCUS_COLORS[c.focusColor]||{}).bg||'var(--today)'};--pi:${(FOCUS_COLORS[c.focusColor]||FOCUS_COLORS.red).ink}"><span class="fc-t">25:00</span><span class="fc-b">Done</span></div>
    <div class="fc-sw">${Object.entries(FOCUS_COLORS).map(([k,f])=>`<button data-fcol="${k}" class="${(c.focusColor||'red')===k?'on':''}" style="--sb:${f.bg||'var(--today)'}" aria-label="${f.n}" title="${f.n}"></button>`).join('')}</div>
    <p class="fc-name">${(FOCUS_COLORS[c.focusColor]||FOCUS_COLORS.red).n}${(c.focusColor||'red')==='red'?' (default)':''}${c.focusShuffle?' · starting colour':''}</p>
    ${row('Shuffle colours',tg('focusShuffle'),'New colour after each finished step')}
    </div>${HAS_KEYS()?`<div class="set-sec"><h3>Pop-out window</h3>
    ${row('Size',`<div class="segc">${sOpt('pipMode','compact','Compact')}${sOpt('pipMode','mini','Timer only')}</div>`,(c.pipMode||'compact')==='mini'?'Just the countdown, very small.':'Task name and timer.')}
    ${DESK()?row('See-through while working',tg('pipFade'),'The mini timer turns solid when you point at it'):''}</div>`:''}<div class="set-sec"><h3>During a session</h3>
    ${row('Sound at end of round',tg('sound'))}
    ${row('Keep screen awake',tg('wake'))}</div>`;
  if(id==='archive'){
    const a=S.tasks.filter(t=>t.archived).sort((x,y)=>(y.doneAt||0)-(x.doneAt||0));
    body=a.length?`<p class="sub-p">Finished tasks that were tidied away. Restore one to bring it back to ${esc(STAGES[3].name)}.</p>
      <div class="set-sec">${a.map(t=>`<div class="arc-row" data-id="${t.id}"><div class="arc-t"><span>${esc(t.title)}</span><small>${t.doneAt?dayLabel(t.doneAt):''}</small></div>
        <button class="arc-b" data-restore aria-label="Restore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button>
        <button class="arc-b" data-adel aria-label="Delete">${X}</button></div>`).join('')}</div>
      <button class="link-row warn" id="arcEmpty">Empty archive</button>`
      :`<p class="sub-p">Nothing here yet. Finished tasks land here when clean up is set to Archive.</p>`;
  }
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
    ${row('Last backup',`<span class="acc-val">${ago(S.lastBackup)}</span>`)}
    ${row('Backup reminders',tg('backupRemind'),'Shown on Home when you’re not signed in')}
    </div><div class="set-sec"><h3>Tasks</h3>
    <button class="link-row" id="demo">Load demo tasks</button>
    <button class="link-row warn" id="wipe">Delete all tasks</button></div>
    <div class="set-sec"><h3>Help</h3><button class="link-row" id="replayIntro">Replay intro</button></div>
    <div class="set-sec"><h3>About</h3>
    ${row('Version',`<span class="acc-val">${VER}${BUILD?` <span class="build">(build ${BUILD})</span>`:''}</span>`)}
    ${DESK()?`${row('Desktop app',`<span class="acc-val">${UPD.current||'…'}</span>`)}<button class="link-row" id="updCheck">${UPD.latest?`Update to ${UPD.latest}`:'Check for updates'}<span class="hint">${UPD.busy?'Updating…':UPD.latest?'Restarts Windaday':UPD.checked?'Up to date':''}</span></button>`:''}</div>`;
  return head+body;
}

function openSettings(){setView='main';lastView='main';drawSettings();$('settings').classList.add('on');$('scrim').classList.add('on');$('settings').scrollTop=0;haptic(5)}
function closeSettings(){
  const ae=document.activeElement;if(ae&&ae.closest&&ae.closest('.settings'))ae.blur();
  $('settings').classList.remove('on');
  if(!document.querySelector('.sheet.on'))$('scrim').classList.remove('on');
  openSw=null;setView='main';render();
}
const settingsOpen=()=>$('settings').classList.contains('on');

