/* ---------- Beta: newer modes live in a folded "Beta" group in Settings → Modes, and their pages wear a Beta badge ----------
   The group starts folded each time Settings opens; switching a mode on or off inside it keeps it open. */
const BETA_MD=['mx','wins','routines','plan','journal'];
let betaOpen=false;
const _btModes=modesPage;
modesPage=function(){const h=_btModes.apply(this,arguments),tpl=document.createElement('template');tpl.innerHTML=h;
  const cards=BETA_MD.map(k=>tpl.content.querySelector(`.md-card[data-md="${k}"]`)).filter(Boolean);if(!cards.length)return h;
  const on=cards.filter(c=>c.classList.contains('on')).length;
  const grp=document.createElement('div');grp.className='bt-grp'+(betaOpen?' open':'');
  grp.innerHTML=`<button class="bt-head" data-btgrp aria-expanded="${betaOpen}"><span class="bt-tag">Beta</span><span class="bt-t"><b>Try new modes</b><small>${cards.length} modes still being polished${on?` · ${on} on`:''}</small></span><svg class="bt-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg></button><div class="bt-body"${betaOpen?'':' hidden'}></div>`;
  cards[0].before(grp);const body=grp.querySelector('.bt-body');cards.forEach(c=>body.appendChild(c));
  return tpl.innerHTML};
$('setIn').addEventListener('click',e=>{const b=e.target.closest('[data-btgrp]');if(!b)return;e.stopPropagation();betaOpen=!betaOpen;haptic(4);
  const g=b.closest('.bt-grp');g.classList.toggle('open',betaOpen);b.setAttribute('aria-expanded',betaOpen);g.querySelector('.bt-body').hidden=!betaOpen},true);
const _btOpenSet=openSettings;openSettings=function(){betaOpen=false;return _btOpenSet.apply(this,arguments)};
