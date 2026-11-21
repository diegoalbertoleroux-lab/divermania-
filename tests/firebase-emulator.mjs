// Run explicitly via emulators:exec. It never reads or writes the real project.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const project='demo-divermania';
assert.equal(process.env.GCLOUD_PROJECT,project,'This test only supports the demo project.');
assert.ok(process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:'),'Local Firestore emulator required.');
assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST?.startsWith('127.0.0.1:'),'Local Auth emulator required.');
const {controlOperacion}=await import('../functions/index.js');
assert.equal(typeof controlOperacion.run,'function');
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {getFirestore}=require('firebase-admin/firestore'),{getAuth}=require('firebase-admin/auth'),db=getFirestore(),auth=getAuth();
const api=`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`;
const authApi=`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
const actors={};
for(const [role,claims] of [['admin',{role:'admin'}],['cash',{role:'cash'}],['gamer',{role:'gamer'}],['screen',{screen:true,board:'orders',deviceId:'screen-test'}]]){
 const password=crypto.randomUUID();const user=await auth.createUser({email:`${role}@example.invalid`,password});await auth.setCustomUserClaims(user.uid,claims);
 const response=await fetch(authApi+'/accounts:signInWithPassword?key=emulator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,returnSecureToken:true})});assert.ok(response.ok);const {idToken}=await response.json();actors[role]={uid:user.uid,token:claims,idToken};
}
async function allowed(path,role,method='GET',body){const response=await fetch(api+'/'+path,{method,headers:{...(role?{Authorization:'Bearer '+actors[role].idToken}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return response.status;}
await db.doc('catalogo/water').set({name:'Agua 500 ml',price:1,priceCents:100,cat:'bebidas',enabled:true,inventoryMode:'unit',stockItemId:'water',receta:[]});
await db.doc('inventario/water').set({name:'Agua 500 ml',unit:'und',kind:'retail',stock:1,minStock:1});
await db.doc('clientes/private').set({name:'Cliente privado',phone:'0000000000'});
await db.doc('dispositivos/screen-test').set({revoked:false,kind:'orders'});
await db.doc('tablero_pedidos/demo').set({number:101,status:'ready',displayName:'Cliente'});
await db.doc('seguimiento/'+'a'.repeat(64)).set({number:101,status:'ready'});
assert.equal(await allowed('catalogo/water'),200);
assert.equal(await allowed('inventario/water'),403);
assert.equal(await allowed('clientes/private','screen'),403);
assert.equal(await allowed('tablero_pedidos','screen'),200);
assert.equal(await allowed('seguimiento/'+'a'.repeat(64)),200);
assert.equal(await allowed('seguimiento'),403);
await db.doc('dispositivos/screen-test').update({revoked:true});assert.equal(await allowed('tablero_pedidos','screen'),403);
assert.equal(await allowed('inventario/water','admin'),200);
for(const role of ['admin','cash','gamer'])assert.equal(await allowed('inventario/water',role,'PATCH',{fields:{stock:{integerValue:'999'}}}),403,role+' must not bypass the inventory service');
const call=(type,payload,role='admin',key=crypto.randomUUID())=>controlOperacion.run({data:{type,payload,key},auth:role?{uid:actors[role].uid,token:actors[role].token}:null,rawRequest:{ip:'127.0.0.1'}});
const orders=await Promise.allSettled([call('order.create',{name:'Una persona',items:[{productId:'water',qty:1}]},null),call('order.create',{name:'Otra persona',items:[{productId:'water',qty:1}]},null)]);
assert.equal(orders.filter(x=>x.status==='fulfilled').length,1);
assert.equal((await db.doc('inventario/water').get()).data().stock,0);
const order=orders.find(x=>x.status==='fulfilled').value;
await call('order.status',{id:order.id,status:'cancelled'},'cash');assert.equal((await db.doc('inventario/water').get()).data().stock,1);
const key=crypto.randomUUID(),purchase={id:'water',qty:2,costUsd:1};await call('inventory.purchase',purchase,'cash',key);await call('inventory.purchase',purchase,'cash',key);assert.equal((await db.doc('inventario/water').get()).data().stock,3);
await db.doc('estaciones/ps1').set({name:'Play 1',enabled:true});
const first=await call('ticket.create',{area:'play',minutes:15,childName:'Visita uno',paymentConfirmed:true},'cash'),second=await call('ticket.create',{area:'play',minutes:15,childName:'Visita dos',paymentConfirmed:true},'cash');
const starts=await Promise.allSettled([call('session.start',{id:first.id,stationId:'ps1'}),call('session.start',{id:second.id,stationId:'ps1'})]);assert.equal(starts.filter(x=>x.status==='fulfilled').length,1);
const ticket=(await db.doc('pases/'+first.id).get()).data();assert.equal(ticket.paymentRef,ticket.controlRef);
console.log('EMULATOR OK: roles, public tracking, revoked display, protected stock, last-unit concurrency, cancellation, purchase retry and exclusive Play.');
await db.terminate();
