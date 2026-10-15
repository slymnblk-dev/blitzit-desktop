/* ---------- quiet when idle (computers): after 5 seconds without moving, the day's summary and the add buttons fade away.
   Any mouse move, scroll or key brings them back. Settings → Appearance → Feel. ---------- */
let idleT=null,idleLast=0;
const idleOk=()=>S.cfg&&S.cfg.idleHide!==false&&matchMedia('(hover:hover) and (pointer:fine)').matches;
function idleWake(){
  const now=performance.now(),b=document.body;
  if(idleT&&!b.classList.contains('idle')&&now-idleLast<250)return;idleLast=now; // mousemove is chatty: re-arm at most 4× a second
  b.classList.remove('idle');clearTimeout(idleT);idleT=null;
  if(idleOk())idleT=setTimeout(()=>{if(idleOk())b.classList.add('idle')},5000);
}
['mousemove','keydown','wheel','pointerdown'].forEach(k=>addEventListener(k,idleWake,{passive:true,capture:true}));
setTimeout(idleWake,0); // after every script has loaded (settings are ready then)
