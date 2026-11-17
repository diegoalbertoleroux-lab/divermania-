import {copyFile,cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
const preview=process.argv.includes('--preview');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
const files=['inventario.html','ticketeras.html','imagenes.html','pase.html','areas.css','index.html','admin.html','cliente.html','televisores.html','seguimiento.html','gestion.html','assets-base.css','identidad.css','menu-divermania.css','gestion-identidad.css','qr.js','sw.js','manifest.json','icon.svg','logodivermania.png','perrosencillo.jpeg','perroespecial.jpeg','_headers'];
for(const file of files){let data=await readFile(file);if(preview&&file.endsWith('.html'))data=Buffer.from(data.toString().replace('<script type="module">','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script type="module">').replace('<script type="module" src=','<script>globalThis.DIVERMANIA_PREVIEW=true;</script><script type="module" src='));await writeFile('dist/'+file,data);}
for(const dir of ['app','shared','legacy','data','assets'])await cp(dir,'dist/'+dir,{recursive:true});
try{await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}catch{}
console.log(preview?'Vista previa preparada, sin acceso a los datos reales.':'Aplicación conectada a Firebase preparada en dist/.');
