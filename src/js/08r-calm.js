/* ---------- calm redraws ----------
   Ticking a habit, a task or a milestone redraws the screen a moment later. Before, every card replayed its
   "slide in" animation then, so the page flashed. Now cards slide in only when you arrive on a screen; a redraw
   of the same screen just updates what changed. */
let calmKey='';
const calmNow=()=>[S.space,S.list,S.stage,S.subHidden,typeof spPage!=='undefined'?spPage:'',ibOn,rhOn,glOn,gdOn,gdOn?gdId:''].join('|');
function calmFinish(){
  if(!document.getAnimations)return;
  for(const a of document.getAnimations()){
    if(typeof CSSAnimation==='undefined'||!(a instanceof CSSAnimation))continue;
    const t=a.effect&&a.effect.getComputedTiming();if(!t||!isFinite(t.endTime))continue; // leave looping glows alone
    if((a.currentTime||0)>40)continue; // only the ones this redraw just started
    const el=a.effect.target;if(!el||!el.closest||el.closest('.sheet,.toast,#cxPop,.dlg,.mo-pg'))continue;
    try{a.finish()}catch(e){}
  }
}
const _calmRender=render;
render=function(d){
  const k=calmNow(),quiet=k===calmKey&&d===undefined&&!enterId;
  _calmRender(d);calmKey=calmNow();
  if(quiet)calmFinish()};
