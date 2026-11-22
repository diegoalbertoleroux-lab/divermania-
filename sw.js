const VERSION='divermania-v4',SHELL=VERSION+'-shell',MEDIA=VERSION+'-media';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const paths=await fetch('/precache.json',{cache:'no-store'}).then(r=>r.json());
 const cache=await caches.open(SHELL);
 await cache.addAll(paths);
 // Versioned SDK modules contain code only. Authentication and data requests stay on the network.
 await Promise.allSettled(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(async name=>{const url='https://www.gstatic.com/firebasejs/10.8.0/'+name,response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(response.ok)await cache.put(url,response);}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('divermania-')&&!name.startsWith(VERSION))await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET')return;
 const own=url.origin===self.location.origin,image=request.destination==='image';
 if(own&&url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/api/images/'))return;
 if(!own&&!url.href.startsWith('https://www.gstatic.com/firebasejs/10.8.0/')&&!image)return;
 if(image){event.respondWith((async()=>{const cache=await caches.open(MEDIA),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok||response.type==='opaque'){await cache.put(request,response.clone());const keys=await cache.keys();if(keys.length>70)await cache.delete(keys[0]);}return response;})());return;}
 event.respondWith((async()=>{const cache=await caches.open(SHELL);try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}catch(error){const cached=await cache.match(request);if(cached)return cached;if(request.mode==='navigate'){const name=url.pathname.replace(/\/$/,'').replace(/\.html$/,'');const path=name==='/admin'||name==='/gestion'?'/admin.html':name==='/cliente'||name===''?'/cliente.html':name==='/seguimiento'?'/seguimiento.html':name==='/pase'?'/pase.html':url.searchParams.get('view')==='board'?'/index.html':'/admin.html';const fallback=await cache.match(path);if(fallback)return fallback;}throw error;}})());
});
