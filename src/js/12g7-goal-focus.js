/* ---------- Goal page · Focus view (0.292), phone and computer ----------
   Goal › milestones › tasks › steps, built around one thing: what to do next.
   Top: the goal and a thin strip with every milestone (tap one to look at it). Then one big "Up next" card: the first open task
   of that milestone with its steps right there (tick them, add one), Start (focus mode) and Today. Then "After that": the rest.
   Choose it in the goal's ⋯ menu → View → Focus. Reuses the page's own pieces (rows, step ticks, add inputs), so every action
   works the same as in the other views. */
/* (0.292 strip, no longer drawn since 0.299) */
function gfStrip(g){const sel=gSel(g),nx=gNext(g);if(!g.ms.length)return '';
  return `<div class="gf-strip" style="--n:${g.ms.length}">${g.ms.map((m,i)=>{const ks=gKids(m),dn=ks.filter(x=>x.done).length,p=m.done?1:ks.length?dn/ks.length:0;
    return `<button class="gf-seg${m.done?' done':''}${m===nx&&!g.done?' now':''}${m===sel?' sel':''}" data-gsel="${m.id}" aria-pressed="${m===sel}" aria-label="Milestone ${i+1}: ${esc(m.t)}${m.done?', done':''}">
      <span class="gf-bar"><i style="width:${(p*100).toFixed(1)}%"></i></span><span class="gf-sl">${m.done?CK:''}${esc(m.t)}</span></button>`}).join('')}</div>`}
/* 0.299 · milestone first: the milestone you're in, big, with ‹ › and its progress; one list with all its tasks (the next one marked);
   when every task is ticked, one clear "Finish milestone"; a finished milestone can be opened again, with the choice explained. */
function gfHead(g,m){const i=g.ms.indexOf(m),N=g.ms.length,ks=gKids(m),dn=ks.filter(x=>x.done).length;
  return `<div class="gf-mh"><button class="gf-nav" data-gfnav="-1" aria-label="Previous milestone" ${i<=0?'disabled':''}>${ARR_L}</button>
    <div class="gf-mt"><span class="gf-mn">Milestone ${i+1} of ${N}</span><b>${esc(m.t)}</b></div>
    <button class="gf-nav" data-gfnav="1" aria-label="Next milestone" ${i>=N-1?'disabled':''}>${ARR_R}</button></div>
    <div class="gf-dots">${g.ms.map((x,k)=>`<button class="gf-dot${x.done?' done':''}${x===m?' sel':''}" data-gsel="${x.id}" aria-label="Milestone ${k+1}: ${esc(x.t)}"></button>`).join('')}</div>
    <div class="gf-mp"><span class="gf-prog"><i style="width:${ks.length?(dn/ks.length*100).toFixed(1):0}%"></i></span><small>${ks.length?`${dn} of ${ks.length} ${ks.length===1?'task':'tasks'}`:'No tasks yet'}</small></div>
    ${m.done?`<div class="gf-fin">${CK}Finished${m.doneAt?` ${gShort(m.doneAt)}`:''}</div>`:''}`}
function gfCard(g,m){
  if(!m)return `<div class="gf-card gf-empty"><span class="gf-eye">First step</span><b class="gf-tt">Break it into milestones</b><p>A few checkpoints on the way. Then tasks, then steps.</p>${g.done?'':gAddInput('Add your first milestone')}</div>`;
  const ks=gKids(m),nx=ks.find(x=>!x.done),live=!m.done&&!g.done;
  if(m.done)return '';                                                     // a finished milestone: its head says so, the list shows what was done
  if(!nx){if(!ks.length)return `<div class="gf-card gf-empty"><span class="gf-eye">Up next</span><b class="gf-tt">Add the first task</b><p>What’s one thing that moves “${esc(m.t)}” forward?</p>
      ${live?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${m.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(m.t)}"></label>`:''}</div>`;
    const nm=g.ms[g.ms.indexOf(m)+1];
    return `<div class="gf-card gf-all"><span class="gf-big">${CK}</span><b class="gf-tt">Every task is done</b>
      <p>${nm?`Close this milestone and move on to “${esc(nm.t)}”.`:'Close this milestone. It’s the last one.'}</p>
      ${live?`<button class="gf-go gf-ok" data-gffin="${m.id}">Finish milestone →</button><button class="gf-link" data-gfadd>Not yet, I want to add a task</button>`:''}</div>`}
  const k=nx.k,subs=nx.subs,t=nx.kind==='t'?nx.t:null,today=t&&t.stage==='today';
  const steps=subs.map(s=>`<button class="gf-st${s.done?' on':''}" data-gsub="${k}|${s.id}" aria-pressed="${!!s.done}"><span class="gf-sk">${CK}</span><span>${esc(s.t||'')}</span></button>`).join('');
  const dn=subs.filter(s=>s.done).length,allSteps=subs.length>0&&dn===subs.length;
  const doneBtn=main=>`<button class="${main?'gf-go':'gf-sec'}" data-gmt="${k}">${CK}${main?'Mark task done':'Done'}</button>`;
  const add=subs.length<SUB_MAX?`<label class="gf-sadd"><span class="gm-plus">${PLUS_S}</span><input data-gsadd="${k}" placeholder="${subs.length?'Add a step':'Break it into steps'}" maxlength="200" autocomplete="off" enterkeyhint="done" aria-label="Add a step to ${esc(nx.title)}"></label>`:'';
  return `<div class="gf-card"><span class="gf-eye">Up next</span>
    ${t?`<button class="gf-tt" data-gtask="${t.id}" title="Open details">${esc(nx.title)}</button>`:`<b class="gf-tt">${esc(nx.title)}</b>`}
    ${t?`<small class="gf-in"><i style="background:${listOf(t.list).c}"></i>${esc(listOf(t.list).name)} · ${esc(STAGES[idx(t.stage)].name)}${t.est?` · ${fmt(t.est)}`:''}</small>`:''}
    ${subs.length?`<div class="gf-sh"><span>Steps</span><small>${dn} of ${subs.length}</small></div><div class="gf-prog"><i style="width:${(dn/subs.length*100).toFixed(1)}%"></i></div>`:''}
    <div class="gf-steps">${steps}${add}</div>
    <div class="gf-acts">${t&&!allSteps?`<button class="gf-go" data-gfgo="${t.id}">${sunIcon()}Start</button>${doneBtn(false)}${today?'':`<button class="gf-sec" data-gftoday="${t.id}">Today</button>`}`
      :doneBtn(true)}</div></div>`}
var gfDone=new Set(); // (kept for older saved state)
function gFocusView(g){
  const pr=gProg(g),dd=gDays(g),m=g.done?null:gSel(g),ks=gKids(m),nx=ks.find(x=>!x.done),live=m&&!m.done&&!g.done;
  const eye=g.done?`Achieved · ${gShort(g.doneAt)}`:[g.due?(dd.n==='—'?'':`${dd.n} ${dd.t}`):'',pr.of?`${pr.n} of ${pr.of} milestones`:''].filter(Boolean).join(' · ');
  const row=r=>gRow(r).replace('class="gm-t','class="gm-t'+(r===nx?' gf-nx':''));
  const list=m&&ks.length?`<div class="gf-after"><div class="gf-ah"><span>${m.done?'What you did':'All tasks in this milestone'}</span></div>
      <div class="gf-list">${gCap('gf-'+m.id,ks,row,8,r=>r.k)}${live&&nx?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${m.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(m.t)}"></label>`:''}</div>
      ${m.done&&!g.done?`<button class="gf-sec gf-reo" data-gfreo="${m.id}">Open this milestone again</button>`:''}</div>`
    :m&&m.done&&!g.done?`<button class="gf-sec gf-reo" data-gfreo="${m.id}">Open this milestone again</button>`:'';
  /* the goal header, calm (0.300): the name, then one quiet line — no shouting label above */
  return `<div class="gf"><div class="gf-hd"><h1 class="gv-h gf-h1">${g.e?`<span class="gf-ge2">${esc(g.e)}</span>`:''}<span>${esc(g.name)}</span></h1>${eye?`<p class="gf-meta">${eye}</p>`:''}</div>
    ${m?gfHead(g,m):''}
    <div class="gf-cols"><div class="gf-main">${g.done?`<div class="gf-card gf-all"><span class="gf-big">${CK}</span><b class="gf-tt">Goal achieved</b><p>Every step got you here.</p></div>`:gfCard(g,m)}</div>
      <div class="gf-side">${list}${gWhy(g)}${pr.of&&pr.n>=pr.of&&!g.done?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div></div></div>`}
/* opening a finished milestone again, explained: tasks stay ticked unless you choose to untick them */
document.body.insertAdjacentHTML('beforeend',`<div class="cap" id="gfReo" role="dialog" aria-modal="true" aria-labelledby="gfReoT"><div class="cap-in">
  <h3 id="gfReoT"></h3><p id="gfReoP"></p><div class="cap-b"><button class="cap-ok" id="gfReoKeep">Open it again</button><button class="cap-ok alt" id="gfReoAll"></button><button class="gf-link" id="gfReoNo">Cancel</button></div></div></div>`);
let gfReoM=null;
function gfReopenAsk(g,m){gfReoM={g,m};const n=gKids(m).filter(x=>x.done).length;
  $('gfReoT').textContent=`Open “${m.t}” again?`;
  $('gfReoP').textContent=`It becomes your current milestone again.${n?` Your ${n} ticked ${n===1?'task stays':'tasks stay'} ticked.`:''}`;
  $('gfReoAll').hidden=!n;$('gfReoAll').textContent=`Also untick ${n===1?'that task':`all ${n} tasks`}`;
  $('gfReo').classList.add('on');haptic(6)}
function gfReopen(untick){const x=gfReoM;$('gfReo').classList.remove('on');gfReoM=null;if(!x)return;const {g,m}=x;
  commit(()=>{m.done=false;delete m.doneAt;if(untick){(m.items||[]).forEach(it=>{it.done=false;delete it.doneAt});
    gMsTasks(m).forEach(t=>{if(t.stage==='done')setStage(t,stageRoom(t.list,'week',t)?'week':'backlog')})}},untick?'Milestone open again · tasks unticked':'Milestone open again');
  gSelId=m.id;if(gdOn)drawGoal()}
$('gfReoKeep').onclick=()=>gfReopen(false);$('gfReoAll').onclick=()=>gfReopen(true);$('gfReoNo').onclick=()=>{$('gfReo').classList.remove('on');gfReoM=null};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('gfReo').classList.contains('on')){e.preventDefault();e.stopImmediatePropagation();$('gfReo').classList.remove('on');gfReoM=null}},true);
/* every way of reopening a finished milestone (any view, the ⋯ menu) goes through the question above */
$('gdPg').addEventListener('click',e=>{const g=gById(gdId);if(!g)return;
  const ro=e.target.closest('[data-gfreo]');if(ro){e.stopPropagation();const m=g.ms.find(x=>x.id===ro.dataset.gfreo);if(m)gfReopenAsk(g,m);return}
  const tk=e.target.closest('[data-gtk]');if(tk){const m=g.ms.find(x=>x.id===tk.dataset.gtk);if(m&&m.done&&!g.done){e.preventDefault();e.stopImmediatePropagation();gfReopenAsk(g,m)}return}
  const mx=e.target.closest('[data-gmx="tk"]');if(mx){const m=gSel(g);if(m&&m.done){e.preventDefault();e.stopImmediatePropagation();const p=$('gdPop');if(p)p.classList.remove('on');gfReopenAsk(g,m)}return}
  const nv=e.target.closest('[data-gfnav]');if(nv){e.stopPropagation();const m=gSel(g),i=g.ms.indexOf(m)+(+nv.dataset.gfnav);if(g.ms[i]){gSelId=g.ms[i].id;haptic(4);drawGoal()}return}
  const fi=e.target.closest('[data-gffin]');if(fi){e.stopPropagation();const m=g.ms.find(x=>x.id===fi.dataset.gffin);if(m&&!m.done){gMkAt=Date.now();gMsToggle(g,m);drawGoal()}return}
  if(e.target.closest('[data-gfadd]')){e.stopPropagation();const c=$('gdIn').querySelector('.gf-all');if(c)c.outerHTML=`<div class="gf-card gf-empty"><span class="gf-eye">Up next</span><b class="gf-tt">Add a task</b><label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${gSel(g).id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done"></label></div>`;gFocus('#gMtIn');return}
},true);
/* Start now → focus mode on that task; Today → it moves to Today */
$('gdPg').addEventListener('click',e=>{
  const go=e.target.closest('[data-gfgo]');if(go){e.stopPropagation();const t=S.tasks.find(x=>String(x.id)===go.dataset.gfgo);if(t){haptic(8);startBlitz([t])}return}
  const td=e.target.closest('[data-gftoday]');if(td){e.stopPropagation();const t=S.tasks.find(x=>String(x.id)===td.dataset.gftoday);if(t&&t.stage!=='today'){if(!canPut(t.list,'today'))return;commit(()=>setStage(t,'today'),`${t.title} · moved to Today`);drawGoal()}return}
},true);
