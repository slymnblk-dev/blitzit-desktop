/* ---------- interface sounds: soft, short, made in code (no audio files) ----------
   Settings → Appearance → Feel → Sounds (on/off) and Sound style (pick a style, set the volume, try each sound). */
let sfxCtx=null,sfxBus=null,sfxLast={},sfxNoise=null;
const SFX_VOL={quiet:.3,normal:.55,loud:.85};
function sfxReady(){
  if(!sfxCtx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;
    sfxCtx=new A();
    // a gentle low-pass and a soft limiter keep every sound warm and never sharp
    const lp=sfxCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6500;lp.Q.value=.3;
    const cmp=sfxCtx.createDynamicsCompressor();cmp.threshold.value=-18;cmp.ratio.value=4;
    sfxBus=sfxCtx.createGain();
    sfxBus.connect(lp).connect(cmp).connect(sfxCtx.destination)}
  sfxBus.gain.value=SFX_VOL[(S.cfg&&S.cfg.sfxVol)||'normal']||.55;
  if(sfxCtx.state==='suspended')try{sfxCtx.resume()}catch(e){}
  return true;
}
/* building blocks */
function sfxOsc(type,f,t,dur,vol,{glideTo,glideIn,attack=.008,detune=0,dest=sfxBus}={}){
  const c=sfxCtx,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.detune.value=detune;
  if(glideIn){o.frequency.setValueAtTime(f*glideIn,t);o.frequency.exponentialRampToValueAtTime(f,t+.045)}else o.frequency.setValueAtTime(f,t);
  if(glideTo)o.frequency.exponentialRampToValueAtTime(glideTo,t+dur*.6);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(vol,.0002),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(dest);o.start(t);o.stop(t+dur+.05);
}
function sfxNoiseHit(t,f,dur,vol){
  const c=sfxCtx;
  if(!sfxNoise){sfxNoise=c.createBuffer(1,c.sampleRate*.2,c.sampleRate);const d=sfxNoise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const s=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain();
  s.buffer=sfxNoise;bp.type='bandpass';bp.frequency.value=f;bp.Q.value=2.5;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(bp).connect(g).connect(sfxBus);s.start(t);s.stop(t+dur+.02);
}
/* sound styles: each one plays the same little melodies with its own voice */
const SFX_STYLES=[
  {id:'glass',name:'Glass',d:'Bright and airy. The default.',shift:1,
    v:(f,t,dur,vol,gl)=>{sfxOsc('sine',f,t,dur,vol,{glideTo:gl});sfxOsc('sine',f*2,t,dur*.8,vol*.12,{glideTo:gl&&gl*2})}},
  {id:'soft',name:'Soft',d:'Warm, low and gentle.',shift:.5,
    v:(f,t,dur,vol,gl)=>{sfxOsc('sine',f,t,dur*1.2,vol*1.3,{glideTo:gl,attack:.02});sfxOsc('triangle',f,t,dur,vol*.25,{glideTo:gl,attack:.02})}},
  {id:'marimba',name:'Marimba',d:'Round wooden taps.',shift:.5,
    v:(f,t,dur,vol,gl)=>{sfxOsc('sine',f,t,dur*.75,vol*1.2,{glideTo:gl,attack:.003});sfxOsc('sine',f*4,t,dur*.18,vol*.35,{attack:.002})}},
  {id:'bell',name:'Bell',d:'Clear chimes with a long shimmer.',shift:1,
    v:(f,t,dur,vol,gl)=>{sfxOsc('sine',f,t,dur*1.6,vol,{glideTo:gl,attack:.004});sfxOsc('sine',f*2.76,t,dur*.9,vol*.28,{attack:.004});sfxOsc('sine',f*5.4,t,dur*.45,vol*.12,{attack:.003})}},
  {id:'pop',name:'Pop',d:'Light bubbly pops.',shift:1,
    v:(f,t,dur,vol,gl)=>{sfxOsc('sine',f,t,dur*.55,vol*1.1,{glideIn:.55,glideTo:gl,attack:.004})}},
  {id:'drop',name:'Droplet',d:'Like water drops.',shift:1.2,
    v:(f,t,dur,vol)=>{sfxOsc('sine',f*1.5,t,dur*.5,vol,{glideTo:f*.85,attack:.003});sfxOsc('sine',f*3,t,dur*.2,vol*.08,{attack:.002})}},
  {id:'pluck',name:'Pluck',d:'Soft plucked strings.',shift:.5,
    v:(f,t,dur,vol,gl)=>{const c=sfxCtx,lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=1;lp.frequency.setValueAtTime(f*8,t);lp.frequency.exponentialRampToValueAtTime(f*1.2,t+dur*.7);lp.connect(sfxBus);
      sfxOsc('sawtooth',f,t,dur,vol*.6,{glideTo:gl,attack:.003,dest:lp});sfxOsc('sine',f,t,dur,vol*.4,{glideTo:gl,attack:.003})}},
  {id:'breeze',name:'Breeze',d:'Dreamy and slow, like a soft pad.',shift:1,
    v:(f,t,dur,vol,gl)=>{[-7,7].forEach(dt=>sfxOsc('triangle',f,t,dur*1.5,vol*.55,{glideTo:gl,attack:.035,detune:dt}));sfxOsc('sine',f*2,t,dur,vol*.08,{attack:.04})}},
  {id:'click',name:'Click',d:'Crisp, quiet clicks. Barely there.',shift:1,
    v:(f,t,dur,vol)=>{sfxNoiseHit(t,f*2.2,.035,vol*1.6);sfxOsc('sine',f,t,.06,vol*.25,{attack:.002})}}
];
const sfxStyle=()=>SFX_STYLES.find(s=>s.id===(S.cfg&&S.cfg.sfxStyle))||SFX_STYLES[0];
/* the little melodies: [frequency, start, length, volume, glide-to] */
const SFX_MEL={
  done:[[1046.5,0,.38,.16],[1568,.075,.55,.13]],                         // task finished: two rising notes
  undone:[[880,0,.22,.08,660]],                                           // back to open
  tick:[[1760,0,.12,.08]],                                                // a step ticked off
  move:[[620,0,.16,.06,880]],                                             // moved to another stage
  add:[[784,0,.14,.07],[1175,.05,.2,.06]],                                // new task
  remove:[[330,0,.22,.09,220]],                                           // deleted or archived
  undo:[[740,0,.18,.06,520]],
  fold:[[1320,0,.06,.04]],                                                // open / close a section
  toggle:[[1480,0,.05,.035]],                                             // a switch in Settings
  start:[[523.25,0,.42,.09],[659.25,.07,.42,.09],[784,.14,.5,.09]],       // focus begins
  win:[[523.25,0,.9,.1],[659.25,.09,.9,.1],[784,.18,.9,.1],[1046.5,.27,1.1,.1]] // the day's run is complete
};
function sfxPlay(name,style){
  const st=style||sfxStyle(),mel=SFX_MEL[name];if(!mel)return;
  const t0=sfxCtx.currentTime+.005;
  mel.forEach(([f,at,dur,vol,gl])=>st.v(f*st.shift,t0+at,dur,vol,gl&&gl*st.shift));
}
let sfxAct=0,sfxPt=null;['pointerdown','pointerup','keydown'].forEach(k=>addEventListener(k,e=>{sfxAct=performance.now();sfxPt=k==='keydown'?null:{x:e.clientX,y:e.clientY}},true));
/* a task's finish sound plays the moment it is ticked; the move that follows a moment later stays quiet */
let sfxHold={id:null,until:0};
const sfxHoldFor=id=>{sfxHold={id,until:performance.now()+2500}};
/* gated: only right after the person did something (never from sync, startup or timers) */
function sfx(name,gated){
  try{
    if(gated&&performance.now()-sfxAct>1500)return;
    if(!S.cfg||S.cfg.uiSounds===false||!SFX_MEL[name])return;
    const now=performance.now();if(now-(sfxLast[name]||0)<60)return;sfxLast[name]=now; // never stack the same sound
    if(window.__sfxLog)window.__sfxLog.push(name); // tests listen here (no speakers needed)
    if(!sfxReady())return;sfxPlay(name);
  }catch(e){}
}
/* stage changes come from many places (swipes, drags, pickers, focus); they ask through here */
function sfxStage(t,was,stage){
  if(was===stage)return;
  if(sfxHold.id===t.id&&performance.now()<sfxHold.until){sfxHold.id=null;return}
  sfx(stage==='done'?'done':was==='done'?'undone':'move',true);
}
/* try a sound in Settings, even while sounds are off */
function sfxTry(name,styleId){try{if(!sfxReady())return;if(window.__sfxLog)window.__sfxLog.push('try:'+name);sfxPlay(name,SFX_STYLES.find(s=>s.id===styleId))}catch(e){}}

/* celebration sounds: each look has its own little phrase */
const SFX_CELEB={
  halo:{v:'bell',m:[[784,0,1.1,.09],[987.8,.06,1.1,.08],[1174.7,.12,1.2,.08],[1568,.2,1.4,.07]]},
  count:{v:'marimba',m:[[523.25,0,.5,.11],[659.25,.07,.5,.11],[784,.14,.5,.11],[1046.5,.21,.7,.12],[1318.5,.3,.9,.1]]},
  aurora:{v:'breeze',m:[[392,0,1.6,.08],[493.9,.1,1.6,.07],[587.3,.2,1.7,.07],[784,.32,1.8,.06]]},
  orbit:{v:'glass',m:[[880,0,.5,.08],[1108.7,.08,.5,.08],[1318.5,.16,.6,.08],[1760,.26,.9,.08]]}
};
function sfxCeleb(id){try{
  if(!S.cfg||S.cfg.uiSounds===false)return;const c=SFX_CELEB[id];if(!c)return;
  if(window.__sfxLog)window.__sfxLog.push('celeb:'+id);
  if(!sfxReady())return;const st=SFX_STYLES.find(s=>s.id===c.v),t0=sfxCtx.currentTime+.01;
  c.m.forEach(([f,at,dur,vol])=>st.v(f*st.shift,t0+at,dur,vol))}catch(e){}}
