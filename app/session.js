import {resolveRoute} from '../shared/routes.js';
import {preview,connection} from './config.js';
export let auth=null,db=null,invoke=null;
let ready=Promise.resolve();
function offlineSession(){try{const uid=localStorage.getItem('divermania.last-staff'),saved=uid&&JSON.parse(localStorage.getItem('divermania.access.'+uid)||'null');if(saved?.role){connection.user={uid};connection.access=saved;connection.role=saved.role;}connection.status='offline';}catch{}}
async function setupSession(){if(!preview&&resolveRoute(location.pathname,location.search,{view:document.documentElement.dataset.appView}).view!=='menu'&&!['track','pass'].includes(resolveRoute(location.pathname,location.search,{view:document.documentElement.dataset.appView}).view)){
 if(!navigator.onLine)offlineSession();
 else try{
  const sdk=await Promise.race([import('./firebase.js'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tiempo de conexión agotado.')),12000))]);auth=sdk.auth;db=sdk.db;invoke=sdk.invoke;
  const {onAuthStateChanged}=await import('/vendor/firebase-auth.js');
  ready=new Promise(resolve=>{let stop=()=>{};stop=onAuthStateChanged(auth,async user=>{
   try{connection.user=user;connection.role=null;if(user){await user.getIdTokenResult();connection.access=await sdk.invoke('access.me');connection.role=connection.access.role;window.dispatchEvent(new Event('divermania-session-ready'));localStorage.setItem('divermania.access.'+user.uid,JSON.stringify(connection.access));localStorage.setItem('divermania.last-staff',user.uid);}}
   catch(error){connection.role=null;connection.error=error.message;}
   finally{stop();resolve();}
  },error=>{connection.role=null;connection.error=error.message;resolve();});});
 }catch(error){connection.role=null;connection.error=navigator.onLine?'No se pudo cargar el acceso. Revisa la conexión y vuelve a abrir la aplicación.':null;if(!navigator.onLine)offlineSession();}
}
}
const startup=setupSession();
export async function sessionReady(){await startup;await ready;return connection;}
export async function waitForStaff(){await sessionReady();if(preview)return;if(!connection.role){location.replace('/admin?return='+encodeURIComponent(location.pathname+location.search));throw new Error('Acceso del equipo requerido.');}}
export async function signIn(email,password){if(preview)return;if(!navigator.onLine)throw new Error('Conéctate a internet para iniciar sesión.');const {signInWithEmailAndPassword}=await import('/vendor/firebase-auth.js');await signInWithEmailAndPassword(auth,email,password);location.reload();}
export async function resetPassword(email){if(preview)return;if(!navigator.onLine)throw new Error('Conéctate a internet para recuperar tu acceso.');const {sendPasswordResetEmail}=await import('/vendor/firebase-auth.js');await sendPasswordResetEmail(auth,email.trim());}
export async function signOut(){if(preview)return;const uid=connection.user?.uid;localStorage.removeItem('divermania.last-staff');if(uid){localStorage.removeItem('divermania.access.'+uid);localStorage.removeItem('divermania.sessions.'+uid);}localStorage.removeItem('divermania.manual-draft');if(auth){const sdk=await import('/vendor/firebase-auth.js');await sdk.signOut(auth);}location.href='/admin';}
