// Ejecutar únicamente con credenciales administrativas obtenidas mediante el inicio de sesión autorizado.
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const [uid,role]=process.argv.slice(2);if(!uid||!['admin','cash','entrance','gamer','kitchen'].includes(role))throw new Error('Uso: node scripts/set-staff-role.mjs UID ROL');
initializeApp({credential:applicationDefault(),projectId:'divermania-3f104'});const auth=getAuth(),user=await auth.getUser(uid);await auth.setCustomUserClaims(uid,{...user.customClaims,role});console.log('Rol asignado. La persona debe volver a iniciar sesión.');
