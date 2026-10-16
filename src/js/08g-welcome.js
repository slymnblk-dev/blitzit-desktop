/* ---------- welcome (optional, on by default; Settings → Appearance → Feel) ----------
   The sun rises over the horizon and its three rays draw one by one: your three tasks that win the day.
   Plays once a day, the first time Windaday opens. Click, tap or any key skips it. */
const WELCOME_SVG=`<svg class="wl-logo" viewBox="0 0 48 48" aria-hidden="true"><defs><clipPath id="wlClip"><rect x="0" y="-10" width="48" height="47.5"/></clipPath></defs><g clip-path="url(#wlClip)"><g class="wl-sun"><path class="wl-fill" d="M12 36a12 12 0 0 1 24 0z"/><path d="M12 36a12 12 0 0 1 24 0"/></g></g><path class="wl-hz" d="M5 36h38"/><path class="wl-ray r1" pathLength="1" d="M12.4 15.4l4 4"/><path class="wl-ray r2" pathLength="1" d="M24 11v7"/><path class="wl-ray r3" pathLength="1" d="M35.6 15.4l-4 4"/></svg>`;
const welcomeOn=()=>!S.cfg||S.cfg.welcome!==false;
let wlT=[];
/* the matching sound: a warm pad as the horizon draws, three soft bells for the three rays, a quiet chord for the name */
function welcomeSound(){
  try{
    if(!S.cfg||S.cfg.uiSounds===false||!sfxReady()||sfxCtx.state!=='running')return; // browsers keep sound off until the first click
    const c=sfxCtx,out=sfxBus,t=c.currentTime+.05;
    const note=(f,at,dur,vol,parts)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t+at);g.gain.exponentialRampToValueAtTime(vol,t+at+.02);g.gain.exponentialRampToValueAtTime(.0001,t+at+dur);
      o.connect(g).connect(out);o.start(t+at);o.stop(t+at+dur+.05);(parts||[]).forEach(([m,k])=>note(f*m,at,dur*.6,vol*k))};
    [[130.81,-6],[196,6],[261.63,0]].forEach(([f,dt])=>{const o=c.createOscillator(),lp=c.createBiquadFilter(),g=c.createGain();
      o.type='triangle';o.frequency.value=f;o.detune.value=dt;lp.type='lowpass';lp.frequency.setValueAtTime(380,t);lp.frequency.linearRampToValueAtTime(1100,t+2.2);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.09,t+1.3);g.gain.setValueAtTime(.09,t+2.6);g.gain.linearRampToValueAtTime(.0001,t+4.4);
      o.connect(lp).connect(g).connect(out);o.start(t);o.stop(t+4.5)});
    [[659.25,1.45],[783.99,1.7],[1046.5,1.95]].forEach(([f,d])=>note(f,d,1.1,.12,[[2.76,.18],[5.4,.06]]));
    [523.25,659.25,783.99].forEach((f,i)=>note(f,2.35+i*.03,1.8,.06));
  }catch(e){}
}
function welcomeEnd(){
  wlT.forEach(clearTimeout);wlT=[];
  const w=$('welcome');if(!w||w.classList.contains('out'))return;
  w.classList.add('out');setTimeout(()=>w.remove(),600);
}
function playWelcome(){
  if($('welcome'))return;
  const w=document.createElement('div');w.id='welcome';w.className='welcome';w.setAttribute('role','dialog');w.setAttribute('aria-label','Welcome to Windaday');
  w.innerHTML=`${WELCOME_SVG}<div class="wl-word">Windaday<i></i></div><div class="wl-tag">Three tasks that matter.<b>Win the day.</b></div><span class="wl-skip">Tap to skip</span>`;
  document.body.appendChild(w);
  requestAnimationFrame(()=>w.classList.add('play'));
  welcomeSound();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  wlT.push(setTimeout(welcomeEnd,reduce?1600:4300));
  w.addEventListener('pointerdown',welcomeEnd);
}
document.addEventListener('keydown',e=>{if($('welcome')&&!$('welcome').classList.contains('out')){e.preventDefault();e.stopPropagation();welcomeEnd()}},true);
/* once a day, on the first open */
function maybeWelcome(){
  if(!welcomeOn()||(navigator.webdriver&&!window.__wlTest))return; // automated checks skip it
  let last='';try{last=localStorage.getItem('welcomeDay')||''}catch(e){}
  if(last===today())return;
  try{localStorage.setItem('welcomeDay',today())}catch(e){}
  playWelcome();
}
