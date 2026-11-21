import {copyFile,cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const preview=process.argv.includes('--preview');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
const files=['inventario.html','ticketeras.html','imagenes.html','pase.html','areas.css','display.css','operations.css','index.html','admin.html','cliente.html','televisores.html','seguimiento.html','gestion.html','assets-base.css','identidad.css','menu-divermania.css','gestion-identidad.css','qr.js','sw.js','manifest.json','icon.svg','logodivermania.png','perrosencillo.jpeg','perroespecial.jpeg','_headers'];
for(const file of files){let data=await readFile(file);if(preview&&file.endsWith('.html'))data=Buffer.from(data.toString().replace('<script type="module">','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script type="module">').replace('<script type="module" src=','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script type="module" src='));await writeFile('dist/'+file,data);}
for(const dir of ['app','shared','legacy','data','assets'])await cp(dir,'dist/'+dir,{recursive:true});
if(!preview){
 await build({entryPoints:['server/worker.js'],outfile:'dist/_worker.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['node:*'],minify:true});
 await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
}
try{await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}catch{}
console.log(preview?'Vista previa preparada, sin acceso a los datos reales.':'Aplicación y Worker preparados en dist/. Firebase Spark, sin Functions ni Storage.');
