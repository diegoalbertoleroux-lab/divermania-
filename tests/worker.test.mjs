import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createGoogleAuth,serviceAccountCredentials} from '../server/google-auth.js';
import {encodeFields,decodeFields} from '../server/firestore-rest.js';
import {createWorker,readLimited} from '../server/worker.js';
import {controlRequest} from '../shared/transport.js';

const project='demo-divermania',pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
const issued=Math.floor(Date.now()/1000),credentials={project_id:project,client_email:'server@demo-divermania.iam.gserviceaccount.com',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'})};
function token(changes={},headerChanges={}){const header=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid,...headerChanges})).toString('base64url'),payload=Buffer.from(JSON.stringify({aud:project,iss:'https://securetoken.google.com/'+project,sub:'admin-1',iat:issued,auth_time:issued,exp:issued+3600,role:'admin',...changes})).toString('base64url'),data=header+'.'+payload;return data+'.'+sign('RSA-SHA256',Buffer.from(data),pair.privateKey).toString('base64url');}
test('Worker comprueba firma, proyecto y vencimiento del token de Firebase',async()=>{
  let calls=0;const auth=createGoogleAuth({project,credentials,fetcher:async()=>{calls++;return Response.json({keys:[jwk]},{headers:{'Cache-Control':'public,max-age=3600'}});}});
  const verified=await auth.verifyIdToken(token());assert.equal(verified.uid,'admin-1');assert.equal(verified.token.role,'admin');
  for(const bad of [token({aud:'other'}),token({iss:'other'}),token({exp:issued-1}),token({sub:''}),token({iat:issued+3600}),token({}, {alg:'none'}),token().slice(0,-16)+'tampered'])await assert.rejects(auth.verifyIdToken(bad),e=>e.code==='unauthenticated');
  assert.equal(calls,1);
});
test('OAuth se firma dentro del servidor y reutiliza su autorización sin exponer la clave',async()=>{
  let calls=0;const auth=createGoogleAuth({project,credentials,fetcher:async(url,options)=>{calls++;assert.equal(url,'https://oauth2.googleapis.com/token');const assertion=new URLSearchParams(options.body).get('assertion'),claim=JSON.parse(Buffer.from(assertion.split('.')[1],'base64url'));assert.equal(claim.iss,credentials.client_email);assert.equal(claim.aud,url);return Response.json({access_token:'local-token',expires_in:3600});}});
  const [first,second]=await Promise.all([auth.accessToken(),auth.accessToken()]);assert.equal(first,'local-token');assert.equal(second,first);assert.equal(calls,1);
  const screen=await auth.createCustomToken('screen-1',{screen:true,board:'orders'}),claims=JSON.parse(Buffer.from(screen.split('.')[1],'base64url'));assert.equal(claims.uid,'screen-1');assert.equal(claims.claims.board,'orders');assert.ok(!screen.includes('PRIVATE KEY'));
  assert.throws(()=>serviceAccountCredentials(JSON.stringify(credentials),'other'),e=>e.code==='unavailable');
});
test('La configuración web se obtiene con la cuenta de servicio y solo expone identificadores públicos',async()=>{
  let configReads=0;const apiKey='AIza'+'A'.repeat(35);
  const auth=createGoogleAuth({project,credentials,fetcher:async(url,options)=>{
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'local-token',expires_in:3600});
    assert.equal(url,'https://identitytoolkit.googleapis.com/admin/v2/projects/'+project+'/config');assert.equal(options.headers.Authorization,'Bearer local-token');configReads++;
    return Response.json({client:{apiKey,permissions:{hidden:'SECRET'}},private_key:'SECRET',signIn:{email:{enabled:true}}});
  }});
  const [first,second]=await Promise.all([auth.publicClientConfig(),auth.publicClientConfig()]);assert.deepEqual(first,{apiKey,projectId:project,authDomain:project+'.firebaseapp.com'});assert.deepEqual(second,first);assert.equal(configReads,1);assert.ok(!JSON.stringify(first).includes('SECRET'));
});
test('El endpoint de configuración nunca devuelve claves privadas ni configuración administrativa',async()=>{
  const apiKey='AIza'+'A'.repeat(35),worker=createWorker({services:{auth:{publicClientConfig:async()=>({apiKey,private_key:'SECRET',signIn:{hidden:'SECRET'}})}}});
  const response=await worker.fetch(new Request('https://local.example/api/firebase-config'),{}),config=await response.json();assert.equal(response.status,200);assert.equal(config.apiKey,apiKey);assert.equal(config.projectId,'divermania-3f104');assert.equal(config.private_key,undefined);assert.equal(config.signIn,undefined);
});
test('Firestore REST conserva cantidades decimales, unidades, mapas y fechas',()=>{const value={qty:1.25,stock:30,unit:'g',flag:false,nothing:null,recipe:[{id:'queso',qty:20}],date:new Date('2026-01-01T00:00:00Z'),nested:{price:0},skip:undefined};const decoded=decodeFields(encodeFields(value));const expected={...value};delete expected.skip;assert.deepEqual(decoded,expected);assert.throws(()=>encodeFields({qty:NaN}));});
test('Transporte conserva la clave de reintento y la identidad de errores del checkout',async()=>{
  const key=crypto.randomUUID();let sent;const result=await controlRequest({key,type:'order.create',payload:{items:[]},token:'session',fetcher:async(url,options)=>{assert.equal(url,'/api/control');assert.equal(options.headers.Authorization,'Bearer session');sent=JSON.parse(options.body);return Response.json({result:{number:101}});}});assert.equal(sent.data.key,key);assert.equal(result.number,101);
  await assert.rejects(controlRequest({type:'order.create',fetcher:async()=>Response.json({error:{status:'FAILED_PRECONDITION',message:'Sin existencias'}},{status:409})}),e=>e.code==='functions/failed-precondition');
  await assert.rejects(controlRequest({type:'order.create',fetcher:async()=>{throw new Error();}}),e=>e.code==='functions/unavailable');
});
test('Worker rechaza otros orígenes, oculta errores internos y conserva los recursos estáticos',async()=>{
  const worker=createWorker(),env={ASSETS:{fetch:()=>new Response('asset')}};
  assert.equal(await (await worker.fetch(new Request('https://local.example/cliente'),env)).text(),'asset');
  assert.equal((await worker.fetch(new Request('https://local.example/api/control',{method:'POST',headers:{Origin:'https://other.example'}}),env)).status,403);
  const health=await (await worker.fetch(new Request('https://local.example/api/health'),env)).json();assert.equal(health.configured,false);
  const services={auth:{verifyIdToken:async()=>({uid:'cash',token:{role:'cash'}})},controller:{handle:()=>{throw new Error('SECRET');}}};const testWorker=createWorker({services});
  const response=await testWorker.fetch(new Request('https://local.example/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{type:'clock',key:crypto.randomUUID()}})}),env);assert.equal(response.status,500);assert.ok(!(await response.text()).includes('SECRET'));
});
test('Imágenes requieren administrador, contenido válido y tamaño acotado',async()=>{
  let stored=0;const storage={put:async()=>stored++},worker=createWorker({services:{auth:{verifyIdToken:async value=>({uid:value,token:{role:value}})}}});
  const request=(role,bytes,type='image/png')=>new Request('https://local.example/api/images',{method:'POST',headers:{Authorization:'Bearer '+role,'Content-Type':type},body:new Uint8Array(bytes)});
  assert.equal((await worker.fetch(request('cash',[137,80,78,71,13,10,26,10]),{MENU_IMAGES:storage})).status,403);
  assert.equal((await worker.fetch(request('admin',[60,115,99,114,105,112,116]),{MENU_IMAGES:storage})).status,400);
  const response=await worker.fetch(request('admin',[137,80,78,71,13,10,26,10]),{MENU_IMAGES:storage});assert.equal(response.status,200);assert.equal(stored,1);assert.match((await response.json()).result.image,/^\/api\/images\/.*\.png$/);
  await assert.rejects(readLimited(new Request('https://local.example',{method:'POST',body:'12345'}),4),e=>e.code==='invalid-argument');
});
