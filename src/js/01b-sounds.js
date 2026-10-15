/* ---------- interface sounds: soft, short, made in code (no audio files). Settings → Appearance → Feel → Sounds ---------- */
let sfxCtx=null,sfxBus=null,sfxLast={};
function sfxReady(){
  if(!sfxCtx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;
    sfxCtx=new A();
    // a gentle low-pass and a soft limiter keep every sound warm and never sharp
    const lp=sfxCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;lp.Q.value=.3;
    const cmp=sfxCtx.createDynamicsCompressor();cmp.threshold.value=-18;cmp.ratio.value=4;
    sfxBus=sfxCtx.createGain();sfxBus.gain.value=.55;
    sfxBus.connect(lp).connect(cmp).connect(sfxCtx.destination)}
  if(sfxCtx.state==='suspended')try{sfxCtx.resume()}catch(e){}
  return true;
}
/* one soft note: a sine with a faint octave shimmer, quick attack, smooth fade */
function sfxNote(f,at,dur,vol,glide,type){
  const c=sfxCtx,t=c.currentTime+at;
  [[1,1],[2,.12]].forEach(([m,k])=>{
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(f*m,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide*m,t+dur*.6);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol*k,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(sfxBus);o.start(t);o.stop(t+dur+.05)});
}
const SFX={
  done:()=>{sfxNote(1046.5,0,.38,.16);sfxNote(1568,.075,.55,.13)},            // task finished: two bright, airy notes
  undone:()=>{sfxNote(880,0,.22,.08,660)},                                       // back to open
  tick:()=>{sfxNote(1760,0,.09,.07)},                                             // a step ticked off
  move:()=>{sfxNote(620,0,.14,.06,880)},                                          // moved to another stage
  add:()=>{sfxNote(784,0,.12,.07);sfxNote(1175,.05,.18,.06)},                     // new task
  remove:()=>{sfxNote(330,0,.2,.09,220)},                                         // deleted or archived
  undo:()=>{sfxNote(740,0,.16,.06,520)},
  fold:()=>{sfxNote(1320,0,.05,.035)},                                            // open / close a section
  toggle:()=>{sfxNote(1480,0,.045,.03)},                                          // a switch in Settings
  start:()=>{[523.25,659.25,784].forEach((f,i)=>sfxNote(f,i*.07,.42,.09))},       // focus begins
  win:()=>{[523.25,659.25,784,1046.5].forEach((f,i)=>sfxNote(f,i*.09,.9,.1))}    // the day's run is complete
};
let sfxAct=0;['pointerdown','pointerup','keydown'].forEach(k=>addEventListener(k,()=>{sfxAct=performance.now()},true));
function sfx(name){
  try{
    if(performance.now()-sfxAct>1500)return;
    if(!S.cfg||S.cfg.uiSounds===false||document.hidden||!SFX[name])return;
    const now=performance.now();if(now-(sfxLast[name]||0)<(name==='done'||name==='undone'?500:60))return;sfxLast[name]=now; // never stack the same sound
    if(!sfxReady())return;SFX[name]();
  }catch(e){}
}
