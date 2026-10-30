/* ---------- Consistency pass (0.241): the phone header inside a space and a few shared patterns ----------
   Phone, inside a space: Back (to Home) · the space switcher · search · ⋯. KPIs & OKRs and your profile live in ⋯,
   so the row matches every other page (two to four round buttons). */
(()=>{
  const hb=$('homeBtn');if(hb){hb.insertAdjacentHTML('beforeend','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>');hb.firstElementChild.classList.add('hb-home');hb.lastElementChild.classList.add('hb-back')}
  const lb=$('listBtn');if(lb)lb.insertAdjacentHTML('beforeend','<svg class="lb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>');
  const sb=$('setBtn');if(sb)sb.insertAdjacentHTML('beforebegin',`<button class="icon-btn top-more" id="topMore" aria-label="More" aria-haspopup="menu" aria-expanded="false">${DOTS3}</button>`);
  document.body.insertAdjacentHTML('beforeend','<div class="sp-pop top-pop" id="topPop" role="menu"></div>');
})();
function topPopClose(){const p=$('topPop');if(p.classList.contains('on')){p.classList.remove('on');$('topMore').setAttribute('aria-expanded','false')}}
$('topMore').addEventListener('click',e=>{
  e.stopPropagation();const p=$('topPop');if(p.classList.contains('on'))return topPopClose();
  const mx=typeof mxOn==='function'&&mxOn()&&typeof mxSpaceIn==='function'&&!!mxSpaceIn();
  p.innerHTML=(mx?`<button role="menuitem" data-tpm="mx"><span class="tp-i">${MX_ICON}</span>KPIs &amp; OKRs</button>`:'')
    +`<button role="menuitem" data-tpm="me"><span class="tp-i">${$('setBtn').innerHTML}</span>Profile &amp; settings</button>`;
  const r=$('topMore').getBoundingClientRect();p.style.top=(r.bottom+8)+'px';p.style.right=(innerWidth-r.right)+'px';
  p.classList.add('on');$('topMore').setAttribute('aria-expanded','true');haptic(5);
});
$('topPop').addEventListener('click',e=>{const b=e.target.closest('[data-tpm]');if(!b)return;topPopClose();
  if(b.dataset.tpm==='mx')mxOpenPop();else openYou()});
document.addEventListener('click',e=>{if(!e.target.closest('#topPop,#topMore'))topPopClose()});
addEventListener('keydown',e=>{if(e.key==='Escape')topPopClose()});
addEventListener('resize',topPopClose);

/* Computers, Home: the date is the small label, the title is "Home" (or your greeting), then one summary line —
   the same label + name + summary as every other page. */
$('mDate').insertAdjacentHTML('beforebegin','<div class="pg-eye m-eye" id="mEye" hidden></div>');
function cHead(){
  const e=$('mEye');if(!e)return;const spp=typeof spPage!=='undefined'&&!!spPage,home=!S.space&&!spp;
  root.dataset.sppage=spp&&!S.space?'1':''; // a space's lists page keeps its title, even with the Calm Home
  e.hidden=!home;if(!home)return;
  e.textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  if(!meName())$('mDate').textContent='Home';
  const td=S.tasks.filter(t=>shown(t)&&t.stage==='today');
  $('mSub').innerHTML=td.length?`<span><b>${td.length}</b> ${td.length===1?'task':'tasks'} today</span><span><b>${fmt(td.reduce((a,t)=>a+t.est,0))}</b> planned</span>`:'Today is clear';
}
const _cRD=renderDesk;renderDesk=function(){_cRD.apply(this,arguments);try{cHead()}catch(err){console.error(err)}};
