/* ---------- phone Home: how "Also today" is laid out (Settings → Appearance → Home on phones) ----------
   Switch (default): one card, with pills on top to switch between Habits, Goal and KPIs.
   Tiles: Goal and Habits side by side as two small tiles, KPIs as a row below.
   One card: everything stacked in one card (the old look).
   Computers keep their own Home. */
const hlWide=()=>matchMedia('(min-width:1100px)').matches;
const hlLay=()=>{const v=C().homeAlso;return v==='tiles'||v==='list'?v:'switch'};
/* the parts we have today, in pill order */
function hlParts(){const hw=hbWidget(),one=!!hw&&hwStyle()==='one';
  return {hw,one,parts:[one?{k:'hb',l:'Habits',h:hw}:null,{k:'goal',l:'Goal',h:nsCard()},{k:'mx',l:'KPIs',h:typeof mxHome==='function'?mxHome():''}].filter(x=>x&&x.h)}}
/* a small tile for the starred goal and for the next habit (Tiles look) */
function hlGoalTile(){const g=gStarred();if(!g)return '';const pr=gProg(g),left=gLeft(g,true);
  return `<button class="hl-tile hl-goal" data-gopen="${g.id}" aria-label="Goal: ${esc(g.name)}"><span class="hl-eye">Goal</span><b>${gName(g)}</b>
    <small>${pr.of?`${pr.n} of ${pr.of}`:'No milestones yet'}${left?` · ${left}`:''}</small><span class="ns-bar"><i style="width:${Math.round(pr.p*100)}%"></i></span></button>`}
function hlHabitTile(){const hs=hbAll(),due=hs.filter(h=>{const s=hbStats(h);return s.due||s.dt}),dn=due.filter(h=>hbStats(h).dt),open=due.filter(h=>!hbStats(h).dt),nx=open[0];
  const C2=2*Math.PI*17,p=due.length?dn.length/due.length:1;
  return `<div class="hl-tile hl-hab"><button class="hl-ht" data-hbopen aria-label="Open habits"><span class="hl-eye">Habits</span>
    <span class="hl-hr"><span class="hl-ring"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="r0" cx="20" cy="20" r="17"/><circle class="r1" cx="20" cy="20" r="17" style="stroke-dasharray:${(C2*p).toFixed(1)} ${C2.toFixed(1)}"/></svg><b>${dn.length}/${due.length}</b></span>
    <b class="hl-hn">${nx?`${nx.e?esc(nx.e)+' ':''}${esc(nx.name)}`:due.length?'All done':'Rest day'}</b></span></button>
    ${nx?`<button class="hw-done hl-done" data-hbt="${nx.id}" aria-pressed="false">Done</button>`:`<small class="hl-nd">${due.length?'See you tomorrow':'Nothing due today'}</small>`}</div>`}
const _homeAlsoLay=homeAlso;
homeAlso=function(){
  if(hlWide()||hlLay()==='list')return _homeAlsoLay();
  const {hw,one,parts}=hlParts(),nd=ciCard()||reviewCard(),bk=nd?'':backupCard();
  const ndH=nd?`<div class="also-in hl-nd-c">${nd}</div>`:'';
  const tail=(one?'':hw)+bk;
  if(!parts.length)return (nd?`<section class="also" aria-label="Also today"><h2 class="sec-h">Also today</h2>${ndH}</section>`:'')+tail;
  if(hlLay()==='tiles'){
    const g=parts.find(x=>x.k==='goal'),h=parts.find(x=>x.k==='hb'),m=parts.find(x=>x.k==='mx');
    const pair=g&&h?`<div class="hl-pair">${hlGoalTile()}${hlHabitTile()}</div>`:(g||h)?`<div class="also-in">${(g||h).h}</div>`:'';
    return `<section class="also hl-tiles" aria-label="Also today"><h2 class="sec-h">Also today</h2>${pair}${m?`<div class="also-in">${m.h}</div>`:''}${ndH}</section>${tail}`}
  /* switch */
  let on=parts.find(x=>x.k===S.homeTab)||parts[0];
  const pills=parts.length>1?`<div class="hl-pills" role="tablist" aria-label="Also today">${parts.map(x=>`<button role="tab" data-hltab="${x.k}" aria-selected="${x===on}">${x.l}</button>`).join('')}</div>`:'<h2 class="sec-h">Also today</h2>';
  return `<section class="also hl-sw" aria-label="Also today">${pills}<div class="also-in" data-hlon="${on.k}">${on.h}</div>${ndH}</section>${tail}`};
document.addEventListener('click',e=>{const b=e.target.closest('[data-hltab]');if(!b)return;e.preventDefault();
  if(S.homeTab===b.dataset.hltab)return;S.homeTab=b.dataset.hltab;haptic(4);render()});
/* swipe the card left/right to move between the pills */
(()=>{let x0=null,y0=0;
  document.addEventListener('touchstart',e=>{const c=e.target.closest('.hl-sw .also-in');if(!c||e.touches.length>1){x0=null;return}x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  document.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.5)return;const ps=[...document.querySelectorAll('.hl-pills [data-hltab]')];if(!ps.length)return;
    const i=ps.findIndex(b=>b.getAttribute('aria-selected')==='true'),n=ps[Math.max(0,Math.min(ps.length-1,i+(dx<0?1:-1)))];
    if(n&&n.dataset.hltab!==S.homeTab){S.homeTab=n.dataset.hltab;haptic(4);render()}},{passive:true})})();
