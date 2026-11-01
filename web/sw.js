const CACHE='blitzit-v263';
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(new URL(r.url).hostname.endsWith('supabase.co'))return; // never cache sync/sign-in traffic
  // pages: network first so updates show right away. On a slow connection the saved copy opens
  // after 1.5s instead of waiting; the download carries on and is saved for the next open. Offline: saved copy.
  if(r.mode==='navigate'){
    const net=fetch(r);
    e.waitUntil(net.then(res=>{if(res&&res.ok){const c=res.clone();return caches.open(CACHE).then(x=>x.put('./index.html',c))}}).catch(()=>{}));
    e.respondWith(caches.match('./index.html').then(hit=>{
      if(!hit)return net;
      const slow=new Promise(ok=>setTimeout(()=>ok(hit),1500));
      return Promise.race([net.catch(()=>hit),slow]);
    }));return;
  }
  // everything else (icons, fonts): cache first, refresh in background
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res}).catch(()=>hit);
    return hit||net;
  }));
});
