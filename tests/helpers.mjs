// Shared test helpers: fake sync service, fake desktop app, quick page setup.
import { expect } from '@playwright/test';

/** A stand-in for Supabase so the app runs without a network. */
export const FAKE_SUPABASE = `window.__sb={sets:[],otps:[]};window.supabase={createClient:()=>({
  auth:{onAuthStateChange(){},setSession:async x=>{__sb.sets.push(x);return{error:null}},signInWithOtp:async o=>{__sb.otps.push(o);return{error:null}},verifyOtp:async()=>({error:null}),signOut:async()=>({})},
  from(){return{select(){return this},eq(){return this},upsert:async()=>({error:null}),maybeSingle:async()=>({data:null,error:null})}},
  channel(){return{on(){return this},subscribe(){return this}}},removeChannel(){}})};`;

/** A stand-in for the Windows app (Tauri): records every call so tests can check them. */
export const fakeDesktop = ({ latest = null, notes = '', link = null } = {}) => `window.__inv=[];window.__em=[];window.__act=null;window.__link=${JSON.stringify(link)};
window.__TAURI__={core:{invoke:async(c,a)=>{__inv.push([c,a||null]);
  if(c==='check_update')return {current:'0.5.0',latest:${JSON.stringify(latest)},notes:${JSON.stringify(notes)}};
  if(c==='take_link'){const u=window.__link;window.__link=null;return u}
  if(c==='install_update')return new Promise(()=>{});return null}},
 event:{emit:async(n,p)=>{if(n==='blitzit-state')__em.push(p)},listen:async(n,f)=>{if(n==='blitzit-act')window.__act=f;return()=>{}}}};`;

/** Opens the app with onboarding skipped. Returns the list of page errors (should stay empty). */
export async function openApp(page, { desk = null, storage = null, url = '/index.html', skipIntro = true } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  await page.addInitScript(FAKE_SUPABASE + (desk || ''));
  if (storage !== null) await page.addInitScript(s => { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('blitzit-v1', s); sessionStorage.setItem('__seeded', '1'); } }, storage);
  await page.goto(url);
  // the app's state lives in a top-level `S` (not on window), so check it by name
  await page.waitForFunction(() => { try { return typeof S === 'object' && typeof render === 'function'; } catch { return !!document.querySelector('.handoff'); } });
  if (skipIntro) await page.evaluate(() => { try { S.onboarded = true; save(); if (document.getElementById('intro').classList.contains('on')) closeIntro(); } catch {} });
  return errors;
}

export const noErrors = errors => expect(errors, errors.join('\n')).toEqual([]);
