import {createHash} from 'node:crypto';
import {normalizePayments,paymentMethods,currencies} from '../shared/payments.js';
import {identity,normalizedName,childName,shoppingAdvice,recipeCost} from '../shared/management.js';
import {orderFromCloud,orderToCloud} from '../shared/codec.js';
import {normalizePhone} from '../shared/settings.js';
import {allowed} from '../shared/workspace.js';
import {cashSnapshot,cashPost} from './cash-ledger.js';
import {removeLots} from '../shared/lots.js';
import {OperationError} from './errors.js';
const digest=s=>createHash('sha256').update(s).digest('hex');
const id=v=>{if(!/^[a-zA-Z0-9_-]{1,150}$/.test(String(v||'')))throw new OperationError('invalid-argument','Identificador inválido.');return v;};
const text=v=>String(v||'').trim().slice(0,400);
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
export function createManagement({db,once}){
 return async function handle(type,p,key,actor,access){
  if(type==='order.payment'&&Array.isArray(p.payments))return once(type,p,key,actor,async(tx,now)=>{
   const [snap]=await tx.getAll(db.doc('pedidos/'+id(p.id)));const shift=await cashSnapshot(tx,db,actor);
   if(!snap.exists)throw new OperationError('not-found','Pedido no encontrado.');
   const o=orderFromCloud(snap.id,snap.data());if(o.archived||o.status==='cancelled'||o.paymentConfirmed)throw new OperationError('failed-precondition','El pedido no admite otro pago.');
   const paid=o.paidCents||0,payment=normalizePayments(p.payments,o.total-paid,{partial:true}),paidCents=paid+payment.amountCents;
   Object.assign(o,{paidCents,paymentConfirmed:paidCents===o.total,receiptRecorded:true,payment,invoiceRef:text(p.invoiceRef)||o.invoiceRef||'Control interno',paidAt:now,updatedAt:now,payments:[...(o.payments||[]),...payment.parts.map(part=>({...part,at:now,actor,key}))]});
   cashPost(tx,db,shift,payment,payment.amountCents);tx.set(snap.ref,orderToCloud(o),{merge:true});
   tx.set(db.doc('pagos_pedidos/'+key),{orderId:o.id,at:now,actor,...payment});
   return {id:o.id,order:o,paidCents,remainingCents:o.total-paidCents};
  });
  if(type==='customer.family.save')return once(type,p,key,actor,async(tx,now)=>{
   const document=identity(p.document),name=childName(p.name),phone=normalizePhone(p.phone);if(name.length<2||phone.length<10||phone.length>15||p.consent!==true)throw new OperationError('invalid-argument','Completa nombre, teléfono y consentimiento del representante.');
   const index=db.doc('identidades/'+digest(document)),phoneIndex=db.doc('identidades/phone_'+digest(phone));
   const [docIndex,phIndex,legacy]=await tx.getAll(index,phoneIndex,db.doc('clientes/'+digest(phone)));
   const customerId=p.id?id(p.id):docIndex.data()?.customerId||phIndex.data()?.customerId||(legacy.exists?legacy.id:digest(document));
   if(docIndex.exists&&docIndex.data().customerId!==customerId||phIndex.exists&&phIndex.data().customerId!==customerId)throw new OperationError('failed-precondition','El documento o teléfono ya pertenece a otra ficha.');
   const ref=db.doc('clientes/'+customerId),previous=await tx.get(ref),old=previous.data()||{};
   if(old.document&&old.document!==document)throw new OperationError('failed-precondition','No cambies la identidad de una ficha existente.');
   const children=[...(old.children||[])];for(const raw of Array.isArray(p.children)?p.children:[]){const name=childName(raw.name||raw);if(name.length<2)continue;if(!children.some(c=>normalizedName(c.name)===normalizedName(name)))children.push({id:digest(customerId+':'+normalizedName(name)).slice(0,24),name,representativeId:customerId,representativeName:childName(p.name),createdAt:now});}if(children.length>30)throw new OperationError('invalid-argument','Revisa los niños vinculados.');
   const customer={...old,id:customerId,name,document,phone,children:children.map(c=>({...c,representativeName:name})),consent:true,consentAt:old.consentAt||now,promotions:p.promotions===true,createdAt:old.createdAt||now,updatedAt:now};
   tx.set(ref,customer);tx.set(index,{customerId});tx.set(phoneIndex,{customerId});return {id:customerId,customer};
  });
  if(type==='inventory.history'){const all=rows(await db.collection('movimientos_inventario').get());return {movements:all.filter(m=>m.ingredientId===p.id||Object.hasOwn(m.moves||{},p.id)).sort((a,b)=>b.at-a.at).slice(0,200)};}
  if(type==='inventory.shopping'){const [items,moves]=await Promise.all([db.collection('inventario').get(),db.collection('movimientos_inventario').get()]);const coverage=Math.min(90,Math.max(1,Number(p.coverage)||7)),lead=Math.min(60,Math.max(0,Number(p.lead)||2));return {rows:shoppingAdvice(Object.fromEntries(rows(items).map(i=>[i.id,i])),rows(moves),{coverage,lead}),days:30,coverage,lead};}
  if(type==='supplier.list')return {suppliers:rows(await db.collection('proveedores').get()),orders:rows(await db.collection('ordenes_compra').get())};
  if(type==='supplier.save')return once(type,p,key,actor,async(tx,now)=>{if(!text(p.name))throw new OperationError('invalid-argument','Indica el proveedor.');const ref=db.doc('proveedores/'+(p.id?id(p.id):key));tx.set(ref,{name:text(p.name),phone:text(p.phone),notes:text(p.notes),leadDays:Math.min(90,Math.max(0,Number(p.leadDays)||0)),updatedAt:now,actor});return {id:ref.id};});
  if(type==='purchase.order')return once(type,p,key,actor,async(tx,now)=>{const supplier=await tx.get(db.doc('proveedores/'+id(p.supplierId)));if(!supplier.exists||!Array.isArray(p.items)||!p.items.length||p.items.length>50)throw new OperationError('invalid-argument','Selecciona proveedor y artículos.');const items=[];for(const r of p.items){if(!Number.isFinite(Number(r.qty))||Number(r.qty)<=0)throw new OperationError('invalid-argument','Cantidad inválida.');items.push({id:id(r.id),qty:Number(r.qty),received:0});}if(new Set(items.map(i=>i.id)).size!==items.length)throw new OperationError('invalid-argument','Un artículo aparece dos veces en la orden de compra.');const docs=await tx.getAll(...items.map(i=>db.doc('inventario/'+i.id)));if(docs.some(d=>!d.exists))throw new OperationError('invalid-argument','Artículo no encontrado.');tx.set(db.doc('ordenes_compra/'+key),{supplierId:p.supplierId,supplierName:supplier.data().name,items,status:'pending',createdAt:now,actor,notes:text(p.notes)});return {id:key};});
  if(type==='inventory.receive')return once(type,p,key,actor,async(tx,now)=>{
   const [snap,supplier,order]=await tx.getAll(db.doc('inventario/'+id(p.id)),db.doc('proveedores/'+id(p.supplierId)),db.doc('ordenes_compra/'+(p.purchaseOrderId?id(p.purchaseOrderId):'none')));const shift=await cashSnapshot(tx,db,actor);
   if(!snap.exists||!supplier.exists)throw new OperationError('invalid-argument','Selecciona artículo y proveedor válidos.');
   const i=snap.data(),packs=Number(p.packs),packSize=Number(p.packSize||1),qty=packs*packSize,totalCents=Math.round(Number(p.costUsd)*100);
   if(!Number.isFinite(qty)||qty<=0||qty>1e9||i.unit==='und'&&!Number.isInteger(qty)||!Number.isSafeInteger(totalCents)||totalCents<=0)throw new OperationError('invalid-argument','Revisa bultos, unidades y costo.');
   const date=p.expires?String(p.expires):null;if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new OperationError('invalid-argument','Fecha inválida.');
   let nextOrder;if(p.purchaseOrderId){const o=order.data(),line=o?.items.find(r=>r.id===p.id);if(!line||o.supplierId!==p.supplierId||line.received+qty>line.qty)throw new OperationError('failed-precondition','La recepción excede lo pendiente de la orden.');nextOrder={...o,items:o.items.map(r=>r.id===p.id?{...r,received:r.received+qty}:r)};nextOrder.status=nextOrder.items.every(r=>r.received>=r.qty)?'received':'partial';}
   const before=Number(i.stock)||0,payment=p.credit?null:normalizePayments(p.payments,totalCents),lotId=key;
   const [previousCost,lotIndex]=await tx.getAll(db.doc('costos_inventario/'+p.id),db.doc('lotes_inventario/'+p.id));const lots=(lotIndex.data()?.lots||[]).filter(l=>l.remaining>0);if(lots.length>=200)throw new OperationError('failed-precondition','Revisa los lotes activos del artículo.');lots.push({id:lotId,lot:text(p.lot)||key.slice(0,8),remaining:qty,expires:date});tx.set(db.doc('lotes_inventario/'+p.id),{lots});
   tx.update(snap.ref,{stock:before+qty,supplierId:p.supplierId,packSize,leadDays:supplier.data().leadDays||0});
   tx.set(db.doc('lotes/'+lotId),{ingredientId:p.id,name:i.name,lot:text(p.lot)||key.slice(0,8),quantity:qty,remaining:qty,expires:date,receivedAt:now,supplierId:p.supplierId});
   const weighted=before>0&&Number.isFinite(previousCost.data()?.averageCostUsd)?(before*previousCost.data().averageCostUsd+totalCents/100)/(before+qty):totalCents/100/qty;
   tx.set(db.doc('costos_inventario/'+p.id),{name:i.name,unit:i.unit,unitCostUsd:totalCents/100/qty,averageCostUsd:weighted,quantity:qty,totalUsd:totalCents/100,verifiedAt:now,actor});
   tx.set(db.doc('movimientos_inventario/'+key),{type:'purchase',ingredientId:p.id,before,after:before+qty,qty,at:now,actor,supplierId:p.supplierId,lotId});
   const description='Compra de '+qty+' '+i.unit+' de '+i.name;
   if(payment){cashPost(tx,db,shift,payment,totalCents,-1);tx.set(db.doc('transacciones/'+key),{tipo:'Compra de Insumo',amountCents:totalCents,montoUsd:totalCents/100,desc:description,fecha:new Date(now).toISOString(),supplierId:p.supplierId,...payment,actor});}
   else tx.set(db.doc('cxp/'+key),{proveedor:supplier.data().name,supplierId:p.supplierId,amountCents:totalCents,monto:totalCents/100,paidCents:0,estado:'Pendiente',fecha:new Date(now).toISOString(),description,source:'purchase',ingredientId:p.id});
   if(nextOrder)tx.set(order.ref,nextOrder);return {id:p.id,stock:before+qty,lotId};
  });
  if(type==='inventory.lots'){const [received,indexes]=await Promise.all([db.collection('lotes').get(),db.collection('lotes_inventario').get()]),active=Object.fromEntries(rows(indexes).flatMap(i=>(i.lots||[]).map(l=>[l.id,{remaining:l.remaining,requiresReview:i.requiresReview===true}])));return {lots:rows(received).filter(l=>!p.id||l.ingredientId===p.id).map(l=>({...l,remaining:active[l.id]?.remaining??0,requiresReview:active[l.id]?.requiresReview===true})).sort((a,b)=>(a.expires||'9999').localeCompare(b.expires||'9999'))};}
  if(type==='inventory.count.list')return {counts:rows(await db.collection('conteos_inventario').get()).filter(c=>c.status==='pending')};
  if(type==='inventory.count.submit')return once(type,p,key,actor,async(tx,now)=>{
   if(!Array.isArray(p.items)||!p.items.length||p.items.length>80||!text(p.reason))throw new OperationError('invalid-argument','Selecciona artículos y motivo del conteo.');
   if(new Set(p.items.map(i=>i.id)).size!==p.items.length)throw new OperationError('invalid-argument','Un artículo aparece dos veces.');
   const docs=await tx.getAll(...p.items.map(i=>db.doc('inventario/'+id(i.id))));
   const items=docs.map((snap,i)=>{const qty=Number(p.items[i].qty),old=snap.data();if(!old||!Number.isFinite(qty)||qty<0||old.unit==='und'&&!Number.isInteger(qty))throw new OperationError('invalid-argument','Cantidad de conteo inválida.');const reserved=Number(old.reserved)||0;if(qty<reserved)throw new OperationError('failed-precondition','El conteo físico es menor que las unidades reservadas. Revisa los pedidos pendientes.');return {id:snap.id,name:old.name,unit:old.unit,before:Number(old.stock)||0,reserved,physicalCounted:qty,counted:qty-reserved};});
   tx.set(db.doc('conteos_inventario/'+key),{status:'pending',items,reason:text(p.reason),createdAt:now,actor});return {id:key};
  });
  if(type==='inventory.count.approve')return once(type,p,key,actor,async(tx,now)=>{
   const snap=await tx.get(db.doc('conteos_inventario/'+id(p.id))),count=snap.data();if(!count||count.status!=='pending')throw new OperationError('failed-precondition','El conteo ya fue revisado.');
   const docs=await tx.getAll(...count.items.map(i=>db.doc('inventario/'+i.id))),indexes=await tx.getAll(...count.items.map(i=>db.doc('lotes_inventario/'+i.id)));
   for(let n=0;n<docs.length;n++)if(!docs[n].exists||(Number(docs[n].data().stock)!==count.items[n].before||Number(docs[n].data().reserved||0)!==Number(count.items[n].reserved||0)))throw new OperationError('failed-precondition','Hubo movimientos después del conteo. Repite el conteo antes de aprobar.');
   for(let n=0;n<docs.length;n++){const i=count.items[n];tx.update(docs[n].ref,{stock:i.counted});if(indexes[n].exists)tx.update(indexes[n].ref,{requiresReview:true});tx.set(db.doc('movimientos_inventario/'+key+'_'+n),{type:'count-approved',ingredientId:i.id,before:i.before,after:i.counted,qty:i.counted-i.before,reason:count.reason,countId:p.id,actor,at:now});}
   tx.update(snap.ref,{status:'approved',approvedBy:actor,approvedAt:now});return {id:p.id};
  });
  if(type==='inventory.return')return once(type,p,key,actor,async(tx,now)=>{
   const [item,supplier]=await tx.getAll(db.doc('inventario/'+id(p.id)),db.doc('proveedores/'+id(p.supplierId)));const shift=await cashSnapshot(tx,db,actor);
   const i=item.data(),qty=Number(p.qty),cents=Math.round(Number(p.amount)*100);if(!i||!supplier.exists||!Number.isFinite(qty)||qty<=0||qty>i.stock||i.unit==='und'&&!Number.isInteger(qty)||!Number.isSafeInteger(cents)||cents<=0||!text(p.reason))throw new OperationError('invalid-argument','Revisa artículo, cantidad, importe y motivo.');
   const payment=p.received?normalizePayments(p.payments,cents):null,lotIndex=await tx.get(db.doc('lotes_inventario/'+p.id));if(lotIndex.exists)tx.update(lotIndex.ref,{lots:removeLots(lotIndex.data().lots||[],qty)});
   tx.update(item.ref,{stock:i.stock-qty});tx.set(db.doc('movimientos_inventario/'+key),{type:'supplier-return',ingredientId:p.id,before:i.stock,after:i.stock-qty,qty:-qty,supplierId:p.supplierId,reason:text(p.reason),actor,at:now});
   if(payment){cashPost(tx,db,shift,payment,cents);tx.set(db.doc('transacciones/'+key),{tipo:'Ingreso (Devolución proveedor)',amountCents:cents,montoUsd:cents/100,desc:text(p.reason),supplierId:p.supplierId,fecha:new Date(now).toISOString(),...payment,actor});}
   else tx.set(db.doc('cxc/'+key),{cliente:supplier.data().name,amountCents:cents,monto:cents/100,estado:'Pendiente',fecha:new Date(now).toISOString(),description:'Devolución a proveedor · '+text(p.reason),supplierId:p.supplierId});
   return {id:p.id,stock:i.stock-qty};
  });
  if(type==='inventory.lot.count')return once(type,p,key,actor,async(tx,now)=>{
   if(!Array.isArray(p.lots)||p.lots.length>200||new Set(p.lots.map(l=>l.id)).size!==p.lots.length)throw new OperationError('invalid-argument','Revisa los lotes del conteo.');
   const item=await tx.get(db.doc('inventario/'+id(p.id))),received=p.lots.length?await tx.getAll(...p.lots.map(l=>db.doc('lotes/'+id(l.id)))):[];if(!item.exists)throw new OperationError('not-found','Artículo no encontrado.');
   const lots=received.map((snap,n)=>{const value=snap.data(),remaining=Number(p.lots[n].remaining);if(!value||value.ingredientId!==p.id||!Number.isFinite(remaining)||remaining<0||item.data().unit==='und'&&!Number.isInteger(remaining))throw new OperationError('invalid-argument','Revisa el lote y su cantidad física.');return {id:snap.id,lot:value.lot,expires:value.expires||null,remaining};});
   if(lots.reduce((n,l)=>n+l.remaining,0)>item.data().stock)throw new OperationError('invalid-argument','Los lotes superan la existencia total.');
   tx.set(db.doc('lotes_inventario/'+p.id),{lots:lots.filter(l=>l.remaining>0),requiresReview:false,countedAt:now,actor});return {id:p.id};
  });
  if(type==='finance.reconcile'){
   const from=Number(p.from)||0,to=Number(p.to)||Date.now(),counted=Math.round(Number(p.counted)*100);if(!Number.isSafeInteger(counted)||!paymentMethods[p.method]||!currencies.includes(p.currency)||to<from||to>Date.now()+1000)throw new OperationError('invalid-argument','Revisa período e importe comprobado.');
   const report=await handle('finance.report',{from,to},key,actor,access),expected=Math.round((report.methods[p.method+' · '+p.currency]?.amount||0)*100);
   return once(type,p,key,actor,async(tx,now)=>{tx.set(db.doc('conciliaciones/'+key),{from,to,method:p.method,currency:p.currency,expectedCents:expected,countedCents:counted,differenceCents:counted-expected,notes:text(p.notes),actor,at:now});return {id:key,expectedCents:expected,differenceCents:counted-expected};});
  }
  if(type==='finance.report'){
   const costsAllowed=allowed(access,'costs');
   const [orders,transactions,products,costs,shifts]=await Promise.all(['pedidos','transacciones','catalogo','costos_inventario','turnos'].map(c=>c==='costos_inventario'&&!costsAllowed?{docs:[]}:db.collection(c).get()));
   const from=Number(p.from)||0,to=Number(p.to)||Date.now(),inRange=n=>n>=from&&n<=to,methods={},areas={},categories={},daily={},margins=[],costMap=Object.fromEntries(rows(costs).map(c=>[c.id,c]));
   const record=(parts,sign=1)=>{for(const part of parts||[]){const k=(part.method||'Sin detalle')+' · '+(part.currency||'USD');methods[k]??={amount:0,usdCents:0};methods[k].amount+=sign*Number(part.originalAmount||0);methods[k].usdCents+=sign*Number(part.amountCents||0);}};
   for(const o of rows(orders).map(o=>orderFromCloud(o.id,o))){if(o.archived)continue;const parts=o.payments?.filter(x=>inRange(x.at))||[];if(parts.length)record(parts);else if(o.paymentConfirmed&&inRange(o.paidAt||o.createdAt))record(o.payment?.parts||[{...o.payment,amountCents:o.total}]);if(!inRange(o.createdAt)||o.status==='cancelled')continue;const area=o.kind==='package'?'Comida incluida':'Comida';areas[area]=(areas[area]||0)+o.total;const day=new Date(o.createdAt).toLocaleDateString('en-CA',{timeZone:'America/Caracas'});daily[day]=(daily[day]||0)+o.total;for(const line of o.items){const product=rows(products).find(p=>p.id===line.productId),cat=product?.cat||'otros';categories[cat]=(categories[cat]||0)+line.qty*line.unitPrice;}}
   for(const t of rows(transactions)){if(!inRange(Date.parse(t.fecha)))continue;const cents=t.amountCents??Math.round(Number(t.montoUsd||0)*100),sign=/Compra|Gasto/.test(t.tipo)?-1:1;record(t.parts||[{...t,amountCents:cents}],sign);if(sign>0&&/Pase|Ampliación/.test(t.tipo)){const area=/Parque/.test(t.tipo)?'Parque':/Gamer/.test(t.tipo)?'Gamer':'Ampliaciones';areas[area]=(areas[area]||0)+cents;}}
   for(const p of rows(products)){const cost=recipeCost(p,costMap),price=p.priceCents??Math.round(Number(p.price)*100);margins.push({id:p.id,name:p.name,price,cost,margin:cost===null?null:price-cost});}
   return {methods,areas,categories,daily,margins:costsAllowed?margins:[],costsAllowed,shifts:rows({docs:shifts.docs.filter(d=>!d.id.startsWith('current'))}).filter(s=>inRange(s.openedAt)).sort((a,b)=>b.openedAt-a.openedAt).slice(0,60)};
  }
  return null;
 };
}
