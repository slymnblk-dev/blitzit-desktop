import { chromium } from 'playwright';
const [,,OUT,mode,size]=process.argv;
const vp=size==='desk'?{width:1400,height:900}:{width:390,height:844};
const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:4173/index.html');await p.waitForFunction(()=>{try{return typeof S==='object'}catch{return false}});
await p.evaluate(m=>{S.onboarded=true;try{closeIntro()}catch(e){}Object.assign(S.cfg,{ui:'flow',motion:false,theme:m,habits:true,goals:true,mx:true,wins:true,routines:true,plan:true,journal:true,inbox:true});save();applySettings();goHome()},mode);
await p.waitForTimeout(700);
const shots=process.env.SET==='2'?[
 ['goal',()=>{const g={id:'g1',name:'Run a half marathon',e:'🏃',space:S.spaces[0].id,why:'Feel strong',due:'',created:Date.now(),star:true,ms:[{id:'m0',t:'Run 5k',done:true},{id:'m1',t:'Run 10k',done:false,items:[{id:'i1',t:'Long run Sunday',done:false}]},{id:'m2',t:'Race day',done:false}]};S.goals=[g];save();openGoal('g1')}],
 ['goals2',()=>{closeGoal();openGoals()}],
 ['habits2',()=>{closeGoals();S.habits=[{id:'h1',name:'Read',e:'📖',days:[0,1,2,3,4,5,6],log:{},created:Date.now()},{id:'h2',name:'Walk',e:'🚶',days:[0,1,2,3,4,5,6],log:{},created:Date.now()}];save();openRhythm()}],
 ['menu',()=>{closeRhythm();goHome();document.getElementById('addBtn').dispatchEvent(new MouseEvent('click',{bubbles:true}))}],
 ['space',()=>{closeNw();openSpaceSheet(S.spaces[0].id)}],
 ['lists',()=>{closeSheets();openListEditor(S.lists[0].id)}],
 ['checkin',()=>{closeSheets();openCheckin()}],
 ['closeday',()=>{try{closeCheckin()}catch(e){};openCloseDay()}],
 ['intro',()=>{try{closeCloseDay()}catch(e){};openIntro()}],
 ['toast',()=>{try{closeIntro()}catch(e){};toast('Moved to My week',()=>{})}],
]:[
 ['home',()=>goHome()],
 ['board',()=>{openSpace(S.spaces[0].id);S.stage='today';render()}],
 ['add',()=>{goHome();document.getElementById('addBtn').click()}],
 ['detail',()=>{closeSheets();openSpace(S.spaces[0].id);const t=S.tasks.find(x=>shown(x)&&x.stage!=='done'&&listOf(x.list).space===S.spaces[0].id);openDetail(t.id)}],
 ['focus',()=>{closeSheets();goHome();startBlitz(S.tasks.filter(t=>shown(t)&&t.stage==='today').slice(0,3))}],
 ['search',()=>{try{endFocus&&endFocus()}catch(e){};document.getElementById('focus').classList.remove('on');openSearch()}],
 ['inbox',()=>{try{closeSearch()}catch(e){};openInbox()}],
 ['habits',()=>{try{closeInbox()}catch(e){};openRhythm()}],
 ['goals',()=>{try{closeRhythm()}catch(e){};openGoals()}],
 ['goal',()=>{const g=S.goals&&S.goals[0];if(g)openGoal(g.id)}],
 ['wins',()=>{try{closeGoal&&closeGoal()}catch(e){};try{closeGoals()}catch(e){};openWins()}],
 ['routines',()=>{try{closeWins()}catch(e){};openRoutines()}],
 ['plan',()=>{try{closeRoutines()}catch(e){};openPlan()}],
 ['journal',()=>{try{closePlan()}catch(e){};openJournal()}],
 ['metrics',()=>{try{closeJournal()}catch(e){};openMetrics()}],
 ['settings',()=>{try{closeMetrics()}catch(e){};openSettings()}],
 ['set-appear',()=>{setView='appearance';drawSettings()}],
 ['you',()=>{setView='you';drawSettings()}],
 ['review',()=>{try{closeSettings()}catch(e){};openReview()}],
];
for(const [n,f] of shots){try{await p.evaluate(`(${f.toString()})()`)}catch(e){errs.push(n+': '+e.message.split('\n')[0])}await p.waitForTimeout(450);await p.screenshot({path:`${OUT}/${size}-${mode}-${n}.png`})}
console.log(JSON.stringify(errs));await b.close();
