import {firebaseConfig} from './config.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {controlRequest} from '../shared/transport.js';
export const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp(firebaseConfig);
export const db=getFirestore(app),auth=getAuth(app);
export async function invokeAs(userAuth,type,payload={},key=crypto.randomUUID()){return controlRequest({token:await userAuth.currentUser?.getIdToken(),type,payload,key});}
export const invoke=(type,payload={},key=crypto.randomUUID())=>invokeAs(auth,type,payload,key);
