import {demoState,applyCommand,uid} from '../shared/domain.js';
export const STORAGE='divermania.control.review.v3';
let channel;try{channel=new BroadcastChannel('divermania-control');}catch{}
const listeners=new Set();
export const readState=()=>{try{const value=JSON.parse(localStorage.getItem(STORAGE));if(value?.version===1)return value;}catch{}const value=demoState();localStorage.setItem(STORAGE,JSON.stringify(value));return value;};
export function saveState(value){try{localStorage.setItem(STORAGE,JSON.stringify(value));}catch(e){if(e.name==='QuotaExceededError')throw new Error('El almacenamiento de esta revisión está lleno. Usa una foto más pequeña, una imagen de la galería o una URL.');throw e;}channel?.postMessage('update');listeners.forEach(fn=>fn(value));}
export function subscribe(fn){listeners.add(fn);const onUpdate=()=>fn(readState());window.addEventListener('storage',onUpdate);const onMessage=()=>onUpdate();channel?.addEventListener('message',onMessage);return ()=>{listeners.delete(fn);window.removeEventListener('storage',onUpdate);channel?.removeEventListener('message',onMessage);};}
export async function execute(type,payload={},key=uid()){const task=()=>{const r=applyCommand(readState(),{type,payload,key});if(!r.duplicate)saveState(r.state);return r.result;};return navigator.locks?navigator.locks.request('divermania-state',task):task();}
export async function mutate(fn){const task=()=>{const s=readState();const result=fn(s);s.revision++;saveState(s);return result;};return navigator.locks?navigator.locks.request('divermania-state',task):task();}
