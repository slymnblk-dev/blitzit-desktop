/* ---------- Tide focus style ---------- */
let T=null,tideT=null,tideQ=null;
const tideOn=()=>$('tide').classList.contains('on');
const tCur=()=>F.q&&F.q[F.i];
const tLeft=()=>Math.max(0,T.dur-((T.pt||Date.now())-T.st-T.pa));
const tElapsed=()=>T.mode==='pick'?0:Math.max(0,Math.min(T.dur,(T.pt||Date.now())-T.st-T.pa));
const tMmss=ms=>{const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function tLog(){ // move newly focused seconds into the focus log
  if(!T)return;const el=Math.floor(tElapsed()/1000),add=el-(T.logged||0);
  if(add>0){S.focusLog=S.focusLog||{};const k=today();S.focusLog[k]=(S.focusLog[k]||0)+add;F.focused+=add;T.logged=el}
}
function tSave(){
  S.tideRun=F&&F.on&&F.tide?{ids:F.q.map(t=>t.id),cid:F.q[F.i]&&F.q[F.i].id,i:F.i,done:F.done,focused:F.focused,T:{mode:T.mode,dur:T.dur,st:T.st,pa:T.pa,pt:T.pt,logged:T.logged||0}}:null;save();
}
function tPick(){T={mode:'pick',dur:(S.cfg.tideMin||25)*6e4,st:0,pa:0,pt:0,logged:0}}
function startTide(q,from){
  clearInterval(F&&F.tick);
  F={on:true,tide:true,q,i:from?from.i:0,focused:from?from.focused:0,done:from?from.done:0,tick:null};
  if(from&&from.T)T=from.T;else tPick();
  if(!from||!from.keepColor){focusLive=null;applyFocusColor()}
  $('focus').classList.remove('on','sum','brk');
  const el=$('tide');el.classList.remove('out');el.classList.add('on');
  if(S.cfg.wake)lockScreen();haptic(12);
  try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume&&audio.resume()}catch(e){}
  tideRender();clearInterval(tideT);tideT=setInterval(tideTick,250);tSave();
}
function tReveal(){const el=$('tide');el.classList.remove('quiet');clearTimeout(tideQ);if(T&&T.mode==='run')tideQ=setTimeout(()=>el.classList.add('quiet'),3000)}
function tStepHTML(t){
  const nx=t.subs.find(x=>!x.done),dn=t.subs.filter(x=>x.done).length;
  return nx?`<button class="f-step" id="tStep" data-a="step" data-s="${nx.id}"><i></i><span class="fs-t">${esc(nx.t)}</span><span class="fs-n">${dn+1} / ${t.subs.length}</span></button>`
    :'';
}
function tideRender(){
  const t=tCur();if(!t)return tideFinish();
  const l=listOf(t.list),m=T.mode,el=$('tide');
  el.classList.toggle('t-paused',m==='pause');el.classList.toggle('t-picking',m==='pick');el.classList.toggle('t-ended',m==='end');
  const DONE=`<button class="f-done" data-a="done">Done</button>`;
  const ctl=m==='pick'?`<button class="f-done" data-a="go">Begin</button>`
    :m==='run'?`<button class="f-btn" data-a="pause" aria-label="Pause">${PAUSE}</button>${DONE}`
    :m==='pause'?`<button class="f-btn" data-a="resume" aria-label="Resume">${PLAY}</button>${DONE}`
    :`<button class="f-btn t-plus" data-a="more" aria-label="Add 5 minutes">+5</button>${DONE}`;
  el.innerHTML=`<div class="t-top"><span></span>
      <div class="fsw" role="group" aria-label="Focus style"><button data-fs="classic">Classic</button><button data-fs="tide" class="on">Tide</button></div>
      <div class="f-r"><button class="f-x pip-btn" data-pip aria-label="Pop out focus window" title="Pop out (stays on top of other apps)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><rect x="11.5" y="11" width="7" height="6" rx="1.5" fill="currentColor" stroke="none"/></svg></button><button class="f-x" data-a="leave" aria-label="Leave focus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
    <div class="t-main">
      <div class="f-up">${esc(l.name)}${F.q.length>1?`, ${F.i+1} of ${F.q.length}`:''}</div>
      <div class="f-title">${esc(t.title)}</div>
      ${tStepHTML(t)}
      <div class="t-orb${m==='run'?' run':''}${m==='end'?' pop':''}"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="tideClip"><circle cx="100" cy="100" r="96"/></clipPath></defs>
        <circle class="o" cx="100" cy="100" r="96"/><g clip-path="url(#tideClip)"><g class="lvl" id="tLvl" style="transform:translateY(210px)"><g class="wv"><path d="M0 0q25-9 50 0t50 0t50 0t50 0t50 0t50 0t50 0t50 0V260H0z"/></g><g class="wv wv2"><path d="M0 4q25-7 50 0t50 0t50 0t50 0t50 0t50 0t50 0t50 0V260H0z"/></g></g></g></svg>
        ${m==='pick'?`<label class="t-time t-set"><input id="tIn" class="t-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${Math.round(T.dur/6e4)}" aria-label="Minutes"><span>min</span></label>`:`<div class="t-time" id="tTime" aria-live="off"></div>`}
      </div>
      ${m==='pick'?`<div class="t-ch">${[15,25,45].map(x=>`<button data-d="${x}" class="${x*6e4===T.dur?'on':''}">${x} min</button>`).join('')}</div>`
        :`<div class="t-cap"><span id="tCap"></span><span>${Math.round(T.dur/6e4)} min</span></div>`}
    </div>
    <div class="t-ctl">${ctl}</div>`;
  tideTick();tReveal();
}
function tideTick(){
  if(!T||!tideOn())return;
  if(T.mode==='run'&&tLeft()<=0){T.mode='end';T.pt=T.st+T.pa+T.dur;tLog();tSave();haptic([120,60,120,60,200]);if(S.cfg.sound)chime();tideRender();return}
  const left=T.mode==='pick'?T.dur:T.mode==='end'?0:tLeft(),tt=$('tTime');if(tt)tt.textContent=tMmss(left);
  const cp=$('tCap');if(cp)cp.textContent=T.mode==='end'?'Time’s up':T.mode==='pause'?'Paused':'Ends at '+new Date(Date.now()+left).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  const lv=$('tLvl');if(lv)lv.style.transform=`translateY(${210-(T.mode==='pick'?0:1-left/T.dur)*222}px)`;
  if(T.mode==='run'&&Date.now()-(T._s||0)>10000){T._s=Date.now();tLog();tSave()}
}
function tideClose(){clearInterval(tideT);clearTimeout(tideQ);const el=$('tide');el.classList.add('out');setTimeout(()=>{el.classList.remove('on','out','quiet','t-paused','t-picking','t-ended');el.innerHTML=''},250)}
function tideFinish(){ // end of the queue -> same summary as Classic
  tLog();F.tide=false;tSave();tideClose();
  if(!F.done){closePip();F.on=false;unlockScreen();render();return}
  $('focus').classList.add('on');showSummary();
}
function tideLeave(){closePip();tLog();if(F.done)return tideFinish();F.on=false;F.tide=false;T=null;tSave();tideClose();unlockScreen();render()}
function switchStyle(to){
  if(!F||!F.on||F.sum)return;haptic(6);S.cfg.focusStyle=to;
  if(to==='tide'&&!F.tide){startTide(F.q,{i:F.i,done:F.done,focused:F.focused,keepColor:true})}
  else if(to==='classic'&&F.tide){tLog();const q=F.q,i=F.i,d=F.done,fc=F.focused;F.tide=false;T=null;tSave();tideClose();
    startBlitz(q,{i,done:d,focused:fc,classic:true})}
  save();
}
$('tide').addEventListener('pointerdown',tReveal);
$('tide').addEventListener('click',e=>{
  const sw=e.target.closest('[data-fs]');if(sw){if(sw.dataset.fs!=='tide')switchStyle(sw.dataset.fs);return}
  const b=e.target.closest('[data-a],[data-d]');if(!b||!T)return;
  if(b.dataset.d){T.dur=+b.dataset.d*6e4;haptic(5);tideRender();return}
  const a=b.dataset.a,n=Date.now();
  if(a==='step'){if(b.classList.contains('tick'))return;const t=tCur(),st=t&&t.subs.find(x=>x.id===+b.dataset.s);if(!st)return;
    b.classList.add('tick');haptic(10);
    setTimeout(()=>{st.done=true;save();shuffleFocus();const el=$('tStep');if(el){el.outerHTML=tStepHTML(t);const ne=$('tStep');if(ne)ne.classList.add('t-in-step')}},380);return}
  if(a==='go'){if(Date.now()-(F.tapAt||0)<900)return;const v=+(($('tIn')||{}).value||0);if(v>=1)T.dur=Math.min(300,v)*6e4;S.cfg.tideMin=Math.round(T.dur/6e4);T.mode='run';T.st=n;T.pa=0;T.pt=0;T.logged=0;haptic(10);tSave();tideRender()}
  else if(a==='pause'){T.mode='pause';T.pt=n;tLog();tSave();tideRender()}
  else if(a==='resume'){T.pa+=n-T.pt;T.pt=0;T.mode='run';tSave();tideRender()}
  else if(a==='more'){T.pa+=n-T.pt;T.pt=0;T.dur+=5*6e4;T.mode='run';haptic(8);tSave();tideRender()}
  else if(a==='done'){if(Date.now()-(F.tapAt||0)<900)return;F.tapAt=Date.now();tLog();const t=liveTask(tCur());if(t&&t.stage!=='done'){setStage(t,'done');F.done++}haptic(14);shuffleFocus();
    if(F.i<F.q.length-1){F.i++;const d=T.dur;tPick();T.dur=Math.min(T.dur,d)||T.dur;tSave();tideRender()}else tideFinish()}
  else if(a==='leave')tideLeave();
});
$('tide').addEventListener('input',e=>{
  if(e.target.id!=='tIn')return;e.target.value=e.target.value.replace(/\D/g,'');const v=+e.target.value;
  if(v>=1&&T){T.dur=Math.min(300,v)*6e4;$('tide').querySelectorAll('.t-ch button').forEach(b=>b.classList.toggle('on',+b.dataset.d*6e4===T.dur))}
});
$('tide').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='tIn'){e.preventDefault();e.target.blur();const g=$('tide').querySelector('[data-a="go"]');g&&g.click()}});
$('tide').addEventListener('focusin',e=>{if(e.target.id==='tIn')e.target.select()});
$('fStyleSw').onclick=e=>{const b=e.target.closest('[data-fs]');if(b&&b.dataset.fs==='tide')switchStyle('tide')};

/* Classic: controls fade after 3s of no touch while the timer runs; tap anywhere to bring them back */
let fQ=null;
function fReveal(){
  const el=$('focus');el.classList.remove('quiet');clearTimeout(fQ);
  if(F.on&&!F.tide&&F.run&&!el.classList.contains('sum'))fQ=setTimeout(()=>{if(F.on&&F.run&&!el.classList.contains('sum'))el.classList.add('quiet')},3000);
}
$('focus').addEventListener('pointerdown',fReveal);
