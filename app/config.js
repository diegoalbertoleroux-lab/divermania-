// Firebase web config identifies the existing project. It is not an administrative credential.
export const firebaseConfig={apiKey:'AIzaSyArZsARX2njLeLNBYCwu1hPyXBUU_Vg09ko',authDomain:'divermania-3f104.firebaseapp.com',projectId:'divermania-3f104',storageBucket:'divermania-3f104.firebasestorage.app',messagingSenderId:'230376484506',appId:'1:230376484506:web:7534dd68d9085f499cb923'};
export const preview=globalThis.DIVERMANIA_PREVIEW===true||(/\.divermania\.pages\.dev$/.test(location.hostname)&&location.hostname!=='divermania.pages.dev')||new URLSearchParams(location.search).get('demo')==='1';
export const staffRoles=['admin','cash','entrance','gamer','kitchen'];
export const connection={mode:preview?'preview':'firebase',status:preview?'local':'connecting',role:null,user:null,error:null};
