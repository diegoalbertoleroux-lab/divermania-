import {createHash} from 'node:crypto';
import {copyFile,cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const preview=process.argv.includes('--preview');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
const files=['inventario.html','ticketeras.html','imagenes.html','pase.html','workspace.css','areas.css','display.css','operations.css','index.html','admin.html','cliente.html','televisores.html','seguimiento.html','gestion.html','assets-base.css','identidad.css','menu-divermania.css','gestion-identidad.css','qr.js','sw.js','manifest.json','manifest-admin.json','icon.svg','logodivermania.png','perrosencillo.jpeg','perroespecial.jpeg','_headers'];
for(const file of files){let data=await readFile(file);if(preview&&file.endsWith('.html'))data=Buffer.from(data.toString().replace('<script type="module">','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script type="module">').replace('<script type="module" src=','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script type="module" src=').replace('<script src="/app/boot.js"','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script src="/app/boot.js"'));await writeFile('dist/'+file,data);}
for(const dir of ['app','shared','legacy','data','assets'])await cp(dir,'dist/'+dir,{recursive:true});
await build({entryPoints:['scripts/vendor/firebase-app.js','scripts/vendor/firebase-auth.js','scripts/vendor/firebase-firestore.js'],outdir:'dist/vendor',bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minify:true,chunkNames:'shared-[hash]'});
await build({entryPoints:['app/barcode-camera.js'],outfile:'dist/app/barcode-camera.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
const appFiles=await readdir('app'),sharedFiles=await readdir('shared'),vendorFiles=await readdir('dist/vendor');
await writeFile('dist/precache.json',JSON.stringify([...files.filter(f=>!f.startsWith('_')&&f!=='sw.js'),...appFiles.filter(f=>f.endsWith('.js')).map(f=>'/app/'+f),...sharedFiles.filter(f=>f.endsWith('.js')).map(f=>'/shared/'+f),...vendorFiles.map(f=>'/vendor/'+f),'/data/menu.json','/data/recipe-templates.json'].map(f=>f.startsWith('/')?f:'/'+f)));
const cachePaths=JSON.parse(await readFile('dist/precache.json','utf8')),fingerprint=createHash('sha256').update(JSON.stringify(cachePaths));for(const path of [...cachePaths].sort())fingerprint.update(await readFile('dist'+path));const cacheVersion='divermania-'+fingerprint.digest('hex').slice(0,16);await writeFile('dist/sw.js',(await readFile('sw.js','utf8')).replace("divermania-v5-personal",cacheVersion));
if(!preview){
 await build({entryPoints:['server/worker.js'],outfile:'dist/_worker.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['node:*'],minify:true});
 await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
}
try{await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}catch{}
console.log(preview?'Vista previa preparada, sin acceso a los datos reales.':'Aplicación y Worker preparados en dist/. Firebase Spark, sin Functions ni Storage.');
