/* ---------- Goals page, redesigned (0.295) — the same page on phones and computers ----------
   Each goal is a card: progress, pace and its next task with Start (focus mode), so the list is a place to act.
   No date above the title, no "New goal" row (the + does that); achieved goals sit in a quiet list below.
   Nothing yet: one quiet line and a small button. The computer's sidebar "Goals" opens this page (08q). */
function gaNext(g){const m=gNext(g);if(!m)return null;const k=gKids(m).find(x=>!x.done);return k?{m,k}:{m,k:null}}
function gaCard(g){const pr=gProg(g),pc=gPace(g),dd=gDays(g),nx=gaNext(g);
  const days=g.due?(dd.n==='—'?'':`${dd.n} ${dd.t}`):'No date set';
  let next='';
  if(!pr.of)next=`<button class="ga-next" data-gopen="${g.id}"><span class="ga-nl">Next</span><span class="ga-nt">Break it into milestones</span>${CHEV}</button>`;
  else if(nx&&nx.k){const t=nx.k.kind==='t'?nx.k.t:null;
    next=`<div class="ga-next"><span class="ga-nl">Next</span><button class="ga-nt" data-gopen="${g.id}" title="Open ${esc(g.name)}">${esc(nx.k.title)}</button>${t?`<button class="ga-go" data-glgo="${t.id}">Start</button>`:`<button class="ga-op" data-gopen="${g.id}" aria-label="Open ${esc(g.name)}">${CHEV}</button>`}</div>`}
  else if(nx)next=`<button class="ga-next" data-gopen="${g.id}"><span class="ga-nl">Next</span><span class="ga-nt">Add a task to ${esc(nx.m.t)}</span>${CHEV}</button>`;
  return `<div class="ga-cw${g.star?' star':''}"><button class="ga-card" data-gopen="${g.id}">
      <span class="ga-top"><span class="ga-ic">${g.e?esc(g.e):G_FLAG}</span><span class="ga-tx"><b>${esc(g.name)}${g.star?`<i class="ga-star" title="North star">${G_STAR}</i>`:''}</b>
        <small><span>${pr.of?`${pr.n} of ${pr.of} milestones`:'No milestones yet'}</span>${days?`<span class="ga-days">${days}</span>`:''}</small></span><span class="pc pc-${pc.k}">${pc.t}</span></span>
      <span class="ns-bar"><i style="width:${Math.round(pr.p*100)}%"></i></span></button>
    ${next}${MORE(`data-gcm="${g.id}"`,`Options for ${esc(g.name)}`)}</div>`}
function gaDraw(){const y=$('goalsPg').scrollTop,gs=gAll().slice().sort((a,b)=>(b.star?1:0)-(a.star?1:0));
  $('glIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="glBack" aria-label="Back">${BACK_SVG}</button></div>
    <div class="hb-head ga-head"><h1 class="hb-h">Goals</h1><div class="hb-sub">${gs.length?gSubLine(gs):'Pick one big outcome and climb it, one step at a time.'}</div></div>
    ${gs.length?`<div class="ga-list">${gs.map(gaCard).join('')}</div>`:`<button class="ga-first" data-gnew="">${PLUS_S}Set your first goal</button>`}
    ${gWonList(gWon(null))}`;
  $('goalsPg').scrollTop=y}
/* Start → focus mode on that task */
$('goalsPg').addEventListener('click',e=>{const b=e.target.closest('[data-glgo]');if(!b)return;e.preventDefault();e.stopPropagation();
  const t=S.tasks.find(x=>String(x.id)===b.dataset.glgo);if(t){haptic(8);startBlitz([t])}},true);
