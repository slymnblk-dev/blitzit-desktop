/* ---------- computer: Goals live in the sidebar, like spaces ----------
   "Goals" folds open to list every goal; a goal opens its own page. No Goals overview page and no back button on a computer.
   Phones keep the Goals tab and its page. */
const gSideWide=()=>matchMedia('(min-width:1100px)').matches;
const G_CHEV='<svg class="s-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
const _rhythmSide=rhythmSide;
rhythmSide=function(){
  if(!gSideWide()||!goalsOn())return _rhythmSide();
  // habits row as before, then our own Goals row
  const keep=S.cfg.goals;S.cfg.goals=false;let h;try{h=_rhythmSide()}finally{S.cfg.goals=keep}
  const gs=gAll(),open=!!S.gSideOpen;
  h+=`<button class="s-list s-home s-inbox s-gfold${open?' open':''}" id="sGoals" title="Goals" aria-expanded="${open}">${G_FLAG}<span class="s-name">Goals</span>${gs.length?`<span class="n">${gs.length}</span>`:''}</button>`;
  if(open)h+=`<div class="s-sub s-gsub">${gs.map(g=>{const p=gProg(g);
      return `<button class="s-list${gdOn&&String(gdId)===String(g.id)?' on':''}" data-sgoal="${g.id}" title="${esc(g.name)}"><span class="sg-e">${g.e?esc(g.e):G_FLAG}</span><span class="s-name">${esc(g.name)}</span><span class="n">${p.n}/${p.of}</span></button>`}).join('')}
    ${gs.length<G_MAX?`<button class="s-list s-mini" data-sgnew title="New goal">${PLUS_S}<span class="s-name">New goal</span></button>`:''}</div>`;
  return h};

const _sListsClick=$('sLists').onclick;
$('sLists').onclick=e=>{
  if(gSideWide()&&goalsOn()){
    if(e.target.closest('#sGoals')){S.gSideOpen=!S.gSideOpen;save();haptic(4);return renderDesk()}
    const go=e.target.closest('[data-sgoal]');
    if(go){if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();
      if(gdOn&&String(gdId)===go.dataset.sgoal)return;openGoal(isNaN(+go.dataset.sgoal)?go.dataset.sgoal:+go.dataset.sgoal);return}
    if(e.target.closest('[data-sgnew]'))return openSetup(null);
  }
  return _sListsClick(e)};

/* anything that asks for the Goals page on a computer opens the sidebar fold instead (and the first goal, if none is open) */
const _openGoals=openGoals;
openGoals=function(){
  if(!gSideWide())return _openGoals();
  if(!goalsOn())return;
  S.gSideOpen=true;save();
  const gs=gAll();
  if(!gs.length)return openSetup(null);
  if(!gdOn){if(ibOn)closeInbox();if(rhOn)closeRhythm();openGoal(gs[0].id)}else renderDesk()};
/* the goal you're on stays lit in the sidebar */
const _openGoal=openGoal;
openGoal=function(id){if(String(id)!==String(gdId)){gDoneOpen=false;gOtherOpen=false}_openGoal(id);if(gSideWide()&&gdOn&&!S.gSideOpen){S.gSideOpen=true;save()}if(gdOn)renderDesk()};
/* growing past the phone size while the Goals page is open: swap it for the sidebar */
matchMedia('(min-width:1100px)').addEventListener('change',e=>{if(e.matches&&glOn){closeGoals();openGoals()}});
