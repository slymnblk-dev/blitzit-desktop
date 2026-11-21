/* ---------- Funnel (optional Beta mode, Settings → Modes) ----------
   Move work through steps, one at a time. The idea comes from Leadsomo; the look is Windaday's.
   Data: the funnel lives in a normal space, and each step is one of that space's lists, so every
   funnel task is an ordinary task (focus, repeat, reminders, search, sync and undo just work).
   S.cfg.fn = {space, steps:[{list, target (0 = none), open (always open)}], unl:{d:'YYYY-MM-DD', lists:[…]},
                daily:{list,n} | null, weekly:{list,n} | null (optional targets), won:'YYYY-MM-DD' (funnel done → a Win, once a day)}
   S.cfg.funnel = mode on/off · S.cfg.fnFree = no locks · S.cfg.fnView = 'funnel' (default) or 'focus' · S.cfg.fnHome = a Now card on Home. A task can count for more than one: t.amt (default 1).
   A step today = what you finished today ÷ its target (no target: ÷ everything planned in it today).
   The next step opens when the one before is half way, when it is set to "always open", or when you open it anyway. */
var fnOn=false,fnSel=null,fnShowDone=false,fnEdit=false,fnAsk=null,fnView='funnel',fnFlash=null,fnNote=null,fnNoteT=0,fnDay=null;
const FN_BACK_DAYS=30;
const FN_MIN=3,FN_MAX=8;
function funnelOn(){return !!(S.cfg&&S.cfg.funnel)}
var FN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>';
const FN_LOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const FN_TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const FN_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const FN_GEAR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
/* ready-made funnels for the first visit (Sales comes from Leadsomo: targets and weekday tasks) */
const FN_TPL=[
  {k:'sales',name:'Sales outreach',e:'🎯',steps:[['Prospects',2],['Outreach',4],['Replies',3],['Conversations',3],['Asks',2],['Demos',1],['Learning',1]],
    tasks:[[0,'Research ICP accounts'],[0,'Find decision makers'],[1,'Cold emails'],[1,'LinkedIn messages'],[1,'Follow-up emails'],[1,'Call warm leads'],
      [2,'Answer new replies'],[2,'Move hot replies forward'],[2,'Close stale threads'],[3,'Discovery call'],[3,'Follow-up call'],[3,'Intro call'],
      [4,'Ask for the next meeting'],[4,'Propose a pilot'],[5,'Run a demo'],[6,'Write one learning note']]},
  {k:'content',name:'Content',e:'✍️',steps:[['Ideas'],['Drafts'],['Edited'],['Published'],['Shared']]},
  {k:'jobs',name:'Job search',e:'💼',steps:[['Find'],['Apply'],['Follow up'],['Interview'],['Offer']]},
  {k:'empty',name:'Start empty',e:'',steps:[['Step 1'],['Step 2'],['Step 3']]}];

/* ---------- reading the funnel ---------- */
const fnCfg=()=>(S.cfg&&S.cfg.fn)||null;
const fnSpace=()=>{const c=fnCfg();return c&&(S.spaces||[]).find(s=>s.id===c.space)||null};
/* steps whose list still exists (a list deleted or archived elsewhere simply drops out) */
const fnSteps=()=>{const c=fnCfg();if(!c||!Array.isArray(c.steps))return [];return c.steps.filter(s=>S.lists.some(l=>l.id===s.list))};
const fnReady=()=>!!fnSpace()&&fnSteps().length>0;
const fnAmt=t=>Math.max(1,Math.round(+t.amt)||1);
/* the day you are looking at: today, or a past day (read only) */
const fnKey=()=>fnDay||today();
const fnPast=()=>!!fnDay&&fnDay<today();
const fnDoneOn=(t,k)=>t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===k;
const fnOpenTasks=list=>fnPast()?[]:S.tasks.filter(t=>t.list===list&&t.stage==='today'&&shown(t));
const fnDoneTasks=list=>S.tasks.filter(t=>t.list===list&&fnDoneOn(t,fnKey())).sort((a,b)=>b.doneAt-a.doneAt);
const fnSum=a=>a.reduce((n,t)=>n+fnAmt(t),0);
function fnStat(st){const c=fnSum(fnDoneTasks(st.list)),open=fnSum(fnOpenTasks(st.list)),goal=+st.target>0?+st.target:c+open;
  return {c,goal,p:goal?Math.min(1,c/goal):0,full:goal>0&&c>=goal}}
const fnUnlToday=()=>{const u=fnCfg()&&fnCfg().unl;return u&&u.d===today()&&Array.isArray(u.lists)?u.lists:[]};
function fnIsOpen(i,steps,stats){const st=steps[i];if(i===0||fnPast()||S.cfg.fnFree||st.open||stats[i].c>0||fnUnlToday().includes(st.list))return true;
  const prev=stats[i-1];return !prev.goal||prev.c>=Math.ceil(prev.goal*.5)}
/* everything the page needs, worked out once per draw */
function fnModel(){const steps=fnSteps(),stats=steps.map(fnStat),open=steps.map((s,i)=>fnIsOpen(i,steps,stats));
  let cur=steps.findIndex((s,i)=>open[i]&&!stats[i].full);if(cur<0)cur=open.lastIndexOf(true);
  let sel=steps.findIndex(s=>s.list===fnSel);if(sel<0||!open[sel])sel=cur;
  const nx=open.indexOf(false),need=nx>0&&stats[nx-1].goal?Math.ceil(stats[nx-1].goal*.5):0;
  return {steps,stats,open,cur,sel,nx,need,left:need?Math.max(1,need-stats[nx-1].c):0}}
const fnLeftToday=()=>fnReady()?fnSteps().reduce((n,s)=>n+S.tasks.filter(t=>t.list===s.list&&t.stage==='today'&&shown(t)).length,0):0;
/* optional targets for the whole funnel: one for the day, one for the week (counts finished tasks in one step) */
function fnWeekStart(k){const d=new Date(k+'T12:00:00'),ws=+C().weekStart===0?0:1;d.setDate(d.getDate()-((d.getDay()-ws+7)%7));return dkey(d)}
function fnTarget(kind){const c=fnCfg(),g=c&&c[kind];if(!g||!(+g.n>0)||!fnSteps().some(s=>s.list===g.list))return null;const k=fnKey();
  const from=kind==='weekly'?fnWeekStart(k):k,inRange=t=>t.list===g.list&&t.stage==='done'&&t.doneAt&&dkey(t.doneAt)>=from&&dkey(t.doneAt)<=k;
  const n=fnSum(S.tasks.filter(inRange));return {kind,list:g.list,n:+g.n,c:n,p:Math.min(1,n/g.n)}}
function fnTargetsHTML(){const ts=['daily','weekly'].map(fnTarget).filter(Boolean);if(!ts.length)return '';
  return `<div class="fn-tgts">${ts.map(t=>`<span class="fn-tgt${t.c>=t.n?' met':''}"><small>${t.kind==='daily'?(fnPast()?'That day':'Today'):(fnPast()?'That week':'This week')}</small><span><b>${t.c}</b>/${t.n} ${esc(listOf(t.list).name.toLowerCase())}</span><i><b style="width:${(t.p*100).toFixed(0)}%"></b></i></span>`).join('')}</div>`}

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg fn-pg" id="funnelPg" role="region" aria-label="Funnel"><div class="ib-in" id="fnIn"></div></div>');
const fnDesk=()=>matchMedia('(min-width:1100px)').matches;
const fnEsc=s=>esc(s).replace(/'/g,'&#39;');
function fnRow(st,i,m){const s=m.stats[i],l=listOf(st.list),open=m.open[i],sel=i===m.sel,next=!open&&i===m.nx;
  const ct=!open?(next&&m.need?`opens at ${m.need}/${m.stats[i-1].goal}`:''):s.full?'done':s.goal?`${s.c} / ${s.goal}`:'';
  return `<button class="fn-row${sel?' sel':''}${open?'':' lock'}${next?' next':''}${s.full?' full':''}${fnFlash===st.list?' flash':''}" data-fnstep="${st.list}" aria-label="${fnEsc(l.name)}, ${open?(s.goal?s.c+' of '+s.goal:'open'):'locked'}"${sel?' aria-current="true"':''}>
    ${open?`<span class="fn-fill" style="width:${(s.p*100).toFixed(1)}%"></span>`:''}<span class="fn-rc"><span class="fn-nm">${esc(l.name)}</span><span class="fn-ct">${ct}</span></span></button>`}
function fnTaskRow(t,now){const a=fnAmt(t),done=t.stage==='done';if(fnPast())return `<div class="fn-task done ro"><span class="fn-tick">${FN_TICK}</span><span class="fn-tt"><b>${esc(t.title)}</b>${a>1?`<i class="fn-amt">×${a}</i>`:''}</span></div>`;
  return `<div class="fn-task${now?' now':''}${done?' done':''}" data-fntask="${t.id}">
    <button class="fn-tick" data-fntick="${t.id}" aria-label="${done?'Mark not done':'Mark done'}: ${fnEsc(t.title)}">${done?FN_TICK:''}</button>
    <button class="fn-tt" data-fnopen="${t.id}"><b>${esc(t.title)}</b>${a>1?`<i class="fn-amt">×${a}</i>`:''}</button>
    ${now?`<button class="fn-go" data-fngo="${t.id}" aria-label="Start focus on ${fnEsc(t.title)}">${FN_PLAY}</button>`:''}
    ${done?'':MORE(`data-fnm="${t.id}"`,'More for this task')}</div>`}
function fnPanel(m){const st=m.steps[m.sel];if(!st)return '';const l=listOf(st.list),s=m.stats[m.sel],open=fnOpenTasks(st.list),done=fnDoneTasks(st.list);
  return `<div class="fn-panel">${fnNoteHTML()}<span class="fn-eye">Step ${m.sel+1} of ${m.steps.length}</span>
    <div class="fn-ph"><b class="fn-pn">${esc(l.name)}</b>${s.goal?`<span class="fn-pc"><b>${s.c}</b>/${s.goal}</span>`:''}</div>
    <div class="fn-bar" aria-hidden="true"><i style="width:${(s.p*100).toFixed(1)}%"></i></div>
    ${fnPast()?`<div class="fn-list">${done.length?done.map(t=>fnTaskRow(t,false)).join(''):'<p class="fn-none">Nothing finished here that day.</p>'}</div></div>`:''}
    ${fnPast()?'':`<div class="fn-list">${open.length?open.map((t,i)=>fnTaskRow(t,i===0)).join(''):`<p class="fn-none">${done.length?'All done here. Nice.':'Nothing planned here today.'}</p>`}</div>`}
    ${fnPast()?'':`${done.length?`<button class="fn-dn" data-fndone aria-expanded="${fnShowDone}">${done.length} done · ${fnShowDone?'Hide':'Show'}</button>${fnShowDone?`<div class="fn-list">${done.map(t=>fnTaskRow(t,false)).join('')}</div>`:''}`:''}
    <label class="fn-add"><span class="wn-pl">${PLUS_S}</span><input id="fnNew" placeholder="Add to ${fnEsc(l.name)}…" maxlength="200" enterkeyhint="done" autocomplete="off" aria-label="Add a task to ${fnEsc(l.name)}"></label>${fnComingHTML(m)}</div>`}`}
/* what opens next, and how far away it is */
function fnComingHTML(m){if(fnPast()||m.nx<1||!m.left)return '';const nx=listOf(m.steps[m.nx].list),pv=listOf(m.steps[m.nx-1].list);
  return `<div class="fn-coming"><span>${FN_LOCK}</span><span>${esc(nx.name)} opens after <b>${m.left} more</b> in ${esc(pv.name)}</span></div>`}
/* goals for the whole funnel: the funnel pours into them — one stem from the tip splits to a card per goal */
function fnGoalsHTML(){const ts=['daily','weekly'].map(fnTarget).filter(Boolean),past=fnPast();
  if(!ts.length)return past?'':`<div class="fn-goals"><span class="fn-stem"></span><button class="fn-ginv" data-fnedit>${TGT_I}Add a daily or weekly goal</button></div>`;
  const met=ts.map(t=>t.c>=t.n),split=ts.length>1;
  const stem=split?`<svg class="fn-ysplit${met.some(Boolean)?' lit':''}" viewBox="0 0 200 34" aria-hidden="true"><path d="M100 0 V12 Q100 18 92 18 H28 Q20 18 20 26 V34 M100 12 Q100 18 108 18 H172 Q180 18 180 26 V34"/></svg>`:`<span class="fn-stem${met[0]?' lit':''}"></span>`;
  return `<div class="fn-goals">${stem}<div class="fn-gcards">${ts.map((t,k)=>`<div class="fn-goal${met[k]?' met':''}${t.kind==='weekly'?' wk':''}"><span class="fn-geye">${t.kind==='daily'?(past?'That day':'Today'):(past?'That week':'This week')}${met[k]?' ✓':''}</span>
    <b class="fn-gv">${t.c}<span>/${t.n}</span></b><span class="fn-gu">${esc(listOf(t.list).name.toLowerCase())}${met[k]?' · met':''}</span><i><b style="width:${(t.p*100).toFixed(0)}%"></b></i></div>`).join('')}</div></div>`}
const TGT_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
/* a quiet line after a step fills or opens: no confetti here, the big moment is the whole funnel */
const fnNoteHTML=()=>fnNote&&Date.now()-fnNoteT<4500?`<div class="fn-note" role="status"><span>${FN_TICK}</span>${esc(fnNote)}</div>`:'';
/* Focus view: the same steps as a thin line, and only the task you are on, big and calm */
function fnStepLine(m){return `<div class="fn-line" role="group" aria-label="Steps">${m.steps.map((st,i)=>{const s=m.stats[i],l=listOf(st.list);
  return `<button class="fn-seg${i===m.sel?' sel':''}${m.open[i]?'':' lock'}${s.full?' full':''}${fnFlash===st.list?' flash':''}" data-fnstep="${st.list}" aria-label="${fnEsc(l.name)}, ${m.open[i]?(s.goal?s.c+' of '+s.goal:'open'):'locked'}"${i===m.sel?' aria-current="true"':''}>
    <i><b style="width:${(s.p*100).toFixed(1)}%"></b></i><span>${esc(l.name)}</span></button>`}).join('')}</div>`}
function fnHeroHTML(m){const st=m.steps[m.sel],l=listOf(st.list),s=m.stats[m.sel],open=fnOpenTasks(st.list),t=open[0],nx=m.steps.findIndex((x,i)=>i>m.sel&&m.open[i]);
  const eye=`${esc(l.name)}${s.goal?` · ${s.c} of ${s.goal}`:''}`;
  if(!t)return `<div class="fn-hero calm"><div class="fn-hin"><span class="fn-eye">${eye}</span><b class="fn-ht">${s.c?`${esc(l.name)} is done for today`:`Nothing planned in ${esc(l.name)}`}</b>
    <small class="fn-hs">${s.c?'Nice work.':'Add a task below, or pick another step.'}</small>
    ${nx>=0?`<div class="fn-hb"><button class="fn-main" data-fngoto="${m.steps[nx].list}">Go to ${esc(listOf(m.steps[nx].list).name)}</button></div>`:''}</div></div>`;
  const sub=(t.notes||'').split('\n')[0].trim();
  return `<div class="fn-hero"><div class="fn-hin"><span class="fn-eye">${eye}</span><b class="fn-ht">${esc(t.title)}${fnAmt(t)>1?` <i class="fn-amt">×${fnAmt(t)}</i>`:''}</b>${sub?`<small class="fn-hs">${esc(sub.slice(0,120))}</small>`:''}
    <div class="fn-hb"><button class="fn-main" data-fngo="${t.id}">${FN_PLAY}Start</button><button class="fn-soft" data-fntick="${t.id}">Done</button>${MORE(`data-fnm="${t.id}"`,'More for this task')}</div></div></div>`}
function fnFocusHTML(m){const st=m.steps[m.sel];if(!st)return '';const open=fnOpenTasks(st.list).slice(1),done=fnDoneTasks(st.list),l=listOf(st.list);
  return `<div class="fn-focus">${fnStepLine(m)}<span class="fn-eye fn-lnow">Step ${m.sel+1} of ${m.steps.length} · ${esc(l.name)}</span>${fnAsk?fnAskHTML(m):''}
    <div class="fn-fgrid"><div class="fn-fl">${fnNoteHTML()}${fnHeroHTML(m)}${fnTargetsHTML()}</div>
    <div class="fn-fr">${open.length?`<span class="fn-eye">Up next</span><div class="fn-list">${open.map(t=>fnTaskRow(t,false)).join('')}</div>`:''}
      ${done.length?`<button class="fn-dn" data-fndone aria-expanded="${fnShowDone}">${done.length} done · ${fnShowDone?'Hide':'Show'}</button>${fnShowDone?`<div class="fn-list">${done.map(t=>fnTaskRow(t,false)).join('')}</div>`:''}`:''}
      <label class="fn-add"><span class="wn-pl">${PLUS_S}</span><input id="fnNew" placeholder="Add to ${fnEsc(l.name)}…" maxlength="200" enterkeyhint="done" autocomplete="off" aria-label="Add a task to ${fnEsc(l.name)}"></label></div></div></div>`}
const FN_SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const FN_MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
/* ‹ day › — look back up to a month; today has no "next" */
function fnDayNav(){const k=fnKey(),d=new Date(k+'T12:00:00'),min=dkey(Date.now()-FN_BACK_DAYS*864e5);
  const lbl=(fnPast()?'':'Today · ')+d.toLocaleDateString(undefined,{weekday:fnPast()?'long':'short',day:'numeric',month:'long'});
  return `<span class="fn-day"><button class="fn-dnb" data-fnday="-1" aria-label="Previous day"${k<=min?' disabled':''}>‹</button><span class="pg-eye">${lbl}</span><button class="fn-dnb" data-fnday="1" aria-label="Next day"${fnPast()?'':' disabled'}>›</button></span>`}
function fnAskHTML(m){const i=m.steps.findIndex(s=>s.list===fnAsk);if(i<1)return '';const l=listOf(m.steps[i].list),p=listOf(m.steps[i-1].list),ps=m.stats[i-1],left=Math.max(1,Math.ceil(ps.goal*.5)-ps.c);
  return `<div class="fn-ask" role="dialog" aria-label="${fnEsc(l.name)} is locked"><span class="fn-ai">${FN_LOCK}</span><b>${esc(l.name)} opens after ${esc(p.name)}</b>
    <small>${ps.goal?`${left} more in ${esc(p.name)} to go.`:`Finish something in ${esc(p.name)} first.`}</small>
    <button class="fn-main" data-fngoto="${p.id}">Go to ${esc(p.name)}</button><button class="fn-anyway" data-fnany="${l.id}">Open anyway</button></div>`}
function fnSetupHTML(){return `<div class="fn-setup"><span class="pg-eye">Set up your funnel</span><h2 class="fn-sh">Pick a starting shape</h2>
  <p class="fn-sp">Each step becomes a list in a new space, so its tasks work like any other task. You can rename, add or remove steps any time.</p>
  <div class="fn-tpls">${FN_TPL.map((tp,i)=>`<button class="fn-tpl" data-fntpl="${i}"><b>${tp.e?tp.e+' ':''}${esc(tp.name)}</b><small>${tp.steps.map(s=>esc(s[0])).join(' → ')}</small></button>`).join('')}</div></div>`}
function fnEditHTML(){const steps=fnSteps();
  return `<div class="fn-ed"><span class="pg-eye">Your steps · ${steps.length} of ${FN_MAX}</span>
    ${steps.map((st,i)=>{const l=listOf(st.list);return `<div class="fn-es" data-fnes="${st.list}"><span class="fn-n">${i+1}</span>
      <input class="fn-ename" value="${fnEsc(l.name)}" maxlength="24" aria-label="Step ${i+1} name" data-fnname="${st.list}" autocomplete="off">
      <span class="fn-tg"><button data-fntg="-1" aria-label="Lower target">−</button><b>${+st.target>0?st.target:'–'}</b><button data-fntg="1" aria-label="Raise target">+</button></span>
      <button class="fn-alw${st.open?' on':''}" data-fnalw aria-pressed="${!!st.open}" title="Always open">${st.open?'Always open':'Opens in turn'}</button>
      ${MORE(`data-fnem="${st.list}"`,'More for this step')}</div>`}).join('')}
    ${steps.length<FN_MAX?`<label class="fn-add"><span class="wn-pl">${PLUS_S}</span><input id="fnNewStep" placeholder="Add a step" maxlength="24" enterkeyhint="done" autocomplete="off" aria-label="Add a step"></label>`:''}
    <p class="fn-sp">Target = how many to finish each day (– means none). Without a target, a step is full when its tasks for today are done. The next step opens half way.</p>
    <span class="pg-eye fn-tgh">Targets for the whole funnel · optional</span>
    ${['daily','weekly'].map(kind=>{const g=(fnCfg()||{})[kind]||{},has=+g.n>0&&steps.some(s=>s.list===g.list);
      return `<div class="fn-es fn-tge" data-fntge="${kind}"><b class="fn-tgk">${kind==='daily'?'Each day':'Each week'}</b>
        <button class="fn-pick" data-fntgl="${kind}" aria-haspopup="menu" aria-label="${kind==='daily'?'Daily':'Weekly'} target step: ${has?fnEsc(listOf(g.list).name):'none'}"><span>${has?esc(listOf(g.list).name):'No target'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        ${has?`<span class="fn-tg"><button data-fntgn="-1" aria-label="Fewer">−</button><b>${g.n}</b><button data-fntgn="1" aria-label="More">+</button></span>`:''}</div>`}).join('')}
    <div class="fn-free"><span><b>Open all steps</b><small>No locks: every step is open from the start.</small></span><button class="tg" data-fnfree aria-pressed="${!!S.cfg.fnFree}" aria-label="Open all steps"></button></div>
    <button class="fn-main fn-edone" data-fnedit>Done</button></div>`}
function drawFunnel(){if(!fnOn)return;const pg=$('funnelPg'),y=pg.scrollTop,sp=fnSpace();
  const top=`<div class="set-top ib-top"><button class="icon-btn" id="fnBack" aria-label="Back">${BACK_SVG}</button></div>`;
  if(!fnReady()){$('fnIn').innerHTML=`${top}<div class="fn-head"><div><span class="pg-eye">${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</span><h1 class="ib-h wn-h">Funnel</h1></div></div>${fnSetupHTML()}`;return}
  if(fnEdit){$('fnIn').innerHTML=`${top}<div class="fn-head"><div><span class="pg-eye">${esc(sp.name)}</span><h1 class="ib-h wn-h">Edit steps</h1></div></div>${fnEditHTML()}`;pg.scrollTop=y;return}
  const m=fnModel(),left=fnLeftToday(),past=fnPast(),done=m.stats.reduce((n,s)=>n+s.c,0);
  const sum=past?`${done} finished that day · looking back`:left?`${left} to do today`:'All done for today';
  const pill=(on,attr,ic,lbl)=>on?`<button class="icon-btn fn-pill" ${attr} aria-label="${lbl}" title="${lbl}">${ic}</button>`:'';
  $('fnIn').innerHTML=`${top}<div class="fn-head"><div>${fnDayNav()}<h1 class="ib-h wn-h">Funnel</h1><div class="pg-sum">${sum}</div></div>
      <div class="fn-tools">${past?`<button class="fn-soft fn-today" data-fnday="0">Back to today</button>`:`<div class="segc fn-vsw" role="group" aria-label="View">${['funnel','focus'].map(v=>`<button data-fnview="${v}" class="${fnView===v?'on':''}" aria-pressed="${fnView===v}">${v==='funnel'?'Funnel':'Focus'}</button>`).join('')}</div>`}
      <span class="fn-tr">${past?'':pill(typeof planOn==='function'&&planOn(),'data-fnplan',FN_SUN,'Plan the day')+pill(typeof journalOn==='function'&&journalOn(),'data-fnjr',FN_MOON,'Close the day')}
      <button class="icon-btn fn-gear" data-fnedit aria-label="Edit steps">${FN_GEAR}</button></span></div></div>
    ${fnView==='focus'&&!past?fnFocusHTML(m):`<div class="fn-grid"><div class="fn-l"><div class="fn-shape" id="fnShape">${m.steps.map((s,i)=>fnRow(s,i,m)).join('')}</div>${fnAsk?fnAskHTML(m):''}${fnGoalsHTML()}</div>${fnPanel(m)}</div>`}`;
  fnShape();pg.scrollTop=y}
/* the one-piece funnel: a soft trapezoid clipped around the stacked rows, and each label kept inside its narrowing row */
function fnShape(){const el=$('fnShape');if(!el)return;const w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)return;const tip=.42,r=14,bx=(w-w*tip)/2;
  el.style.clipPath=`path('M ${r} 0 L ${w-r} 0 Q ${w} 0 ${w-3} ${r} L ${w-bx+4} ${h-10} Q ${w-bx} ${h} ${w-bx-r} ${h} L ${bx+r} ${h} Q ${bx} ${h} ${bx-4} ${h-10} L 3 ${r} Q 0 0 ${r} 0 Z')`;
  [...el.children].forEach(row=>{const yc=row.offsetTop+row.offsetHeight/2,vis=Math.max(80,w-2*bx*(yc/h)-28);row.querySelector('.fn-rc').style.maxWidth=vis+'px'})}
addEventListener('resize',()=>{if(fnOn)fnShape()});
function openFunnel(){if(!funnelOn())return;if(typeof closeSearch==='function')closeSearch();
  fnOn=true;fnEdit=false;fnAsk=null;fnShowDone=false;fnNote=null;fnDay=null;fnView=S.cfg.fnView==='focus'?'focus':'funnel';$('funnelPg').classList.add('on');document.body.classList.add('ib-open');drawFunnel();$('funnelPg').scrollTop=0;haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeFunnel(){if(!fnOn)return;fnOn=false;fnEdit=false;fnAsk=null;$('funnelPg').classList.remove('on');if(!document.querySelector('.inbox-pg.on'))document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#funnelPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}

/* ---------- changing things ---------- */
function fnSetCfg(fn){S.cfg.fn=S.cfg.fn||{steps:[]};fn(S.cfg.fn);save();drawFunnel();try{renderDesk()}catch(e){}}
function fnFromTpl(tp){const sp={id:'s'+newId(),name:tp.k==='empty'?'Funnel':tp.name,c:'#F5A35A',e:tp.e||'🎯'};
  const lists=tp.steps.map(([n])=>({id:'l'+newId(),name:n,c:sp.c,space:sp.id}));
  const tasks=(tp.tasks||[]).map(([i,title])=>({...newTask(title,'today',lists[i].id,S.cfg.defEst),repeat:'weekdays'}));
  commit(()=>{S.spaces.push(sp);S.lists.push(...lists);S.tasks.push(...tasks);if(typeof trimSeen==='number'&&tasks.length)trimSeen=Math.max(trimSeen,...tasks.map(t=>t.id)); // template tasks don't become your default list
    S.cfg.fn={space:sp.id,steps:lists.map((l,i)=>({list:l.id,target:tp.steps[i][1]||0,open:false})),unl:{d:today(),lists:[]}}},`${sp.name} funnel ready`);
  try{sfx('done')}catch(e){}fnSel=null;drawFunnel();try{renderDesk()}catch(e){}}
function fnTick(id){const t=S.tasks.find(x=>String(x.id)===String(id));if(!t)return;const on=t.stage!=='done';
  if(!on&&!canPut(t.list,'today',t))return;
  const m0=fnModel();commit(()=>setStage(t,on?'done':'today'),on?'Task done':'Back on today');
  if(on){haptic([8,30,12]);fnAfterTick(m0,fnModel())}
  drawFunnel()}
/* the whole funnel done today: one Win in the jar (Wins mode), once a day */
function fnWin(){const c=fnCfg(),sp=fnSpace();if(!c||!sp||c.won===today())return;c.won=today();
  if(typeof winsOn==='function'&&winsOn()){S.wins=S.wins||[];const n=fnSteps().reduce((a,s)=>a+fnSum(fnDoneTasks(s.list)),0);S.wins.push({id:newId(),t:`Funnel done · ${sp.name}`,sub:`${n} finished across ${fnSteps().length} steps`,at:Date.now(),kind:'big'})}
  save();try{sfx('done')}catch(e){}}
/* after a tick: say quietly what changed (a step filled, the next one opened) and let the new step glow once */
function fnAfterTick(m0,m1){const filled=m1.stats.findIndex((s,k)=>s.full&&m0.stats[k]&&!m0.stats[k].full),opened=m1.open.findIndex((o,k)=>o&&!m0.open[k]);
  const name=k=>listOf(m1.steps[k].list).name,parts=[];if(filled>=0)parts.push(`${name(filled)} done`);if(opened>0)parts.push(`${name(opened)} is open now`);
  const won=m1.stats.some(s=>s.full)&&m1.stats.every(s=>s.full||!s.goal)&&!(m0.stats.some(s=>s.full)&&m0.stats.every(s=>s.full||!s.goal));
  if(won){parts.length=0;parts.push('Funnel done. You won the day.');fnWin()}
  if(!parts.length)return;fnNote=parts.join(' · ');fnNoteT=Date.now();if(opened>0){fnFlash=m1.steps[opened].list;setTimeout(()=>{fnFlash=null;if(fnOn)drawFunnel()},1600)}
  setTimeout(()=>{if(fnOn&&Date.now()-fnNoteT>=4400)drawFunnel()},4600)}
function fnAddTask(v){const m=fnModel(),st=m.steps[m.sel];if(!st||!v)return false;const t=newTask(v.slice(0,200),'today',st.list,S.cfg.defEst);
  if(!canPut(t.list,'today',null,{title:v}))return false;commit(()=>S.tasks.push(t),'Task added');try{sfx('add')}catch(e){}haptic(6);return true}
function fnMoveTask(t,list){commit(()=>{t.list=list},`Moved to ${listOf(list).name}`);drawFunnel()}
/* delete a step: its tasks move to the step before (or after, for the first one) */
function fnDelStep(list){const steps=fnSteps();if(steps.length<=FN_MIN)return toast(`A funnel needs at least ${FN_MIN} steps`);
  const i=steps.findIndex(s=>s.list===list),to=steps[i>0?i-1:1].list,n=S.tasks.filter(t=>t.list===list).length,name=listOf(list).name;
  commit(()=>{S.tasks.forEach(t=>{if(t.list===list)t.list=to});S.lists=S.lists.filter(l=>l.id!==list);S.cfg.fn.steps=S.cfg.fn.steps.filter(s=>s.list!==list)},
    n?`${name} deleted · ${n} ${n===1?'task':'tasks'} moved to ${listOf(to).name}`:`${name} deleted`);drawFunnel()}
function fnAddStep(v){const steps=fnSteps(),sp=fnSpace();if(!sp||!v||steps.length>=FN_MAX)return;const l={id:'l'+newId(),name:v.slice(0,24),c:sp.c,space:sp.id};
  commit(()=>{S.lists.push(l);S.cfg.fn.steps.push({list:l.id,target:0,open:false})},`${l.name} added`);drawFunnel();setTimeout(()=>{const i=$('fnNewStep');if(i)i.focus()},30)}

$('funnelPg').addEventListener('click',e=>{const T=x=>e.target.closest(x);
  if(T('#fnBack')){if(fnEdit){fnEdit=false;return drawFunnel()}return closeFunnel()}
  const tp=T('[data-fntpl]');if(tp)return fnFromTpl(FN_TPL[+tp.dataset.fntpl]);
  const dy=T('[data-fnday]');if(dy){const d=+dy.dataset.fnday;if(!d){fnDay=null}else{const x=new Date(fnKey()+'T12:00:00');x.setDate(x.getDate()+d);const k=dkey(x);fnDay=k>=today()?null:k}
    fnAsk=null;fnShowDone=false;haptic(4);return drawFunnel()}
  if(T('[data-fnplan]'))return openPlan();
  if(T('[data-fnjr]'))return openJournal();
  const vw=T('[data-fnview]');if(vw){fnView=vw.dataset.fnview;fnAsk=null;haptic(4);return drawFunnel()}
  if(T('[data-fnedit]')){fnEdit=!fnEdit;haptic(4);drawFunnel();$('funnelPg').scrollTop=0;return}
  if(T('[data-fnfree]')){haptic(5);setCfg('fnFree',!S.cfg.fnFree);return drawFunnel()}
  const st=T('[data-fnstep]');if(st){const m=fnModel(),i=m.steps.findIndex(s=>s.list===st.dataset.fnstep);if(i<0)return;haptic(4);
    if(!m.open[i]){fnAsk=fnAsk===st.dataset.fnstep?null:st.dataset.fnstep;return drawFunnel()}
    fnAsk=null;fnSel=st.dataset.fnstep;fnShowDone=false;drawFunnel();const tgt=!fnDesk()&&fnView==='funnel'&&$('funnelPg').querySelector('.fn-panel');if(tgt)tgt.scrollIntoView({behavior:'smooth',block:'start'});return}
  const gt=T('[data-fngoto]');if(gt){fnAsk=null;fnSel=gt.dataset.fngoto;return drawFunnel()}
  const an=T('[data-fnany]');if(an){const id=an.dataset.fnany;fnSetCfg(c=>{const u=c.unl&&c.unl.d===today()?c.unl:{d:today(),lists:[]};if(!u.lists.includes(id))u.lists.push(id);c.unl=u});fnAsk=null;fnSel=id;haptic(6);return drawFunnel()}
  if(fnAsk&&!T('.fn-ask')){fnAsk=null;drawFunnel()}
  const tk=T('[data-fntick]');if(tk)return fnTick(tk.dataset.fntick);
  const go=T('[data-fngo]');if(go){const t=S.tasks.find(x=>String(x.id)===go.dataset.fngo);if(t){haptic(8);startBlitz([t])}return}
  const op=T('[data-fnopen]');if(op)return openDetail(+op.dataset.fnopen);
  if(T('[data-fndone]')){fnShowDone=!fnShowDone;haptic(4);return drawFunnel()}
  const mo=T('[data-fnm]');if(mo){e.stopPropagation();const t=S.tasks.find(x=>String(x.id)===mo.dataset.fnm);if(!t)return;
    const others=fnSteps().filter(s=>s.list!==t.list);
    return cxOpen(mo,[{t:`Counts as ${fnAmt(t)}…`,ic:PLUS_S,act:()=>cxOpen(mo,[1,2,3,5,10,20].map(n=>({t:n===1?'Counts as 1 (normal)':`Counts as ${n}`,ic:n===fnAmt(t)?FN_TICK:PLUS_S,act:()=>{commit(()=>{if(n>1)t.amt=n;else delete t.amt},n>1?`Counts as ${n}`:'Counts as 1');drawFunnel()}})))},
      ...(others.length?[{t:'Move to step…',ic:ARR_R,act:()=>cxOpen(mo,others.map(s=>({t:listOf(s.list).name,ic:ARR_R,act:()=>fnMoveTask(t,s.list)})))}]:[]),
      {t:'Open task',ic:PEN_S,act:()=>openDetail(t.id)}])}
  /* editing steps */
  const tg=T('[data-fntg]');if(tg){const id=tg.closest('[data-fnes]').dataset.fnes,d=+tg.dataset.fntg;haptic(4);
    return fnSetCfg(c=>{const s=c.steps.find(x=>x.list===id);if(s)s.target=Math.max(0,Math.min(99,(+s.target||0)+d))})}
  /* whole-funnel target: pick the step from Windaday's own menu (a native list is unreadable on Windows dark) */
  const tp2=T('[data-fntgl]');if(tp2){e.stopPropagation();const kind=tp2.dataset.fntgl,cur=((fnCfg()||{})[kind]||{}).list;
    const pick=v=>()=>fnSetCfg(c=>{if(!v)c[kind]=null;else c[kind]={list:v,n:(c[kind]&&+c[kind].n>0)?c[kind].n:(kind==='daily'?2:5)}});
    return cxOpen(tp2,[{t:'No target',ic:cur?'':FN_TICK,act:pick('')},...fnSteps().map(s=>({t:listOf(s.list).name,ic:s.list===cur?FN_TICK:'',act:pick(s.list)}))])}
  const tn=T('[data-fntgn]');if(tn){const kind=tn.closest('[data-fntge]').dataset.fntge,d=+tn.dataset.fntgn;haptic(4);return fnSetCfg(c=>{const g=c[kind];if(g)g.n=Math.max(1,Math.min(999,(+g.n||1)+d))})}
  const al=T('[data-fnalw]');if(al){const id=al.closest('[data-fnes]').dataset.fnes;haptic(4);return fnSetCfg(c=>{const s=c.steps.find(x=>x.list===id);if(s)s.open=!s.open})}
  const em=T('[data-fnem]');if(em){e.stopPropagation();const id=em.dataset.fnem,steps=fnSteps(),i=steps.findIndex(s=>s.list===id);
    const mv=d=>()=>{fnSetCfg(c=>{const a=c.steps,j=a.findIndex(s=>s.list===id),k=a.findIndex(s=>s.list===steps[i+d].list);[a[j],a[k]]=[a[k],a[j]]})};
    return cxOpen(em,[...(i>0?[{t:'Move up',ic:ARR_L,act:mv(-1)}]:[]),...(i<steps.length-1?[{t:'Move down',ic:ARR_R,act:mv(1)}]:[]),
      {t:'Delete step',ic:BIN_S,warn:1,act:()=>fnDelStep(id)}])}});
$('funnelPg').addEventListener('keydown',e=>{
  if(e.target.id==='fnNew'&&e.key==='Enter'){e.preventDefault();const v=e.target.value.trim();if(fnAddTask(v)){drawFunnel();const i=$('fnNew');if(i)i.focus()}return}
  if(e.target.id==='fnNewStep'&&e.key==='Enter'){e.preventDefault();return fnAddStep(e.target.value.trim())}
  if(e.target.matches('.fn-ename')&&e.key==='Enter'){e.preventDefault();e.target.blur()}
  if(e.target.matches('input')&&e.key==='Escape'){e.preventDefault();e.stopPropagation();e.target.blur()}});
$('funnelPg').addEventListener('change',e=>{const n=e.target.closest('[data-fnname]');if(!n)return;const l=S.lists.find(x=>x.id===n.dataset.fnname),v=n.value.trim();if(!l)return;
  if(!v){n.value=l.name;return}if(v!==l.name){commit(()=>{l.name=v.slice(0,24)},'Step renamed');try{renderDesk()}catch(err){}}});

/* a repeating task's next copy keeps counting the same */
const _fnStage=hkBelow('setStage','funnel',setStage__core);
hkLayer('setStage','funnel',function(t){const r=_fnStage.apply(this,arguments);if(t&&t.amt>1&&t.spawned){const c=S.tasks.find(x=>x.id===t.spawned);if(c&&!c.amt)c.amt=t.amt}return r});

/* ---------- Home: an optional small card with the task you are on (Settings → Modes → Funnel) ---------- */
function fnHomeCard(){if(!funnelOn()||!S.cfg.fnHome||!fnReady())return '';
  const keep=fnDay;fnDay=null;let m,t;try{m=fnModel();const st0=m.steps[m.cur];t=st0&&fnOpenTasks(st0.list)[0]}finally{fnDay=keep}   // Home is always about today
  const st=m.steps[m.cur];if(!st||!t)return '';const s=m.stats[m.cur];
  return `<div class="ci-home fn-home" data-fnhopen><span class="ci-hi">${FN_ICON}</span><span class="ci-ht"><b>${esc(t.title)}</b><small>Funnel · ${esc(listOf(st.list).name)}${s.goal?` ${s.c}/${s.goal}`:''}</small></span>
    <button class="rv-go" data-fnhgo="${t.id}">Start</button></div>`}
const _fnCi=hkBelow('ciCard','funnel',ciCard__core);hkLayer('ciCard','funnel',function(){return fnHomeCard()||_fnCi.apply(this,arguments)});
document.addEventListener('click',e=>{const g=e.target.closest('[data-fnhgo]'),o=e.target.closest('[data-fnhopen]');if(!g&&!o)return;e.preventDefault();e.stopPropagation();
  if(g){const t=S.tasks.find(x=>String(x.id)===g.dataset.fnhgo);if(t){haptic(8);startBlitz([t])}return}openFunnel()},true);

/* ---------- keep things fresh ---------- */
onRender('funnel-page',function(){if(fnOn){if(!funnelOn())closeFunnel();else if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest('#funnelPg input'))drawFunnel()}});

/* ---------- computers: "Funnel" under Modes in the sidebar ---------- */
const _fnSide=hkBelow('rhythmSide','funnel',rhythmSide__core);
hkLayer('rhythmSide','funnel',function(){const h=_fnSide();if(!funnelOn())return h;const n=fnLeftToday();
  const it=`<button class="s-list s-home s-inbox ${fnOn?'on':''}" id="sFunnel" title="Funnel">${FN_ICON}<span class="s-name">Funnel</span>${n?`<span class="n">${n}</span>`:''}</button>`;
  return h?h+it:`<div class="s-lbl2"><span class="s-name">Modes</span></div>${it}`});
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sFunnel')){e.stopImmediatePropagation();return fnOn?closeFunnel():openFunnel()}},true);
/* a full page: opening any other page closes it (see regPage in core/data.js) */
regPage('funnel',['openFunnel'],()=>fnOn,closeFunnel);
const _fnDesk=hkBelow('renderDesk','funnel',renderDesk__core);hkLayer('renderDesk','funnel',function(){_fnDesk.apply(this,arguments);if(fnOn){const h=$('sHome');if(h)h.classList.remove('on')}});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!fnOn||e.defaultPrevented||$('dlg').classList.contains('on')||document.querySelector('.sheet.on'))return;
  if(e.target&&e.target.closest&&e.target.closest('#funnelPg input'))return;if(fnAsk){fnAsk=null;return drawFunnel()}if(!fnDesk())return;e.preventDefault();closeFunnel()});

/* ---------- phones: a Funnel tab ---------- */
const _fnTabs=hkBelow('tabsList','funnel',tabsList__core);
hkLayer('tabsList','funnel',function(){let t=_fnTabs();if(!funnelOn())return t;t=t.length?t:[['home','Home',TB_HOME]];t.push(['funnel','Funnel',FN_ICON]);return t});
const _fnTabNow=hkBelow('tabNow','funnel',tabNow__core);hkLayer('tabNow','funnel',function(){return fnOn?'funnel':_fnTabNow()});
const _fnTbGo=hkBelow('tbGo','funnel',tbGo__core);
hkLayer('tbGo','funnel',function(k){
  if(k==='funnel'){if(fnOn){if(fnEdit){fnEdit=false;drawFunnel()}$('funnelPg').scrollTo({top:0,behavior:'smooth'});return}_fnTbGo('home');openFunnel();return drawTabs()}
  if(fnOn)closeFunnel();return _fnTbGo(k)});
/* the + on the Funnel tab adds a task to the step you are looking at */
document.addEventListener('click',e=>{if(!fnOn||!e.target.closest('#tbAdd'))return;e.preventDefault();e.stopImmediatePropagation();
  if(fnEdit){fnEdit=false;drawFunnel()}const i=$('fnNew');if(i){i.scrollIntoView({block:'center'});i.focus()}},true);
const _fnApply=hkBelow('applySettings','funnel',applySettings__core);hkLayer('applySettings','funnel',function(){_fnApply.apply(this,arguments);if(fnOn&&!funnelOn())closeFunnel()});

/* ---------- Settings → Modes: a Funnel card (in the Beta group) ---------- */
const _fnModes=hkBelow('modesPage','funnel',modesPage__core);
hkLayer('modesPage','funnel',function(){const h=_fnModes.apply(this,arguments),on=funnelOn(),sp=fnReady()&&fnSpace();
  const card=`<div class="md-card${on?' on':''}" data-md="funnel"><div class="md-head"><span class="md-ic">${FN_ICON}</span><span class="md-t"><b>Funnel</b><small>Move work through steps, one at a time</small></span>${tg('funnel')}</div>
    ${on?`<div class="md-body"><p class="md-note">Steps like Prospects → Outreach → Replies. Finishing tasks fills each step, and the next one opens half way. ${sp?`Your funnel lives in the space <b>${esc(sp.name)}</b>, so its tasks also show in Today and search.`:'Open it to pick a starting shape.'}</p>
      <div class="md-sub"><span><b>Start in</b><small>The view the page opens with. You can switch on the page too.</small></span><div class="segc">${['funnel','focus'].map(v=>`<button data-fnsetview="${v}" class="${(S.cfg.fnView||'funnel')===v?'on':''}" aria-pressed="${(S.cfg.fnView||'funnel')===v}">${v==='funnel'?'Funnel':'Focus'}</button>`).join('')}</div></div>
      <div class="md-sub"><span><b>Open all steps</b><small>No locks: every step is open from the start.</small></span>${tg('fnFree')}</div>
      <div class="md-sub"><span><b>Now card on Home</b><small>The task you are on, with Start.</small></span>${tg('fnHome')}</div>
      ${sp?`<button class="md-act" data-fnsetedit>Edit steps and targets</button>`:''}</div>`:''}</div>`;
  const i=h.indexOf('<div class="set-sec"><h3>Everyday');if(i<0)return h+card;const j=h.lastIndexOf('</div>',i);return h.slice(0,j)+card+h.slice(j)});
$('setIn').addEventListener('click',e=>{const v=e.target.closest('[data-fnsetview]');if(!v)return;e.stopPropagation();haptic(5);setCfg('fnView',v.dataset.fnsetview)},true);
$('setIn').addEventListener('click',e=>{if(!e.target.closest('[data-fnsetedit]'))return;e.stopPropagation();try{closeSettings()}catch(err){}openFunnel();fnEdit=true;drawFunnel()},true);
