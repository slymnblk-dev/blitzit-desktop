/* ---------- focus mode ---------- */
let F={on:false};let wake=null;
async function lockScreen(){try{if('wakeLock' in navigator)wake=await navigator.wakeLock.request('screen')}catch(e){}}
function unlockScreen(){try{wake&&wake.release()}catch(e){}wake=null}
const PAUSE='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
const PLAY='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>';
const POMO={work:25*60,break:5*60};
let audio0=null;
$('goBtn').onclick=()=>{
  let q=visible().filter(t=>t.stage==='today');
  if(!q.length)q=visible().filter(t=>t.stage==='week');
  if(!inSpaceMode())q=bySpaceOrder(q); // from Home or All tasks: same order as the space list
  if(!q.length)return toast('Add a task to Today first');
  startBlitz(q);
};
function startBlitz(q,from){
  if(!from&&S.cfg.focusStyle==='tide')return startTide(q);
  focusLive=null;applyFocusColor();
  F={on:true,q,i:from?from.i:0,sec:0,run:true,mode:S.cfg.focusMode,phase:'work',left:POMO.work,round:1,focused:from?from.focused:0,done:from?from.done:0,last:Date.now(),tick:setInterval(step,500)};
  $('focus').classList.remove('sum','brk');
  drawFocus();$('focus').classList.add('on');fReveal();if(S.cfg.wake)lockScreen();haptic(12);
  try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume&&audio.resume()}catch(e){}
};
/* timer counts real clock time, so a locked phone or a background tab can't make it drift */
function addFocus(n){
  F.sec+=n;F.focused+=n;S.focusLog=S.focusLog||{};const k=today();S.focusLog[k]=(S.focusLog[k]||0)+n;
  if(Date.now()-(F.saved||0)>5000){F.saved=Date.now();save()}
}
function step(){
  const now=Date.now();
  if(!F.run){F.last=now;return}
  let d=Math.floor((now-(F.last||now))/1000);if(d<=0)return;F.last+=d*1000;
  let switched=false;
  while(d>0){
    if(F.mode==='pomo'){
      const take=Math.min(d,F.left);
      if(F.phase==='work')addFocus(take);
      F.left-=take;d-=take;
      if(F.left<=0){switched=true;
        if(F.phase==='work'){F.phase='break';F.left=POMO.break}
        else{F.phase='work';F.left=POMO.work;F.round++}}
    } else {addFocus(d);d=0}
  }
  if(F.mode!=='pomo'){const t=F.q[F.i];if(t&&t.est>0&&!F.upd&&F.sec>=t.est*60+(F.extra||0)){F.upd=true;if(deskMini||PIP){haptic([120,60,120]);chime()}}}
  if(switched){haptic([30,60,30]);chime();$('focus').classList.toggle('brk',F.phase==='break');drawFocus()}
  else drawTime();
}
const mmss=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function drawTime(){
  const t=F.q[F.i];
  if(F.mode==='pomo'){
    const total=POMO[F.phase];
    $('fTime').textContent=mmss(F.left);
    $('fBar').style.width=((total-F.left)/total*100)+'%';
    $('fLeft').textContent=F.phase==='work'?`Round ${F.round}, break in ${Math.ceil(F.left/60)}m`:'Break time';
    $('fEst').textContent='';
  } else {
    $('fTime').textContent=mmss(F.sec);
    $('fBar').style.width=Math.min(100,F.sec/(t.est*60+(F.extra||0))*100)+'%';
    const left=t.est*60+(F.extra||0)-F.sec;
    $('fLeft').textContent=left>0?`${Math.ceil(left/60)}m left`:`${Math.floor(-left/60)}m over`;
    $('fEst').textContent='';
  }
}
function drawFocus(){
  const t=F.q[F.i],l=listOf(t.list);
  $('fMode').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===F.mode));
  $('fList').textContent=F.q.length>1?`${l.name}, ${F.i+1} of ${F.q.length}`:l.name;
  $('fTitle').textContent=t.title;
  const nx=t.subs.find(s=>!s.done),dn=t.subs.filter(s=>s.done).length;
  $('fStep').hidden=!nx;$('fStep').classList.remove('tick');
  if(nx){$('fStepT').textContent=nx.t;$('fStepN').textContent=`${dn+1} / ${t.subs.length}`;$('fStep').dataset.s=nx.id}
  const n=F.q[F.i+1];$('fNext').innerHTML=n?`Up next <b>${esc(n.title)}</b>`:'';
  $('fPause').innerHTML=F.run?PAUSE:PLAY;drawTime();
}
$('fStep').onclick=()=>{const b=$('fStep');if(b.classList.contains('tick'))return;const s=F.q[F.i].subs.find(x=>x.id===+b.dataset.s);if(!s)return;b.classList.add('tick');haptic(10);setTimeout(()=>{s.done=true;save();shuffleFocus();drawFocus()},380)};
$('fMode').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.m===F.mode)return;
  step();F.last=Date.now();F.mode=b.dataset.m;S.cfg.focusMode=F.mode;save();F.phase='work';F.left=POMO.work;F.round=1;$('focus').classList.remove('brk');haptic(6);drawFocus()};
function nextFocus(){
  if(F.i<F.q.length-1){F.i++;F.sec=0;F.extra=0;F.upd=false;F.run=true;drawFocus()}
  else showSummary();
}
