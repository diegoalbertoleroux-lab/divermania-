import {preview,firebaseConfig} from '../app/config.js';
const sdk=preview?await import('./demo-app.js'):await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
export const initializeApp=(config)=>sdk.initializeApp(preview?config:firebaseConfig);
export const getApps=(...args)=>sdk.getApps(...args);
