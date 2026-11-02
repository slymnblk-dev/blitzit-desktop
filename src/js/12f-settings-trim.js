/* ---------- Settings, trimmed (0.270) ----------
   Fewer switches, good defaults. These are always on now (their settings are gone): animations, the welcome
   sunrise, the Today highlight, sounds (Glass), new tasks on top, folding long columns after 5, finished tasks
   tucked under "Completed", quiet when idle (after 5 s), compact pop-out, sound at the end of a round,
   keeping the screen awake, one step at a time in focus, simple stage tabs on phones (0.271). New tasks go to the list you used last.
   Appearance: themes fold away; Home has its own card. Focus: one compact timer row. */
const TRIM_ON={motion:true,welcome:true,todayGlint:true,uiSounds:true,sfxStyle:'glass',addTo:'top',collapseLong:true,collapseAt:5,
  doneFold:true,idleHide:true,pipMode:'compact',sound:true,wake:true,fsShow:'1',bars:'tabs',weekStart:1,priSort:true};
Object.assign(S.cfg,TRIM_ON);
const HOME_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/></svg>';
const RV_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>';
const CI_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M4 18h16M7.5 18a4.5 4.5 0 0 1 9 0M12 7v3M6.2 10.2l1.7 1.7M17.8 10.2l-1.7 1.7"/></svg>';
const HAS_HAPTIC=()=>'vibrate' in navigator&&!HAS_KEYS();

/* Themes: one quiet row that opens to the pills */
var thFold=true;
function themesFold(){const c=C(),d=themeOf('dark',c.darkTheme).name,l=themeOf('light',c.lightTheme).name;
  return `<div class="set-sec th-fold${thFold?'':' open'}"><button class="th-fh" data-thfold aria-expanded="${!thFold}"><span><b>Themes</b><small>Dark: ${esc(d)} · Light: ${esc(l)}</small></span>${CHEV}</button>
    ${thFold?'':themesSection().replace('<div class="set-sec" id="themesSec"><h3>Themes</h3>','<div id="themesSec">')}</div>`}

/* Focus timer: Free | Pomodoro, and when Pomodoro, two small steppers for focus and break */
const TMR_STEPS={pomoWork:[15,20,25,30,45,50,60,90],pomoBreak:[5,10,15,20]};
function timerRow(){const c=C(),pomo=c.focusMode==='pomo';
  const st=(k,label)=>{const v=+c[k],a=TMR_STEPS[k],i=a.indexOf(v);
    return `<span class="tmr-st"><span class="tmr-l">${label}</span><button data-tmr="${k}:-1" aria-label="Shorter ${label.toLowerCase()}"${i<=0?' disabled':''}>−</button><b>${v}<small>m</small></b><button data-tmr="${k}:1" aria-label="Longer ${label.toLowerCase()}"${i>=a.length-1?' disabled':''}>+</button></span>`};
  return `<div class="tmr">${row('Timer',`<div class="segc">${sOpt('focusMode','free','Free')}${sOpt('focusMode','pomo','Pomodoro')}</div>`,pomo?'Work in rounds with short breaks':'Count up while you work')}
    ${pomo?`<div class="tmr-row">${st('pomoWork','Focus')}${st('pomoBreak','Break')}</div>`:''}</div>`}
document.addEventListener('click',e=>{
  const f=e.target.closest('#setIn [data-thfold]');if(f){thFold=!thFold;haptic(4);try{sfx('fold')}catch(err){}return drawSettings()}
  const t=e.target.closest('#setIn [data-tmr]');if(t){const [k,d]=t.dataset.tmr.split(':'),a=TMR_STEPS[k],i=Math.max(0,a.indexOf(+C()[k]));
    const n=a[Math.min(a.length-1,Math.max(0,i+(+d)))];if(n!==+C()[k]){haptic(4);setCfg(k,n)}}
},true);

/* new tasks go to the list you used last: remember the list of the newest task you added */
var trimSeen=0;
const _trimRender=render;
render=function(d){_trimRender(d);try{let top=null;for(const t of S.tasks)if(t.list&&!t.inbox&&(!top||t.id>top.id))top=t;
  if(top&&top.id>trimSeen){if(trimSeen&&S.cfg.defList!==top.list){S.cfg.defList=top.list}trimSeen=top.id}}catch(e){}};
/* these stay on even if a synced older setting says otherwise */
const _trimApply=applySettings;
applySettings=function(){Object.assign(S.cfg,TRIM_ON);if(!['ring','tint'].includes(S.cfg.priStyle))S.cfg.priStyle='ring'; /* priorities: Ring (default) or Tint (0.273) */return _trimApply.apply(this,arguments)};
