/* ---------- Small moments of motion (phone + computer). Each one is a few lines, so any can be taken out on its own.
   All follow Settings → Motion off and the system's reduced motion; haptics follow Settings → Haptics.
   1 tick burst · 2 count-up · 3 haptics (gaps only) · 5 page direction · 6 won the day · 7 streak flip
   8 pull Home to refresh · 10 focus last seconds (press feel, empty states and the finish glow are CSS: 12-phone.css) ---------- */
const moOK=()=>root.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 1 · ticking something done: a small burst of dots from the tick */
function moBurst(el,col){
  if(!moOK()||!el)return;const r=el.getBoundingClientRect();if(!r.width)return;
  const b=document.createElement('div');b.className='mo-burst';b.style.left=(r.left+r.width/2)+'px';b.style.top=(r.top+r.height/2)+'px';
  if(col)b.style.setProperty('--mb',col);
  b.innerHTML=Array.from({length:6},(_,i)=>`<i style="--a:${i*60+15}deg"></i>`).join('');
  document.body.appendChild(b);setTimeout(()=>b.remove(),700);
}
document.addEventListener('click',e=>{
  const ck=e.target.closest('[data-check]');
  if(ck){const row=ck.closest('.row');if(row&&!row.classList.contains('is-done')&&!row.dataset.busy)moBurst(ck,'var(--today)');return}
  const hf=e.target.closest('[data-hfdone]');if(hf)return moBurst(hf,'var(--today)');
  const hb=e.target.closest('[data-hbt],[data-hst]');if(hb&&hb.getAttribute('aria-pressed')!=='true'&&!hb.classList.contains('on'))return moBurst(hb.querySelector('.hw-k,.hs-k')||hb,'var(--today)');
  const gm=e.target.closest('[data-gmt],[data-gtk]');if(gm&&gm.getAttribute('aria-pressed')!=='true')moBurst(gm,'var(--today)');
},true);

/* 2 · numbers count up when you arrive on Home or open a page; rings fill from empty (CSS, while :root.mo-arrive) */
function moCount(scope){
  if(!moOK()||!scope)return;
  scope.querySelectorAll('.cm-hd p b,.bn-hr,.hw-ring b,.dh-ring b,.hp-sub b,.hb-sub b,.mt2-sub b').forEach(el=>{
    if(el.children.length)return;const m=el.textContent.match(/^(\D*)(\d+)(.*)$/);if(!m||+m[2]<2)return;
    const to=+m[2],t0=performance.now(),dur=Math.min(700,300+to*40);
    const step=now=>{if(!el.isConnected)return;const k=Math.min(1,(now-t0)/dur),v=Math.round(to*(1-Math.pow(1-k,3)));
      el.textContent=m[1]+v+m[3];if(k<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);
  });
}
let moInT=null;
function moArrive(scope){if(!moOK())return;root.classList.add('mo-arrive');clearTimeout(moInT);moInT=setTimeout(()=>root.classList.remove('mo-arrive'),1100);requestAnimationFrame(()=>moCount(scope))}
const moAtHome=()=>!S.space&&!(typeof spPage!=='undefined'&&spPage);
const moHomeBox=()=>matchMedia('(min-width:1100px)').matches?$('dHome'):$('homeView');
let moWasHome=null;
const _moRender=render;render=function(d){_moRender(d);try{const h=moAtHome();if(h&&moWasHome===false)moArrive(moHomeBox());moWasHome=h}catch(err){console.error(err)}};
['inboxPg','rhythmPg','goalsPg','mxPg'].forEach(id=>{const pg=$(id);if(!pg)return;
  new MutationObserver(()=>{const on=pg.classList.contains('on');if(on&&!pg.dataset.moOn)moArrive(pg);pg.dataset.moOn=on?'1':''}).observe(pg,{attributes:true,attributeFilter:['class']})});
setTimeout(()=>{if(moAtHome()){moWasHome=true;moArrive(moHomeBox())}},700);

/* 3 · haptics where they were missing: goal milestones and tasks, the round +, logging a KPI */
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-gmt],[data-gtk]');if(g)return haptic(g.getAttribute('aria-pressed')==='true'?6:[8,30,12]);
  if(e.target.closest('#tbAdd,.mxw-plus,.mx-logbtn'))haptic(6);
},true);

/* 5 · phones: switching tabs, the page comes in from the side of its tab (Inbox from the left of Goals, and so on).
   Computers: pages fade and rise in (CSS). */
const MO_TABS=['home','inbox','habits','goals'];
const _moTab=tbGo;tbGo=function(k){
  const c=tabNow(),a=MO_TABS.indexOf(c),b=MO_TABS.indexOf(k);
  if(a<0||b<0||a===b||!moOK())return _moTab(k);
  const dir=b>a?'r':'l',open=[...document.querySelectorAll('.inbox-pg.on')];
  root.dataset.tdir=dir;open.forEach(p=>p.classList.add('pg-out-'+(dir==='r'?'l':'r')));
  _moTab(k);
  setTimeout(()=>{open.forEach(p=>p.classList.remove('pg-out-l','pg-out-r'));delete root.dataset.tdir},450);
};

/* 6 · the last Today task done: the sun rises and a warm gold glow, "You won the day" */
const moTodayLeft=()=>S.tasks.filter(t=>shown(t)&&t.stage==='today').length;
let moLeft=null;
function moWon(){
  if(!moOK())return;if($('focus').classList.contains('on')||(typeof tideOn==='function'&&tideOn()))return;
  const c=$('celeb');if(c)c.remove();const old=$('moWin');if(old)old.remove();
  const n=S.tasks.filter(t=>shown(t)&&t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===today()).length;
  const el=document.createElement('div');el.id='moWin';el.className='mo-win';el.setAttribute('aria-live','polite');
  el.innerHTML=`<div class="mw-glow"></div><div class="mw-in"><svg class="mw-sun" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><g class="mw-rays"><path d="M24 9v6"/><path d="M11.5 14.5l4 4"/><path d="M36.5 14.5l-4 4"/></g><path class="mw-disc" d="M12 36a12 12 0 0 1 24 0z" fill="currentColor" fill-opacity=".35" stroke="none"/><path class="mw-disc" d="M12 36a12 12 0 0 1 24 0"/><path d="M4 36h40"/></svg><b>You won the day</b><span>${n} ${n===1?'task':'tasks'} done today</span></div>`;
  document.body.appendChild(el);haptic([10,50,10,50,24]);setTimeout(moWonSound,180);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),600)},2600);
}
/* its sound, "Sunrise": four notes rising like the sun, landing on a warm open chord, in a small soft room.
   Follows Settings → Sounds (on/off and volume) like every other sound. */
let moVerb=null;
function moWonSound(){try{
  if(!S.cfg||S.cfg.uiSounds===false||!sfxReady())return;const c=sfxCtx;
  if(!moVerb){moVerb=c.createGain();moVerb.gain.value=.28;
    [.11,.17].forEach(d=>{const dl=c.createDelay(1),fb=c.createGain(),f=c.createBiquadFilter();dl.delayTime.value=d;fb.gain.value=.38;f.type='lowpass';f.frequency.value=2600;
      moVerb.connect(dl);dl.connect(f).connect(fb).connect(dl);f.connect(sfxBus)})}
  const osc=(type,f,t,dur,vol,attack=.008)=>{const o=c.createOscillator(),g=c.createGain(),w=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    w.gain.value=.6;o.connect(g);g.connect(sfxBus);g.connect(w).connect(moVerb);o.start(t);o.stop(t+dur+.05)};
  const bell=(f,t,d,v)=>{osc('sine',f,t,d,v);osc('sine',f*2.01,t,d*.55,v*.18);osc('sine',f*3.02,t,d*.3,v*.06)};
  const t=c.currentTime+.02;
  [523.3,659.3,784,1046.5].forEach((f,i)=>bell(f,t+i*.085,.9-i*.05,.16));
  [523.3,659.3,784].forEach(f=>osc('sine',f,t+.34,1.3,.07,.08));osc('triangle',261.6,t+.34,1.2,.05,.1);bell(1318.5,t+.42,.7,.04);
}catch(e){}}
const _moRender2=render;render=function(d){_moRender2(d);try{const n=moTodayLeft();
  if(moLeft>0&&n===0&&performance.now()-sfxAct<2500&&S.tasks.some(t=>shown(t)&&t.stage==='done'&&t.doneAt&&Date.now()-t.doneAt<4000))setTimeout(moWon,380);
  moLeft=n}catch(err){console.error(err)}};

/* 7 · a habit's streak grows: the number flips up like a counter */
const _moHb=hbToggle;hbToggle=function(id,force){
  const h=hbById(id),was=h?hbStats(h).st:0;const r=_moHb(id,force);
  try{const h2=hbById(id);if(h2&&hbStats(h2).st>was&&moOK()){
    const flip=()=>document.querySelectorAll(`[data-hgs="${id}"] b,[data-hst="${id}"] small,.hw-st`).forEach(el=>{el.classList.remove('mo-flip');void el.offsetWidth;el.classList.add('mo-flip')});
    setTimeout(flip,30);setTimeout(flip,1250)}}catch(err){console.error(err)}
  return r};

/* 8 · phones: pull Home down to refresh: a small sun rises, then sync runs (or Home simply redraws when signed out) */
document.body.insertAdjacentHTML('beforeend',`<div class="mo-pull" id="moPull" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><g class="mp-rays"><path d="M24 9v6"/><path d="M11.5 14.5l4 4"/><path d="M36.5 14.5l-4 4"/></g><path class="mp-disc" d="M12 36a12 12 0 0 1 24 0z" fill="currentColor" fill-opacity=".3" stroke="none"/><path class="mp-disc" d="M12 36a12 12 0 0 1 24 0"/><path d="M4 36h40"/></svg></div>`);
let moP=null;
document.addEventListener('touchstart',e=>{
  if(S.space||window.scrollY>2||matchMedia('(min-width:1100px)').matches||anyOpen()||document.querySelector('.inbox-pg.on,.sheet.on,.focus.on')||e.target.closest('input,textarea,.tabbar'))return;
  moP={y:e.touches[0].clientY,x:e.touches[0].clientX,h:0,on:false,armed:false};
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!moP)return;const dy=e.touches[0].clientY-moP.y,dx=e.touches[0].clientX-moP.x;
  if(!moP.on){if(dy>10&&dy>Math.abs(dx)*1.2)moP.on=true;else if(Math.abs(dx)>10||dy<-6){moP=null;return}else return}
  moP.h=Math.max(0,Math.min(90,dy*.45));const el=$('moPull');el.classList.add('live');el.style.setProperty('--p',(moP.h/64).toFixed(3));
  const armed=moP.h>=64;if(armed!==moP.armed){moP.armed=armed;el.classList.toggle('armed',armed);if(armed)haptic(10)}
},{passive:true});
document.addEventListener('touchend',()=>{
  if(!moP)return;const p=moP;moP=null;const el=$('moPull');if(!p.on){return}
  if(!p.armed){el.classList.remove('live','armed');return}
  el.classList.add('spin');
  const done=msg=>{el.classList.remove('live','armed','spin');if(msg)toast(msg)};
  try{if(typeof sb!=='undefined'&&sb&&typeof user!=='undefined'&&user){Promise.resolve(reconcile(false)).then(()=>done(syncState==='error'?'Could not sync. Try again in a moment.':'Synced')).catch(()=>done('Could not sync. Try again in a moment.'))}
    else setTimeout(()=>{render();done('Up to date')},600)}catch(err){done()}
});

/* 10 · focus: the last 10 seconds of a timed block tick with a soft pulse */
setInterval(()=>{
  let el=null,rem=null;
  try{if(typeof tideOn==='function'&&tideOn()&&T&&T.mode==='run'&&!T.pt){el=$('tTime');rem=Math.ceil(tLeft()/1000)}
    else if(F&&F.on&&F.run&&!$('focus').classList.contains('sum')){el=$('fTime');const t=F.q[F.i];
      rem=F.mode==='pomo'?F.left:t&&t.est>0?t.est*60+(F.extra||0)-F.sec:null}}catch(e){}
  document.querySelectorAll('.mo-last').forEach(x=>{if(x!==el)x.classList.remove('mo-last','mo-tk')});
  if(!el||rem==null)return;
  const last=rem>0&&rem<=10&&moOK();el.classList.toggle('mo-last',last);
  if(last){el.classList.remove('mo-tk');void el.offsetWidth;el.classList.add('mo-tk')}
},1000);
