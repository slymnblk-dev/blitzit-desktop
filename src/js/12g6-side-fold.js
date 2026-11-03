/* ---------- Computer sidebar: every labelled section folds (Lists, Modes, Spaces) (0.286) ----------
   Click the label to fold or unfold; it remembers per device (localStorage "wd-sbfold"). A folded label shows how many
   items are inside. The open item stays easy to find: a folded section that holds the page you are on shows a dot.
   In the slim (icon-only) sidebar, folding is ignored so nothing becomes unreachable. */
const SB_CHEV='<svg class="sb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
let sbFold={};try{sbFold=JSON.parse(localStorage.getItem('wd-sbfold')||'{}')||{}}catch(e){}
const sbKey=lab=>(lab.textContent||'').trim().toLowerCase();
function sbWrap(){
  const sl=$('sLists');if(!sl)return;
  [...sl.querySelectorAll(':scope>.s-lbl2')].forEach(lab=>{
    const items=[];let n=lab.nextElementSibling;while(n&&!n.classList.contains('s-lbl2')){items.push(n);n=n.nextElementSibling}
    if(!items.length)return;
    const k=sbKey(lab),shut=!!sbFold[k],cnt=items.filter(x=>x.matches('.s-list:not(#sNewSp)')).length,here=items.some(x=>x.classList.contains('on')||!!x.querySelector('.on'));
    const box=document.createElement('div');box.className='sb-sec'+(shut?' shut':'');box.dataset.sb=k;
    const inn=document.createElement('div');inn.className='sb-in';items.forEach(x=>inn.appendChild(x));box.appendChild(inn);lab.after(box);
    lab.classList.add('sb-lbl');lab.setAttribute('role','button');lab.tabIndex=0;lab.setAttribute('aria-expanded',String(!shut));lab.dataset.sbk=k;
    lab.insertAdjacentHTML('beforeend',`<span class="sb-meta">${here?'<i class="sb-here" title="You are here"></i>':''}<em class="sb-n">${cnt}</em>${SB_CHEV}</span>`);
    lab.classList.toggle('shut',shut);
  });
}
function sbToggle(lab){const k=lab.dataset.sbk,box=lab.nextElementSibling;if(!k||!box||!box.classList.contains('sb-sec'))return;
  const shut=!box.classList.contains('shut');box.classList.toggle('shut',shut);lab.classList.toggle('shut',shut);lab.setAttribute('aria-expanded',String(!shut));
  if(shut)sbFold[k]=1;else delete sbFold[k];try{localStorage.setItem('wd-sbfold',JSON.stringify(sbFold))}catch(e){}haptic(4);try{sfx('fold')}catch(e){}}
document.addEventListener('click',e=>{const l=e.target.closest('#sLists .sb-lbl');if(!l)return;e.preventDefault();e.stopPropagation();sbToggle(l)},true);
document.addEventListener('keydown',e=>{const l=e.target.closest&&e.target.closest('#sLists .sb-lbl');if(l&&(e.key==='Enter'||e.key===' ')){e.preventDefault();sbToggle(l)}});
const _sbRender=render;
render=function(){const r=_sbRender.apply(this,arguments);try{sbWrap()}catch(e){}return r};
