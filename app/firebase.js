import {firebaseConfig,functionsRegion} from './config.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
export const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp(firebaseConfig);
export const db=getFirestore(app),auth=getAuth(app),functions=getFunctions(app,functionsRegion);
export async function invoke(type,payload={},key=crypto.randomUUID()){try{return (await httpsCallable(functions,'controlOperacion')({type,payload,key})).data;}catch(e){const messages={'functions/not-found':'El servicio de control todavía no está publicado en Firebase. El administrador debe completar la puesta en marcha.','functions/unavailable':'No hay conexión con el servicio. Inténtalo de nuevo; conserva el mismo pedido.','functions/unauthenticated':'Inicia sesión con una cuenta autorizada del equipo.','functions/permission-denied':'Tu cuenta no tiene permiso para esta operación.'};const error=new Error(messages[e.code]||e.message||'No se pudo completar la operación.');error.code=e.code;throw error;}}
