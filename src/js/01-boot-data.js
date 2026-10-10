/* ---------- desktop sign-in hand-off ----------
   The desktop app asks Supabase to send the email link back here with ?desk=1.
   This browser tab then passes the sign-in to the app (blitzit://) instead of signing itself in. */
const HANDOFF=(()=>{try{
  const q=new URLSearchParams(location.search),h=location.hash.slice(1);
  if(q.get('desk')!=='1'||window.__TAURI__||!/access_token=|error=/.test(h))return null;
  history.replaceState(null,'',location.pathname);return h;
}catch(e){return null}})();
/* ---------- version ---------- */
const APP_VERSION=66; // bumped with every published update
const VER='0.'+String(APP_VERSION).padStart(2,'0'); // shown to people, e.g. 0.39
const BUILD=(()=>{try{const src=[...document.scripts].map(x=>x.textContent).join('');let h=2166136261;
  for(let i=0;i<src.length;i++){h^=src.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).slice(0,6)}catch(e){return ''}})();
const STAGES=[
  {id:'backlog',name:'Backlog',short:'Backlog'},
  {id:'week',name:'My week',short:'My week'},
  {id:'today',name:'Today',short:'Today'},
  {id:'done',name:'Done',short:'Done'}
];
const PALETTE=['#5AB8F5','#7C83F2','#F06A6A','#F5A35A','#4FD1A5','#E879C8','#A1A1AA'];
const REPEATS=[{id:'none',name:'Never'},{id:'daily',name:'Daily'},{id:'weekdays',name:'Weekdays'},{id:'weekly',name:'Weekly'}];
const DAY=864e5;
const dkey=(d=new Date())=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const today=()=>dkey();
const NOW=Date.now();
const SEED_LISTS=[
  {id:'dj',name:'DJ Badbull',c:'#5AB8F5',space:'music'},
  {id:'habits',name:'Habits',c:'#7C83F2',space:'personal'},
  {id:'swing',name:'Swing trading',c:'#F06A6A',space:'trading'}
];
const SEED_SPACES=[{id:'music',name:'Music',c:'#5AB8F5',e:'🎧'},{id:'personal',name:'Personal',c:'#9C95FF',e:'🌱'},{id:'trading',name:'Trading',c:'#FF5B47',e:'📈'}];
const SEED=[
  {id:1,title:'Finish the mix for Friday',stage:'today',list:'dj',est:90,subs:[{id:1,t:'Pick the opener',done:true},{id:2,t:'Smooth the mid-set transitions',done:false},{id:3,t:'Export and listen in the car',done:false}]},
  {id:2,title:'30 minute workout',stage:'today',list:'habits',est:30,repeat:'daily'},
  {id:3,title:'Set alerts on watchlist',stage:'today',list:'swing',est:15,notes:'Alerts at the 50-day average for each name.'},
  {id:4,title:'Buy GOOG on pullback',stage:'week',list:'swing',est:15},
  {id:5,title:'Send promo pack to venues',stage:'week',list:'dj',est:45},
  {id:6,title:'No screens after midnight',stage:'backlog',list:'habits',est:60},
  {id:7,title:'Rebuild crate for house sets',stage:'backlog',list:'dj',est:120},
  {id:8,title:'Journal last week’s trades',stage:'done',list:'swing',est:30,doneAt:NOW-DAY},
  {id:9,title:'Read 20 pages',stage:'done',list:'habits',est:20,doneAt:NOW-DAY},
  {id:10,title:'Clean up sample folders',stage:'done',list:'dj',est:45,doneAt:NOW-2*DAY},
  {id:11,title:'Review open positions',stage:'done',list:'swing',est:20,doneAt:NOW-3*DAY}
];
const KEY='blitzit-v1';
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
const FRESH=!S||!S.tasks;
if(FRESH)S={tasks:JSON.parse(JSON.stringify(SEED)),stage:'today',list:'all',theme:null,nid:20,lastDay:today(),onboarded:false};
else if(S.onboarded===undefined)S.onboarded=true;
/* make sure the saved data has the right shape before anything reads it (old, partial or damaged saves) */
function sanitize(){
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
  if(!Array.isArray(S.tasks))S.tasks=[];
  S.tasks=S.tasks.filter(t=>obj(t)&&t.id!=null&&isFinite(+t.id));
  S.tasks.forEach(t=>{t.subs=Array.isArray(t.subs)?t.subs.filter(x=>obj(x)&&x.id!=null&&isFinite(+x.id)):[]});
  if(S.lists!=null)S.lists=Array.isArray(S.lists)?S.lists.filter(l=>obj(l)&&l.id!=null):null;
  if(S.spaces!=null)S.spaces=Array.isArray(S.spaces)?S.spaces.filter(x=>obj(x)&&x.id!=null):null;
  if(!obj(S.cfg))delete S.cfg;
  if(!obj(S.tomb))S.tomb={};
}
if(!S||typeof S!=='object'||Array.isArray(S))S={tasks:JSON.parse(JSON.stringify(SEED)),stage:'today',list:'all',theme:null,nid:20,lastDay:today(),onboarded:false};
sanitize();
window.__crHold=!!(S.classicRun&&S.classicRun.ids); // keep a saved Classic session until startup has resumed it
/* migrate older saves */
if(!S.lists)S.lists=SEED_LISTS.map(l=>({...l}));
if(!S.lastDay)S.lastDay=today();
S.tasks.forEach(t=>{t.subs=t.subs||[];t.notes=t.notes||'';t.repeat=t.repeat||'none';if(t.stage==='done'&&!t.doneAt)t.doneAt=NOW-DAY});
S.nid=Math.max(+S.nid||0,...S.tasks.map(t=>+t.id+1),...S.tasks.flatMap(t=>t.subs.map(s=>+s.id+1)));

/* ids are unique across devices (time-based), so two devices never create the same id */
const newId=()=>{const v=Math.max(S.nid||0,Date.now()*1000+Math.floor(Math.random()*1000));S.nid=v+1;return v};
/* change tracking: each task, list and space remembers when it last changed; deletions leave a tombstone */
let trackMap=null;
const bareJSON=x=>{const {u,...r}=x;return JSON.stringify(r)};
function trackChanges(){
  const now=Date.now(),m={};S.tomb=S.tomb||{};
  [['t',S.tasks],['l',S.lists],['s',S.spaces||[]]].forEach(([k,arr])=>arr.forEach(x=>{const key=k+':'+x.id,b=bareJSON(x);m[key]=b;if(trackMap&&trackMap[key]!==b)x.u=now}));
  if(trackMap)Object.keys(trackMap).forEach(key=>{if(key[1]===':'&&!(key in m))S.tomb[key]=now});
  m.__ord=S.tasks.map(t=>t.id).join(',');if(trackMap&&m.__ord!==trackMap.__ord)S.orderU=now;
  m.__cfg=JSON.stringify(S.cfg||{});if(trackMap&&m.__cfg!==trackMap.__cfg)S.cfgU=now;
  trackMap=m;
}
let undoHash=null;const undoCore=()=>JSON.stringify([S.tasks,S.lists,S.spaces],(k,v)=>k==='u'?undefined:v); // ignores sync timestamps
const save=()=>{try{fSave()}catch(e){};if(undoHash!==null){try{if(undoCore()!==undoHash){undoHash=null;dropUndo()}}catch(e){}};try{trackChanges()}catch(e){};try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){};try{cloudDirty()}catch(e){}};
let PIP=null; // the floating focus window (desktop Chrome)
const $=id=>document.getElementById(id);
const color=st=>`var(--${st})`;
const listOf=id=>S.lists.find(l=>l.id===id)||{id,name:'No list',c:'#A1A1AA'};
function migrateSpaces(){
  if(!Array.isArray(S.spaces)||!S.spaces.length){
    const used=new Set(S.lists.map(l=>l.space||(SEED_LISTS.find(x=>x.id===l.id)||{}).space||'personal'));
    S.spaces=SEED_SPACES.filter(x=>used.has(x.id)).map(x=>({...x}));
    if(!S.spaces.length)S.spaces=[{...SEED_SPACES[1]}];
  }
  const ids=S.spaces.map(x=>x.id);
  S.lists.forEach(l=>{if(!ids.includes(l.space)){const sd=SEED_LISTS.find(x=>x.id===l.id);l.space=sd&&ids.includes(sd.space)?sd.space:ids[0]}});
  S.spaces.forEach(x=>{if(x.e===undefined||x.e===''){const a=autoIcon(x.name);if(a&&!x.autoSet){x.e=a;x.autoSet=true}}});
  if(S.space===undefined)S.space=null;
  if(S.space&&S.space!=='all'&&!ids.includes(S.space))S.space=null;
  repairData();
}
/* safety net: fix anything malformed (old saves, partial syncs) so the app never crashes on bad data */
function repairData(){
  const SIDS=['backlog','week','today','done'];
  if(!SIDS.includes(S.stage))S.stage='today';
  sanitize();
  if(!Array.isArray(S.spaces)||!S.spaces.length)S.spaces=[{...SEED_SPACES[1]}];
  if(!Array.isArray(S.lists)||!S.lists.length)S.lists=[{id:'l'+newId(),name:'General',c:'#9C95FF',space:S.spaces[0].id}];
  const lids=new Set(S.lists.map(l=>l.id));
  S.tasks=S.tasks.filter(t=>t&&typeof t==='object'&&t.id!=null);
  S.tasks.forEach(t=>{
    if(!SIDS.includes(t.stage))t.stage='backlog';
    if(!lids.has(t.list))t.list=S.lists[0].id;
    if(typeof t.title!=='string')t.title=t.title==null?'':String(t.title);
    if(!Array.isArray(t.subs))t.subs=[];
    if(typeof t.est!=='number'||!(t.est>=0))t.est=30;
    if(typeof t.notes!=='string')t.notes='';
    if(!t.repeat)t.repeat='none';
  });
  if(S.list!=='all'&&!lids.has(S.list))S.list='all';
}
const spaceOf=id=>S.spaces.find(x=>x.id===id);
const ICONS=['🎧','🌱','📈','💪','💰','💼','🏠','✈️','📚','🎨','💻','🚀','🍳','🛍️','❤️','🎯','🧘','⚽','🎮','📷','✍️','🎓','🛠️','🌍'];
const ICON_WORDS=[[/music|dj|song|band|audio|beat/,'🎧'],[/health|fitness|gym|workout|sport|run/,'💪'],[/financ|money|budget|bank|invest|tax/,'💰'],
  [/trad|stock|crypto|market/,'📈'],[/work|job|office|business|career|client/,'💼'],[/home|house|family|chores/,'🏠'],[/travel|trip|holiday|vacation/,'✈️'],
  [/study|school|uni|learn|course|exam/,'📚'],[/design|art|draw|paint/,'🎨'],[/code|dev|app|tech|software/,'💻'],[/project|launch|startup|side/,'🚀'],
  [/food|cook|recipe|meal/,'🍳'],[/shop|buy|grocer/,'🛍️'],[/love|relationship|partner/,'❤️'],[/goal|focus|target/,'🎯'],[/mind|medit|yoga|calm|wellbeing/,'🧘'],
  [/game|gaming/,'🎮'],[/photo|video|film|content/,'📷'],[/writ|blog|book|journal/,'✍️'],[/personal|life|self|habit/,'🌱']];
const autoIcon=n=>{const t=(n||'').toLowerCase();const m=ICON_WORDS.find(([r])=>r.test(t));return m?m[1]:''};
const inSpaceMode=()=>S.space&&S.space!=='all';
const listsHere=()=>inSpaceMode()?S.lists.filter(l=>l.space===S.space):S.lists;
const inSpace=t=>!inSpaceMode()||listOf(t.list).space===S.space;
const fmt=m=>m>=60?(m%60?`${Math.floor(m/60)}h ${m%60}m`:`${m/60}h`):`${m}m`;
const shown=t=>!t.archived&&(!t.showFrom||t.showFrom<=today());
const VS=()=>STAGES.filter(s=>s.id!=='done'||!S.cfg||S.cfg.showDone);
const visible=()=>S.tasks.filter(t=>shown(t)&&inSpace(t)&&(S.list==='all'||t.list===S.list));
const idx=id=>STAGES.findIndex(s=>s.id===id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const root=document.documentElement;
const haptic=(p=8)=>{try{if(S.cfg&&!S.cfg.haptics)return;navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const defaultList=()=>{const h=listsHere();if(S.list!=='all'&&h.some(l=>l.id===S.list))return S.list;if(S.cfg&&S.cfg.defList&&h.some(l=>l.id===S.cfg.defList))return S.cfg.defList;return (h[0]||S.lists[0]).id};
const addTask=t=>{S.cfg&&S.cfg.addTo==='bottom'?S.tasks.push(t):S.tasks.unshift(t)};
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const I_REP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
const I_SUB='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>';
const I_NOTE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>';


