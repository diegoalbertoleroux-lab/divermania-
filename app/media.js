import {preview} from './config.js';
export async function uploadMenuImage(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Selecciona una imagen JPG, PNG o WebP.');
 if(file.size>(preview?2:5)*1024*1024)throw new Error(preview?'En la revisión usa imágenes de hasta 2 MB.':'La imagen debe pesar como máximo 5 MB.');
 if(preview)return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
 // Bound uploaded photos without changing the original file on the user's disk.
 if(globalThis.createImageBitmap&&file.size>180000)try{const bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const compact=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(compact&&compact.size<file.size)file=compact;}catch{}
 const {auth}=await import('./firebase.js');if(!auth.currentUser)throw new Error('Inicia sesión como administrador.');
 const response=await fetch('/api/images',{method:'POST',headers:{Authorization:'Bearer '+await auth.currentUser.getIdToken(),'Content-Type':file.type},body:file});
 let data;try{data=await response.json();}catch{throw new Error('El servicio de imágenes todavía no está disponible.');}
 if(!response.ok||data.error)throw new Error(data.error?.message||'No se pudo subir la imagen.');
 return data.result.image;
}
