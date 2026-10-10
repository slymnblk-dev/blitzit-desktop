/* ---------- finished-task clean up ---------- */
function runCleanup(withUndo){
  if(!S.cfg||S.cfg.cleanup==='never')return;
  const cut=Date.now()-S.cfg.cleanupAfter*DAY;
  const old=S.tasks.filter(t=>t.stage==='done'&&!t.archived&&t.doneAt&&t.doneAt<cut&&!(t.keepUntil>cut));
  if(!old.length)return;
  const n=old.length,act=S.cfg.cleanup,msg=`${n} finished ${n===1?'task':'tasks'} ${act==='archive'?'archived':'deleted'}`;
  const fn=()=>{if(act==='archive')old.forEach(t=>{t.archived=true;t.archivedAt=Date.now()});else S.tasks=S.tasks.filter(t=>!old.includes(t))};
  if(withUndo)commit(fn,msg);else{fn();render();toast(msg)}
}

/* ---------- column focus (desktop) ---------- */
function applyColFocus(anim){
  const bd=$('board');if(!bd)return;if(S.colFocus&&!VS().some(x=>x.id===S.colFocus))S.colFocus=null;const f=S.colFocus||null;
  bd.classList.toggle('focused',!!f);
  const prev=bd.dataset.f||'';bd.dataset.f=f||'';
  bd.style.gridTemplateColumns=VS().map(s=>f?(s.id===f?'minmax(0,4fr)':'minmax(0,.2fr)'):'minmax(0,1fr)').join(' ');
  bd.querySelectorAll('.col').forEach(c=>{const on=c.dataset.s===f;c.classList.toggle('fcs',on);c.classList.toggle('was',anim&&c.dataset.s===prev);
    const b=c.querySelector('.col-fx');if(b)b.setAttribute('aria-label',on?'Back to board':'Focus on '+STAGES[idx(c.dataset.s)].name);
    c.title=f&&!on?STAGES[idx(c.dataset.s)].name:''});
  if(anim){bd.classList.remove('swap');void bd.offsetWidth;bd.classList.add('swap');clearTimeout(bd._t);bd._t=setTimeout(()=>{bd.classList.remove('swap');bd.querySelectorAll('.col.was').forEach(c=>c.classList.remove('was'))},900)}
}
function setColFocus(id){S.colFocus=id;haptic(6);applyColFocus(true);save()}
$('board').addEventListener('click',e=>{
  const fx=e.target.closest('.col-fx, .col-t h2');
  const col=e.target.closest('.col');if(!col)return;
  if(fx){e.stopPropagation();setColFocus(S.colFocus===col.dataset.s?null:col.dataset.s);return}
  if(S.colFocus&&!col.classList.contains('fcs'))setColFocus(col.dataset.s);
},true);

/* ---------- first-time intro ---------- */
const STARTERS=[{n:'Work',e:'💼',c:'#5AB8F5'},{n:'Side project',e:'🚀',c:'#F5A35A'},{n:'Personal',e:'🌱',c:'#9C95FF'},{n:'Health',e:'💪',c:'#4FD1A5'},{n:'Learning',e:'📚',c:'#E879C8'},{n:'Finance',e:'💰',c:'#F06A6A'}];
let inStep=0,inPick=new Set(['Work','Personal']),inReplay=false;
function openIntro(replay){inReplay=!!replay;inStep=0;drawIntro();$('intro').classList.add('on');document.body.style.overflow='hidden'}
function closeIntro(){$('intro').classList.remove('on');document.body.style.overflow=''}
function drawIntro(){
  $('inTrack').style.transform=`translateX(${-inStep*100}%)`;
  $('intro').dataset.step=inStep;
  [...$('inDots').children].forEach((d,i)=>d.classList.toggle('on',i===inStep));
  $('inPicks').innerHTML=STARTERS.map(x=>`<button class="in-pick ${inPick.has(x.n)?'on':''}" data-n="${x.n}" style="--pc:${x.c}"><span>${x.e}</span>${x.n}</button>`).join('');
  const last=inStep===2;
  $('inNext').textContent=!last?'Next':inReplay?'Back to my tasks':'Start fresh';
  $('inNext').disabled=last&&!inReplay&&!inPick.size;
  $('inSkip').classList.toggle('gone',last);
  $('inAlt').hidden=!last||inReplay;$('inSignin').hidden=!CLOUD;
  $('inPicks').hidden=inReplay;
  $('inP3').innerHTML=inReplay?'Each area of your work lives in its own <b>space</b>. Add, rename or recolour spaces anytime from <b>Home</b>.':'Pick the areas you work on. Each becomes a <b>space</b> with its own lists. You can change them anytime.';
}
function startFresh(){
  const picked=STARTERS.filter(x=>inPick.has(x.n));
  S.tasks=[];S.spaces=picked.map(x=>({id:'s'+newId(),name:x.n,c:x.c,e:x.e,autoSet:true}));
  S.lists=S.spaces.map(sp=>({id:'l'+newId(),name:'General',c:sp.c,space:sp.id}));
  S.space=null;S.list='all';S.stage='today';S.focusLog={};S.onboarded=true;S.lastDay=today();
  closeIntro();applySettings();render(0);haptic(12);toast(matchMedia('(min-width:1100px)').matches?'You’re all set. Press N to add a task':'You’re all set. Tap + to add a task');
}
$('inNext').onclick=()=>{
  if(inStep<2){inStep++;haptic(5);return drawIntro()}
  if(inReplay){closeIntro();return}
  if(inPick.size)startFresh();
};
$('inSkip').onclick=()=>{inStep=2;haptic(5);drawIntro()};
$('inPicks').onclick=e=>{const b=e.target.closest('.in-pick');if(!b)return;const n=b.dataset.n;inPick.has(n)?inPick.delete(n):inPick.add(n);haptic(5);drawIntro()};
$('inDemo').onclick=()=>{S.onboarded=true;closeIntro();render(0);toast('Demo data loaded. Clear it anytime in Settings')};
$('inSignin').onclick=()=>{S.tasks=[];S.onboarded=true;closeIntro();render(0);openSettings();setView='account';drawSettings()};
$('inDots').onclick=e=>{const i=[...$('inDots').children].indexOf(e.target);if(i>-1){inStep=i;drawIntro()}};
let inX=null;
$('inTrack').addEventListener('pointerdown',e=>{if(!e.target.closest('button'))inX=e.clientX});
$('inTrack').addEventListener('pointerup',e=>{if(inX===null)return;const d=e.clientX-inX;inX=null;
  if(d<-50&&inStep<2){inStep++;drawIntro()}else if(d>50&&inStep>0){inStep--;drawIntro()}});
document.addEventListener('keydown',e=>{if(!$('intro').classList.contains('on'))return;
  if(e.key==='ArrowRight'&&inStep<2){inStep++;drawIntro()}else if(e.key==='ArrowLeft'&&inStep>0){inStep--;drawIntro()}
  else if(e.key==='Enter'&&!e.target.closest('button')){$('inNext').click()}
  e.stopPropagation()},true);

/* ---------- install ---------- */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installBtn').hidden=false;$('dInstall').hidden=false});
$('installBtn').onclick=async()=>{if(!installEvt)return;installEvt.prompt();try{await installEvt.userChoice}catch(e){}installEvt=null;$('installBtn').hidden=true;$('dInstall').hidden=true};
window.addEventListener('appinstalled',()=>{$('installBtn').hidden=true;toast('Windaday installed')});
if('serviceWorker' in navigator&&document.querySelector('link[rel=manifest]'))navigator.serviceWorker.register('sw.js').catch(()=>{});

if(!S.firstUse)S.firstUse=Date.now();
migrateSpaces();
applySettings();
render(0);
checkNewDay();
runCleanup(false);
if(HANDOFF)showHandoff();else{
initCloud();
if(!S.onboarded)openIntro(false);
try{const cr=S.classicRun;window.__crHold=false;if(cr&&cr.ids&&!(S.tideRun&&S.tideRun.ids)){
  const q=cr.ids.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean),ci=q.findIndex(t=>t.id===cr.cid);
  if(ci>=0&&q[ci].stage!=='done')setTimeout(()=>{
    startBlitz(q,{i:ci,done:cr.done||0,focused:cr.focused||0,classic:true});
    const away=Date.now()-(cr.last||Date.now()),keep=cr.run&&away<2*3600e3; // closed for over 2h: resume paused, don't count the gap
    Object.assign(F,{sec:cr.sec||0,run:keep,mode:cr.mode||F.mode,phase:cr.phase||'work',left:cr.left!=null?cr.left:F.left,round:cr.round||1,extra:cr.extra||0,last:keep?cr.last:Date.now()});
    $('focus').classList.toggle('brk',F.phase==='break');drawFocus();step();save();
  },200);else{S.classicRun=null;save()}
}}catch(e){}
try{const tr=S.tideRun;if(tr&&tr.ids){const q=tr.ids.map(id=>S.tasks.find(t=>t.id===id)).filter(Boolean),ci=tr.cid!=null?q.findIndex(t=>t.id===tr.cid):tr.i;if(q.length&&ci>=0&&ci<q.length)setTimeout(()=>startTide(q,{i:ci,done:tr.done||0,focused:tr.focused||0,T:tr.T}),200);else{S.tideRun=null;save()}}}catch(e){}
/* old address (netlify.app) in a browser: point people to windaday.com. The desktop app keeps using this address on purpose. */
try{if(/\.netlify\.app$/.test(location.hostname)&&!DESK()&&localStorage.getItem('movedSeen')!=='1'){
  const b=document.createElement('div');b.className='moved';
  b.innerHTML=`<span><b>Windaday has a new home.</b> ${S.syncedUser?'Your tasks sync there too.':'Sign in first so your tasks come with you.'}</span><a href="https://windaday.com" class="moved-go">Open windaday.com</a><button class="moved-x" aria-label="Dismiss">${X}</button>`;
  document.body.appendChild(b);
  b.querySelector('.moved-x').onclick=()=>{try{localStorage.setItem('movedSeen','1')}catch(e){}b.remove()};
}}catch(e){}
/* preview copy (github.io): a small badge so it is never mistaken for the live app. Its data stays in this browser only. */
try{if(/\.github\.io$/.test(location.hostname)){const p=document.createElement('div');p.className='pv-badge';p.textContent='Preview · test copy';p.title='Not the live app. Data here stays in this browser.';document.body.appendChild(p)}}catch(e){}
try{if(new URLSearchParams(location.search).get('blitz')==='1')setTimeout(()=>$('goBtn').click(),400)}catch(e){}
}
