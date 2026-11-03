/* ---------- Goal page · Focus view (0.292), phone and computer ----------
   Goal › milestones › tasks › steps, built around one thing: what to do next.
   Top: the goal and a thin strip with every milestone (tap one to look at it). Then one big "Up next" card: the first open task
   of that milestone with its steps right there (tick them, add one), Start (focus mode) and Today. Then "After that": the rest.
   Choose it in the goal's ⋯ menu → View → Focus. Reuses the page's own pieces (rows, step ticks, add inputs), so every action
   works the same as in the other views. */
function gfStrip(g){const sel=gSel(g),nx=gNext(g);if(!g.ms.length)return '';
  return `<div class="gf-strip" style="--n:${g.ms.length}">${g.ms.map((m,i)=>{const ks=gKids(m),dn=ks.filter(x=>x.done).length,p=m.done?1:ks.length?dn/ks.length:0;
    return `<button class="gf-seg${m.done?' done':''}${m===nx&&!g.done?' now':''}${m===sel?' sel':''}" data-gsel="${m.id}" aria-pressed="${m===sel}" aria-label="Milestone ${i+1}: ${esc(m.t)}${m.done?', done':''}">
      <span class="gf-bar"><i style="width:${(p*100).toFixed(1)}%"></i></span><span class="gf-sl">${m.done?CK:''}${esc(m.t)}</span></button>`}).join('')}</div>`}
function gfCard(g,m){
  if(!m)return `<div class="gf-card gf-empty"><span class="gf-eye">First step</span><b class="gf-tt">Break it into milestones</b><p>A few checkpoints on the way. Then tasks, then steps.</p>${g.done?'':gAddInput('Add your first milestone')}</div>`;
  const ks=gKids(m),nx=ks.find(x=>!x.done),live=!m.done&&!g.done;
  if(!nx){const all=ks.length>0;
    return `<div class="gf-card gf-empty"><span class="gf-eye">${esc(m.t)}</span><b class="gf-tt">${m.done?'Milestone done':all?'Every task is done':'No tasks yet'}</b>
      <p>${m.done?(m.doneAt?`Done ${gShort(m.doneAt)}.`:'Done.'):all?'Tick the milestone and move on to the next one.':'Add the first task for this milestone.'}</p>
      ${all&&live?`<button class="gf-go" data-gtk="${m.id}">${CK}Mark milestone done</button>`:''}
      ${!all&&live?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${m.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(m.t)}"></label>`:''}</div>`}
  const k=nx.k,subs=nx.subs,t=nx.kind==='t'?nx.t:null,today=t&&t.stage==='today';
  const steps=subs.map(s=>`<button class="gf-st${s.done?' on':''}" data-gsub="${k}|${s.id}" aria-pressed="${!!s.done}"><span class="gf-sk">${CK}</span><span>${esc(s.t||'')}</span></button>`).join('');
  const dn=subs.filter(s=>s.done).length;
  return `<div class="gf-card"><span class="gf-eye">Up next · ${esc(m.t)}</span>
    ${t?`<button class="gf-tt" data-gtask="${t.id}" title="Open details">${esc(nx.title)}</button>`:`<b class="gf-tt">${esc(nx.title)}</b>`}
    ${t?`<small class="gf-in"><i style="background:${listOf(t.list).c}"></i>${esc(listOf(t.list).name)} · ${esc(STAGES[idx(t.stage)].name)}${t.est?` · ${fmt(t.est)}`:''}</small>`:''}
    ${subs.length?`<div class="gf-prog"><i style="width:${(dn/subs.length*100).toFixed(1)}%"></i></div>`:''}
    <div class="gf-steps">${steps}${subs.length<SUB_MAX?`<label class="gf-sadd"><span class="gm-plus">${PLUS_S}</span><input data-gsadd="${k}" placeholder="${subs.length?'Add a step':'Break it into steps'}" maxlength="200" autocomplete="off" enterkeyhint="done" aria-label="Add a step to ${esc(nx.title)}"></label>`:''}</div>
    <div class="gf-acts">${t?`<button class="gf-go" data-gfgo="${t.id}">${sunIcon()}Start now</button>${today?`<span class="gf-sec on">In Today</span>`:`<button class="gf-sec" data-gftoday="${t.id}">Today</button>`}`
      :`<button class="gf-go" data-gmt="${k}">${CK}Mark done</button>`}</div></div>`}
function gFocusView(g){
  const pr=gProg(g),dd=gDays(g),m=g.done?null:gSel(g),ks=gKids(m),nx=ks.find(x=>!x.done),rest=ks.filter(x=>x!==nx),open=rest.filter(x=>!x.done),done=rest.filter(x=>x.done),live=m&&!m.done&&!g.done;
  const eye=g.done?`Achieved · ${gShort(g.doneAt)}`:`${esc((spaceOf(g.space)||{}).name||'Goal')}${g.due?` · by ${gLong(g.due)}`:''}`;
  const meta=[g.done?'':dd.n==='—'?'No date set':`${dd.n} ${dd.t}`,pr.of?`${pr.n} of ${pr.of} milestones`:''].filter(Boolean).join(' · ');
  const after=m&&nx?`<div class="gf-after"><div class="gf-ah"><span>After that</span><small>${open.length?`${open.length} open`:''}${open.length&&done.length?' · ':''}${done.length?`${done.length} done`:''}</small></div>
      <div class="gf-list">${gCap('gf-'+m.id,[...open,...done],gRow,4,r=>r.k)}${live?`<label class="gm-add"><span class="gm-plus">${PLUS_S}</span><input id="gMtIn" data-gms="${m.id}" placeholder="Add a task" maxlength="120" autocomplete="off" enterkeyhint="done" aria-label="Add a task to ${esc(m.t)}"></label>`:''}</div></div>`:'';
  return `<div class="gf"><div class="gf-hd"><span class="gf-ge">${eye}</span><h1 class="gv-h">${g.e?`<span class="gd-e">${esc(g.e)}</span>`:''}${esc(g.name)}</h1>${meta?`<p class="gf-meta">${meta}</p>`:''}</div>
    ${gfStrip(g)}
    <div class="gf-cols"><div class="gf-main">${g.done?`<div class="gf-card gf-empty"><span class="gf-eye">Summit</span><b class="gf-tt">Goal achieved</b><p>Every step got you here.</p></div>`:gfCard(g,m)}</div>
      <div class="gf-side">${after}${gWhy(g)}${pr.of&&pr.n>=pr.of&&!g.done?`<button class="gv-win" data-gwin>${G_FLAG}Mark achieved</button>`:''}</div></div></div>`}
/* Start now → focus mode on that task; Today → it moves to Today */
$('gdPg').addEventListener('click',e=>{
  const go=e.target.closest('[data-gfgo]');if(go){e.stopPropagation();const t=S.tasks.find(x=>String(x.id)===go.dataset.gfgo);if(t){haptic(8);startBlitz([t])}return}
  const td=e.target.closest('[data-gftoday]');if(td){e.stopPropagation();const t=S.tasks.find(x=>String(x.id)===td.dataset.gftoday);if(t&&t.stage!=='today'){if(!canPut(t.list,'today'))return;commit(()=>setStage(t,'today'),`${t.title} · moved to Today`);drawGoal()}return}
},true);
