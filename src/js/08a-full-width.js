/* ---------- full width (computers): inside a space the sidebar hides; a top bar switches spaces and lists ---------- */
const FW_BACK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const CHEV_D='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const fwOn=()=>!!(S.cfg&&S.cfg.fullWidth&&S.space);
let fwPop=null;
function renderFullWidth(){
  const on=fwOn();$('desk').classList.toggle('fw',on);
  if(!on){$('fwNav').innerHTML='';fwPop=null;return}
  const sp=S.space==='all'?null:spaceOf(S.space),l=S.list!=='all'?S.lists.find(x=>x.id===S.list):null;
  const where=`<span>${sp?esc(sp.name):'All tasks'}</span>${l?`<span class="fw-sl">/</span><span>${esc(l.name)}</span>`:''}`;
  $('fwNav').innerHTML=`<button class="fw-back" id="fwBack" title="Home  (H)">${FW_BACK}<span>Home</span></button><span class="fw-div"></span>
    <div class="fw-crumbs"><button class="fw-pill ${fwPop?'open':''}" data-fwp="1" title="Switch space or list">${where}${CHEV_D}</button>${fwPop?fwMenu():''}</div>
    <span class="fw-sub">${$('mSub').innerHTML}</span>`;
}
/* one menu, two calm columns: spaces on the left, the lists of the space you point at on the right */
let fwFocus=null;
const fwOpenN=test=>S.tasks.filter(t=>shown(t)&&test(t)&&t.stage!=='done').length;
const FW_CH='<svg class="fw-ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
function fwMenu(){
  if(!fwFocus)fwFocus=S.space;
  const sps=orderedSpaces().map(sp=>{const ids=S.lists.filter(l=>l.space===sp.id).map(l=>l.id);
    return `<button class="fw-it fw-s ${S.space===sp.id?'cur':''} ${fwFocus===sp.id?'hov':''}" data-fwsp="${sp.id}" data-fwh="${sp.id}"><span class="fw-n">${esc(sp.name)}</span><em>${fwOpenN(t=>ids.includes(t.list))}</em>${FW_CH}</button>`}).join('');
  return `<div class="fw-menu" role="menu">
    <div class="fw-col sp"><div class="fw-scroll">${sps}<button class="fw-it fw-s ${S.space==='all'?'cur':''} ${fwFocus==='all'?'hov':''}" data-fwsp="all" data-fwh="all"><span class="fw-n">All tasks</span><em>${fwOpenN(()=>true)}</em></button></div>
      <div class="fw-foot"><button class="fw-act" data-fwact="newsp">${PLUS_S}New space</button></div></div>
    <div class="fw-col ls" id="fwLs">${fwLists()}</div></div>`;
}
function fwLists(){
  if(fwFocus==='all')return `<div class="fw-scroll"><p class="fw-note">Every task from all your spaces, in one board.</p></div>`;
  const sp=spaceOf(fwFocus);if(!sp)return '';
  const ls=S.lists.filter(l=>l.space===sp.id),here=S.space===sp.id;
  return `<div class="fw-scroll"><div class="fw-cap">${esc(sp.name)}</div>
    <button class="fw-it ${here&&S.list==='all'?'cur':''}" data-fwsp="${sp.id}" data-fwl="all"><span class="fw-n">All lists</span><em>${fwOpenN(t=>ls.some(l=>l.id===t.list))}</em></button>
    ${ls.map(l=>`<button class="fw-it ${here&&S.list===l.id?'cur':''}" data-fwsp="${sp.id}" data-fwl="${l.id}"><i class="fw-dot" style="background:${l.c}"></i><span class="fw-n">${esc(l.name)}</span><em>${fwOpenN(t=>t.list===l.id)}</em></button>`).join('')}
    <button class="fw-it fw-new" data-fwact="newl" data-fwsp="${sp.id}">${PLUS_S}<span class="fw-n">New list</span></button></div>
    <div class="fw-foot"><button class="fw-act" data-fwact="editl" data-fwsp="${sp.id}">Edit lists</button></div>`;
}
function fwClose(){if(fwPop){fwPop=null;fwFocus=null;renderFullWidth()}}
$('fwNav').addEventListener('mouseover',e=>{const h=e.target.closest('[data-fwh]');if(!h||h.dataset.fwh===fwFocus)return;fwFocus=h.dataset.fwh;
  document.querySelectorAll('.fw-s').forEach(b=>b.classList.toggle('hov',b.dataset.fwh===fwFocus));const ls=$('fwLs');if(ls)ls.innerHTML=fwLists()});
$('fwNav').addEventListener('click',e=>{
  if(e.target.closest('#fwBack')){fwPop=null;return goHome()}
  const p=e.target.closest('[data-fwp]');if(p){e.stopPropagation();fwPop=!fwPop;fwFocus=null;haptic(5);return renderFullWidth()}
  const a0=e.target.closest('[data-fwact]');if(a0){const k=a0.dataset.fwact,sp=a0.dataset.fwsp;fwPop=null;fwFocus=null;
    if(sp&&sp!==S.space)openSpaceSide(sp);else renderFullWidth();
    if(k==='newsp')return openSpaceSheet(null);
    if(k==='newl'){editing=false;nl={name:'',c:PALETTE[S.lists.length%PALETTE.length]};drawLists();openSheet('listSheet');setTimeout(()=>$('nlIn').focus(),300);return}
    if(k==='editl'){editing=true;nl=null;drawLists();openSheet('listSheet');return}}
  const s=e.target.closest('[data-fwsp]');if(s){fwPop=null;fwFocus=null;const sp=s.dataset.fwsp,l=s.dataset.fwl||'all';
    if(sp!==S.space)openSpaceSide(sp);S.list=l;haptic(5);return render()}
});
document.addEventListener('click',e=>{if(fwPop&&!e.target.closest('.fw-crumbs'))fwClose()});
document.addEventListener('keydown',e=>{if(fwPop&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();fwClose()}},true);
$('fwMe').onclick=()=>openYou();
/* "N more" / "Show less" in long columns (board and phone list) */
document.addEventListener('click',e=>{const b=e.target.closest('.more-btn[data-more]');if(!b)return;e.stopPropagation();moreOpen[b.dataset.more]=!moreOpen[b.dataset.more];haptic(5);render()},true);
