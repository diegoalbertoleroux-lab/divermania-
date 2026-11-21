import test from 'node:test';
import assert from 'node:assert/strict';
import {googleError,googleRequest,withIamRetry,inspectGoogleSetup} from '../scripts/google-setup.mjs';

test('La consulta de Authentication con OAuth de usuario indica el proyecto de cuotas',async()=>{
  const project='demo-divermania',secret='test-access-token-not-real',body={email:['admin@example.invalid']};
  const result=await googleRequest({url:'https://identitytoolkit.googleapis.com/v1/projects/'+project+'/accounts:lookup',project,token:secret,method:'POST',body,fetcher:async(url,options)=>{
    assert.equal(options.headers['X-Goog-User-Project'],project);assert.equal(options.headers.Authorization,'Bearer '+secret);assert.deepEqual(JSON.parse(options.body),body);
    if(!options.headers['X-Goog-User-Project'])return Response.json({error:{status:'PERMISSION_DENIED',message:'API requires a quota project'}},{status:403});
    return Response.json({users:[{localId:'test-admin'}]});
  }});assert.equal(result.users[0].localId,'test-admin');
});
test('Las peticiones de Google conservan el manejo de errores y no envían credenciales fuera de Google',async()=>{
  await assert.rejects(googleRequest({url:'https://outside.example/api',project:'demo-divermania',token:'private',fetcher:()=>{throw new Error('Must not fetch');}}),/Destino no autorizado/);
  const missing=await googleRequest({url:'https://iam.googleapis.com/v1/projects/demo-divermania/serviceAccounts/test',project:'demo-divermania',token:'private',allow404:true,fetcher:async()=>Response.json({error:{status:'NOT_FOUND'}},{status:404})});assert.equal(missing,null);
});

test('El error de Google identifica la petición y el argumento sin mostrar credenciales',()=>{
  const secret='test-secret-not-real',error=googleError({url:'https://iam.googleapis.com/v1/projects/demo/serviceAccounts',method:'POST',status:400,data:{error:{status:'INVALID_ARGUMENT',message:'Argument failed '+secret+' cfut_example-hidden-value'}},secrets:[secret]});
  assert.match(error.message,/POST iam.googleapis.com/);assert.match(error.message,/INVALID_ARGUMENT/);assert.ok(!error.message.includes(secret));assert.ok(!error.message.includes('cfut_example-hidden-value'));assert.ok(!error.message.includes('administra'));assert.equal(error.status,400);
});
test('Solo se repiten propagación de cuenta y conflictos; no se repite un argumento inválido',async()=>{
  let attempts=0;const delays=[];await withIamRetry(async()=>{attempts++;if(attempts<3)throw {status:400,googleMessage:'Service account pending@example.invalid does not exist.'};return true;},{pause:async ms=>delays.push(ms),log(){}});assert.equal(attempts,3);assert.deepEqual(delays,[1000,2000]);
  attempts=0;await assert.rejects(withIamRetry(async()=>{attempts++;throw googleError({url:'https://iam.googleapis.com/v1/projects/demo/serviceAccounts',status:400,data:{error:{status:'INVALID_ARGUMENT',message:'Invalid account ID.'}}});},{pause:async()=>{},log(){}}));assert.equal(attempts,1);
});
test('Los conflictos se reintentan con un límite y las denegaciones no se repiten',async()=>{
  let attempts=0;await assert.rejects(withIamRetry(async()=>{attempts++;throw {status:409,googleStatus:'ABORTED'};},{pause:async()=>{},log(){}}));assert.equal(attempts,6);
  attempts=0;await assert.rejects(withIamRetry(async()=>{attempts++;throw {status:403};},{pause:async()=>{},log(){}}));assert.equal(attempts,1);
});
test('Diagnóstico de Google consulta existencia, roles y cantidad de claves sin crear ni mostrar claves',async()=>{
  const requests=[],lines=[],project='demo-divermania',email='divermania-worker@'+project+'.iam.gserviceaccount.com';
  await inspectGoogleSetup({project,log:text=>lines.push(text),google:async(url,options={})=>{
    requests.push({url,...options});
    if(url.endsWith(':getIamPolicy'))return {bindings:[{role:'roles/datastore.user',members:['serviceAccount:'+email]}]};
    if(url.includes('/keys?'))return {keys:[{name:'DO_NOT_PRINT_KEY_RESOURCE'}]};
    return {name:'projects/'+project+'/serviceAccounts/'+email};
  }});
  assert.equal(requests.length,3);assert.equal(requests.filter(r=>r.method==='POST').length,1);assert.ok(requests.find(r=>r.method==='POST').url.endsWith(':getIamPolicy'));assert.match(lines.join('\n'),/roles\/firebaseauth.admin: pendiente/);assert.match(lines.join('\n'),/Claves de usuario registradas: 1/);assert.ok(!lines.join('\n').includes('DO_NOT_PRINT_KEY_RESOURCE'));
});
