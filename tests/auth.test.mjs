import test from 'node:test';
import assert from 'node:assert/strict';
import {loginError,publicFirebaseConfig,demoLink} from '../shared/auth.js';

test('La configuración pública acepta solo el proyecto esperado y una clave web válida',()=>{
  const project='demo-divermania',apiKey='AIza'+'A'.repeat(35),config=publicFirebaseConfig({projectId:project,apiKey,private_key:'MUST_NOT_LEAK',authorizedDomains:['private.example']},project);
  assert.deepEqual(config,{apiKey,projectId:project,authDomain:project+'.firebaseapp.com'});
  assert.throws(()=>publicFirebaseConfig({projectId:'other',apiKey},project));
  assert.throws(()=>publicFirebaseConfig({projectId:project,apiKey:apiKey+'x'},project));
});
test('Los errores de acceso distinguen configuración, contraseña, proveedor y conexión sin mostrar el error privado',()=>{
  assert.match(loginError({code:'auth/invalid-api-key'}),/configuración/);
  assert.match(loginError({code:'auth/invalid-credential'}),/restablecer/);
  assert.match(loginError({code:'auth/operation-not-allowed'}),/habilitado/);
  assert.match(loginError({code:'auth/network-request-failed'}),/conexión/);
  assert.ok(!loginError({message:'SECRET'}).includes('SECRET'));
});
test('Los enlaces de demostración conservan mesa, sección y fragmento sin afectar enlaces externos ni producción',()=>{
  const origin='https://divermania.pages.dev';
  assert.equal(demoLink('/admin?page=inventory',true,origin),'/admin?page=inventory&demo=1');
  assert.equal(demoLink('/cliente?mesa=4#food-menu',true,origin),'/cliente?mesa=4&demo=1#food-menu');
  assert.equal(demoLink('/?view=board&kind=orders',true,origin),'/?view=board&kind=orders&demo=1');
  for(const url of ['https://wa.me/123','#help','/api/control','/assets/menu/a.jpg'])assert.equal(demoLink(url,true,origin),url);
  assert.equal(demoLink('/admin?page=inventory',false,origin),'/admin?page=inventory');
});
