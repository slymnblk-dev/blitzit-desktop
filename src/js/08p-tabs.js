/* ---------- Phones: bottom tab bar (Home · Inbox · Habits · Goals, and +) ----------
   Shows on phones and tablets once Inbox, Habits or Goals is on, on Home and on those pages. It replaces Home's rows
   for them and the big Add task button. Inside a space the space's own bar (Win the day, +) stays.
   Computers have the sidebar instead. The + opens the add sheet on what fits the page: a habit on Habits, a goal on Goals. */
const TB_HOME='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/></svg>';
const TB_PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
document.body.insertAdjacentHTML('beforeend','<nav class="tabbar" id="tabBar" aria-label="Main"><div class="tb-in" id="tbIn"></div></nav>');
function tabsList(){const t=[['home','Home',TB_HOME]];
  if(inboxOn())t.push(['inbox','Inbox',IB_ICON]);if(habitsOn())t.push(['habits','Habits',RH_ICON]);if(goalsOn())t.push(['goals','Goals',G_FLAG]);
  return t.length>1?t:[]}
const tabNow=()=>gdOn||glOn?'goals':rhOn?'habits':ibOn?'inbox':'home';
let tbSig='';
function drawTabs(){
  const ts=tabsList(),on=ts.length>0&&(!S.space||ibOn||rhOn||glOn||gdOn);
  document.body.classList.toggle('tabs-on',on);
  if(!on){tbSig='';return}
  const cur=tabNow(),n=C().ibBadge===false?0:inboxItems().length,sig=ts.map(x=>x[0]).join()+'|'+cur+'|'+n;if(sig===tbSig)return;tbSig=sig;
  const btns=ts.map(([k,l,ic])=>`<button class="tb${k===cur?' on':''}" data-tab="${k}" id="tb${l}"${k===cur?' aria-current="page"':''}>${ic}<span>${l}</span>${k==='inbox'&&n?`<i class="tb-n">${n>99?'99+':n}</i>`:''}</button>`);
  btns.splice(Math.ceil(btns.length/2),0,`<button class="tb-add" id="tbAdd" aria-label="Add">${TB_PLUS}</button>`); // the + sits in the middle
  $('tbIn').innerHTML=btns.join('');
}
/* one tab at a time: the others close; tapping the open tab goes back to its top (or from a goal to all goals) */
function tbGo(k){
  const cur=tabNow();
  if(k===cur){
    if(k==='goals'&&gdOn){closeGoal();if(!glOn)openGoals();return drawTabs()}
    const pg={home:null,inbox:'inboxPg',habits:'rhythmPg',goals:'goalsPg'}[k];
    if(pg)$(pg).scrollTo({top:0,behavior:'smooth'});else window.scrollTo({top:0,behavior:'smooth'});return}
  if(gdOn&&k!=='goals')closeGoal();if(glOn&&k!=='goals')closeGoals();if(rhOn&&k!=='habits')closeRhythm();if(ibOn&&k!=='inbox')closeInbox();
  if(k==='home'){if(S.space)goHome()}
  else if(k==='inbox')openInbox();
  else if(k==='habits')openRhythm();
  else if(k==='goals'){if(gdOn)closeGoal();openGoals()}
  drawTabs();
}
$('tabBar').addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]');if(b){haptic(5);return tbGo(b.dataset.tab)}
  if(e.target.closest('#tbAdd')){addKindNext=rhOn?'habit':glOn&&!gdOn?'goal':null;$('addBtn').click()}
});
const _tbRender=render;render=function(d){_tbRender(d);try{drawTabs()}catch(err){console.error(err)}};
const _tbDesk=renderDesk;renderDesk=function(){_tbDesk.apply(this,arguments);try{drawTabs()}catch(err){console.error(err)}};
