/* ---------- Home: a line of light runs once around the Today card when you arrive on Home ----------
   The same moment as the Today column's glint on a space, in the hero's own look: a white light on the coral card
   (phone Today card, Calm column), a coral light on the Bento Today card. Then Focus / Win the day gives one soft pulse.
   Follows Settings → Today highlight, Motion off and the system's reduced motion. */
let hgHome=null,heroGlT=null;
function heroGlint(){
  if(!S.cfg.todayGlint||root.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches||S.space)return;
  const desk=matchMedia('(min-width:1100px)').matches,box=desk?$('dHome'):document.querySelector('.app');
  const g=box&&box.querySelector('.hglint');if(!g)return;
  const b=g.parentNode.querySelector('.td-go,.cm-go,.ts-go');
  g.classList.remove('run');b&&b.classList.remove('hg-pulse');void g.offsetWidth;g.classList.add('run');
  clearTimeout(heroGlT);heroGlT=setTimeout(()=>{g.classList.remove('run');if(b){b.classList.add('hg-pulse');setTimeout(()=>b.classList.remove('hg-pulse'),1000)}},1500);
}
const hgSoon=()=>setTimeout(heroGlint,350);
/* arriving on Home: on start, coming back from a space, or tapping Home in the tab bar from another page */
const _hgRender=render;render=function(d){_hgRender(d);try{const h=!S.space;if(h&&hgHome===false)hgSoon();hgHome=h}catch(err){console.error(err)}};
const _hgTab=tbGo;tbGo=function(k){const c=tabNow();_hgTab(k);if(k==='home'&&c!=='home')hgSoon()};
setTimeout(()=>{if(!S.space){hgHome=true;heroGlint()}},700);
