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
/* one menu: every space with its lists underneath */
function fwMenu(){
  const open=test=>S.tasks.filter(t=>shown(t)&&test(t)&&t.stage!=='done').length;
  const group=sp=>{const ls=S.lists.filter(l=>l.space===sp.id),ids=ls.map(l=>l.id),here=S.space===sp.id;
    return `<div class="fw-g"><button class="fw-it fw-h ${here&&S.list==='all'?'on':''}" data-fwsp="${sp.id}"><span class="fw-n">${esc(sp.name)}</span><em>${open(t=>ids.includes(t.list))}</em></button>
      ${ls.length>1?ls.map(l=>`<button class="fw-it fw-l ${here&&S.list===l.id?'on':''}" data-fwsp="${sp.id}" data-fwl="${l.id}"><i class="fw-dot" style="background:${l.c}"></i><span class="fw-n">${esc(l.name)}</span><em>${open(t=>t.list===l.id)}</em></button>`).join(''):''}</div>`};
  return `<div class="fw-menu" role="menu">${orderedSpaces().map(group).join('')}
    <div class="fw-g"><button class="fw-it fw-h ${S.space==='all'?'on':''}" data-fwsp="all"><span class="fw-n">All tasks</span><em>${open(()=>true)}</em></button></div>
    <div class="fw-foot">${S.space!=='all'?`<button class="fw-act" data-fwact="newl">New list</button>`:''}<button class="fw-act" data-fwact="editl">Edit lists</button><button class="fw-act" data-fwact="newsp">New space</button></div></div>`;
}
function fwClose(){if(fwPop){fwPop=null;renderFullWidth()}}
$('fwNav').addEventListener('click',e=>{
  if(e.target.closest('#fwBack')){fwPop=null;return goHome()}
  const p=e.target.closest('[data-fwp]');if(p){e.stopPropagation();fwPop=!fwPop;haptic(5);return renderFullWidth()}
  const s=e.target.closest('[data-fwsp]');if(s){fwPop=null;const sp=s.dataset.fwsp,l=s.dataset.fwl||'all';
    if(sp!==S.space)openSpaceSide(sp);S.list=l;haptic(5);return render()}
  const a=e.target.closest('[data-fwact]');if(a){fwPop=null;renderFullWidth();const k=a.dataset.fwact;
    if(k==='newsp')return openSpaceSheet(null);
    if(k==='newl'){editing=false;nl={name:'',c:PALETTE[S.lists.length%PALETTE.length]};drawLists();openSheet('listSheet');setTimeout(()=>$('nlIn').focus(),300);return}
    if(k==='editl'){editing=true;nl=null;drawLists();openSheet('listSheet');return}}
});
document.addEventListener('click',e=>{if(fwPop&&!e.target.closest('.fw-crumbs'))fwClose()});
document.addEventListener('keydown',e=>{if(fwPop&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();fwClose()}},true);
$('fwMe').onclick=()=>openYou();
