import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePayments} from '../shared/payments.js';
import {cashPost} from '../server/cash-ledger.js';
import {shoppingAdvice,recipeCost,identity} from '../shared/management.js';
test('Pagos mixtos conservan importes por moneda y el efectivo se concilia separado',()=>{
 const p=normalizePayments([{method:'efectivo',currency:'USD',amount:5},{method:'zelle',currency:'USD',amount:5},{method:'pago_movil',currency:'VES',rate:200,amount:2000}],2000);
 assert.equal(p.amountCents,2000);assert.equal(p.remainingCents,0);const writes=[],shift={id:'turno',status:'open',ledgerVersion:1,totals:{usd:0,ves:0,noncash:0}},snap={data:()=>shift,ref:'current'};cashPost({update:(ref,v)=>writes.push(v),set:()=>{}},{doc:p=>p},snap,p,2000);
 assert.deepEqual(writes[0].totals,{usd:500,ves:0,noncash:1500});assert.equal(writes[0].methods.pago_movil_VES,200000);
});
test('El vuelto solo se admite para efectivo y no se registra como ingreso',()=>{
 const p=normalizePayments([{method:'efectivo',currency:'VES',amount:2500,rate:200}],1000);assert.equal(p.parts[0].changeAmount,500);assert.equal(p.parts[0].originalAmount,2000);assert.equal(p.amountCents,1000);
 assert.throws(()=>normalizePayments([{method:'zelle',amount:12}],1000),/electrónico/);
 assert.throws(()=>normalizePayments([{method:'binance',currency:'USDT',amount:1,rate:0}],1000),/tasa/);
});
test('Abonos conservan el pendiente y un pago completo exige cubrirlo',()=>{
 const rows=[{method:'punto',currency:'VES',amount:600,rate:200}];assert.equal(normalizePayments(rows,1000,{partial:true}).remainingCents,700);assert.throws(()=>normalizePayments(rows,1000),/Falta completar/);assert.throws(()=>normalizePayments([{method:'efectivo',amount:-1}],1000));
});
test('Reposición usa consumo registrado y conserva mínimos cuando no hay historia',()=>{
 const now=Date.now(),inventory={a:{name:'A',unit:'und',stock:2,minStock:1},b:{name:'B',unit:'g',stock:3,minStock:10}};
 const rows=shoppingAdvice(inventory,[{type:'pedido',at:now,moves:{a:60}},{type:'devolucion',at:now,moves:{a:30}}],{now,coverage:7,lead:2});
 assert.equal(rows.find(r=>r.id==='a').suggested,7);assert.equal(rows.find(r=>r.id==='b').suggested,17);
});
test('Una receta incompleta o sin costos nunca inventa margen',()=>{assert.equal(recipeCost({recipeStatus:'pending',receta:[{id:'a',qty:1}]},{a:{unitCostUsd:2}}),null);assert.equal(recipeCost({receta:[{id:'a',qty:2}]},{}),null);assert.equal(recipeCost({receta:[{id:'a',qty:2}]},{a:{unitCostUsd:1.5}}),300);assert.equal(identity('v-12.345.678'),'V12345678');});
