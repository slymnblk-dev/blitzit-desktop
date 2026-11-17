/* ---------- the phone's status bar takes the colour of a full-screen moment ----------
   While Focus (classic or Tide) or a routine is playing, the status bar / browser bar matches its background,
   so the screen feels whole. When it closes, the bar goes back to the app's look (themeMeta). */
const SB_IDS=['focus','tide','rtPlay'];
function sbSync(){const el=SB_IDS.map(id=>$(id)).find(x=>x&&x.classList.contains('on'));
  if(!el)return themeMeta();
  const bg=getComputedStyle(el).backgroundColor;if(!bg||bg==='rgba(0, 0, 0, 0)')return;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',bg))}
{const mo=new MutationObserver(()=>setTimeout(sbSync,30));SB_IDS.forEach(id=>{const el=$(id);if(el)mo.observe(el,{attributes:true,attributeFilter:['class','style']})})}
