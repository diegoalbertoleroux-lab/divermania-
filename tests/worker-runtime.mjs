// Runs the bundled code in workerd. All outgoing services are mocked; no business project access.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {generateKeyPairSync} from 'node:crypto';
const project='divermania-3f104',pair=generateKeyPairSync('rsa',{modulusLength:2048});
const credentials={project_id:project,client_email:'fake@'+project+'.iam.gserviceaccount.com',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'})};
let outbound=0;
const runtime=new Miniflare({modules:true,scriptPath:new URL('../dist/_worker.js',import.meta.url).pathname,compatibilityDate:'2026-04-01',compatibilityFlags:['nodejs_compat'],bindings:{FIREBASE_PROJECT_ID:project,FIREBASE_SERVICE_ACCOUNT:JSON.stringify(credentials)},kvNamespaces:['MENU_IMAGES'],serviceBindings:{ASSETS:()=>new Response('static asset')},outboundService:async request=>{
  outbound++;const url=new URL(request.url);
  if(url.hostname==='oauth2.googleapis.com')return Response.json({access_token:'fake-local-token',expires_in:3600});
  if(url.hostname==='firestore.googleapis.com'){
    if(url.pathname.endsWith('/menu_publico/state'))return Response.json({error:{status:'NOT_FOUND'}},{status:404});
    if(url.pathname.endsWith('/catalogo'))return Response.json({documents:[]});
  }
  throw new Error('Unexpected outbound request: '+url.hostname);
}});
try{
  const health=await runtime.dispatchFetch('https://local.example/api/health');assert.equal(health.status,200);assert.equal((await health.json()).images,true);
  for(const type of ['clock','catalog.public']){const response=await runtime.dispatchFetch('https://local.example/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{type,payload:{},key:crypto.randomUUID()}})});assert.equal(response.status,200,type+': '+await response.text());}
  const asset=await runtime.dispatchFetch('https://local.example/cliente');assert.equal(await asset.text(),'static asset');
  assert.ok(outbound>=3);console.log('WORKERD OK: bundled Worker, Node crypto, OAuth, catalog, KV binding and static assets. Outgoing services mocked.');
}finally{await runtime.dispose();}
