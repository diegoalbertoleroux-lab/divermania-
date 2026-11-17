import {preview,staffRoles,connection} from './config.js';
export let auth=null,db=null,invoke=null;
let ready=Promise.resolve();
if(!preview){const sdk=await import('./firebase.js');auth=sdk.auth;db=sdk.db;invoke=sdk.invoke;const {onAuthStateChanged}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');ready=new Promise(resolve=>{const stop=onAuthStateChanged(auth,async user=>{if(user){const token=await user.getIdTokenResult();const role=token.claims.role||(token.claims.admin?'admin':null);connection.user=user;connection.role=staffRoles.includes(role)?role:null;}stop();resolve();});});}
export async function sessionReady(){await ready;return connection;}
export async function waitForStaff(){await ready;if(preview)return;await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');if(!connection.role){location.replace('/admin.html?return='+encodeURIComponent(location.pathname+location.search));throw new Error('Acceso del equipo requerido.');}}
export async function signIn(email,password){if(preview)return;const {signInWithEmailAndPassword}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');await signInWithEmailAndPassword(auth,email,password);location.reload();}
export async function signOut(){if(preview)return;const sdk=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');await sdk.signOut(auth);location.href='/admin.html';}
