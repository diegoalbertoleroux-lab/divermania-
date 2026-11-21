import {executePreview} from './preview-commands.js';
import {resolveRoute} from '../shared/routes.js';
import {preview,connection,firebaseConfig} from './config.js';
import {baseState,productFromCloud,orderFromCloud} from '../shared/codec.js';
import {setClockOffset} from '../shared/domain.js';
import {sessionReady} from './session.js';
const listeners=new Set();let state=baseState(),driver=null,revision=0,secondary=null,exchangeRate=null;
const params=new URLSearchParams(location.search),{view}=resolveRoute(location.pathname,location.search,{view:document.documentElement.dataset.appView,page:document.documentElement.dataset.appPage});
const publish=()=>{if(exchangeRate)state.exchangeRate=exchangeRate;state.revision=++revision;for(const fn of listeners)fn(state);};
export const readState=()=>state;
export const subscribe=fn=>{listeners.add(fn);return ()=>listeners.delete(fn);};
export async function execute(type,payload={},key=crypto.randomUUID()){if(!driver)await initialize();if(preview)return executePreview(driver,type,payload,key);if(!navigator.onLine)throw new Error('No hay conexión. La operación no se registró.');return driver.invoke(type,payload,key);}

let ratePromise=null;export function refreshRate(){if(ratePromise)return ratePromise;ratePromise=fetch('https://ve.dolarapi.com/v1/dolares/oficial',{credentials:'omit',signal:globalThis.AbortSignal?.timeout?.(10000)}).then(r=>r.json()).then(data=>{const rate=Number(data.promedio);if(!Number.isFinite(rate)||rate<=0)throw new Error('Tasa inválida');exchangeRate={value:rate,updatedAt:Date.now()};state.exchangeRate=exchangeRate;publish();return true;}).catch(()=>{state.exchangeRate??=null;publish();return false;}).finally(()=>{ratePromise=null;});return ratePromise;}
let initPromise;export function initialize(){return initPromise||(initPromise=setup());}
async function setup(){
 if(preview){driver=await import('./demo-store.js');const products=await fetch('/data/menu.json').then(r=>r.json());let s=driver.readState();if(!s.reviewMenuLoaded){s={...s,catalog:products.map(p=>productFromCloud(p.id,p)),reviewMenuLoaded:true,vouchers:[{id:'demo-voucher',ticketNumber:44,items:['hotdog','popcorn'],status:'pending',createdAt:Date.now()}],devices:[]};driver.saveState(s);}if(s.tickets.some(t=>!t.token)){s.tickets.forEach(t=>t.token||=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-',''));driver.saveState(s);}state=s;state.ordersReady=true;driver.subscribe(next=>{state=next;state.ordersReady=true;publish();});connection.status='local';publish();refreshRate();return;}
 await sessionReady();driver=await import('./firebase.js');const sdk=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
 const watch=(name,key,mapper=(id,data)=>({id,...data}),database=driver.db)=>sdk.onSnapshot(sdk.collection(database,name),snap=>{state[key]=snap.docs.map(d=>mapper(d.id,d.data()));if(key==='orders')state.ordersReady=true;connection.status='live';publish();},err=>{connection.error=err.code==='permission-denied'?'La cuenta o pantalla no tiene acceso. Revisa la autorización en Firebase.':err.message;connection.status='error';publish();});
 if(connection.role)watch('catalogo','catalog',productFromCloud);
 else sdk.onSnapshot(sdk.doc(driver.db,'menu_publico','state'),()=>driver.invoke('catalog.public').then(r=>{state.catalog=r.products.map(p=>productFromCloud(p.id,p));connection.status='live';publish();}).catch(error=>{connection.error=error.message;publish();}),error=>{connection.error=error.message;publish();});
 driver.invoke('clock').then(r=>setClockOffset(r.serverNow-Date.now())).catch(()=>{connection.error='Falta completar la conexión del servicio de control en Cloudflare.';publish();});
 // Ingredient labels come from the trusted backend, never by exposing inventory stock publicly.
 if(connection.role)driver.invoke('catalog.public').then(r=>{state.catalog=r.products.map(p=>productFromCloud(p.id,p));connection.status='live';publish();}).catch(()=>{});
 if(view==='pass'){const token=params.get('token');if(token&&/^[a-zA-Z0-9_-]{48,150}$/.test(token))sdk.onSnapshot(sdk.doc(driver.db,'pases_publicos',token),snap=>{state.tickets=snap.exists()?[{...snap.data(),token}]:[];connection.status='live';publish();},e=>{connection.error=e.message;publish();});return;}
 if(view==='track'){
  const token=params.get('token');if(token&&/^[a-zA-Z0-9_-]{8,150}$/.test(token))sdk.onSnapshot(sdk.doc(driver.db,'seguimiento',token),snap=>{state.orders=snap.exists()?[{id:token,token,...snap.data()}]:[];connection.status='live';publish();},e=>{connection.error=e.message;publish();});return;
 }
 if(view==='board'){
  const kind=params.get('kind')||'orders';let displayDb=driver.db;
  if(!connection.role){const {initializeApp,getApps}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');const {getAuth,onAuthStateChanged}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');const app=getApps().find(a=>a.name==='display')||initializeApp(firebaseConfig,'display');secondary={app,auth:getAuth(app)};const user=await new Promise(resolve=>{const stop=onAuthStateChanged(secondary.auth,u=>{stop();resolve(u);});});if(!user){connection.status='pairing';publish();return;}const token=await user.getIdTokenResult();if(token.claims.board!==kind){connection.error='Esta pantalla está vinculada a otra función.';connection.status='pairing';publish();return;}const call=()=>driver.invokeAs(secondary.auth,'device.heartbeat');try{const result=await call();connection.displayName=result.name;}catch{connection.status='pairing';publish();return;}setInterval(()=>call().catch(()=>{connection.status='pairing';connection.error='La pantalla fue desvinculada o perdió conexión.';publish();}),60000);displayDb=sdk.getFirestore(app);}
  if(kind==='orders')watch('tablero_pedidos','orders',undefined,displayDb);else{watch('tablero_sesiones','tickets',undefined,displayDb);watch('estaciones_publicas','stations',undefined,displayDb);}return;
 }
 if(!connection.role&&view!=='menu'){connection.status='login';publish();return;}
 if(connection.role){
  if(['admin','cash'].includes(connection.role)){refreshRate();for(const [collection,key] of [['transacciones','transactions'],['cxc','receivables'],['cxp','payables']])sdk.onSnapshot(sdk.collection(driver.db,collection),snap=>{state.finances??={};state.finances[key]=snap.docs.map(d=>({id:d.id,...d.data()}));publish();},error=>{connection.error=error.message;publish();});}
  watch('pedidos','orders',orderFromCloud);watch('pases','tickets');if(['admin','cash','entrance'].includes(connection.role))watch('clientes','customers');watch('estaciones','stations');if(['admin','cash'].includes(connection.role))sdk.onSnapshot(sdk.collection(driver.db,'inventario'),snap=>{state.inventory=Object.fromEntries(snap.docs.map(d=>[d.id,{id:d.id,...d.data()}]));publish();});watch('canjes','vouchers');if(connection.role==='admin')watch('dispositivos','devices');
  sdk.onSnapshot(sdk.doc(driver.db,'configuracion','control'),snap=>{state.settings=snap.data()||{};state.capacity=snap.data()?.capacity??null;publish();});
 }
}
export async function pairDisplay(code){if(preview)throw new Error('La vista previa no vincula dispositivos físicos.');const result=await driver.invoke('device.redeem',{code});const {signInWithCustomToken}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');if(!secondary)throw new Error('Vuelve a abrir la pantalla e intenta de nuevo.');await signInWithCustomToken(secondary.auth,result.token);location.href='/?view=board&kind='+encodeURIComponent(result.kind);}
window.addEventListener('offline',()=>{connection.status='offline';publish();});window.addEventListener('online',()=>{connection.status=preview?'local':'reconnecting';publish();});
