/* ---------- first time: land on the example tasks, a quiet "Clear" chip, and a 1-minute do-it-yourself tour ----------
   New people start on the demo (Work + Personal). Home shows a small "Example tasks · Clear" chip (phone: under the
   title; computer: next to the line under the greeting). Clear opens "Start fresh": pick your spaces, the examples go.
   The tour: a small card (phone: above the tab bar; computer: bottom right) and a coral ring around the real thing
   to tap. You do each step yourself; the card follows. Replay from Settings → Help. */

/* ---- example data ---- */
const DEMO_SP_NAMES=new Set(Object.values(DEMO).map(d=>d.space.name));
const demoShown=()=>S.tasks.some(t=>DEMO_TITLES.has(t.title))&&(S.demoOn===true||(S.demoOn===undefined&&isDemo()));
const DEMO_CHIP=()=>`<button class="demo-chip" data-democlear type="button"><i aria-hidden="true"></i>Example tasks<span>Clear</span></button>`;
function demoChipPlace(){
  document.querySelectorAll('.demo-chip').forEach(x=>x.remove());
  if(S.space||!demoShown())return;
  const ph=document.querySelector('.home-hero .summary');if(ph&&!deskOn())ph.insertAdjacentHTML('afterend',DEMO_CHIP());
  const dk=$('mSub');if(dk&&deskOn())dk.insertAdjacentHTML('beforeend',DEMO_CHIP());
}
const deskOn=()=>matchMedia('(min-width:1100px)').matches;
const _obRender=render;
render=function(d){_obRender(d);try{demoChipPlace()}catch(e){}};
document.addEventListener('click',e=>{if(e.target.closest('[data-democlear]')){e.preventDefault();e.stopPropagation();haptic(6);sfOpen()}},true);

/* "Start fresh": pick spaces, clear the examples (your own tasks, goals and habits stay; undo brings it all back) */
let sfPick=new Set();
function sfOpen(){
  sfPick=new Set(S.spaces.map(s=>s.name).filter(n=>STARTERS.some(x=>x.n===n)));if(!sfPick.size)sfPick=new Set(['Work','Personal']);
  let d=$('sfDlg');if(!d){d=document.createElement('div');d.id='sfDlg';d.className='sf';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Start fresh');document.body.appendChild(d);
    d.addEventListener('click',e=>{
      if(e.target===d||e.target.closest('[data-sfno]'))return sfClose();
      const p=e.target.closest('[data-sfp]');if(p){const n=p.dataset.sfp;sfPick.has(n)?sfPick.delete(n):sfPick.add(n);haptic(4);return sfDraw()}
      if(e.target.closest('[data-sfgo]'))sfGo()});
    d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();sfClose()}})}
  sfDraw();requestAnimationFrame(()=>d.classList.add('on'));setTimeout(()=>{const b=d.querySelector('[data-sfgo]');if(b)b.focus()},250);
}
function sfClose(){const d=$('sfDlg');if(d)d.classList.remove('on')}
function sfKeep(sp){ // a space stays when it holds anything that isn't an example
  const ls=new Set(S.lists.filter(l=>l.space===sp.id).map(l=>l.id));
  if(S.tasks.some(t=>ls.has(t.list)&&!DEMO_TITLES.has(t.title)))return true;
  return ['habits','goals','kpis','okrs','routines'].some(k=>(S[k]||[]).some(x=>String(x.space)===String(sp.id)));
}
function sfDraw(){
  const left=S.spaces.filter(sp=>!DEMO_SP_NAMES.has(sp.name)||sfKeep(sp)).length;
  $('sfDlg').innerHTML=`<div class="sf-in"><i class="sf-grab" aria-hidden="true"></i><h3>Start fresh</h3>
    <p>The example tasks go away. Pick the areas you work on. Each one becomes a space.</p>
    <div class="sf-picks">${STARTERS.map(x=>`<button type="button" class="sf-p${sfPick.has(x.n)?' on':''}" data-sfp="${x.n}" aria-pressed="${sfPick.has(x.n)}"><span>${x.e}</span>${x.n}</button>`).join('')}</div>
    <button type="button" class="primary sf-go" data-sfgo ${!sfPick.size&&!left?'disabled':''}>Clear examples &amp; start</button>
    <button type="button" class="sf-no" data-sfno>Keep exploring</button></div>`;
}
function sfGo(){
  const pick=STARTERS.filter(x=>sfPick.has(x.n));
  sfClose();tourEnd();
  commit(()=>{
    S.tasks=S.tasks.filter(t=>!DEMO_TITLES.has(t.title));
    const gone=S.spaces.filter(sp=>DEMO_SP_NAMES.has(sp.name)&&!sfPick.has(sp.name)&&!sfKeep(sp)).map(sp=>sp.id);
    S.spaces=S.spaces.filter(sp=>!gone.includes(sp.id));S.lists=S.lists.filter(l=>!gone.includes(l.space));
    pick.forEach(x=>{if(S.spaces.some(sp=>sp.name===x.n))return;const sp={id:'s'+newId(),name:x.n,c:x.c,e:x.e,autoSet:true};S.spaces.push(sp);S.lists.push({id:'l'+newId(),name:'General',c:x.c,space:sp.id})});
    S.lists.forEach(l=>{if(['Projects','Life'].includes(l.name)&&!S.tasks.some(t=>t.list===l.id))l.name='General'});
    S.demoOn=false;S.space=null;S.list='all';S.stage='today';
  },'Examples cleared. Your fresh start');
  haptic(12);
}

/* ---- the tour ---- */
const firstSp=()=>orderedSpaces()[0]||S.spaces[0];
const rowSel='#list li.row';
const TOUR=[
  {k:'space',t:()=>`Open the ${esc(firstSp()?.name||'first')} space`,
    p:()=>`Spaces keep each part of life apart, like Work and Personal. ${deskOn()?'Click':'Tap'} <b>${esc(firstSp()?.name||'a space')}</b> to open it.`,
    tgt:()=>{const sp=firstSp();return sp?`[data-space="${sp.id}"]`:null},
    prep:()=>{if(S.space)goHome()},act:true},
  {k:'list',t:()=>'Lists live in a space',
    p:()=>'A space holds lists, like a project or a client. Switch between them here.',
    tgt:()=>deskOn()?'#fwNav .fw-pill||#sLists .s-sub':'#listBtn'},
  {k:'stages',t:()=>'Four stages',
    p:()=>'Every task moves along: <b>Backlog</b> for someday, <b>My week</b> for this week, <b>Today</b> for today, then <b>Done</b>.',
    tgt:()=>deskOn()?'#board .col-h':'#gauge',all:true},
  {k:'week',t:()=>'Plan your week',
    p:()=>deskOn()?'Once a week, drag a task from <b>Backlog</b> into <b>My week</b>. Try it now.':'Once a week, open <b>Backlog</b> and swipe a task to the right. It moves to My week. Try it.',
    tgt:()=>deskOn()?'.col[data-s="backlog"] li.row':(S.stage!=='backlog'?'#gauge .seg[data-s="backlog"]':rowSel),act:true},
  {k:'today',t:()=>'Pick today',
    p:()=>deskOn()?'Each morning, drag what you will really do from <b>My week</b> into <b>Today</b>.':'Each morning, open <b>My week</b> and swipe a task right, into <b>Today</b>.',
    tgt:()=>deskOn()?'.col[data-s="week"] li.row':(S.stage!=='week'?'#gauge .seg[data-s="week"]':rowSel),act:true},
  {k:'detail',t:()=>'Every task has details',
    p:()=>`${deskOn()?'Click':'Tap'} a task to open it: time, notes, steps, repeat and more.`,
    tgt:()=>deskOn()?'.col[data-s="today"] li.row':rowSel,act:true},
  {k:'end',t:()=>'You’re all set',
    p:()=>demoShown()?'Play with the examples as long as you like. When you’re ready, tap <b>Clear</b> on Home to start with your own.':'Add your first task with <b>+</b>. Win the day!'}
];
let tour=null; // {i}
function tourStart(i=0){tour={i};tourEl();tourDraw();haptic(6)}
function tourEnd(){if(!tour)return;tour=null;cancelAnimationFrame(tourRaf);const c=$('tourCard'),r=$('tourRing');if(c)c.classList.remove('on');if(r)r.classList.remove('on');document.body.classList.remove('tour-low')}
function tourGo(i){if(!tour)return;tour.i=i;haptic(5);tourDraw()}
function tourEl(){if($('tourCard'))return;
  const c=document.createElement('div');c.id='tourCard';c.className='tour';c.setAttribute('role','dialog');c.setAttribute('aria-live','polite');c.setAttribute('aria-label','Quick tour');document.body.appendChild(c);
  const r=document.createElement('div');r.id='tourRing';r.className='tour-ring';r.setAttribute('aria-hidden','true');document.body.appendChild(r);
  c.addEventListener('click',e=>{
    if(e.target.closest('[data-tx]'))return tourEnd();
    if(e.target.closest('[data-tgo]'))return tourGo(tour.i+1);
    if(e.target.closest('[data-tstart]')){if(S.space)goHome();return tourGo(1)}
    if(e.target.closest('[data-tdone]'))return tourEnd();
    if(e.target.closest('[data-tsign]')){tourEnd();S.tasks=[];S.demoOn=false;render(0);openSettings();setView='account';drawSettings()}});
}
/* step 0 is the hello; steps 1-6 are the tour; 7 is the end */
function tourDraw(){
  const c=$('tourCard');if(!tour||!c)return;const i=tour.i;
  if(i===0){c.innerHTML=`<div class="tour-top"><span class="tour-eye">Welcome to Windaday</span><button class="tour-x" data-tx aria-label="Close">${X}</button></div>
    <b class="tour-t">Here are some example tasks</b><p>Try things out safely. Want a 1-minute tour of the basics?</p>
    <div class="tour-b"><button class="secondary" data-tx>Not now</button><button class="primary" data-tstart>Start the tour</button></div>
    ${CLOUD?`<button class="tour-link" data-tsign>I already have an account</button>`:''}`}
  else{const s=TOUR[i-1],last=i===TOUR.length;if(s.prep)try{s.prep()}catch(e){}
    c.innerHTML=`<div class="tour-top"><span class="tour-eye">${last?'Quick tour · done':`Quick tour · ${i} of ${TOUR.length-1}`}</span><button class="tour-x" data-tx aria-label="End the tour">${X}</button></div>
    <b class="tour-t">${s.t()}</b><p>${s.p()}</p>
    <div class="tour-f"><span class="tour-bar"><i style="width:${Math.round(Math.min(i,TOUR.length-1)/(TOUR.length-1)*100)}%"></i></span>
      ${last?`<button class="primary tour-btn" data-tdone>Done</button>`:s.act?`<button class="tour-skip" data-tgo>Skip step</button>`:`<button class="primary tour-btn" data-tgo>Next</button>`}</div>`}
  c.classList.add('on');tourScrolled=false;cancelAnimationFrame(tourRaf);tourLoop();
}
let tourRaf=0,tourScrolled=false;
function tourLoop(){
  const c=$('tourCard'),r=$('tourRing');if(!tour||!c)return;
  const s=tour.i>0?TOUR[tour.i-1]:null,sel=s&&s.tgt?s.tgt():null;
  // a target can list fallbacks (a||b); "all" rings every match together (e.g. the four column heads)
  let els=[];if(sel)for(const one of sel.split('||')){els=[...document.querySelectorAll(one)].filter(x=>{const b=x.getBoundingClientRect();return b.width>12&&b.height>12&&!x.closest('.ghost,[hidden]')});if(els.length)break}
  if(!(s&&s.all))els=els.slice(0,1);const el=els[0];
  const busy=document.querySelector('.sheet.on,.dlg.on,#sfDlg.on,.settings.on');
  if(el&&!busy){
    const rs=els.map(x=>x.getBoundingClientRect()),b={left:Math.min(...rs.map(x=>x.left)),top:Math.min(...rs.map(x=>x.top)),right:Math.max(...rs.map(x=>x.right)),bottom:Math.max(...rs.map(x=>x.bottom))};b.width=b.right-b.left;b.height=b.bottom-b.top;
    if(!tourScrolled&&(b.top<60||b.bottom>innerHeight-180)){tourScrolled=true;el.scrollIntoView({block:'center',behavior:'smooth'})}
    r.style.cssText=`left:${b.left-4}px;top:${b.top-4}px;width:${b.width+8}px;height:${b.height+8}px`;r.classList.add('on');
    // keep the card off the thing to tap
    const cb=c.getBoundingClientRect(),hit=b.bottom>cb.top-8&&b.top<cb.bottom+8&&b.right>cb.left&&b.left<cb.right;
    if(hit&&!c.classList.contains('up'))c.classList.add('up');else if(!hit&&c.classList.contains('up')&&b.top<innerHeight*.5)c.classList.remove('up');
  }else{r.classList.remove('on');c.classList.remove('up')}
  const low=c.classList.contains('on')&&!c.classList.contains('up');document.body.classList.toggle('tour-low',low);if(low)document.body.style.setProperty('--tour-h',c.offsetHeight+'px');
  tourRaf=requestAnimationFrame(tourLoop);
}
/* the card follows what you do */
const tourAt=k=>tour&&tour.i>0&&TOUR[tour.i-1].k===k;
const _obOpenSpace=openSpace;
openSpace=function(id){_obOpenSpace(id);if(tourAt('space'))setTimeout(()=>tourGo(tour.i+1),350)};
const _obSetStage=setStage;
setStage=function(t,stage){const was=t&&t.stage;const r=_obSetStage(t,stage);
  if((tourAt('week')&&was==='backlog'&&stage==='week')||(tourAt('today')&&was==='week'&&stage==='today'))setTimeout(()=>tourGo(tour.i+1),450);
  return r};
const _obOpenDetail=openDetail;
openDetail=function(id){_obOpenDetail(id);if(tourAt('detail'))setTimeout(()=>tourGo(tour.i+1),400)};
addEventListener('keydown',e=>{if(e.key==='Escape'&&tour&&!document.querySelector('.sheet.on,.dlg.on,#sfDlg.on'))tourEnd()});

/* first start: after the sunrise welcome (if it plays), say hello. Automated checks skip it unless they ask. */
function tourSoon(){
  if(navigator.webdriver&&!window.__tourTest)return;
  let n=0;const tick=()=>{if(++n>60)return;if($('welcome')||$('intro').classList.contains('on')||document.querySelector(".handoff"))return setTimeout(tick,400);setTimeout(()=>tourStart(0),500)};tick();
}
