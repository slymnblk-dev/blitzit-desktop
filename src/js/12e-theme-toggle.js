/* ---------- Light / dark in one tap (0.268) ----------
   A sun / moon button next to Settings (computer) and next to your picture (phone). The new look spreads out
   from the button in a soft circle (View Transitions), or fades where that isn't available. The choice is a
   normal setting (cfg.theme), so it is saved, synced to your account and remembered next time.
   Defaults: dark mode, Ember for dark, Sand for light, and the Calm column Home on computers. */
const TT_SUN='<svg class="tt-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"/></svg>';
const TT_MOON='<svg class="tt-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z"/></svg>';
const ttBtn=id=>`<button class="icon-btn tt-btn" id="${id}" data-tt aria-label="Switch to light mode" title="Light / dark">${TT_SUN}${TT_MOON}</button>`;
(()=>{const d=$('dSet');if(d)d.insertAdjacentHTML('beforebegin',ttBtn('ttDesk'));const p=$('setBtn');if(p)p.insertAdjacentHTML('beforebegin',ttBtn('ttPhone'))})();
function ttPaint(){const dark=modeNow()==='dark';document.querySelectorAll('[data-tt]').forEach(b=>{b.classList.toggle('is-dark',dark);
  b.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');b.setAttribute('aria-pressed',String(dark))})}
/* the phone's status bar (theme-color) follows the switch gradually instead of jumping first (0.320) */
function ttRgb(c){const d=document.createElement('i');d.style.color=c;document.body.appendChild(d);const v=getComputedStyle(d).color;d.remove();const m=v.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null}
function ttBarFade(old,ms){const ms2=document.querySelectorAll('meta[name="theme-color"]'),to=[...ms2].map(m=>m.getAttribute('content'));
  const pairs=[...ms2].map((m,i)=>[m,ttRgb(old[i]||to[i]),ttRgb(to[i]),to[i]]).filter(p=>p[1]&&p[2]);if(!pairs.length)return;
  const t0=performance.now(),ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const step=now=>{const t=Math.min(1,(now-t0)/ms),e=ease(t);
    pairs.forEach(([m,a,b,fin])=>m.setAttribute('content',t>=1?fin:`rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*e)).join(',')})`));if(t<1)requestAnimationFrame(step)};
  pairs.forEach(([m,a])=>m.setAttribute('content',`rgb(${a.join(',')})`));requestAnimationFrame(step)}
function ttSwitch(btn){
  const calm=!C().motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const oldBar=[...document.querySelectorAll('meta[name="theme-color"]')].map(m=>m.getAttribute('content'));
  const next=modeNow()==='dark'?'light':'dark',go=()=>{setCfg('theme',next);ttPaint();ttBarFade(oldBar,calm?1:520)};
  haptic(8);try{sfx('toggle')}catch(e){}
  if(calm)return go();
  /* browsers without the circle (e.g. some phone browsers): everything fades together, at one speed, instead of each part on its own */
  if(!document.startViewTransition){root.classList.add('tt-fade');go();setTimeout(()=>root.classList.remove('tt-fade'),560);return}
  const r=btn.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,rad=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  /* 0.319: smoother. (1) While switching, the app's own colour fades are off, so the new look is final inside the circle
     (before, cards and buttons were still fading their colours while the circle grew). (2) The new look starts as a dot at the
     button, so it never flashes in full for a frame before the circle starts. (3) The circle holds its end until the switch is done. */
  root.style.setProperty('--ttx',x+'px');root.style.setProperty('--tty',y+'px');
  root.classList.add('tt-anim');
  const vt=document.startViewTransition(go);
  vt.ready.then(()=>root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${rad}px at ${x}px ${y}px)`]},
    {duration:650,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
  vt.finished.finally(()=>root.classList.remove('tt-anim'));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-tt]');if(!b)return;e.preventDefault();e.stopPropagation();ttSwitch(b)},true);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>ttPaint());
const _ttApply=applySettings;
applySettings=function(){_ttApply.apply(this,arguments);try{ttPaint()}catch(e){}};
ttPaint();
