/* ---------- pop-out focus window (Document Picture-in-Picture, desktop Chrome/Edge) ----------
   A small always-on-top window with its own mini view: "compact" (task + timer) or "mini" (timer only).
   It mirrors the running focus session; the full focus view stays in the app. */
const PIP_SIZE={compact:{width:320,height:190},mini:{width:220,height:110}};
/* inside the Blitzit desktop app (Tauri): a frameless always-on-top mini window instead of Chrome's popup */
const DESK=()=>!!(window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.event);
let deskMini=false,deskT=null,deskUn=null;
/* desktop app updates: the app checks GitHub for a newer signed version and offers a one-click update */
const UPD={current:'',latest:null,checked:false,busy:false,later:false};
/* "What's new" for desktop versions whose update doesn't carry its own notes yet */
const DESK_NOTES={'0.5.1':['A new update window in the middle of the screen, with what’s new','Updates now wait until your focus session is over','Window and tray now say Windaday']};
const updNotes=()=>{
  const fromRelease=(UPD.notes||'').split(/\r?\n/).map(l=>l.replace(/^\s*[-*•]\s*/,'').trim()).filter(l=>l&&!/^#/.test(l)).slice(0,5);
  return fromRelease.length?fromRelease:(DESK_NOTES[UPD.latest]||['Improvements and fixes for the desktop app']);
};
async function checkUpdate(manual){
  if(!DESK())return;
  try{const r=await window.__TAURI__.core.invoke('check_update');UPD.current=r.current;UPD.latest=r.latest||null;UPD.notes=r.notes||'';UPD.checked=true}
  catch(e){if(manual)toast('Couldn’t check for updates');return}
  if(manual&&!UPD.latest)toast('Windaday is up to date');
  if(UPD.latest&&(manual||!UPD.later))showUpdate(manual);
  if(settingsOpen())drawSettings();
}
/* the update window: centred, calm, says what's new. Never interrupts a running session: it waits and shows right after. */
function showUpdate(manual){
  if($('upd')||!UPD.latest)return;
  if(F.on&&!manual){UPD.pending=true;return}
  UPD.pending=false;
  const d=document.createElement('div');d.className='updm';d.id='upd';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','updT');
  d.innerHTML=`<div class="updm-card">
    <div class="updm-top"><span class="updm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg></span><span class="updm-k">Update ready</span></div>
    <h2 id="updT">Windaday ${esc(UPD.latest)}</h2>
    <p class="updm-sub">${UPD.current?`You have ${esc(UPD.current)} · `:''}takes a few seconds</p>
    <div class="updm-new"><h4>What’s new</h4><ul>${updNotes().map(n=>`<li><i>${CHECK}</i><span>${esc(n)}</span></li>`).join('')}</ul></div>
    <div class="updm-acts"><button class="updm-go" id="updGo">Update now</button><button class="updm-later" id="updLater">Later</button></div>
    <div class="updm-busy"><div class="updm-prog"><span></span></div><p>Installing… Windaday restarts by itself.</p></div>
  </div>`;
  document.body.appendChild(d);
  const later=()=>{if(UPD.busy)return;UPD.later=true;d.classList.add('out');setTimeout(()=>d.remove(),260);document.removeEventListener('keydown',keys,true)};
  const keys=e=>{if(!$('upd'))return document.removeEventListener('keydown',keys,true);
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();later()}
    else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();installUpdate()}
    else if(e.key==='Tab'){e.preventDefault();const f=[$('updGo'),$('updLater')];f[(f.indexOf(document.activeElement)+1)%2].focus()}
    else e.stopPropagation()};
  document.addEventListener('keydown',keys,true);
  $('updLater').onclick=later;$('updGo').onclick=installUpdate;
  d.addEventListener('click',e=>{if(e.target===d)later()});
  setTimeout(()=>{const g=$('updGo');g&&g.focus()},60);
}
async function installUpdate(){
  if(UPD.busy)return;
  if(F.on){toast('Finish your session first, then update');return}
  if(!$('upd'))showUpdate(true);
  UPD.busy=true;const m=$('upd');if(m)m.classList.add('busy');
  if(settingsOpen())drawSettings();
  try{await window.__TAURI__.core.invoke('install_update');UPD.busy=false;UPD.latest=null;$('upd')&&$('upd').remove();if(settingsOpen())drawSettings();toast('Windaday is up to date')}
  catch(e){UPD.busy=false;if(m)m.classList.remove('busy');if(settingsOpen())drawSettings();toast('Update failed. Try again later')}
}
function pipVars(){const cs=getComputedStyle(root);return{fbg:cs.getPropertyValue('--fbg').trim()||cs.getPropertyValue('--today').trim(),fink:cs.getPropertyValue('--fink').trim()||'#0F1013',font:cs.getPropertyValue('--font').trim(),dark:root.dataset.focusdark==='1'}}
let deskZ='';
function deskSize(st){const z={...DESK_SIZE[pipMode()]};if(pipMode()==='compact'&&st&&st.step&&!st.sum)z.height+=22;return z}
function deskSend(){
  if(!deskMini)return;const st=pipState();
  if(!st){deskClose();return}
  const z=deskSize(st),k=z.width+'x'+z.height;
  if(k!==deskZ){if(deskZ)window.__TAURI__.core.invoke('resize_mini',z).catch(()=>{});deskZ=k}
  window.__TAURI__.event.emit('blitzit-state',{...st,mode:pipMode(),vars:{...pipVars(),fade:S.cfg.pipFade!==false}}).catch(()=>{});
}
/* finish screen "Close": hide the mini timer and leave the main window where it is */
function deskDismiss(){clearInterval(deskT);deskMini=false;deskZ='';try{window.__TAURI__.core.invoke('close_mini',{restore:false}).catch(()=>{})}catch(_){}closeFocus()}
/* desktop mini window sizes include room for its soft shadow */
const DESK_SIZE={compact:{width:336,height:178},mini:{width:236,height:126}};
const focusEl=()=>tideOn()?$('tide'):$('focus');
function shrinkOut(){ // the focus view flies into the bottom-right corner, where the mini timer appears
  const el=focusEl();if(!el||root.dataset.motion==='off')return Promise.resolve();
  el.classList.add('to-mini');return new Promise(r=>setTimeout(r,380));
}
function growIn(){
  const el=focusEl();if(!el)return;el.classList.remove('to-mini');
  if(root.dataset.motion==='off')return;el.classList.add('from-mini');setTimeout(()=>el.classList.remove('from-mini'),520);
}
let deskOpening=false;
async function deskOpen(){
  if(deskMini)return deskClose();
  if(!F.on||deskOpening)return;deskOpening=true;setTimeout(()=>deskOpening=false,1500);
  const z=deskSize(pipState());
  await shrinkOut();
  try{await window.__TAURI__.core.invoke('open_mini',z)}catch(e){growIn();return toast('Couldn’t open the mini timer')}
  deskZ=z.width+'x'+z.height;
  setTimeout(()=>{const el=focusEl();el&&el.classList.remove('to-mini')},400);
  deskMini=true;
  if(!deskUn)deskUn=await window.__TAURI__.event.listen('blitzit-act',e=>{
    const a=e.payload;
    if(a==='closed'){deskMini=false;clearInterval(deskT);return}
    if(a==='ready'){deskSend();return}
    if(a==='size'){S.cfg.pipMode=pipMode()==='mini'?'compact':'mini';save();deskSend();return}
    if(a==='open'){closeFocus();return}
    if(a==='dismiss'){deskDismiss();return}
    if(a==='back'&&F.sum){closeFocus();return}
    if(a==='back'){deskClose();return}
    pipAct(a);setTimeout(deskSend,80);
  });
  clearInterval(deskT);deskT=setInterval(deskSend,300);deskSend();
}
function deskClose(){clearInterval(deskT);deskZ='';if(deskMini){deskMini=false;try{window.__TAURI__.core.invoke('close_mini').then(()=>setTimeout(growIn,60))}catch(_){}}}
window.blitzitStart=()=>{if(!F.on)$('goBtn').click()}; // tray menu + Ctrl+Alt+Shift+B
const PIP_CSS=`html,body{margin:0;height:100%}
body{background:var(--fbg,var(--today));color:var(--fink,#0F1013);font-family:var(--font);-webkit-font-smoothing:antialiased;overflow:hidden;user-select:none;transition:background .6s}
.pv{position:relative;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;padding:14px 18px}
.pv-t{font-size:15px;font-weight:700;letter-spacing:-.02em;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;opacity:.85}
.pv-time{font-weight:800;letter-spacing:-.06em;line-height:1;font-variant-numeric:tabular-nums;font-size:clamp(40px,24vw,120px);margin-top:4px;white-space:nowrap}
.pv-bar{height:4px;border-radius:4px;background:rgba(0,0,0,.14);overflow:hidden;margin-top:10px}
.pv-bar span{display:block;height:100%;width:0;background:currentColor;transition:width .9s linear}
.pv.paused .pv-time{opacity:.45}
[data-pipmode="mini"] .pv{align-items:center;padding:8px}
[data-pipmode="mini"] .pv-t,[data-pipmode="mini"] .pv-bar{display:none}
[data-pipmode="mini"] .pv-time{font-size:clamp(28px,30vw,140px);margin:0}
.pv-ctl{position:absolute;right:8px;top:8px;display:flex;gap:4px;opacity:0;transition:opacity .2s}
body:hover .pv-ctl,.pv.paused .pv-ctl{opacity:1}
.pv-ctl button{height:28px;min-width:28px;padding:0 9px;border:0;border-radius:999px;background:rgba(0,0,0,.14);color:inherit;font:inherit;font-size:12px;font-weight:700;display:grid;place-items:center;cursor:pointer}
.pv-ctl button:hover{background:rgba(0,0,0,.24)}
.pv-ctl .pv-done{background:var(--fink,#0F1013);color:var(--fbg,var(--today))}
.pv-ctl .pv-done:hover{background:var(--fink,#0F1013);opacity:.85}
.pv-ctl svg{width:13px;height:13px}
[data-focusdark="1"] .pv-ctl button:not(.pv-done),[data-focusdark="1"] .pv-bar{background:rgba(255,255,255,.14)}
[data-pipmode="mini"] .pv-ctl{left:6px;right:6px;top:50%;transform:translateY(-50%);justify-content:center}
[data-pipmode="mini"] .pv-time{transition:opacity .2s}
[data-pipmode="mini"] body:hover .pv-time{opacity:.12}`;
const I_BACK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-2"/></svg>';
const I_SIZE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
let pipT=null;
const pipMode=()=>S.cfg.pipMode==='mini'?'mini':'compact';
function syncPip(){
  if(!PIP||PIP.closed)return;const pd=PIP.document.documentElement;
  pd.style.cssText=root.style.cssText;
  [...root.attributes].forEach(a=>{if(a.name.startsWith('data-'))pd.setAttribute(a.name,a.value)});
  pd.dataset.pipmode=pipMode();
}
function pipStep(t){const nx=t&&t.subs&&t.subs.find(s=>!s.done);return nx?{t:nx.t,n:`${t.subs.filter(s=>s.done).length+1}/${t.subs.length}`}:null}
function pipState(){ // read the live session from whichever focus view is running
  if(!F.on)return null;
  if(F.sum)return {sum:true,n:F.done,time:fmt(Math.max(0,Math.round(F.focused/60)))};
  const inT=tideOn(),t=inT?tCur():F.q&&F.q[F.i];if(!t)return null;
  if(inT){
    const pick=T.mode==='pick',left=pick?T.dur:T.mode==='end'?0:tLeft();
    return {title:t.title,time:pick?tMmss(T.dur):tMmss(left),bar:pick?0:(1-left/T.dur)*100,run:T.mode==='run',pick,end:T.mode==='end',up:T.mode==='end',step:pipStep(t)};
  }
  const up=F.mode!=='pomo'&&t.est>0&&F.sec>=t.est*60+(F.extra||0);
  return {title:t.title,time:$('fTime').textContent,bar:parseFloat($('fBar').style.width)||0,run:F.run,pick:false,end:false,up,step:pipStep(t)};
}
function drawPip(){
  if(!PIP||PIP.closed)return;const d=PIP.document,st=pipState();if(!st||st.sum)return closePip();
  const q=id=>d.getElementById(id);
  q('pvT').textContent=st.title;q('pvTime').textContent=st.time;q('pvBar').style.width=Math.min(100,st.bar)+'%';
  q('pv').classList.toggle('paused',!st.run&&!st.end);
  q('pvPlay').innerHTML=st.run?PAUSE:PLAY;q('pvPlay').setAttribute('aria-label',st.run?'Pause':st.pick?'Begin':'Resume');
  q('pvDone').textContent=st.pick?'Begin':'Done';
}
function pipAct(a){
  const inT=tideOn(),tb=k=>{const b=$('tide').querySelector(`[data-a="${k}"]`);b&&b.click()};
  if(a==='play'){if(inT)tb(T.mode==='run'?'pause':T.mode==='pick'?'go':T.mode==='end'?'more':'resume');else $('fPause').click()}
  else if(a==='done'){if(inT)tb(T.mode==='pick'?'go':'done');else $("fDone").click()}
  else if(a==='more'){if(inT)tb('more');else{F.extra=(F.extra||0)+300;F.upd=false;drawTime()}}
  else if(a==='step'){if(inT)tb('step');else $('fStep').click()}
  else if(a==='size'&&PIP){S.cfg.pipMode=pipMode()==='mini'?'compact':'mini';save();syncPip();const z=PIP_SIZE[pipMode()];try{PIP.resizeTo(z.width,z.height+(PIP.outerHeight-PIP.innerHeight||0))}catch(_){}}
  else if(a==='back')closePip();
  setTimeout(drawPip,60);
}
async function popOut(){
  if(DESK())return deskOpen();
  if(PIP){closePip();return}
  if(!F.on)return;
  const z=PIP_SIZE[pipMode()];
  let w;try{w=await documentPictureInPicture.requestWindow(z)}catch(e){return toast('Couldn’t open the pop-out window')}
  PIP=w;w.document.title='Windaday';
  document.querySelectorAll('link[rel=stylesheet],link[rel=preconnect]').forEach(n=>w.document.head.appendChild(n.cloneNode(true)));
  const st=w.document.createElement('style');st.textContent=`:root{${[...document.styleSheets].length?'':''}}`+PIP_CSS;w.document.head.appendChild(st);
  // carry the app's colour tokens (fonts, theme, focus colour)
  const vars=getComputedStyle(root),keep=['--font','--today','--bg','--text','--surface'].map(k=>`${k}:${vars.getPropertyValue(k)}`).join(';');
  const st2=w.document.createElement('style');st2.textContent=`:root{${keep}}`;w.document.head.appendChild(st2);
  w.document.body.innerHTML=`<div class="pv" id="pv"><div class="pv-t" id="pvT"></div><div class="pv-time" id="pvTime"></div><div class="pv-bar"><span id="pvBar"></span></div>
    <div class="pv-ctl"><button id="pvPlay" data-pv="play"></button><button class="pv-done" id="pvDone" data-pv="done">Done</button><button data-pv="size" aria-label="Switch size" title="Compact / timer only">${I_SIZE}</button><button data-pv="back" aria-label="Back to Windaday" title="Back to Windaday">${I_BACK}</button></div></div>`;
  w.document.addEventListener('click',e=>{const b=e.target.closest('[data-pv]');if(b)pipAct(b.dataset.pv)});
  w.document.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();pipAct('play')}else if(e.key==='Enter'){e.preventDefault();pipAct('done')}else if(e.key==='Escape'){e.preventDefault();pipAct('back')}});
  w.addEventListener('pagehide',()=>{clearInterval(pipT);if(PIP===w)PIP=null});
  syncPip();drawPip();clearInterval(pipT);pipT=setInterval(drawPip,300);
}
const closePip=()=>{deskClose();clearInterval(pipT);if(PIP){const w=PIP;PIP=null;try{w.close()}catch(_){}}};
document.addEventListener('click',e=>{if(e.target.closest('[data-pip]')){e.stopPropagation();popOut()}},true);

function showSummary(){
  clearInterval(F.tick);unlockScreen();
  $('sDone').textContent=F.done;$('sDoneL').textContent=F.done===1?'task done':'tasks done';$('sTime').textContent=fmt(Math.max(0,Math.round(F.focused/60)));
  F.sum=true;if(deskMini)deskSend();else closePip(); // desktop: celebrate in the mini timer, don't pull the big window up
  $('focus').classList.remove('brk','quiet');clearTimeout(fQ);$('focus').classList.add('sum');haptic([20,40,20]);
}
function closeFocus(){if(UPD.pending)setTimeout(()=>showUpdate(true),700);closePip();clearTimeout(fQ);$('focus').classList.remove('quiet');clearInterval(F.tick);unlockScreen();F.on=false;$('focus').classList.remove('on');render()}
/* remember a running Classic session, so a reload or restart picks it up where it was */
function fSave(){if(window.__crHold)return;S.classicRun=F&&F.on&&!F.tide&&!F.sum&&F.q&&F.q[F.i]?{ids:F.q.map(t=>t.id),cid:F.q[F.i].id,sec:F.sec||0,run:!!F.run,mode:F.mode,phase:F.phase,left:F.left,round:F.round,focused:F.focused||0,done:F.done||0,extra:F.extra||0,last:F.last||Date.now()}:null}
$('fPause').onclick=()=>{step();F.run=!F.run;F.last=Date.now();$('fPause').innerHTML=F.run?PAUSE:PLAY;haptic(5);fReveal();save()};
const liveTask=t=>t&&(S.tasks.find(x=>x.id===t.id)||t);
$('fDone').onclick=()=>{if(Date.now()-(F.tapAt||0)<600)return;F.tapAt=Date.now();setStage(liveTask(F.q[F.i]),'done');F.done++;save();haptic(14);shuffleFocus();nextFocus()};
$('fSkip').onclick=()=>{if(Date.now()-(F.tapAt||0)<600)return;F.tapAt=Date.now();nextFocus()};
$('fClose').onclick=()=>F.done&&!F.sum?showSummary():closeFocus();
$('fBack').onclick=closeFocus;

