/* ---------- focus sounds (optional; Settings → Focus): calm background sound while you focus ----------
   Phase 1: sounds made in code (no files, no storage, works offline).
   Later: songs streamed from Supabase Storage plug in as entries with kind:'track' and a url (see AMB_TRACKS). */
const AMB={ctx:null,bus:null,cur:null,stop:[],el:null};
/* future songs: [{id:'lofi-1',name:'Lofi · Night drive',kind:'track',url:'https://…supabase.co/storage/v1/object/public/music/…mp3'}] */
let AMB_TRACKS=[];
const AMB_GEN=[
  {id:'rain',name:'Rain',ico:'🌧️',build:ambRain},
  {id:'ocean',name:'Ocean',ico:'🌊',build:ambOcean},
  {id:'cafe',name:'Café',ico:'☕',build:ambCafe},
  {id:'fire',name:'Fireplace',ico:'🔥',build:ambFire},
  {id:'brown',name:'Brown noise',ico:'🟤',build:ambBrown}
];
const ambList=()=>[...AMB_GEN.map(x=>({...x,kind:'gen'})),...AMB_TRACKS];
const ambOn=()=>S.cfg&&S.cfg.ambShow!==false;
const ambVol=()=>{const v=+((S.cfg||{}).ambVol);return isFinite(v)&&v>=0?Math.min(1,v):.6};

function ambCtx(){
  if(!AMB.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;AMB.ctx=new A();
    AMB.bus=AMB.ctx.createGain();AMB.bus.gain.value=0;AMB.bus.connect(AMB.ctx.destination)}
  if(AMB.ctx.state==='suspended')try{AMB.ctx.resume()}catch(e){}
  return AMB.ctx;
}
/* noise buffers, made once */
const ambBuf={};
function noise(kind){
  if(ambBuf[kind])return ambBuf[kind];
  const c=AMB.ctx,n=c.sampleRate*4,b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let last=0,b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<n;i++){const w=Math.random()*2-1;
      if(kind==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5}
      else if(kind==='pink'){b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
      else d[i]=w}}
  return ambBuf[kind]=b;
}
function src(kind){const s=AMB.ctx.createBufferSource();s.buffer=noise(kind);s.loop=true;s.loopStart=Math.random();s.start(0,Math.random()*3);AMB.stop.push(()=>{try{s.stop()}catch(e){}});return s}
function filt(type,f,q){const x=AMB.ctx.createBiquadFilter();x.type=type;x.frequency.value=f;if(q!=null)x.Q.value=q;return x}
function gain(v){const g=AMB.ctx.createGain();g.gain.value=v;return g}
function lfo(target,rate,depth,base){const o=AMB.ctx.createOscillator(),g=gain(depth);o.frequency.value=rate;target.value=base;o.connect(g).connect(target);o.start();AMB.stop.push(()=>{try{o.stop()}catch(e){}})}
function every(min,max,fn){let t;const go=()=>{fn();t=setTimeout(go,min+Math.random()*(max-min))};t=setTimeout(go,min);AMB.stop.push(()=>clearTimeout(t))}
function burst(f,q,dur,vol,type='bandpass'){const c=AMB.ctx,s=c.createBufferSource(),b=filt(type,f,q),g=gain(0),t=c.currentTime;
  s.buffer=noise('white');g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(b).connect(g).connect(AMB.bus);s.start(t,Math.random()*3);s.stop(t+dur+.05)}
function ping(f,vol){const c=AMB.ctx,t=c.currentTime;[[1,1],[2.7,.25]].forEach(([m,k])=>{const o=c.createOscillator(),g=gain(0);o.frequency.value=f*m;
  g.gain.setValueAtTime(vol*k,t);g.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(g).connect(AMB.bus);o.start(t);o.stop(t+.65)})}

/* the five sounds */
function ambRain(){
  src('pink').connect(filt('highpass',380)).connect(filt('lowpass',6500)).connect(gain(.5)).connect(AMB.bus);
  src('brown').connect(filt('lowpass',260)).connect(gain(.22)).connect(AMB.bus);
  every(25,110,()=>burst(2200+Math.random()*4500,1.4,.03+Math.random()*.03,.05+Math.random()*.12));
}
function ambOcean(){
  const f=filt('lowpass',700,.5),g=gain(.4);
  src('brown').connect(f).connect(g).connect(AMB.bus);
  lfo(f.frequency,.09,450,750);lfo(g.gain,.09,.28,.42);
  const f2=filt('bandpass',1800,.6),g2=gain(.05);src('pink').connect(f2).connect(g2).connect(AMB.bus);lfo(g2.gain,.09,.045,.05);
}
function ambCafe(){
  const m=filt('bandpass',520,.7),mg=gain(.6);src('pink').connect(m).connect(mg).connect(AMB.bus);lfo(mg.gain,.23,.14,.56);lfo(m.frequency,.07,120,520);
  src('brown').connect(filt('lowpass',320)).connect(gain(.38)).connect(AMB.bus);
  every(2500,8000,()=>ping(1900+Math.random()*1700,.025+Math.random()*.03));
  every(900,3000,()=>burst(900+Math.random()*900,3,.08,.03));
}
function ambFire(){
  src('brown').connect(filt('lowpass',480)).connect(gain(.45)).connect(AMB.bus);
  const h=filt('bandpass',900,.5),hg=gain(.06);src('pink').connect(h).connect(hg).connect(AMB.bus);lfo(hg.gain,.3,.03,.06);
  every(60,420,()=>{const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++)setTimeout(()=>burst(1800+Math.random()*3500,.9,.006+Math.random()*.02,.12+Math.random()*.25,'highpass'),i*(20+Math.random()*60))});
}
function ambBrown(){src('brown').connect(filt('lowpass',900)).connect(gain(.6)).connect(AMB.bus)}

function ambFade(to,sec){const g=AMB.bus.gain,t=AMB.ctx.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(to,t+sec)}
function ambTeardown(){AMB.stop.splice(0).forEach(f=>f());if(AMB.el){try{AMB.el.pause()}catch(e){}AMB.el=null}}
/* play a sound by id ('off' or unknown stops) */
function ambPlay(id){
  const it=ambList().find(x=>x.id===id);
  if(!it){ambStop();return}
  if(!ambCtx())return;
  const swap=()=>{ambTeardown();AMB.cur=it.id;
    if(it.kind==='track'){const a=new Audio(it.url);a.loop=true;a.volume=ambVol();a.play().catch(()=>{});AMB.el=a}
    else{it.build();ambFade(ambVol()*.8,1.4)}
    ambMark()};
  if(AMB.cur&&AMB.cur!==it.id){ambFade(0,.35);setTimeout(swap,380)}else if(AMB.cur!==it.id)swap();
}
function ambStop(){if(!AMB.ctx||!AMB.cur){AMB.cur=null;ambMark();return}AMB.cur=null;ambFade(0,.8);setTimeout(()=>{if(!AMB.cur)ambTeardown()},850);ambMark()}
function ambSetVol(v){S.cfg.ambVol=v;save();if(AMB.el)AMB.el.volume=v;else if(AMB.ctx&&AMB.cur)ambFade(v*.8,.15)}
/* the button shows a small dot while a sound plays */
function ambMark(){document.querySelectorAll('.amb-btn').forEach(b=>b.classList.toggle('playing',!!AMB.cur));const p=$('ambPop');if(p)ambDraw()}

/* menu */
function ambDraw(){
  const p=$('ambPop');if(!p)return;const cur=AMB.cur||'off';
  p.innerHTML=`<div class="amb-h">Focus sounds</div><div class="amb-grid">
    <button class="amb-o ${cur==='off'?'on':''}" data-ambp="off"><span class="amb-i">∅</span>Off</button>
    ${ambList().map(x=>`<button class="amb-o ${cur===x.id?'on':''}" data-ambp="${x.id}"><span class="amb-i">${x.ico||'🎵'}</span>${esc(x.name)}</button>`).join('')}</div>
    <label class="amb-vol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/></svg><input type="range" min="0" max="1" step=".02" value="${ambVol()}" id="ambVol" aria-label="Volume"></label>`;
}
function ambMenu(btn){
  ambClose();const r=btn.getBoundingClientRect(),p=document.createElement('div');p.id='ambPop';p.className='amb-pop';
  document.body.appendChild(p);ambDraw();
  const w=p.offsetWidth;p.style.left=Math.max(10,Math.min(innerWidth-w-10,r.right-w))+'px';p.style.top=(r.bottom+8)+'px';
  requestAnimationFrame(()=>p.classList.add('on'));
}
function ambClose(){const p=$('ambPop');if(p)p.remove()}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-amb]');if(b){e.stopPropagation();$('ambPop')?ambClose():ambMenu(b);haptic(5);return}
  const o=e.target.closest('[data-ambp]');if(o){e.stopPropagation();const id=o.dataset.ambp;S.cfg.ambSound=id;S.cfgU=Date.now();save();id==='off'?ambStop():ambPlay(id);haptic(5);return}
  if($('ambPop')&&!e.target.closest('#ambPop'))ambClose();
},true);
document.addEventListener('input',e=>{if(e.target.id==='ambVol')ambSetVol(+e.target.value)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('ambPop')){e.stopPropagation();ambClose()}},true);
/* focus starts: bring back the last sound you picked; focus ends: fade out */
function ambFocusStart(){if(ambOn()&&S.cfg.ambSound&&S.cfg.ambSound!=='off')ambPlay(S.cfg.ambSound)}
function ambFocusEnd(){ambClose();ambStop()}
function ambApply(){document.body.classList.toggle('no-amb',!ambOn());if(!ambOn())ambFocusEnd()}
