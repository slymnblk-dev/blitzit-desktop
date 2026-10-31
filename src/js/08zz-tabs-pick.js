/* ---------- Phone tab bar: Home and up to 3 more (the + sits on its own) ----------
   Settings → Appearance → Tabs: Home is always there; pick up to three of your modes (Inbox, Habits, Goals, Wins, Routines, Plan…).
   S.cfg.tabs holds the picked keys; not set yet, the first three in order. Turning a mode on adds its tab while there's room.
   Modes without a tab open from the Modes button on phone Home, and their pages get a Back button.
   This file must stay last of the tab-bar wrappers (08zz), so every mode has added its tab before we choose. */
const TB_MAX=3;
const TB_CFG={inbox:'inbox',habits:'habits',goals:'goals',mx:'metrics',wins:'wins',routines:'routines',plan:'plan'};
const _tpList=tabsList;
const tbAvail=()=>_tpList().filter(x=>x[0]!=='home');
function tbPicked(sel){const av=tbAvail().map(x=>x[0]),c=sel||S.cfg.tabs;return (Array.isArray(c)?av.filter(k=>c.includes(k)):av).slice(0,TB_MAX)}
const tbHidden=()=>{const p=tbPicked();return tbAvail().filter(x=>!p.includes(x[0]))};
tabsList=function(){const t=_tpList();if(!t.length)return t;const p=tbPicked();
  const out=[t.find(x=>x[0]==='home')||['home','Home',TB_HOME],...t.filter(x=>p.includes(x[0]))];return out.length>1?out:[]};
/* a mode page whose tab isn't in the bar shows its Back button */
const _tpDraw=drawTabs;
drawTabs=function(){_tpDraw.apply(this,arguments);try{
  const cur=tabNow(),phone=!matchMedia('(min-width:1100px)').matches;
  document.body.classList.toggle('tb-off',cur!=='home'&&!tbPicked().includes(cur));
  document.body.classList.toggle('tb-more',phone&&tbHidden().length>0)}catch(e){}};
/* turning a mode on: it gets a tab while there's room */
const _tpSet=setCfg;
setCfg=function(k,v){const tk=TB_CFG[k],before=tk&&v?tbPicked():null;_tpSet.apply(this,arguments);if(!before)return;
  const tabs=Array.isArray(S.cfg.tabs)?[...S.cfg.tabs]:before;
  if(!tabs.includes(tk)&&tbPicked(tabs).length<TB_MAX)tabs.push(tk);
  S.cfg.tabs=tabs;S.cfgU=Date.now();save();drawTabs();try{drawSettings()}catch(e){}};
function tbToggle(k){const p=tbPicked(),tabs=Array.isArray(S.cfg.tabs)?S.cfg.tabs.filter(x=>x!==k):p.filter(x=>x!==k);
  if(!p.includes(k)){if(p.length>=TB_MAX){haptic([6,40,6]);return toast(`Up to ${TB_MAX} tabs next to Home. Turn one off first.`)}tabs.push(k)}
  S.cfg.tabs=tabs;S.cfgU=Date.now();save();haptic(5);drawTabs();drawSettings()}
/* Settings → Appearance (phones): the Tabs row, under "Tab bar on phones" */
function tbPickRow(){const av=tbAvail(),p=tbPicked();
  return `<div class="set-row tbp-row"><div class="set-l">Tabs<small>${av.length?`Home is always there. Pick up to ${TB_MAX} more · <b>${p.length} of ${TB_MAX}</b>`:'Turn on a mode in Settings → Modes to add tabs.'}</small></div>
    ${av.length?`<div class="tbp-list">${av.map(([k,l,ic])=>{const on=p.includes(k);return `<button class="tbp${on?' on':''}" data-tbp="${k}" aria-pressed="${on}">${TB_I[k]||ic}<span>${l}</span></button>`}).join('')}</div>`:''}</div>`}
$('setIn').addEventListener('click',e=>{const b=e.target.closest('[data-tbp]');if(!b)return;e.stopPropagation();tbToggle(b.dataset.tbp)},true);

/* phone Home: a Modes button opens the modes that have no tab */
(()=>{const s=document.querySelector('.top-r [data-srch]');if(s)s.insertAdjacentHTML('beforebegin',`<button class="icon-btn modes-btn" id="modesBtn" aria-label="Modes" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg></button>`);
  document.body.insertAdjacentHTML('beforeend','<div class="sp-pop top-pop" id="modesPop" role="menu" aria-label="Modes"></div>')})();
function modesPopClose(){const p=$('modesPop');if(p&&p.classList.contains('on')){p.classList.remove('on');$('modesBtn').setAttribute('aria-expanded','false')}}
$('modesBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('modesPop');if(p.classList.contains('on'))return modesPopClose();
  p.innerHTML=tbHidden().map(([k,l,ic])=>`<button role="menuitem" data-mdgo="${k}"><span class="tp-i">${TB_I[k]||ic}</span>${l}</button>`).join('')
    +`<button role="menuitem" data-mdgo="set" class="mdp-set"><span class="tp-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg></span>Choose tabs</button>`;
  const r=$('modesBtn').getBoundingClientRect();p.style.top=(r.bottom+8)+'px';p.style.right=(innerWidth-r.right)+'px';
  p.classList.add('on');$('modesBtn').setAttribute('aria-expanded','true');haptic(5)});
$('modesPop').addEventListener('click',e=>{const b=e.target.closest('[data-mdgo]');if(!b)return;modesPopClose();const k=b.dataset.mdgo;
  if(k==='set'){openSettings();setView='appearance';drawSettings();return}
  tbGo(k);drawTabs()});
document.addEventListener('click',e=>{if(!e.target.closest('#modesPop,#modesBtn'))modesPopClose()});
addEventListener('keydown',e=>{if(e.key==='Escape')modesPopClose()});
addEventListener('resize',modesPopClose);
