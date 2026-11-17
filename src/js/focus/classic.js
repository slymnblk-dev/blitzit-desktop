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
  q=inSpaceMode()?priSorted(q):bySpaceOrder(q); // same order as the list you see (biggest impact, then priority)
  if(!q.length)return toast('Add a task to Today first');
  startBlitz(q);
};
function startBlitz(q,from){if(!from){sfx('start');setTimeout(ambFocusStart,300)}
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
  if(F.stepFor!==t.id){F.stepFor=t.id;fAddStep=false}drawSteps();
  const n=F.q[F.i+1];$('fNext').innerHTML=n?`Up next <b>${esc(n.title)}</b>`:'';
  $('fPause').innerHTML=F.run?PAUSE:PLAY;drawTime();
}
/* the task's steps, all of them: tick (or untick) any, add one, without leaving focus (Classic and Tide alike) */
let fAddStep=false;
const fsBox=()=>document.querySelector('#tide.on #tSteps')||$('fSteps');
const fCur=()=>F.on&&F.q?liveTask(F.q[F.i]):null;
const FS_TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 12.5l3.5 3.5 7.5-8"/></svg>';
const FS_PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const fsLabel=s=>(s.done?'Mark not done: ':'Mark done: ')+s.t;
/* Spotlight: one step at a time (or three, Settings → Focus → Steps), in a card that keeps one size, so the timer never moves.
   Ticked steps leave the card and the next one rises in; a row of dashes shows how far through you are. */
let fsUndo=null,fsUndoT=null,fsFresh=null;
const fsShow=()=>C().fsShow==='3'?3:1;
function drawSteps(){
  const t=fCur(),el=fsBox();if(!el)return;if(!t){el.innerHTML='';return}
  const ss=t.subs||[],dn=ss.filter(s=>s.done).length,a=document.activeElement,typing=a&&a.id==='fsIn'?a.value:null;
  const n=fsShow(),open=ss.filter(s=>!s.done),vis=open.slice(0,n);
  el.classList.toggle('has',ss.length>0);el.classList.toggle('fs-3',n===3);
  if(!ss.length){el.innerHTML=fAddStep?`<label class="fs-add on"><span class="fs-plus">${FS_PLUS}</span><input id="fsIn" placeholder="Add a step" maxlength="200" autocomplete="off" enterkeyhint="done" aria-label="Add a step"></label>`
    :`<button class="fs-add" data-fsadd>${FS_PLUS}<span>Add steps</span></button>`}
  else{
    const add=ss.length<SUB_MAX?`<button class="fs-plusb" data-fsadd aria-label="Add a step" title="Add a step">${FS_PLUS}</button>`:'';
    const body=fAddStep?`<label class="fs-add on"><span class="fs-plus">${FS_PLUS}</span><input id="fsIn" placeholder="Add a step" maxlength="200" autocomplete="off" enterkeyhint="done" aria-label="Add a step"></label>`
      :!open.length?`<div class="fs-all"><i>${FS_TICK}</i><span>All ${ss.length} ${ss.length===1?'step':'steps'} done</span></div>`
      :`<div class="fs-list">${vis.map(s=>`<button class="fs-r${s.id===fsFresh?' fs-in':''}" data-fst="${s.id}" aria-pressed="false" aria-label="${esc(fsLabel(s))}"><i>${FS_TICK}</i><span>${esc(s.t)}</span></button>`).join('')}</div>`;
    const foot=fsUndo?`<button class="fs-undo" data-fsundo>Undo</button>`:n===1&&open[1]?`<span class="fs-then">Then: ${esc(open[1].t)}</span>`:open.length>n?`<span class="fs-then">${open.length-n} more after these</span>`:'<span></span>';
    el.innerHTML=`<div class="fs-h"><span>Steps</span><span class="fs-hr"><span id="fsN">${dn} of ${ss.length}</span>${add}</span></div>${body}
      <div class="fs-f"><span class="fs-dots" aria-hidden="true">${ss.map(s=>`<i class="${s.done?'on':''}"></i>`).join('')}</span>${foot}</div>`}
  fsFresh=null;
  if(typing!==null){const i=$('fsIn');if(i){i.value=typing;i.focus({preventScroll:true})}}
}
function fTickStep(id){const t=fCur(),s=t&&(t.subs||[]).find(x=>x.id===id);if(!s)return;s.done=!s.done;save();
  if(s.done){haptic(10);sfx('tick');shuffleFocus()}else haptic(5);
  const b=fsBox().querySelector(`[data-fst="${id}"]`);
  if(s.done){fsUndo=id;clearTimeout(fsUndoT);fsUndoT=setTimeout(()=>{fsUndo=null;drawSteps()},4000);
    const nx=(t.subs||[]).filter(x=>!x.done)[fsShow()-1];fsFresh=nx?nx.id:null}
  if(b&&s.done){b.classList.add('on','fs-out');setTimeout(drawSteps,280)}else drawSteps()}
/* the mini timer's step button ticks the next open one */
function fTickNext(){const t=fCur(),s=t&&(t.subs||[]).find(x=>!x.done);if(s)fTickStep(s.id)}
function fsClick(e){
  const b=e.target.closest('[data-fst]');if(b){if(b.classList.contains('fs-out'))return;return fTickStep(+b.dataset.fst)}
  if(e.target.closest('[data-fsundo]')){const id=fsUndo;fsUndo=null;clearTimeout(fsUndoT);if(id!=null)fTickStep(id);return}
  if(e.target.closest('[data-fsadd]')){fAddStep=true;haptic(4);drawSteps();const i=$('fsIn');if(i)i.focus()}}
function fsKey(e){
  if(e.target.id==='fsIn'){e.stopPropagation(); // typing a step never pauses, finishes or closes focus
    if(e.key==='Enter'){e.preventDefault();const v=e.target.value.trim();if(!v){fAddStep=false;return drawSteps()}
      const t=fCur();if(!t||!canStep(t))return;t.subs=t.subs||[];t.subs.push({id:newId(),t:v,done:false});haptic(6);try{sfx('add')}catch(err){}save();
      e.target.value='';drawSteps();const l=fsBox().querySelector('.fs-list');if(l)l.scrollTop=l.scrollHeight}
    else if(e.key==='Escape'){e.preventDefault();fAddStep=false;drawSteps()}
    return}
  const b=e.target.closest('[data-fst]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();if(!b.classList.contains('fs-out'))fTickStep(+b.dataset.fst)}}
function fsOut(e){if(e.target.id!=='fsIn')return;setTimeout(()=>{const a=document.activeElement,i=$('fsIn');if(fAddStep&&i&&a!==i&&!i.value.trim()){fAddStep=false;drawSteps()}},150)}
$('fSteps').addEventListener('click',fsClick);$('fSteps').addEventListener('keydown',fsKey);$('fSteps').addEventListener('focusout',fsOut);
$('fMode').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.m===F.mode)return;
  step();F.last=Date.now();F.mode=b.dataset.m;S.cfg.focusMode=F.mode;save();F.phase='work';F.left=POMO.work;F.round=1;$('focus').classList.remove('brk');haptic(6);drawFocus()};
function nextFocus(){
  if(F.i<F.q.length-1){F.i++;F.sec=0;F.extra=0;F.upd=false;F.run=true;drawFocus()}
  else showSummary();
}
