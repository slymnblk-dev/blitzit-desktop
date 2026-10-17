/* ---------- themes (Settings → Appearance → Themes) ----------
   Each mode keeps its Default look plus two extras: Sand and Porcelain for light, Onyx and Ember for dark.
   The app still follows Auto/Light/Dark; the chosen look is used whenever that mode is showing.
   One source of truth: these colours drive both the app (as CSS tokens) and the little preview cards. */
const THEMES={
  light:[
    {id:'default',name:'Default',sub:'Cool and neutral',v:{bg:'#F4F4F0',side:'#F4F4F0',surface:'#FFFFFF',surface2:'#ECECE7',line:'rgba(0,0,0,.08)',text:'#121316',muted:'#6C6D75',backlog:'#6B61F0',week:'#E8930C',today:'#EE3E2A',done:'#12A877'}},
    {id:'sand',name:'Sand',sub:'Warm, like paper',v:{bg:'#F1EBE1',side:'#EAE2D5',surface:'#FCFAF6',surface2:'#E8E0D3',line:'rgba(74,52,28,.10)',text:'#1F1A15',muted:'#857A6D',backlog:'#6459DE',week:'#D4840A',today:'#E2432D',done:'#13906A'}},
    {id:'porcelain',name:'Porcelain',sub:'Soft cream, airy',v:{bg:'#FAF7F2',side:'#F4F0E8',surface:'#FFFFFF',surface2:'#F0EBE2',line:'rgba(60,45,25,.08)',text:'#1A1815',muted:'#7E776D',backlog:'#675CE8',week:'#DC8C0B',today:'#E8402B',done:'#119A70'}},
  ],
  dark:[
    {id:'default',name:'Default',sub:'Deep charcoal',v:{bg:'#0F1013',side:'#0F1013',surface:'#1A1B20',surface2:'#24252B',line:'rgba(255,255,255,.07)',text:'#F3F2EE',muted:'#8C8D96',backlog:'#9C95FF',week:'#FFB547',today:'#FF5B47',done:'#34D399'}},
    {id:'onyx',name:'Onyx',sub:'True black, sharp',v:{bg:'#000000',side:'#050505',surface:'#111113',surface2:'#1B1B1E',line:'rgba(255,255,255,.085)',text:'#F6F6F3',muted:'#8B8B92',backlog:'#A29CFF',week:'#FFBC55',today:'#FF5E4A',done:'#3BDDA3'}},
    {id:'ember',name:'Ember',sub:'Warm graphite',v:{bg:'#14110F',side:'#110E0C',surface:'#201B17',surface2:'#2B2520',line:'rgba(255,232,205,.07)',text:'#F3ECE2',muted:'#9A8E81',backlog:'#A39BFF',week:'#F5B04E',today:'#FF6249',done:'#3DD09A'}},
  ]};
const themeOf=(mode,id)=>THEMES[mode].find(t=>t.id===id)||THEMES[mode][0];
/* write the extra looks as CSS once: [data-lt]/[data-dt] on <html> pick them, in whichever way the mode is chosen */
(function themeCSS(){
  const tok=v=>Object.entries(v).map(([k,x])=>`--${k}:${x}`).join(';');
  let css='';
  THEMES.light.slice(1).forEach(t=>{css+=`:root[data-theme="light"][data-lt="${t.id}"]{${tok(t.v)}}@media (prefers-color-scheme: light){:root:not([data-theme="dark"])[data-lt="${t.id}"]{${tok(t.v)}}}`});
  THEMES.dark.slice(1).forEach(t=>{css+=`:root[data-theme="dark"][data-dt="${t.id}"]{${tok(t.v)}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"])[data-dt="${t.id}"]{${tok(t.v)}}}`});
  const s=document.createElement('style');s.id='themeCSS';s.textContent=css;document.head.appendChild(s);
})();
const modeNow=()=>root.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
function themeApply(){
  const c=C();
  if(c.lightTheme&&c.lightTheme!=='default')root.dataset.lt=c.lightTheme;else delete root.dataset.lt;
  if(c.darkTheme&&c.darkTheme!=='default')root.dataset.dt=c.darkTheme;else delete root.dataset.dt;
  themeMeta();
}
/* phone status bar / browser bar follow the look */
function themeMeta(){
  const bg=getComputedStyle(root).getPropertyValue('--bg').trim();if(!bg)return;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',bg));
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>setTimeout(themeMeta,0));
/* the picker: a tiny drawing of the board in each look */
function themeCard(mode,t,on){
  const v=t.v;
  return `<button class="thc${on?' on':''}" type="button" data-thm="${mode}" data-thid="${t.id}" aria-pressed="${on}" aria-label="${t.name} ${mode} theme">
    <span class="thc-pv" style="background:${v.bg};box-shadow:inset 0 0 0 1px ${v.line}">
      <span class="thc-sd" style="background:${v.side};border-right:1px solid ${v.line}"><i style="background:${v.text}"></i><i style="background:${v.muted}"></i><i style="background:${v.muted}"></i></span>
      <span class="thc-bd">${['backlog','week','today','done'].map(k=>`<span class="thc-c${k==='today'?' td':''}" style="${k==='today'?`background:color-mix(in srgb,${v.today} 10%,${v.bg});box-shadow:inset 0 0 0 1px color-mix(in srgb,${v.today} 35%,transparent)`:''}"><b style="background:${v[k]}"></b><i style="background:${v.surface};box-shadow:0 0 0 1px ${v.line}"></i><i style="background:${v.surface};box-shadow:0 0 0 1px ${v.line}"></i>${k==='today'?`<em style="background:${v.today}"></em>`:''}</span>`).join('')}</span>
    </span>
    <span class="thc-n"><b>${t.name}</b><small>${t.sub}</small></span>
    <span class="thc-ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
  </button>`;
}
function themesSection(){
  const c=C(),cur=modeNow();
  const grp=(mode,label)=>`<div class="thg"><div class="thg-h"><span>${label}</span>${cur===mode?'<em>Showing now</em>':`<small>Used when the app is ${mode}</small>`}</div>
    <div class="thg-row">${THEMES[mode].map(t=>themeCard(mode,t,(mode==='light'?c.lightTheme:c.darkTheme||'default')===t.id||(t.id==='default'&&!(mode==='light'?c.lightTheme:c.darkTheme)))).join('')}</div></div>`;
  return `<div class="set-sec" id="themesSec"><h3>Themes</h3>${grp('light','Light')}${grp('dark','Dark')}</div>`;
}
function themePick(mode,id){
  haptic(6);sfx('toggle');
  setCfg(mode==='light'?'lightTheme':'darkTheme',id);
  // picking a look for the other mode while it isn't showing: say when it will appear
  if(modeNow()!==mode)toast(`${themeOf(mode,id).name} will show when the app is ${mode}`);
}
