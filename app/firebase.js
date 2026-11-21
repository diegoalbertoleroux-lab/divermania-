import {firebaseConfig} from './config.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {controlRequest} from '../shared/transport.js';
import {publicFirebaseConfig} from '../shared/auth.js';
try{const response=await fetch('/api/firebase-config',{credentials:'same-origin',signal:globalThis.AbortSignal?.timeout?.(10000)});if(response.ok)Object.assign(firebaseConfig,publicFirebaseConfig(await response.json(),firebaseConfig.projectId));}catch{}
export const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp(firebaseConfig);
export const db=getFirestore(app),auth=getAuth(app);
export async function invokeAs(userAuth,type,payload={},key=crypto.randomUUID()){return controlRequest({token:await userAuth.currentUser?.getIdToken(),type,payload,key});}
export const invoke=(type,payload={},key=crypto.randomUUID())=>invokeAs(auth,type,payload,key);
