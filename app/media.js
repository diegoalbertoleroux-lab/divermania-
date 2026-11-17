import {preview} from './config.js';
export async function uploadMenuImage(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Selecciona una imagen JPG, PNG o WebP.');
 if(file.size>(preview?2:5)*1024*1024)throw new Error(preview?'En la revisión usa imágenes de hasta 2 MB.':'La imagen debe pesar como máximo 5 MB.');
 if(preview)return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
 const {app,auth}=await import('./firebase.js');if(!auth.currentUser)throw new Error('Inicia sesión como administrador.');
 const {getStorage,ref,uploadBytes,getDownloadURL}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],target=ref(getStorage(app),`menu/${auth.currentUser.uid}/${crypto.randomUUID()}.${ext}`);
 try{await uploadBytes(target,file,{contentType:file.type});return await getDownloadURL(target);}catch(e){throw new Error(e.code==='storage/unauthorized'?'La carga requiere publicar las reglas de Firebase Storage y una cuenta administradora.':'No se pudo subir la foto. Revisa que Firebase Storage esté habilitado y vuelve a intentarlo.');}
}
