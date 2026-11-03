/* ---------- computer: the Goals item in the sidebar ----------
   0.295: one item that opens the Goals page (the same page as on phones); a goal opens from there. */
const gSideWide=()=>matchMedia('(min-width:1100px)').matches;
const G_CHEV='<svg class="s-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
const _rhythmSide=rhythmSide;
rhythmSide=function(){
  if(!gSideWide()||!goalsOn())return _rhythmSide();
  // habits row as before, then our own Goals row
  const keep=S.cfg.goals;S.cfg.goals=false;let h;try{h=_rhythmSide()}finally{S.cfg.goals=keep}
  /* 0.295: Goals is one plain item that opens the Goals page (no fold with every goal) */
  const gs=gAll(),on=(typeof glOn!=='undefined'&&glOn)||(typeof gdOn!=='undefined'&&gdOn);
  h+=`<button class="s-list s-home s-inbox${on?' on':''}" id="sGoals" title="Goals">${G_FLAG}<span class="s-name">Goals</span>${gs.length?`<span class="n">${gs.length}</span>`:''}</button>`;
  return h};

const _sListsClick=$('sLists').onclick;
$('sLists').onclick=e=>{
  if(gSideWide()&&goalsOn()){
    if(e.target.closest('#sGoals')){if(ibOn)closeInbox();if(rhOn)closeRhythm();if(gdOn)closeGoal();if(!glOn)openGoals();else{drawGoals();$('goalsPg').scrollTop=0}haptic(4);return}
    const go=e.target.closest('[data-sgoal]');
    if(go){if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();
      if(gdOn&&String(gdId)===go.dataset.sgoal)return;openGoal(isNaN(+go.dataset.sgoal)?go.dataset.sgoal:+go.dataset.sgoal);return}
    if(e.target.closest('[data-sgnew]'))return openSetup(null);
  }
  return _sListsClick(e)};

/* 0.295: the Goals page is the same on computers and phones (it used to open the sidebar fold and the first goal) */
/* the goal you're on stays lit in the sidebar */
const _openGoal=openGoal;
openGoal=function(id){if(String(id)!==String(gdId)){gDoneOpen=false;gOtherOpen=false}_openGoal(id);if(gdOn)renderDesk()};
/* growing past the phone size while the Goals page is open: swap it for the sidebar */
matchMedia('(min-width:1100px)').addEventListener('change',e=>{if(e.matches&&glOn){closeGoals();openGoals()}});
