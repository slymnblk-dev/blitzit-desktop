/* ---------- Modes → Goals (optional; Settings → Modes, off by default) ----------
   Off means every goal screen, card, pill, star and menu item disappears. Goals are kept, so turning
   the mode back on brings everything back.
   • North star: one starred goal sits on Home under the Today card. Any task can be linked to a goal
     (★ Goal in its details) and wears a small star; finishing it shows up as "moved it this week".
   • Goal page: The climb (default), Path or Poster, switchable per goal under ⋯ → View; drawn in 08n-pages.js.
   • 30-second setup: what, by when, first milestones.
   Spaces are optional: a goal with no space stands on its own (g.space null). A goal in a space hides when that
   space is archived or deleted, like before.
   Data: S.goals [{id,name,e,space?,why,due:'YYYY-MM-DD',created,star,view,done,doneAt,
     ms:[{id,t,done,doneAt,items:[{id,t,done,doneAt,subs}],task?}]}]. Milestones are parent tasks. Their tasks live in
   the goal itself (m.items, in no list or stage) unless you add one to a list: then it is a real task (t.ms, t.goal).
   Finishing a milestone's last task ticks it; marking a milestone done finishes its open tasks; reopening a
   milestone leaves its tasks as they are. (ms.task is the older one-task link and still counts as a member.) Goals sync, back up and undo like tasks.
   Constants are var (not const) because other files may draw before this one runs. */
var gdOn=false,gsOn=false,gdId=null,gdAnim=false;
var G_MAX=3,MS_MAX=12;
var G_STAR='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/></svg>';
var G_FLAG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
var G_ICONS=['🎯','🏃','💪','📚','💼','💰','🚀','🧠','✍️','🎸','🏠','✈️','🌱','❤️','🎓','🏆','📈','🧘','🍎','🛠️','🎨','📷','🌍','⭐'];
var G_WORDS=[[/marathon|run|race|\bkm\b|5k|10k|triathlon/,'🏃'],[/weight|fit|gym|strong|muscle|lose|\bkg\b|lbs|push.?up/,'💪'],[/read|books?\b/,'📚'],
  [/client|customer|sales|deal|job|promot|career|business|hire/,'💼'],[/save|money|debt|invest|income|revenue|earn|salary|€|\$|£/,'💰'],
  [/launch|ship|app|startup|product|release|website/,'🚀'],[/learn|language|course|study|exam|degree|spanish|english|german|french/,'🧠'],
  [/write|novel|blog|article|thesis/,'✍️'],[/guitar|piano|music|song|album|\bdj\b/,'🎸'],[/house|home|move|apartment|flat|renovat/,'🏠'],
  [/travel|trip|visit|country|countries/,'✈️'],[/meditat|calm|stress|sleep|mindful/,'🧘'],[/eat|diet|vegan|cook|sugar/,'🍎']];
function gIcon(n){const s=String(n||'').toLowerCase();const m=G_WORDS.find(([r])=>r.test(s));return m?m[1]:(autoIcon(n)||'')}

function goalsOn(){return !!(S.cfg&&S.cfg.goals)}
function gList(){if(!Array.isArray(S.goals))S.goals=[];return S.goals}
function gById(id){return gList().find(g=>g&&String(g.id)===String(id))}
/* active goals whose space still exists (an archived or deleted space hides its goals) */
const gSpaceOk=x=>!x.space||!!spaceOf(x.space);
function gAll(){return gList().filter(g=>g&&!g.done&&gSpaceOk(g))}
function gWon(sp){return gList().filter(g=>g&&g.done&&gSpaceOk(g)&&(!sp||g.space===sp)).sort((a,b)=>(b.doneAt||0)-(a.doneAt||0))}
function gStarred(){return gAll().find(g=>g.star)||null}
function gNoon(d){const x=new Date(d);x.setHours(12,0,0,0);return x}
function gDate(k){const p=String(k||'').split('-').map(Number);return p[0]?new Date(p[0],p[1]-1,p[2],12):null}
function gPlus(months){const d=gNoon(new Date());d.setMonth(d.getMonth()+months);return dkey(d)}
function gMon(){const d=gNoon(new Date());d.setDate(d.getDate()-((d.getDay()+6)%7));d.setHours(0,0,0,0);return d.getTime()}
function gShort(k){const d=typeof k==='string'?gDate(k):new Date(k);if(!d||isNaN(d))return '';const y=d.getFullYear()!==new Date().getFullYear();
  return d.toLocaleDateString(undefined,y?{month:'short',day:'numeric',year:'numeric'}:{month:'short',day:'numeric'})}
function gLong(k){const d=gDate(k);if(!d)return '';const y=d.getFullYear()!==new Date().getFullYear();return d.toLocaleDateString(undefined,y?{month:'long',day:'numeric',year:'numeric'}:{month:'long',day:'numeric'})}
function gDaysLeft(g){const d=gDate(g.due);return d?Math.round((d-gNoon(new Date()))/864e5):null}
function gLeft(g,short){const n=gDaysLeft(g);if(n===null)return '';if(n<0)return short?'Past due':`${-n} ${n===-1?'day':'days'} past due`;if(n===0)return 'Due today';return `${n} ${n===1?'day':'days'}${short?'':' left'}`}
function gProg(g){const of=g.ms.length,n=g.ms.filter(m=>m.done).length;return {n,of,p:g.done?1:of?n/of:0}}
/* pace: progress against the time that has passed since the goal was set */
function gPace(g){
  if(g.done)return {k:'won',t:'Achieved'};
  const {n,of,p}=gProg(g);if(!of)return {k:'none',t:'Not started'};
  if(n>=of)return {k:'ahead',t:'Summit reached'};
  const left=gDaysLeft(g);if(left!==null&&left<0)return {k:'behind',t:'Past due'};
  const s=gNoon(g.created||Date.now()),e=gDate(g.due);if(!e||e<=s)return {k:'ok',t:'On track'};
  const el=Math.min(1,Math.max(0,(gNoon(new Date())-s)/(e-s)));
  if(p>=el+.15&&p>0)return {k:'ahead',t:'Ahead'};
  if(p>=el-.15||el<.12)return {k:'ok',t:'On track'};
  return {k:'behind',t:'A bit behind'};
}
const gName=g=>`${g.e?esc(g.e)+' ':''}${esc(g.name)}`;
function gTasks(g){return S.tasks.filter(t=>t.goal!=null&&String(t.goal)===String(g.id)&&!t.inbox&&!t.archived)}
function gMoved(g){const m=gMon();return gTasks(g).filter(t=>t.stage==='done'&&(t.doneAt||0)>=m)}
function gNext(g){return g.ms.find(m=>!m.done)||null}
/* a milestone's tasks: the ones linked to it (t.ms), plus the older one-task link (m.task) */
function gMsTasks(m){if(!m)return [];return S.tasks.filter(t=>!t.archived&&!t.inbox&&(String(t.ms)===String(m.id)||(m.task!=null&&t.id===m.task)))}
const gMsOf=(g,t)=>g.ms.find(m=>String(t.ms)===String(m.id)||(m.task!=null&&t.id===m.task))||null;
/* the goal's tasks that sit in no milestone */
function gLoose(g){return gTasks(g).filter(t=>!gMsOf(g,t))}
/* everything under a milestone, oldest first: its own items (only in the goal) and tasks added to a list.
   Each kid: {k:key, kind:'i'|'t', it|t, m, title, done, subs} — keys look like 'i<msId>.<itemId>' or 't<taskId>' */
function gKids(m){if(!m)return [];
  const its=(m.items||[]).map(it=>({k:'i'+m.id+'.'+it.id,kind:'i',it,m,id:+it.id||0,title:it.t,done:!!it.done,subs:it.subs||[]}));
  const ts=gMsTasks(m).map(t=>({k:'t'+t.id,kind:'t',t,m,id:+t.id||0,title:t.title,done:t.stage==='done',subs:t.subs||[]}));
  return [...its,...ts].sort((a,b)=>a.id-b.id)}
function gKid(g,k){if(!k)return null;
  if(k[0]==='t'){const t=S.tasks.find(x=>String(x.id)===k.slice(1));if(!t)return null;const m=gMsOf(g,t);return {k,kind:'t',t,m,id:t.id,title:t.title,done:t.stage==='done',subs:t.subs||[]}}
  const [mid,iid]=k.slice(1).split('.'),m=g.ms.find(x=>x.id===mid),it=m&&(m.items||[]).find(x=>String(x.id)===iid);
  return it?{k,kind:'i',it,m,id:it.id,title:it.t,done:!!it.done,subs:it.subs||[]}:null}
/* a milestone follows its kids: all done → done; one reopened → reopened */
function gMsSync(m){const ks=gKids(m);if(!ks.length)return;const all=ks.every(x=>x.done);
  if(all&&!m.done){m.done=true;m.doneAt=Date.now()}else if(!all&&m.done){m.done=false;delete m.doneAt}}
function gSubLine(gs){
  if(!gs.length)return 'No goals yet';
  const near=gs.map(gDaysLeft).filter(n=>n!==null&&n>=0).sort((a,b)=>a-b)[0];
  return `<b>${gs.length}</b> in progress${near!==undefined?` · next one due in <b>${near}</b> ${near===1?'day':'days'}`:''}`}

/* ---------- the climb: milestones as a trail up a hill, the sun rising behind the summit ---------- */
let gUid=0;
function gClimb(g,cls){
  const N=Math.max(1,g.ms.length),pr=gProg(g),top=g.done||(g.ms.length>0&&pr.n>=g.ms.length),id='gcl'+(++gUid);
  const P=[];for(let i=0;i<=N+1;i++){const f=i/(N+1);P.push([22+204*f,166-126*f])}
  const amp=Math.min(9,126/(N+1)*.3),pts=[];
  P.forEach((p,i)=>{pts.push(p);if(i<=N){const q=P[i+1],L=(a,o)=>[p[0]+(q[0]-p[0])*a,p[1]+(q[1]-p[1])*a+o];pts.push(L(.42,-amp*.4),L(.64,amp))}});
  const seg=k=>pts.slice(0,k*3+1).map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const cur=top?N+1:pr.n,d=seg(N+1),dn=seg(cur),me=P[cur];
  const sun=80-50*(top?1:pr.p);
  return `<svg class="g-climb${cls?' '+cls:''}${top?' top':''}" viewBox="0 -12 280 198" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g-m1,var(--surface2))"/><stop offset="1" style="stop-color:var(--g-m2,var(--surface))"/></linearGradient></defs>
    <g class="g-sun" style="--sy:${(sun-30).toFixed(1)}px"><circle class="g-disc" cx="246" cy="30" r="19"/><path class="g-rays" d="M246 2v-7M222 11l-5-5M270 11l5-5"/></g>
    <path class="g-mtn" fill="url(#${id})" d="${d}L446 187L-400 187L-400 166Z"/>
    <path class="g-rt0" d="${d}"/>${cur?`<path class="g-rt1" pathLength="1" d="${dn}"/>`:''}
    ${g.ms.map((m,i)=>`<circle class="g-ms${m.done?' on':''}" cx="${P[i+1][0].toFixed(1)}" cy="${P[i+1][1].toFixed(1)}" r="4.5"><title>${esc(m.t)}</title></circle>`).join('')}
    <circle class="g-meh" cx="${me[0].toFixed(1)}" cy="${me[1].toFixed(1)}" r="13"/><circle class="g-me" cx="${me[0].toFixed(1)}" cy="${me[1].toFixed(1)}" r="7"/>
    <path class="g-flag" d="M226 40V21"/><path class="g-flagf" d="M226 21l12 4.5-12 4.5z"/></svg>`;
}

/* ---------- pieces shared by Home and the Goals page ---------- */
function nsCard(){
  if(!goalsOn()||C().wStar===false)return '';const g=gStarred();if(!g)return '';
  const pr=gProg(g),left=gLeft(g,true);
  return `<button class="ns-card" data-gopen="${g.id}" aria-label="North star: ${esc(g.name)}"><span class="ns-i">${G_STAR}</span><span class="ns-t">
    <span class="ns-top"><b>${gName(g)}</b><small>${pr.of?`${pr.n} of ${pr.of}`:'No milestones yet'}${left?` · ${left}`:''}</small></span><span class="ns-bar"><i style="width:${Math.round(pr.p*100)}%"></i></span></span></button>`}
function gCard(g,wide){const pr=gProg(g),pc=gPace(g);
  return `<div class="g-cw"><button class="g-card${g.star?' is-star':''}" data-gopen="${g.id}">${wide?`<span class="g-cmini">${gClimb(g,'mini')}</span>`:''}
    <span class="g-ctop"><span class="g-ce">${g.e?esc(g.e):G_FLAG}</span><span class="g-tx"><b>${esc(g.name)}</b><small>${g.due?`By ${gShort(g.due)} · ${gLeft(g)}`:'No date set'}</small></span>${g.star?`<span class="g-cstar" title="North star">${G_STAR}</span>`:''}</span>
    <span class="ns-bar"><i style="width:${Math.round(pr.p*100)}%"></i></span>
    <span class="g-cmeta"><span>${pr.of?`${pr.n} of ${pr.of} milestones`:'No milestones yet'}</span><span class="pc pc-${pc.k}">${pc.t}</span></span></button>${MORE(`data-gcm="${g.id}"`,`Options for ${esc(g.name)}`)}</div>`}
function gWonList(ws){return ws.length?`<div class="g-won"><span class="eye">Achieved</span>${ws.slice(0,6).map(g=>`<div class="g-tr2"><button class="g-wrow" data-gopen="${g.id}"><span class="g-wi">🏆</span><span class="g-tx"><b>${gName(g)}</b><small>${gShort(g.doneAt)}</small></span>${CHEV}</button>${MORE(`data-gcm="${g.id}"`,`Options for ${esc(g.name)}`)}</div>`).join('')}</div>`:''}
function goalsBlock(gs,sp,wide){
  const add=gAll().length<G_MAX?`<button class="hb-add" data-gnew="${sp||''}">${PLUS_S}New goal</button>`:`<p class="hb-note">${G_MAX} goals at once is the most. Finish one to start another.</p>`;
  if(!gs.length&&!sp)return `<div class="ib-empty rh-empty g-empty"><span class="g-emi">${gClimb({ms:[{done:1},{},{}],due:'',done:false},'mini')}</span><b>No goals yet</b><span>Pick one big outcome. Break it into milestones and climb, one step at a time.</span><button class="primary" data-gnew="">Set a goal</button></div>${gWonList(gWon())}`;
  if(wide)return `<div class="g-grid wide">${gs.map(g=>gCard(g,true)).join('')}${gAll().length<G_MAX?`<button class="g-addc" data-gnew="${sp||''}"><span>${PLUS_S}</span>New goal</button>`:''}</div>${gAll().length<G_MAX?'':add}${gWonList(gWon(sp||null))}`;
  return `<div class="g-grid">${gs.map(g=>gCard(g,false)).join('')}</div>${add}${gWonList(gWon(sp||null))}`}
/* the small star on task rows; the ★ Goal pill and picker in a task's details */
function goalStar(t){if(t.goal==null||!goalsOn())return '';const g=gById(t.goal);if(!g||g.done)return '';return `<span class="mi g-st" title="Moves: ${esc(g.name)}" aria-label="Linked to goal ${esc(g.name)}">${G_STAR}</span>`}
function goalPill(t,P){if(!goalsOn())return '';const g=t.goal!=null?gById(t.goal):null;if(!g&&!gAll().length)return '';
  return P('goal',`<span class="g-pst">${G_STAR}</span>${g?esc(g.name):'Goal'}`,!g)}
function goalPicks(t,pk){return pk(t.goal==null||!gById(t.goal),'','None')+gAll().map(g=>pk(String(t.goal)===String(g.id),g.id,`${g.e?g.e+' ':''}${g.name}`)).join('')}

/* ---------- Goals page: all goals in one place, like Inbox ---------- */
var glOn=false;
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg gl-pg" id="goalsPg" role="region" aria-label="Goals"><div class="ib-in" id="glIn"></div></div>');
function openGoals(){
  if(!goalsOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(typeof closeSearch==='function')closeSearch();
  glOn=true;drawGoals();$('goalsPg').classList.add('on');$('goalsPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
}
function closeGoals(){if(!glOn)return;glOn=false;$('goalsPg').classList.remove('on');const a=document.activeElement;if(a&&a.closest&&a.closest('#goalsPg'))a.blur();if(typeof renderDesk==='function')renderDesk()}
function drawGoals(){const y=$('goalsPg').scrollTop,gs=gAll();
  $('glIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="glBack" aria-label="Back">${BACK_SVG}</button></div>
    <div class="hb-head"><span class="eye">${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</span><h1 class="hb-h">Goals</h1>${gs.length?`<div class="hb-sub">${gSubLine(gs)}</div>`:''}</div>
    ${goalsBlock(gs,'',matchMedia('(min-width:1100px)').matches)}`;
  $('goalsPg').scrollTop=y}
$('goalsPg').addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('.sheet.on')&&!gdOn){e.stopPropagation();closeGoals()}});

/* ---------- goal page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg gd-pg" id="gdPg" role="region" aria-label="Goal"><div class="ib-in" id="gdIn"></div></div>');
function openGoal(id){
  if(!goalsOn()||!gById(id))return;
  if(typeof closeSearch==='function')closeSearch();
  gdId=id;gSelId=null;gAddMs=false;gSubOpen.clear();gdOn=true;gdAnim=true;drawGoal();gdAnim=false;
  $('gdPg').classList.add('on');$('gdPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();
}
function closeGoal(){
  if(!gdOn)return;gdOn=false;if(gmeOn)closeMsEdit();$('gdPg').classList.remove('on');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#gdPg'))a.blur();
  if(typeof renderDesk==='function')renderDesk();
}
/* ---------- actions ---------- */
/* marking a milestone done finishes its open tasks; reopening it leaves them as they are */
function gMsToggle(g,m){
  const on=!m.done,pr=gProg(g),all=on&&pr.n+1>=pr.of;
  commit(()=>{m.done=on;if(on){m.doneAt=Date.now();(m.items||[]).forEach(it=>{if(!it.done){it.done=true;it.doneAt=Date.now()}});gMsTasks(m).forEach(t=>{if(t.stage!=='done')setStage(t,'done')})}else delete m.doneAt},
    on?(all?'Summit reached. Every milestone is done.':`Milestone done · ${pr.n+1} of ${pr.of}`):'Milestone reopened');
  if(on)haptic([8,30,12]);
}
/* a new task for a milestone lands in My week, in the goal's space */
/* a new task for a milestone lives in the goal itself: no space, list or stage needed */
function gMsAddItem(g,m,title){commit(()=>{m.items=m.items||[];m.items.push({id:newId(),t:title,done:false,subs:[]});if(m.done){m.done=false;delete m.doneAt}},'Task added');try{sfx('add')}catch(e){}return true}
/* optional: put a milestone's task into a list (My week if it has room, else Later), or bring a list task back into the goal */
function gItemToList(g,m,it,l){const st=it.done?'done':stageRoom(l.id,'week')?'week':stageRoom(l.id,'backlog')?'backlog':null;
  if(!st){toast(`${l.name} is full in My week and Later (${STAGE_MAX} each). Pick another list.`);haptic([10,40,10]);return}
  commit(()=>{addTask({id:newId(),title:it.t,stage:st,list:l.id,est:S.cfg.defEst||30,subs:(it.subs||[]).map(s=>({...s})),notes:'',repeat:'none',goal:g.id,ms:m.id,...(it.done?{doneAt:it.doneAt||Date.now()}:{})});
    m.items=(m.items||[]).filter(x=>x!==it)},`Added to ${l.name} · ${STAGES[idx(st)].name}`)}
function gTaskToGoal(g,m,t){commit(()=>{m.items=m.items||[];m.items.push({id:newId(),t:t.title,done:t.stage==='done',...(t.stage==='done'?{doneAt:t.doneAt||Date.now()}:{}),subs:(t.subs||[]).map(s=>({...s}))});
    S.tasks=S.tasks.filter(x=>x!==t);g.ms.forEach(x=>{if(x.task===t.id)delete x.task})},'Now only in this goal · taken out of its list')}
/* tick a task from the milestone card; un-ticking puts it back in My week */
function gTaskToggle(id){const t=S.tasks.find(x=>x.id===id);if(!t)return;const on=t.stage!=='done',back=stageRoom(t.list,'week')?'week':'backlog';
  commit(()=>setStage(t,on?'done':back),on?'Task done':`Task back in ${STAGES[idx(back)].name}`);if(on)haptic([8,30,12])}
/* deleting a milestone keeps its tasks; they move to Other tasks */
function gMsDelete(g,ms){const n=gMsTasks(ms).length;commit(()=>{g.ms=g.ms.filter(x=>x!==ms);S.tasks.forEach(t=>{if(String(t.ms)===String(ms.id))delete t.ms})},n?'Milestone removed · its list tasks stay':'Milestone removed')}
function gMsAdd(g){
  const i=$('gMsIn'),v=(i&&i.value||'').trim();if(!v)return;
  if(g.ms.length>=MS_MAX){toast(`Up to ${MS_MAX} milestones. Keep them big.`);return}
  g.ms.push({id:'m'+newId(),t:v,done:false});save();try{sfx('add')}catch(e){}haptic(8);render();drawGoal();
  const n=$('gMsIn');if(n)n.focus();
}
function gSetWin(g,on){
  if(!on&&gAll().length>=G_MAX){toast(`${G_MAX} goals are already in progress. Finish one first.`);return}
  commit(()=>{if(on){g.done=true;g.doneAt=Date.now();g.star=false}else{g.done=false;delete g.doneAt}},on?`🏆 ${g.name}: achieved`:'Back in progress');
  if(on){haptic([10,40,10,40,20]);try{sfx('done')}catch(e){}}
}
function gToggleStar(g){const on=!g.star;commit(()=>{gList().forEach(x=>{if(x.star)x.star=false});g.star=on},on?'Now your north star. It sits on Home.':'North star removed')}
function gDelete(g){
  confirmAsk({title:`Delete ${g.name}?`,text:'Its milestones go too. Linked tasks stay, without the star.',yes:'Yes, delete',no:'No',
    onYes:()=>{const inSet=settingsOpen();closeSheets();if(gdId===g.id)closeGoal();
      commit(()=>{S.goals=gList().filter(x=>x!==g);S.tasks.forEach(t=>{if(t.goal!=null&&String(t.goal)===String(g.id)){delete t.goal;delete t.ms}})},`${g.name} deleted`);if(inSet)drawSettings()}});
}
$('gdPg').addEventListener('click',e=>{
  const g=gById(gdId);if(!g)return;
  const pop=$('gdPop');if(pop&&!e.target.closest('#gdPop,#gdMore'))pop.classList.remove('on');
  if(e.target.closest('#gdBack'))return closeGoal();
  if(e.target.closest('#gdMore')){e.stopPropagation();const was=pop.classList.contains('on');document.querySelectorAll('.sp-pop.on').forEach(x=>x.classList.remove('on'));if(!was){haptic(5);pop.classList.add('on')}return}
  const m=e.target.closest('[data-gm]');if(m){pop.classList.remove('on');const a=m.dataset.gm;
    if(a==='edit')return openGoalSheet(g.id);if(a==='star')return gToggleStar(g);if(a==='win')return gSetWin(g,!g.done);if(a==='del')return gDelete(g);return}
  const v=e.target.closest('[data-gview]');if(v){if((g.view||C().gView)!==v.dataset.gview){g.view=v.dataset.gview;haptic(5);save();gdAnim=true;drawGoal();gdAnim=false}return}
  if(e.target.closest('[data-gwhy]')){openGoalSheet(g.id,true);return}
  const tk=e.target.closest('[data-gtask]');if(tk){haptic(5);return openDetail(+tk.dataset.gtask)}
  if(e.target.closest('[data-gwin]'))return gSetWin(g,true);
  if(e.target.closest('[data-gedit]')){pop.classList.remove('on');return openMsEdit()}
});
$('gdPg').addEventListener('keydown',e=>{
  const g=gById(gdId);
  if(e.key==='Enter'&&g){
    if(e.target.id==='gMsIn'){e.preventDefault();return gMsAdd(g)}
    if(e.target.id==='gMtIn'){e.preventDefault();const v=e.target.value.trim(),m=g.ms.find(x=>x.id===e.target.dataset.gms);if(!v||!m)return;
      if(gMsAddItem(g,m,v)){drawGoal();const n=$('gMtIn');if(n)n.focus();const ts=$('gdIn').querySelector('.gm-ts');if(ts){ts.scrollTop=ts.scrollHeight;vFade(ts)}}return} // show the new task at the bottom
  }
  if(e.key==='Escape'){
    if(document.querySelector('.sheet.on')||$('dlg').classList.contains('on'))return;
    const pop=$('gdPop');if(pop&&pop.classList.contains('on')){pop.classList.remove('on');e.stopPropagation();return}
    if(e.target.matches('input')&&e.target.value&&(e.target.id==='gMsIn'||e.target.id==='gMtIn')){e.target.value='';return}
    if(e.target.id==='gMsIn'&&gAddMs){gAddMs=false;e.stopPropagation();drawGoal();return}
    e.stopPropagation();closeGoal();
  }
});

/* ---------- 30-second setup: what → by when → first milestones ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg review-pg gs-pg" id="gsPg" role="dialog" aria-label="New goal"><div class="ib-in" id="gsIn"></div></div>');
let gsD=null;
function openSetup(sp){
  if(!goalsOn())return;
  if(gAll().length>=G_MAX){toast(`Up to ${G_MAX} goals at once. Finish one to start another.`);return}
  const sps=orderedSpaces();
  gsD={step:1,name:'',e:'',touched:false,space:sp&&spaceOf(sp)?sp:null,why:'',pick:3,due:gPlus(3),ms:[],star:!gStarred()};
  gsOn=true;drawSetup();$('gsPg').classList.add('on');$('gsPg').scrollTop=0;haptic(6);
  setTimeout(()=>{if(gsOn&&$('gsName'))$('gsName').focus()},330);
}
function closeSetup(){if(!gsOn)return;gsOn=false;$('gsPg').classList.remove('on');const a=document.activeElement;if(a&&a.closest&&a.closest('#gsPg'))a.blur()}
function gsDays(){const d=gDate(gsD.due);return d?Math.max(1,Math.round((d-gNoon(new Date()))/864e5)):0}
function drawSetup(){
  const d=gsD,st=d.step,days=gsDays(),wk=Math.max(1,Math.round(days/7));
  let body='';
  if(st===1)body=`<span class="rv-eye gs-eye">New goal</span><h1 class="gs-q">What do you want to achieve?</h1>
    <div class="gs-name"><span class="gs-e" id="gsE">${d.e?esc(d.e):G_FLAG}</span><input id="gsName" value="${esc(d.name)}" placeholder="Run a half marathon" maxlength="60" autocomplete="off" enterkeyhint="next" aria-label="Goal"></div>
    ${S.spaces.length?`<div class="gs-lbl">Space <span>Optional</span></div><div class="gs-chips"><button class="gs-chip${!d.space?' on':''}" data-gssp="">No space</button>${orderedSpaces().map(x=>`<button class="gs-chip${d.space===x.id?' on':''}" data-gssp="${x.id}">${spMini(x)}${esc(x.name)}</button>`).join('')}</div>`:''}
    <div class="gs-lbl">Why does it matter? <span>Optional</span></div><textarea id="gsWhy" rows="2" maxlength="160" placeholder="So I feel strong and proud of myself" aria-label="Why it matters">${esc(d.why)}</textarea>`;
  if(st===2){const tm=new Date();tm.setDate(tm.getDate()+1);
    body=`<span class="rv-eye gs-eye">${d.e?esc(d.e)+' ':''}${esc(d.name)}</span><h1 class="gs-q">By when?</h1>
    <div class="gs-opts">${[1,3,6,12].map(m=>`<button class="${d.pick===m?'on':''}" data-gsm="${m}">${m===12?'In 1 year':`In ${m} ${m===1?'month':'months'}`}<small>${gShort(gPlus(m))}</small></button>`).join('')}
      <label class="gs-date${d.pick==='date'?' on':''}"><span>Pick a date</span><input type="date" id="gsDate" min="${dkey(tm)}" value="${d.pick==='date'?d.due:''}" aria-label="Pick a date"></label></div>
    <p class="gs-hint">${days?`About <b>${wk} ${wk===1?'week':'weeks'}</b> from today. Enough room for a few milestones.`:''}</p>`}
  if(st===3)body=`<span class="rv-eye gs-eye">${d.e?esc(d.e)+' ':''}${esc(d.name)} · by ${gShort(d.due)}</span><h1 class="gs-q">First milestones</h1>
    <p class="gs-hint">${d.ms.length?`That’s about one every <b>${Math.max(1,Math.round(days/d.ms.length))} days</b>.`:'Break it into a few checkpoints. You can add more later.'}</p>
    <div class="gs-ms">${d.ms.map((t,i)=>`<div class="gs-mi"><span class="gs-mn">${i+1}</span><span class="gs-mt">${esc(t)}</span><button data-gsx="${i}" aria-label="Remove ${esc(t)}">${X}</button></div>`).join('')}
      ${d.ms.length<MS_MAX?`<div class="gs-madd"><input id="gsMs" placeholder="${d.ms.length?'Add another':'e.g. Run 5 km without stopping'}" maxlength="80" autocomplete="off" enterkeyhint="done" aria-label="Add a milestone"><button id="gsMsAdd" type="button">Add</button></div>`:''}</div>
    <button class="gs-star" id="gsStar" aria-pressed="${d.star}"><span class="ns-i">${G_STAR}</span><span class="g-tx"><b>Make it my north star</b><small>It sits on Home, under Today</small></span><span class="tg" aria-pressed="${d.star}"></span></button>`;
  $('gsIn').innerHTML=`<div class="set-top gs-top"><button class="icon-btn" id="gsBack" aria-label="${st>1?'Back':'Close'}">${st>1?BACK_SVG:X}</button><span class="gs-n">${st} of 3</span></div>
    <div class="gs-steps">${[1,2,3].map(i=>`<i class="${i<=st?'on':''}"></i>`).join('')}</div><div class="gs-body" data-st="${st}">${body}</div>
    ${st<3?`<button class="primary gs-next" id="gsNext" ${st===1&&!d.name.trim()?'disabled':''}>${st===1?'Next: by when':'Next: first milestones'}</button>`:`<button class="primary gs-next" id="gsGo">Create goal</button>`}`;
}
function gsStep(n){
  const d=gsD;if(n===2&&!d.name.trim()){$('gsName').focus();return}
  if(n===3&&(gDaysLeft({due:d.due})||0)<1){toast('Pick a date after today');return}
  d.step=n;haptic(5);drawSetup();$('gsPg').scrollTop=0;
  setTimeout(()=>{const i=n===1?$('gsName'):n===3?$('gsMs'):null;if(gsOn&&i&&matchMedia('(min-width:700px)').matches)i.focus()},60);
}
function gsAddMs(){const i=$('gsMs'),v=(i&&i.value||'').trim();if(!v||gsD.ms.length>=MS_MAX)return;gsD.ms.push(v);haptic(6);drawSetup();const n=$('gsMs');if(n)n.focus()}
function gsCreate(){
  const d=gsD;if(!d||!d.name.trim())return;
  const pend=($('gsMs')&&$('gsMs').value||'').trim();if(pend&&d.ms.length<MS_MAX)d.ms.push(pend);
  if(gAll().length>=G_MAX){toast(`Up to ${G_MAX} goals at once.`);return}
  const id='g'+newId(),name=d.name.trim(),inSet=settingsOpen();
  commit(()=>{if(d.star)gList().forEach(x=>{if(x.star)x.star=false});
    gList().push({id,name,e:d.e,space:d.space&&spaceOf(d.space)?d.space:null,why:d.why.trim(),due:d.due,created:Date.now(),star:!!d.star,ms:d.ms.map(t=>({id:'m'+newId(),t,done:false}))})},`Goal set: ${name}`);
  try{sfx('add')}catch(e){}haptic([8,30,12]);closeSetup();
  if(inSet)drawSettings();else setTimeout(()=>openGoal(id),140);
}
$('gsPg').addEventListener('click',e=>{
  const d=gsD;if(!d)return;
  if(e.target.closest('#gsBack')){if(d.step>1)gsStep(d.step-1);else closeSetup();return}
  if(e.target.closest('#gsNext'))return gsStep(d.step+1);
  if(e.target.closest('#gsGo'))return gsCreate();
  const sp=e.target.closest('[data-gssp]');if(sp){d.space=sp.dataset.gssp||null;haptic(5);$('gsPg').querySelectorAll('[data-gssp]').forEach(b=>b.classList.toggle('on',b===sp));return}
  const m=e.target.closest('[data-gsm]');if(m){d.pick=+m.dataset.gsm;d.due=gPlus(d.pick);haptic(5);return drawSetup()}
  if(e.target.closest('#gsStar')){d.star=!d.star;haptic(5);return drawSetup()}
  const x=e.target.closest('[data-gsx]');if(x){d.ms.splice(+x.dataset.gsx,1);haptic(5);return drawSetup()}
  if(e.target.closest('#gsMsAdd'))return gsAddMs();
  if(e.target.closest('#gsE')&&d.step===1){const i=G_ICONS.indexOf(d.e);d.e=G_ICONS[(i+1)%G_ICONS.length];d.touched=true;$('gsE').textContent=d.e;haptic(4)}
});
$('gsPg').addEventListener('input',e=>{const d=gsD;if(!d)return;
  if(e.target.id==='gsName'){d.name=e.target.value;if(!d.touched){d.e=gIcon(d.name);$('gsE').innerHTML=d.e?esc(d.e):G_FLAG}$('gsNext').disabled=!d.name.trim()}
  if(e.target.id==='gsWhy')d.why=e.target.value;
});
$('gsPg').addEventListener('change',e=>{if(e.target.id==='gsDate'&&e.target.value){gsD.pick='date';gsD.due=e.target.value;drawSetup()}});
$('gsPg').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();closeSetup();return}
  if(e.key!=='Enter')return;
  if(e.target.id==='gsName'){e.preventDefault();gsStep(2)}
  else if(e.target.id==='gsMs'){e.preventDefault();if(e.target.value.trim())gsAddMs();else if(gsD.ms.length)gsCreate()}
});

/* ---------- edit sheet ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="gSheet"><div class="sheet-in">
  <div class="grab"></div><h2>Edit goal</h2>
  <div class="sp-form"><span class="sp-prev hb-prev g-prev" id="gPrev" role="button" aria-label="Choose an icon"></span><input class="field sp-name-in" id="gName" placeholder="Goal" maxlength="60" autocomplete="off" enterkeyhint="done"></div>
  <div class="lbl">Why it matters</div><textarea class="field g-whyin" id="gWhy" rows="2" maxlength="160" placeholder="Optional"></textarea>
  <div class="le-card sp-opts" id="gOpts"></div>
  <button class="primary" id="gSave">Save</button>
  <div class="le-acts"><button class="le-btn" id="gWinB" type="button">Mark achieved</button><button class="le-btn warn" id="gDelB" type="button">Delete goal</button></div>
</div></div>`);
let gDraft=null,gSub=null;
function openGoalSheet(id,why){const g=gById(id);if(!g)return;
  gDraft={id:g.id,name:g.name,e:g.e||'',space:g.space,due:g.due||gPlus(3),why:g.why||''};gSub=null;
  $('gName').value=g.name;$('gWhy').value=g.why||'';$('gWinB').textContent=g.done?'Back in progress':'Mark achieved';
  drawGoalSheet();openSheet('gSheet');if(why)setTimeout(()=>{if($('gSheet').classList.contains('on'))$('gWhy').focus()},300)}
function drawGoalSheet(){
  const d=gDraft,sp=spaceOf(d.space)||{},tm=new Date();tm.setDate(tm.getDate()+1);
  $('gSave').disabled=!d.name.trim();$('gPrev').innerHTML=d.e?esc(d.e):G_FLAG;
  $('gOpts').innerHTML=
    lxRow('i','Icon',`<span class="lx-ico">${d.e?esc(d.e):'None'}</span>`,`<div class="ico-grid"><button data-gico="" class="ico-none ${!d.e?'on':''}" aria-label="No icon">–</button>${G_ICONS.map(i=>`<button data-gico="${i}" class="${d.e===i?'on':''}" aria-label="Icon ${i}">${i}</button>`).join('')}</div>`,gSub==='i')+
    lxRow('d','By when',`<span class="lx-t">${gShort(d.due)}</span>`,`<div class="hb-pre g-pre">${[1,3,6,12].map(m=>`<button data-gdm="${m}">${m===12?'1 year':`${m} ${m===1?'month':'months'}`}</button>`).join('')}</div><input type="date" class="g-date" id="gDue" value="${d.due}" min="${dkey(tm)}" aria-label="Due date">`,gSub==='d')+
    (S.spaces.length?lxRow('s','Space',d.space&&sp.id?`${spMini(sp)}<span class="lx-t">${esc(sp.name||'')}</span>`:'<span class="lx-t">No space</span>',`<div class="lx-list"><button class="lx-opt${!d.space?' on':''}" data-gsp=""><span>No space</span>${!d.space?tick():''}</button>${orderedSpaces().map(x=>`<button class="lx-opt${d.space===x.id?' on':''}" data-gsp="${x.id}">${spMini(x)}<span>${esc(x.name)}</span>${d.space===x.id?tick():''}</button>`).join('')}</div>`,gSub==='s'):'');
}
$('gOpts').addEventListener('click',e=>{
  const t=e.target.closest('[data-lxt]');if(t){lxToggle(t,v=>gSub=v);return}
  const d=gDraft;if(!d)return;
  const ic=e.target.closest('[data-gico]');if(ic){d.e=ic.dataset.gico;haptic(5);return drawGoalSheet()}
  const dm=e.target.closest('[data-gdm]');if(dm){d.due=gPlus(+dm.dataset.gdm);haptic(5);return drawGoalSheet()}
  const sp=e.target.closest('[data-gsp]');if(sp){d.space=sp.dataset.gsp||null;haptic(5);return drawGoalSheet()}
});
$('gOpts').addEventListener('change',e=>{if(e.target.id==='gDue'&&e.target.value){gDraft.due=e.target.value;drawGoalSheet()}});
$('gPrev').onclick=()=>{const t=$('gOpts').querySelector('[data-lxt="i"]');if(t&&gSub!=='i')lxToggle(t,v=>gSub=v)};
$('gName').oninput=e=>{gDraft.name=e.target.value;$('gSave').disabled=!gDraft.name.trim()};
$('gName').onkeydown=e=>{if(e.key==='Enter'&&gDraft.name.trim())$('gSave').click()};
$('gWhy').oninput=e=>{gDraft.why=e.target.value};
$('gSave').onclick=()=>{const d=gDraft,g=d&&gById(d.id);if(!g||!d.name.trim())return;const inSet=settingsOpen();closeSheets();
  commit(()=>Object.assign(g,{name:d.name.trim(),e:d.e,space:d.space&&spaceOf(d.space)?d.space:null,due:d.due,why:d.why.trim()}),'Goal saved');if(inSet)drawSettings()};
$('gWinB').onclick=()=>{const g=gDraft&&gById(gDraft.id);if(!g)return;const inSet=settingsOpen();closeSheets();setTimeout(()=>{gSetWin(g,!g.done);if(inSet)drawSettings()},200)};
$('gDelB').onclick=()=>{const g=gDraft&&gById(gDraft.id);if(g)gDelete(g)};

/* ---------- Settings → Modes → Your goals ---------- */
function goalsSetPage(){
  const gs=gAll(),won=gWon();
  const r=g=>`<button class="link-row" data-ge="${g.id}"><span class="hs-n">${gName(g)}</span><span class="hint">${g.done?`Achieved ${gShort(g.doneAt)}`:`By ${gShort(g.due)}`}${g.star&&!g.done?' · North star':''}${CHEV}</span></button>`;
  return `<p class="sub-p">Up to ${G_MAX} goals at once, so each one gets real attention. Tap one to change it.</p>
    ${gs.length?`<div class="set-sec"><h3>In progress</h3>${gs.map(r).join('')}</div>`:'<p class="sub-p hs-none">No goals yet.</p>'}
    ${won.length?`<div class="set-sec"><h3>Achieved</h3>${won.map(r).join('')}</div>`:''}
    ${gs.length<G_MAX?`<button class="primary hs-new" data-gnew="">New goal</button>`:''}`;
}

/* ---------- taps from anywhere (capture, so a goal inside a card never also opens the card) ---------- */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-gopen],[data-gnew],[data-gadd],[data-ge],#glEntry,#glBack');if(!el)return;
  if(el.closest('#gdPg')&&!el.matches('[data-gopen]'))return;
  e.stopPropagation();e.preventDefault();
  if(el.matches('[data-gopen]'))return openGoal(el.dataset.gopen);
  if(el.matches('[data-gnew]'))return openSetup(el.dataset.gnew||null);
  if(el.matches('[data-gadd]')){closePops();return openSetup(el.dataset.gadd)}
  if(el.matches('[data-ge]'))return openGoalSheet(el.dataset.ge);
  if(el.matches('#glEntry'))return openGoals();
  if(el.matches('#glBack'))return closeGoals();
},true);

/* finishing a task that came from a milestone ticks the milestone (and un-finishing it reopens it) */
const _gSetStage=setStage;
setStage=function(t,stage){const was=t.stage;_gSetStage(t,stage);
  try{if(was!==stage&&(stage==='done'||was==='done'))gList().forEach(g=>{const m=gMsOf(g,t);if(m)gMsSync(m)})}catch(err){}};
/* keep the goal page in step with edits, undo and sync, without stealing focus while typing */
const _gRender=render;
render=function(d){_gRender(d);try{
  if(gsOn&&!goalsOn())closeSetup();
  if(gdOn&&(!goalsOn()||!gById(gdId)))closeGoal();
  if(gdOn){const a=document.activeElement;if(!(a&&a.closest&&a.closest('#gdPg')&&a.matches('input,textarea')))drawGoal()}
  if(glOn&&!goalsOn())closeGoals();if(glOn)drawGoals();
}catch(err){console.error(err)}};
