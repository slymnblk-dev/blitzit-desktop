// Flow audit: text contrast + any Classic-only palette colour still painted, on every screen.
import { chromium } from 'playwright';
const [,,mode,size]=process.argv;
const vp=size==='desk'?{width:1400,height:900}:{width:390,height:844};
const b=await chromium.launch();const p=await b.newPage({viewport:vp});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:4173/index.html');await p.waitForFunction(()=>{try{return typeof S==='object'}catch{return false}});
await p.evaluate(m=>{S.onboarded=true;try{closeIntro()}catch(e){}Object.assign(S.cfg,{ui:'flow',motion:false,theme:m,habits:true,goals:true,mx:true,wins:true,routines:true,plan:true,journal:true,inbox:true});save();applySettings();goHome()},mode);
await p.waitForTimeout(500);
const scan=()=>{const P=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:a[0],g:a[1],b:a[2],a:a[3]===undefined?1:a[3]}};
 const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
 const mix=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
 const bgOf=el=>{const st=[];for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!=='none'){const c=P(cs.backgroundImage);if(c){st.push({...c,a:1});break}}const c=P(cs.backgroundColor);if(c&&c.a>0){st.push(c);if(c.a>=1)break}}
   let out=P(getComputedStyle(document.body).backgroundColor)||{r:0,g:0,b:0,a:1};for(let i=st.length-1;i>=0;i--)out=mix(st[i],out);return out};
 const res=[];document.querySelectorAll('body *').forEach(el=>{if(!el.childNodes.length)return;const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
  const r=el.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;const cs=getComputedStyle(el);
  if(cs.visibility==='hidden'||+cs.opacity===0)return;let o=1;for(let e=el;e;e=e.parentElement){o*=+getComputedStyle(e).opacity}if(o<.5)return;
  if(el.closest('[aria-hidden="true"],button:disabled,[disabled]'))return;
  const fg=P(cs.color);if(!fg)return;const bg=bgOf(el),f=mix(fg,bg);const l1=L(f),l2=L(bg),cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  const big=parseFloat(cs.fontSize)>=18.6||(parseFloat(cs.fontSize)>=14&&+cs.fontWeight>=700);
  if(cr<(big?3:4.5))res.push(`${cr.toFixed(2)} ${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}.${[...el.classList].slice(0,2).join('.')} "${el.textContent.trim().slice(0,24)}" fg=${cs.color} bg=rgb(${bg.r|0},${bg.g|0},${bg.b|0})`)});
 const ff=getComputedStyle(document.body).fontFamily;return {ff:ff.slice(0,10),res:[...new Set(res)]}};
const shots=JSON.parse(process.env.SHOTS||'null')||[
 ['home','goHome()'],['board',"openSpace(S.spaces[0].id);S.stage='today';render()"],['add',"goHome();document.getElementById('addBtn').click()"],
 ['detail',"closeSheets();openSpace(S.spaces[0].id);openDetail(S.tasks.find(x=>shown(x)&&x.stage!=='done'&&listOf(x.list).space===S.spaces[0].id).id)"],
 ['focus',"closeSheets();goHome();startBlitz(S.tasks.filter(t=>shown(t)&&t.stage==='today').slice(0,3))"],
 ['inbox',"document.getElementById('focus').classList.remove('on');openInbox()"],['habits',"try{closeInbox()}catch(e){};openRhythm()"],['goals',"try{closeRhythm()}catch(e){};openGoals()"],
 ['wins',"try{closeGoals()}catch(e){};openWins()"],['routines',"try{closeWins()}catch(e){};openRoutines()"],['plan',"try{closeRoutines()}catch(e){};openPlan()"],
 ['journal',"try{closePlan()}catch(e){};openJournal()"],['metrics',"try{closeJournal()}catch(e){};openMetrics()"],['settings',"try{closeMetrics()}catch(e){};openSettings()"],
 ['you',"setView='you';drawSettings()"],['review',"try{closeSettings()}catch(e){};openReview()"]];
for(const [n,f] of shots){try{await p.evaluate(f)}catch(e){errs.push(n+': '+e.message.split('\n')[0])}await p.waitForTimeout(350);const r=await p.evaluate(scan);
  if(r.res.length)console.log(`== ${n} (${r.ff})\n  `+r.res.slice(0,14).join('\n  '))}
console.log('errors',JSON.stringify(errs));await b.close();
