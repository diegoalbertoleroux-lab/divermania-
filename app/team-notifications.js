import {execute} from './store.js';
import {connection,preview} from './config.js';
let busy=false,started=false,last=0,unread=0,account=null,inboxRevision;
export async function enableTeamNotifications(){
 if(!('Notification' in window)||!('serviceWorker' in navigator))throw new Error('Este navegador no admite notificaciones.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Activa las notificaciones en los permisos del navegador.');
 if(!('PushManager' in window)||preview)return {push:false};
 const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('La instalación todavía se está preparando. Intenta activar las notificaciones en unos momentos.')),12000))]),{publicKey}=await execute('push.key'),bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 await execute('push.subscribe',subscription.toJSON());return {push:true};
}
export function markChatRead(){unread=0;draw();}
function draw(){for(const b of document.querySelectorAll('.chat-unread')){b.hidden=!unread;b.textContent=unread>99?'99+':String(unread);}}
async function poll(){if(busy||document.hidden||!navigator.onLine||!connection.role&&!preview)return;const user=preview?'demo-owner':connection.user?.uid;if(account!==user){account=user;last=0;unread=0;inboxRevision=undefined;}busy=true;try{const r=await execute('chat.inbox',{revision:inboxRevision}),messages=r.messages||[],fresh=last?messages.filter(m=>m.actor!==user&&m.at>last):[];inboxRevision=r.revision;if(!r.unchanged)unread=Object.values(r.unread||{}).reduce((n,x)=>n+x,0);draw();if(fresh.length){window.dispatchEvent(new CustomEvent('divermania-team-message',{detail:fresh}));if('Notification' in window&&Notification.permission==='granted'){const reg=await navigator.serviceWorker?.getRegistration();reg?.showNotification('Nuevo mensaje del equipo',{body:'Abre el chat para leerlo.',tag:'divermania-team-chat',icon:'/icon.svg',data:{url:'/admin?chat=1'}});}}last=Math.max(last,r.serverNow||Date.now());}catch{}finally{busy=false;}}

export function startTeamNotifications(){draw();if(started)return;started=true;poll();setInterval(poll,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});}
