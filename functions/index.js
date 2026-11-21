// Optional emulator/legacy Functions adapter. The free deployment uses Cloudflare Pages Workers.
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import {createController} from './server/control.js';
initializeApp();
const controller=createController({db:getFirestore(),auth:getAuth()});
export const controlOperacion=onCall({region:'us-central1',cors:true,maxInstances:10},async request=>{try{return await controller.handle(request);}catch(e){throw new HttpsError(e.code||'internal',e.message);}});
export const mantenerTablero=onDocumentWritten({document:'pedidos/{id}',region:'us-central1'},controller.syncOrder);
export const mantenerEstaciones=onDocumentWritten({document:'estaciones/{id}',region:'us-central1'},controller.syncStation);
