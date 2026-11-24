import {firebaseConfig} from './config.js';
import {initializeApp,getApps} from '/vendor/firebase-app.js';
import {getFirestore} from '/vendor/firebase-firestore.js';
import {getAuth} from '/vendor/firebase-auth.js';
import {controlRequest} from '../shared/transport.js';
import {publicFirebaseConfig} from '../shared/auth.js';
try{const cached=JSON.parse(localStorage.getItem('divermania.firebase-config')||'null');if(cached&&Date.now()-cached.at<86400000)Object.assign(firebaseConfig,publicFirebaseConfig(cached.value,firebaseConfig.projectId));else{const response=await fetch('/api/firebase-config',{credentials:'same-origin',signal:globalThis.AbortSignal?.timeout?.(10000)});if(response.ok){const value=publicFirebaseConfig(await response.json(),firebaseConfig.projectId);Object.assign(firebaseConfig,value);localStorage.setItem('divermania.firebase-config',JSON.stringify({at:Date.now(),value}));}}}catch{}
export const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp(firebaseConfig);
export const db=getFirestore(app),auth=getAuth(app);
export async function invokeAs(userAuth,type,payload={},key=crypto.randomUUID()){return controlRequest({token:await userAuth.currentUser?.getIdToken(),type,payload,key});}
export const invoke=(type,payload={},key=crypto.randomUUID())=>invokeAs(auth,type,payload,key);
