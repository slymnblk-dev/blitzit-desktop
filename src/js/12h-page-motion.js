/* ---------- Phones: one smooth motion for every page change (0.282) ----------
   Uses View Transitions: the old page is captured as a picture, fades out quickly and drifts a little, while the new page
   slides in as one piece and settles softly. No more hard cuts or two pages showing through each other.
   Direction: deeper (Home → space → list) comes from the right, back from the left; tabs and stages follow their order.
   The tab bar and the bottom bar stay in place (they are their own layers). Off with Motion off / reduced motion,
   on computers, in browsers without View Transitions, and in automated tests (unless window.__vtTest). */
var vtIn=false,vtWait=false,vtArgs=null,vtKey=null,vtStage=null;
const vtOn=()=>!matchMedia('(min-width:1100px)').matches&&typeof document.startViewTransition==='function'&&moOK()&&(!navigator.webdriver||window.__vtTest);
function vtRun(dir,fn){
  if(vtIn||!vtOn())return fn();
  vtIn=true;vtWait=true;root.dataset.vt=dir;let t;
  /* a jump to the top asked for now waits until the new page is drawn, so the old picture stays where you were */
  const so=window.scrollTo;let q=null;window.scrollTo=function(){q=arguments};const back=()=>{if(window.scrollTo!==so)window.scrollTo=so};
  try{t=document.startViewTransition(()=>{vtWait=false;back();fn();if(vtArgs){const a=vtArgs;vtArgs=null;_vtRender.apply(null,a)}if(q)so.apply(window,q);vtSettle()})}
  catch(e){back();vtIn=false;vtWait=false;delete root.dataset.vt;fn();if(q)so.apply(window,q);return}
  t.finished.catch(()=>{}).finally(()=>{back();vtIn=false;vtWait=false;delete root.dataset.vt});
}
/* the new page's own little entrance moves (title slide, cards rising) jump to their end: the page already moves as one,
   and letting them run (or holding them back with CSS) made titles show twice or pop in again after the slide (0.283) */
function vtSettle(){try{document.getAnimations().forEach(a=>{if(typeof CSSAnimation!=='undefined'&&!(a instanceof CSSAnimation))return;
  const tm=a.effect&&a.effect.getComputedTiming?a.effect.getComputedTiming():null;if(!tm||tm.iterations===Infinity||a.playState==='finished')return;a.finish()})}catch(e){}}
/* where you are, for render: Home, a space (and list), or a stage inside it */
const vtWhere=()=>S.space?`s:${S.space}:${S.list}`:'home';
const _vtRender=render;
render=function(d){
  if(vtWait){vtArgs=[d];return}                     // a page change is about to be drawn: draw once, with the latest state
  const k=vtWhere(),st=S.stage,was=vtKey,wasSt=vtStage;vtKey=k;vtStage=st;
  if(vtIn||was===null||!vtOn())return _vtRender.apply(this,arguments);
  let dir=null;
  if(was!==k){dir=k==='home'?'l':was==='home'?'r':was.split(':')[1]!==k.split(':')[1]?'r':'f'}
  /* switching stages (Backlog, My week, Today, Done) is instant since 0.317: no slide */
  if(!dir)return _vtRender.apply(this,arguments);
  const args=arguments;vtRun(dir,()=>_vtRender.apply(null,args));
};
/* tabs: slide toward the tab you tapped */
const vtTabOrder=()=>[...document.querySelectorAll('#tbIn [data-tab]')].map(b=>b.dataset.tab);
const _vtTab=tbGo;
/* 0.318: switching tabs is instant too (the slide made pages flash); the tab pages just appear */
tbGo=function(k){root.classList.add('tb-snap');let r;try{r=_vtTab.apply(this,arguments)}finally{vtKey=vtWhere();vtStage=S.stage;requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('tb-snap')))}return r};
