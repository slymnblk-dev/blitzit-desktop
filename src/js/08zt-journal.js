/* ---------- Journal (optional mode, Settings → Modes): one line in the morning, one in the evening ----------
   Each day has one entry in S.journal: {id, d: dayKey, am: "what would make today a win?", pm: "what went well?",
   mood: 1 Low … 5 Great, en: [{at, v: 1 Low, 2 OK, 3 High}]} — synced, backed up and undoable.
   Energy is an optional part (Settings → Modes → Journal → Energy check-ins): tap how you feel, and after a few
   days Journal shows your usual day and your best hours to focus.
   Phones: a Journal tab. Computers: "Journal" under Modes, the month of moods on the left and the day on the right. */
var jrOn=false,jrDay=null,jrMonth=0;
function journalOn(){return !!(S.cfg&&S.cfg.journal)}
const jrEnergyOn=()=>journalOn()&&!!S.cfg.jEnergy;
var JR_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z"/><path d="M6 18a2 2 0 0 1 2-2h10"/><path d="M10 8h5M10 11h3"/></svg>';
const JR_SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 17a7 7 0 0 1 14 0"/><path d="M3 17h18M12 5v3M6.3 8.3l2 2M17.7 8.3l-2 2"/></svg>';
const JR_MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/></svg>';
const JR_MOODS=['Low','Meh','OK','Good','Great'];
const JR_EN=['Low','OK','High'];
/* ---------- data ---------- */
const jrAll=()=>S.journal||(S.journal=[]);
const jrGet=d=>jrAll().find(j=>j.d===d);
function jrMake(d){let j=jrGet(d);if(!j){j={id:newId(),d,am:'',pm:'',en:[]};jrAll().push(j)}return j}
const jrWritten=j=>!!(j&&(j.am.trim()||j.pm.trim()||j.mood));
const jrDays=()=>jrAll().filter(jrWritten).length;
const jrDate=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d,12)};
const jrLbl=(k,o)=>k===today()?'Today':jrDate(k).toLocaleDateString(undefined,o||{weekday:'long'});
const jrMoodCls=m=>m?['jm-lo','jm-meh','jm-ok','jm-good','jm-great'][m-1]:'';
/* the energy you usually have at each hour (last 3 weeks of check-ins) */
function jrEnergyByHour(){const from=Date.now()-21*864e5,by={};
  jrAll().forEach(j=>(j.en||[]).forEach(e=>{if(e.at<from)return;const h=new Date(e.at).getHours();(by[h]=by[h]||[]).push(e.v)}));
  const avg={};Object.keys(by).forEach(h=>avg[h]=by[h].reduce((a,b)=>a+b,0)/by[h].length);Object.defineProperty(avg,'_n',{value:by});return avg}
const jrCheckins=()=>jrAll().reduce((a,j)=>a+(j.en||[]).length,0);
function jrInsight(){const avg=jrEnergyByHour(),hs=Object.keys(avg).map(Number).sort((a,b)=>a-b);if(jrCheckins()<6||hs.length<3)return null;
  /* best two hours: the highest average over at least 3 check-ins (one lucky tap doesn't count) */
  const n=avg._n,sum=h=>(n[h]||[]).reduce((a,b)=>a+b,0),cnt=h=>(n[h]||[]).length;let best=null;
  hs.forEach(h=>{const c=cnt(h)+cnt(h+1);if(c<3)return;const v=(sum(h)+sum(h+1))/c;if(!best||v>best.v+1e-9)best={h,v}});if(!best)return null;
  const pm=hs.filter(h=>h>=12&&cnt(h)>=2),dip=pm.length?pm.reduce((a,h)=>avg[h]<avg[a]?h:a,pm[0]):null;
  return {best:best.h,dip:dip!=null&&avg[dip]<best.v?dip:null}}

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg jr-pg" id="journalPg" role="region" aria-label="Journal"><div class="ib-in" id="jrIn"></div></div>');
const jrDesk=()=>matchMedia('(min-width:1100px)').matches;
function jrDayHTML(k){const j=jrGet(k)||{am:'',pm:'',en:[]},isT=k===today(),eve=new Date().getHours()>=15;
  const moods=JR_MOODS.map((m,i)=>`<button class="jr-mood${j.mood===i+1?' on':''} ${jrMoodCls(i+1)}" data-jrmood="${i+1}" aria-pressed="${j.mood===i+1}">${m}</button>`).join('');
  return `<div class="jr-day">${isT?'':`<div class="jr-past"><span class="pg-eye">${jrDate(k).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</span><button class="jr-back" data-jrtoday>Back to today</button></div>`}
    <div class="jr-card${isT&&!eve?' now':''}"><div class="jr-q">${JR_SUN}<span>Morning · What would make ${isT?'today':'the day'} a win?</span></div>
      <textarea class="jr-in" data-jrf="am" rows="2" maxlength="600" placeholder="Write one line…" aria-label="What would make the day a win">${esc(j.am)}</textarea></div>
    <div class="jr-card${isT&&eve?' now':''}"><div class="jr-q">${JR_MOON}<span>Evening · What went well?</span></div>
      <textarea class="jr-in" data-jrf="pm" rows="2" maxlength="600" placeholder="Write one line…" aria-label="What went well">${esc(j.pm)}</textarea>
      <span class="jr-q2">How did ${isT?'today':'the day'} feel?</span><div class="jr-moods" role="group" aria-label="Mood">${moods}</div></div>
    ${jrWritten(j)?`<div class="jr-dm">${MORE(`data-jrm="${k}"`,'More for this day')}</div>`:''}</div>`}
function jrEnergyHTML(){if(!jrEnergyOn())return '';const j=jrGet(today()),n=(j&&j.en||[]).length,last=n?j.en[n-1]:null;
  const avg=jrEnergyByHour(),hs=Object.keys(avg).map(Number).sort((a,b)=>a-b),ins=jrInsight();
  const W=320,H=110,x=h=>(h-6)/(22-6)*W,y=v=>H-8-(v-1)/2*(H-24);
  const pts=hs.filter(h=>h>=6&&h<=22).map(h=>[x(h),y(avg[h])]);
  const path=pts.length>1?'M'+pts.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L'):'';
  const chart=pts.length>1?`<svg class="jr-chart" viewBox="0 0 ${W} ${H+18}" role="img" aria-label="Your usual energy through the day${ins?`: highest around ${pnHMsafe(ins.best*60)}`:''}">
      ${ins?`<rect x="${x(ins.best)-6}" y="4" width="${x(ins.best+2)-x(ins.best)+12}" height="${H-6}" rx="10" class="jr-best"/>`:''}
      <path d="${path}" class="jr-line"/>${pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" class="jr-dot"/>`).join('')}
      ${[7,10,14,19].map(h=>`<text x="${x(h)}" y="${H+14}" class="jr-ax">${h}:00</text>`).join('')}</svg>`:`<p class="jr-hint">Check in a few times a day. After a few days you'll see your usual energy here.</p>`;
  return `<div class="jr-en"><div class="jr-eh"><span class="pg-eye">Energy</span><small>${n?`${n} check-in${n===1?'':'s'} today · last ${JR_EN[last.v-1]} at ${pnHMsafe(new Date(last.at).getHours()*60+new Date(last.at).getMinutes())}`:'How is your energy right now?'}</small></div>
    <div class="jr-lvs">${JR_EN.map((l,i)=>`<button class="jr-lv lv${i+1}" data-jren="${i+1}"><i aria-hidden="true"><b></b><b></b><b></b></i>${l}</button>`).join('')}</div>
    <div class="jr-usual"><b>Your usual day</b><small>last 3 weeks</small></div>${chart}
    ${ins?`<p class="jr-tip">You focus best around <b>${pnHMsafe(ins.best*60)} – ${pnHMsafe((ins.best+2)*60)}</b>.${ins.dip!=null?` Your dip is around ${pnHMsafe(ins.dip*60)}: good for emails and calls.`:''}</p>`:''}</div>`}
const pnHMsafe=m=>`${Math.floor(m/60)%24}:${String(Math.round(m)%60).padStart(2,'0')}`;
function jrCalHTML(){const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+jrMonth);const y=base.getFullYear(),m=base.getMonth();
  const days=new Date(y,m+1,0).getDate(),lead=(new Date(y,m,1).getDay()+6)%7,t=today();
  const cells=[...Array(lead)].map(()=>'<span class="jr-c0"></span>').join('')+[...Array(days)].map((_,i)=>{const k=dkey(new Date(y,m,i+1,12)),j=jrGet(k),fut=k>t;
    return `<button class="jr-c ${j&&j.mood?jrMoodCls(j.mood):jrWritten(j)?'wr':''}${k===t?' now':''}${k===(jrDay||t)?' sel':''}" data-jrday="${k}" ${fut?'disabled':''} aria-label="${jrDate(k).toLocaleDateString(undefined,{month:'long',day:'numeric'})}${j&&j.mood?', '+JR_MOODS[j.mood-1]:jrWritten(j)?', written':''}">${i+1}</button>`}).join('');
  const hd=[1,2,3,4,5,6,0].map(d=>`<span class="jr-ch">${new Date(2024,0,7+d).toLocaleDateString(undefined,{weekday:'narrow'})}</span>`).join('');
  return `<div class="jr-cal"><div class="jr-calh"><b>${base.toLocaleDateString(undefined,{month:'long',year:y===new Date().getFullYear()?undefined:'numeric'})}</b><small>Mood each day</small>
      <div class="hp-nav"><button class="pm-btn" data-jrmon="-1" aria-label="Previous month">${ARR_L}</button><button class="pm-btn" data-jrmon="1" aria-label="Next month" ${jrMonth>=0?'disabled':''}>${ARR_R}</button></div></div>
    <div class="jr-grid">${hd}${cells}</div>
    <div class="jr-leg"><span><i class="jm-great"></i>Great</span><span><i class="jm-good"></i>Good</span><span><i class="jm-ok"></i>OK</span><span><i class="jm-meh"></i>Meh</span><span><i class="jm-lo"></i>Low</span><span><i></i>Not written</span></div></div>`}
function jrEarlierHTML(){const t=today(),list=jrAll().filter(j=>j.d<t&&jrWritten(j)).sort((a,b)=>a.d<b.d?1:-1).slice(0,jrDesk()?7:10);
  if(!list.length)return '';
  return `<span class="pg-eye jr-lbl">Earlier</span><div class="jr-list">${list.map(j=>`<button class="jr-ent" data-jrday="${j.d}"><i class="${jrMoodCls(j.mood)}"></i><span><b>${jrLbl(j.d,{weekday:'short',month:'short',day:'numeric'})}${j.mood?' · '+JR_MOODS[j.mood-1]:''}</b>${(j.pm||j.am).trim()?`<span>${esc((j.pm||j.am).trim())}</span>`:''}</span></button>`).join('')}</div>`}
function jrSummary(){const n=jrDays(),ms=jrAll().filter(j=>j.mood&&j.d.slice(0,7)===today().slice(0,7)).map(j=>j.mood);
  const avg=ms.length?ms.reduce((a,b)=>a+b,0)/ms.length:0,word=avg>=4.5?'great':avg>=3.5?'good':avg>=2.5?'OK':avg?'low':'';
  return `<b>${n}</b> ${n===1?'day':'days'} written${word&&ms.length>=3?` · mostly <b>${word}</b> this month`:' · one line is enough'}`}
function drawJournal(){if(!jrOn)return;const y=$('journalPg').scrollTop,desk=jrDesk(),k=jrDay||today();
  const head=`<div class="jr-head"><span class="pg-eye">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</span><h1 class="ib-h wn-h">Journal</h1><div class="pg-sum">${jrSummary()}</div></div>`;
  $('jrIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="jrBack" aria-label="Back">${BACK_SVG}</button></div>${head}
    ${desk?`<div class="jr-gridx"><div class="jr-l">${jrCalHTML()}${jrEnergyHTML()}</div><div class="jr-r">${jrDayHTML(k)}${jrEarlierHTML()}</div></div>`
      :`<div class="jr-col">${jrDayHTML(k)}${k===today()?jrEnergyHTML():''}${jrEarlierHTML()}${jrCalHTML()}</div>`}`;
  $('journalPg').scrollTop=y}
function openJournal(){if(!journalOn())return;
  if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();if(wnOn)closeWins();if(rtOn)closeRoutines();if(pnOn)closePlan();if(typeof closeSearch==='function')closeSearch();
  jrOn=true;jrDay=null;jrMonth=0;drawJournal();$('journalPg').classList.add('on');document.body.classList.add('ib-open');$('journalPg').scrollTop=0;haptic(5);
  if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeJournal(){if(!jrOn)return;jrSaveNow();jrOn=false;$('journalPg').classList.remove('on');if(!ibOn&&!rhOn&&!wnOn&&!rtOn&&!pnOn)document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#journalPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
/* writing saves quietly as you type (no Undo toast per letter) */
let jrT=null,jrPend=null;
function jrSaveNow(){clearTimeout(jrT);if(!jrPend)return;const {k,f,v}=jrPend;jrPend=null;const j=jrMake(k);if(j[f]!==v){j[f]=v;save();try{renderDesk()}catch(e){}}}
$('journalPg').addEventListener('input',e=>{const ta=e.target.closest('[data-jrf]');if(!ta)return;jrPend={k:jrDay||today(),f:ta.dataset.jrf,v:ta.value.slice(0,600)};clearTimeout(jrT);jrT=setTimeout(jrSaveNow,500)});
$('journalPg').addEventListener('focusout',e=>{if(e.target.closest('[data-jrf]')){jrSaveNow();setTimeout(()=>{if(jrOn&&!document.activeElement.closest('#journalPg [data-jrf]'))drawJournal()},0)}});
$('journalPg').addEventListener('keydown',e=>{if(e.target.closest('[data-jrf]')&&e.key==='Escape'){e.preventDefault();e.stopPropagation();e.target.blur()}});
$('journalPg').addEventListener('click',e=>{
  if(e.target.closest('#jrBack'))return closeJournal();
  const md=e.target.closest('[data-jrmood]');if(md){jrSaveNow();const k=jrDay||today(),v=+md.dataset.jrmood,j=jrMake(k);j.mood=j.mood===v?undefined:v;if(!j.mood)delete j.mood;save();haptic(5);try{sfx('toggle')}catch(err){}return drawJournal()}
  const en=e.target.closest('[data-jren]');if(en){const j=jrMake(today());j.en=j.en||[];j.en.push({at:Date.now(),v:+en.dataset.jren});save();haptic(6);try{sfx('done')}catch(err){}toast(`Energy: ${JR_EN[+en.dataset.jren-1]} · noted`);return drawJournal()}
  const dy=e.target.closest('[data-jrday]');if(dy){jrSaveNow();jrDay=dy.dataset.jrday===today()?null:dy.dataset.jrday;haptic(4);drawJournal();if(!jrDesk())$('journalPg').scrollTo({top:0,behavior:'smooth'});return}
  if(e.target.closest('[data-jrtoday]')){jrDay=null;return drawJournal()}
  const mo=e.target.closest('[data-jrmon]');if(mo){const n=jrMonth+ +mo.dataset.jrmon;if(n>0)return;jrMonth=n;haptic(4);return drawJournal()}
  const m=e.target.closest('[data-jrm]');if(m){e.stopPropagation();const k=m.dataset.jrm;
    cxOpen(m,[{t:'Clear this day',ic:BIN_S,warn:1,act:()=>{commit(()=>{const j=jrGet(k);if(j){j.am='';j.pm='';delete j.mood}},'Day cleared');drawJournal()}}])}});

/* ---------- keep it fresh ---------- */
const _jrRender=render;render=function(d){_jrRender(d);try{if(jrOn){if(!journalOn())closeJournal();else if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest('#journalPg [data-jrf]'))drawJournal()}}catch(err){console.error(err)}};

/* ---------- computers: "Journal" under Modes in the sidebar ---------- */
const _jrSide=rhythmSide;
rhythmSide=function(){const h=_jrSide();if(!journalOn())return h;const done=jrWritten(jrGet(today()));
  const it=`<button class="s-list s-home s-inbox ${jrOn?'on':''}" id="sJournal" title="Journal">${JR_ICON}<span class="s-name">Journal</span>${done?'<span class="n jr-sn" aria-label="Written today">✓</span>':''}</button>`;
  return h?h+it:`<div class="s-lbl2"><span class="s-name">Modes</span></div>${it}`};
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sJournal')){e.stopImmediatePropagation();return jrOn?closeJournal():openJournal()}
  if(jrOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l],#sInbox,#sRhythm,#sGoals,[data-sgoal],[data-sgnew],#sMetrics,#sWins,#sRoutines,#sPlan'))closeJournal()},true);
for(const fn of ['openInbox','openRhythm','openGoals','openGoal','goHome','openSpaceSide','openMetrics','openWins','openRoutines','openPlan']){const f=window[fn];if(typeof f!=='function')continue;
  window[fn]=function(){if(jrOn)closeJournal();return f.apply(this,arguments)}}
const _jrDesk=renderDesk;renderDesk=function(){_jrDesk.apply(this,arguments);if(jrOn){const h=$('sHome');if(h)h.classList.remove('on')}};
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!jrOn||e.defaultPrevented||$('dlg').classList.contains('on')||document.querySelector('.sheet.on,.cx-pop.on'))return;
  if(e.target&&e.target.closest&&e.target.closest('#journalPg textarea'))return;if(!jrDesk())return;e.preventDefault();closeJournal()});
ESC_PAGES.journalPg=()=>{if(jrDay){jrDay=null;return drawJournal()}closeJournal()};

/* ---------- phones: a Journal tab ---------- */
TB_I.journal=JR_ICON;
const _jrTabs=tabsList;
tabsList=function(){let t=_jrTabs();if(!journalOn())return t;t=t.length?t:[['home','Home',TB_HOME]];t.push(['journal','Journal',JR_ICON]);return t};
const _jrTabNow=tabNow;tabNow=function(){return jrOn?'journal':_jrTabNow()};
const _jrTbGo=tbGo;
tbGo=function(k){
  if(k==='journal'){if(jrOn){if(jrDay){jrDay=null;drawJournal()}$('journalPg').scrollTo({top:0,behavior:'smooth'});return}_jrTbGo('home');openJournal();return drawTabs()}
  if(jrOn)closeJournal();return _jrTbGo(k)};
/* the + on the Journal tab jumps to today's line */
document.addEventListener('click',e=>{if(!jrOn||!e.target.closest('#tbAdd'))return;e.preventDefault();e.stopImmediatePropagation();jrDay=null;drawJournal();
  const ta=$('jrIn').querySelector(`[data-jrf="${new Date().getHours()>=15?'pm':'am'}"]`);if(ta){ta.focus();ta.scrollIntoView({block:'center',behavior:'smooth'})}},true);
const _jrApply=applySettings;applySettings=function(){_jrApply.apply(this,arguments);if(jrOn&&!journalOn())closeJournal()};

/* ---------- Settings → Modes: a Journal card, with Energy as an optional part ---------- */
const _jrModes=modesPage;
modesPage=function(){const h=_jrModes.apply(this,arguments),on=journalOn();
  const card=`<div class="md-card${on?' on':''}" data-md="journal"><div class="md-head"><span class="md-ic">${JR_ICON}</span><span class="md-t"><b>Journal</b><small>One line in the morning, one at night</small></span>${tg('journal')}</div>
    ${on?`<div class="md-body"><p class="md-note">What would make today a win, what went well, and how the day felt. Your moods fill a calendar.</p>
      <div class="md-sub"><span><b>Energy check-ins</b><small>Tap how you feel during the day. Journal learns your best hours to focus.</small></span>${tg('jEnergy')}</div></div>`:''}</div>`;
  const i=h.indexOf('<div class="set-sec"><h3>Everyday');if(i<0)return h+card;const j=h.lastIndexOf('</div>',i);return h.slice(0,j)+card+h.slice(j)};
