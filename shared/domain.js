import {packages,normalizePhone} from './settings.js';
export const money = cents => new Intl.NumberFormat('es-VE',{style:'currency',currency:'USD'}).format(cents/100);
export const uid = () => crypto.randomUUID();
export const rates=Object.fromEntries(Object.entries(packages).map(([area,items])=>[area,Object.fromEntries(items.map(x=>[x.minutes,x.price]))]));
export const inventorySeed={pan:{name:'Pan',stock:100,minStock:15,unit:'und'},carne:{name:'Carne',stock:10000,minStock:1000,unit:'g'},salchicha:{name:'Salchicha',stock:80,minStock:10,unit:'und'},queso:{name:'Queso',stock:5000,minStock:500,unit:'g'},tomate:{name:'Tomate',stock:3000,minStock:300,unit:'g'},lechuga:{name:'Lechuga',stock:2000,minStock:200,unit:'g'},papitas:{name:'Papitas',stock:3000,minStock:300,unit:'g'},salsa:{name:'Salsa',stock:5000,minStock:500,unit:'ml'}};
export const recipes={burger:[{id:'pan',qty:1},{id:'carne',qty:150},{id:'queso',qty:30},{id:'tomate',qty:20},{id:'lechuga',qty:10},{id:'salsa',qty:20}],hotdog:[{id:'pan',qty:1},{id:'salchicha',qty:1},{id:'queso',qty:20},{id:'papitas',qty:20},{id:'salsa',qty:20}]};
export const catalog = [
 {id:'burger',name:'Hamburguesa clásica',description:'Carne, queso, vegetales y nuestra salsa.',price:650,category:'Hamburguesas',emoji:'🍔',color:'peach',ingredients:['Queso','Tomate','Lechuga','Salsa']},
 {id:'hotdog',name:'Perro especial',description:'Salchicha, queso, papitas y salsas.',price:350,category:'Perros',emoji:'🌭',color:'pink',ingredients:['Queso','Papitas','Salsas']},
 {id:'fries',name:'Papas para compartir',description:'Doraditas, crujientes y recién hechas.',price:300,category:'Acompañantes',emoji:'🍟',color:'yellow',ingredients:[]},
 {id:'juice',name:'Jugo de frutas',description:'Una pausa fresca para seguir disfrutando.',price:200,category:'Bebidas',emoji:'🥤',color:'mint',ingredients:[]},
 {id:'water',name:'Agua mineral',description:'Botella individual.',price:100,category:'Bebidas',emoji:'💧',color:'blue',ingredients:[]}
];
export function demoState(now=Date.now()) {
 const customers=[{id:'demo-ana',name:'Ana Pérez',phone:'0000000001',consent:true,promotions:false,createdAt:now-86400000*18},{id:'demo-luis',name:'Luis García',phone:'0000000002',consent:true,promotions:true,createdAt:now-86400000*12},{id:'demo-sofia',name:'Sofía Rojas',phone:'0000000003',consent:true,promotions:false,createdAt:now-86400000*8}];
 return {version:1,revision:0,createdAt:now,catalog:catalog.map(p=>({...p,receta:recipes[p.id]||[]})),inventory:structuredClone(inventorySeed),legacy:{transacciones:{},cxc:{},cxp:{}},customers,capacity:20,stations:Array.from({length:6},(_,i)=>({id:'ps'+(i+1),name:'Play '+(i+1)})),tickets:[
 {id:'demo-t1',number:41,area:'play',customerId:'demo-luis',name:'Luis García',minutes:60,amount:500,paymentConfirmed:true,paymentRef:'DEMO-041',invoiceRef:'',createdAt:now-55*60000,startedAt:now-55*60000,endAt:now+5*60000-15000,stationId:'ps1',status:'active'},
 {id:'demo-t2',number:42,area:'play',customerId:null,name:'Visitante 42',minutes:30,amount:400,paymentConfirmed:true,paymentRef:'DEMO-042',invoiceRef:'',createdAt:now-8*60000,startedAt:now-8*60000,endAt:now+22*60000,stationId:'ps3',status:'active'},
 {id:'demo-t3',number:43,area:'park',customerId:'demo-ana',name:'Ana Pérez',minutes:30,amount:400,paymentConfirmed:true,paymentRef:'DEMO-043',invoiceRef:'',createdAt:now-14*60000,startedAt:now-14*60000,endAt:now+16*60000,stationId:null,status:'active'},
 {id:'demo-t4',number:44,area:'park',customerId:null,name:'Familia visitante',minutes:60,amount:600,paymentConfirmed:true,paymentRef:'DEMO-044',invoiceRef:'',createdAt:now-3*60000,startedAt:null,endAt:null,stationId:null,status:'waiting'}
 ],orders:[
 {id:'demo-o1',number:104,token:'demo-pedido-104',name:'Visitante',customerId:null,table:'4',notes:'',items:[{productId:'burger',name:'Hamburguesa clásica',qty:2,unitPrice:650,removed:['Tomate']},{productId:'juice',name:'Jugo de frutas',qty:2,unitPrice:200,removed:[]}],total:1700,status:'pending',paymentConfirmed:false,invoiceRef:'',createdAt:now-3*60000,updatedAt:now-3*60000},
 {id:'demo-o2',number:103,token:'demo-pedido-103',name:'Ana Pérez',customerId:'demo-ana',table:'2',notes:'',items:[{productId:'hotdog',name:'Perro especial',qty:2,unitPrice:350,removed:[]},{productId:'fries',name:'Papas para compartir',qty:1,unitPrice:300,removed:[]}],total:1000,status:'preparing',paymentConfirmed:true,invoiceRef:'DEMO-F103',createdAt:now-10*60000,updatedAt:now-6*60000},
 {id:'demo-o3',number:102,token:'demo-pedido-102',name:'Visitante',customerId:null,table:'Retiro',notes:'',items:[{productId:'burger',name:'Hamburguesa clásica',qty:1,unitPrice:650,removed:[]}],total:650,status:'ready',paymentConfirmed:true,invoiceRef:'DEMO-F102',createdAt:now-16*60000,updatedAt:now-60000}
 ],audit:[],idempotency:[]};
}
export function emptyState(now=Date.now()) {return {...demoState(now),tickets:[],orders:[],customers:[]};}
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const clean=(value,max=120)=>String(value??'').trim().slice(0,max);
export function recipeFor(product,option=''){return product.options?.length?(product.recipesByOption?.[option]||[]):(product.receta||[]);}
export function applyCommand(original,command,now=Date.now()) {
 const s=structuredClone(original);const p=command.payload||{};let result={};
 assert(typeof command.key==='string'&&command.key.length>=8&&command.key.length<=100,'Identificador de operación inválido.');
 const previous=s.idempotency.find(x=>x.key===command.key);if(previous)return {state:original,result:previous.result,duplicate:true};
 const customerId=p.customerId||null; if(customerId)assert(s.customers.some(c=>c.id===customerId),'Cliente no encontrado.');
 if(command.type==='ticket.create') {
  assert(['play','park'].includes(p.area),'Selecciona el área.');assert(rates[p.area]?.[Number(p.minutes)]!==undefined,'Duración inválida.');
  assert(p.paymentConfirmed===true,'Taquilla debe confirmar el pago antes de emitir el pase.');assert(clean(p.paymentRef),'Registra una referencia o comprobante de taquilla.');
  const ticket={id:uid(),number:Math.max(0,...s.tickets.map(t=>t.number))+1,area:p.area,minutes:Number(p.minutes),amount:rates[p.area][p.minutes],name:clean(p.name)||'Visitante',customerId,paymentConfirmed:true,paymentRef:clean(p.paymentRef),invoiceRef:clean(p.invoiceRef),createdAt:now,startedAt:null,endAt:null,stationId:null,status:'waiting'};
  s.tickets.push(ticket);result={id:ticket.id,number:ticket.number};
 } else if(command.type==='session.start') {
  const t=s.tickets.find(t=>t.id===p.id);assert(t&&t.status==='waiting','Este pase ya fue activado o no está disponible.');assert(t.paymentConfirmed,'El pase no tiene pago confirmado.');
  if(t.area==='play') {assert(s.stations.some(x=>x.id===p.stationId),'Selecciona una estación.');assert(!s.tickets.some(x=>x.status==='active'&&x.stationId===p.stationId),'Esa Play sigue ocupada. Finaliza primero la sesión anterior.');t.stationId=p.stationId;}
  else if(s.capacity!==null)assert(s.tickets.filter(x=>x.area==='park'&&x.status==='active').length<s.capacity,'El parque está en su capacidad máxima.');
  Object.assign(t,{status:'active',startedAt:now,endAt:now+t.minutes*60000});result={id:t.id};
 } else if(command.type==='session.finish') {
  const t=s.tickets.find(t=>t.id===p.id);assert(t&&t.status==='active','La sesión no está activa.');Object.assign(t,{status:'finished',finishedAt:now});
 } else if(command.type==='session.extend') {
  const t=s.tickets.find(t=>t.id===p.id);assert(t&&t.status==='active','La sesión no está activa.');assert(rates[t.area]?.[Number(p.minutes)]!==undefined,'Ampliación inválida.');assert(p.paymentConfirmed===true&&clean(p.paymentRef),'Confirma en taquilla el pago de la ampliación.');
  const amount=rates[t.area][p.minutes];t.endAt=Math.max(now,t.endAt)+Number(p.minutes)*60000;t.minutes+=Number(p.minutes);t.amount+=amount;(t.extensions??=[]).push({minutes:Number(p.minutes),amount,paymentRef:clean(p.paymentRef),at:now});
 } else if(command.type==='order.create') {
  assert(Array.isArray(p.items)&&p.items.length>0&&p.items.length<=30,'Agrega al menos un producto.');
  const items=p.items.map(item=>{const product=s.catalog.find(x=>x.id===item.productId);assert(product&&product.enabled!==false&&Number.isInteger(product.price)&&product.price>=0,'Producto no disponible.');const qty=Number(item.qty);assert(Number.isInteger(qty)&&qty>=1&&qty<=20,'Cantidad inválida.');const option=clean(item.option,100);const options=(product.options||[]).flatMap(o=>o.values||[o.value||o.label||o]);if(options.length)assert(options.includes(option),'Elige una opción válida para '+product.name+'.');return {productId:product.id,name:product.name,option,qty,unitPrice:product.price,removed:[...new Set((Array.isArray(item.removed)?item.removed:[]).filter(x=>(product.ingredients||[]).includes(x)))]};});
  const stockMoves={};for(const item of items){const product=s.catalog.find(x=>x.id===item.productId);for(const ing of recipeFor(product,item.option)){const inv=s.inventory?.[ing.id];assert(inv,'No está disponible un insumo de '+product.name+'.');if(!item.removed.includes(inv.name))stockMoves[ing.id]=(stockMoves[ing.id]||0)+ing.qty*item.qty;}}for(const [id,qty] of Object.entries(stockMoves)){assert(Number.isFinite(qty)&&qty>0,'Receta inválida.');assert(s.inventory[id].stock>=qty,'Stock insuficiente de '+s.inventory[id].name+'.');}for(const [id,qty] of Object.entries(stockMoves))s.inventory[id].stock-=qty;
  assert(p.deliveryType!=='Delivery'||clean(p.address,300),'Escribe una dirección para el delivery.');
  const order={id:uid(),stockMoves,phone:clean(p.phone,25),deliveryType:clean(p.deliveryType,20)||'Retiro',address:clean(p.address,300),number:Math.max(100,...s.orders.map(o=>o.number))+1,token:uid()+uid().replaceAll('-',''),name:clean(p.name)||'Visitante',customerId,table:clean(p.table,30)||'Retiro',notes:clean(p.notes,400),items,total:items.reduce((sum,x)=>sum+x.qty*x.unitPrice,0),status:'pending',paymentConfirmed:false,invoiceRef:'',createdAt:now,updatedAt:now};
  s.orders.push(order);result={id:order.id,number:order.number,token:order.token};
 } else if(command.type==='order.status') {
  const o=s.orders.find(o=>o.id===p.id);assert(o,'Pedido no encontrado.');const next={pending:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['delivered','cancelled'],delivered:[],cancelled:[]};assert(next[o.status]?.includes(p.status),'Ese cambio de estado no está permitido.');if(p.status==='cancelled'&&o.status==='pending'&&o.stockMoves){for(const [id,qty] of Object.entries(o.stockMoves))if(s.inventory?.[id])s.inventory[id].stock+=qty;o.stockReverted=true;}o.status=p.status;o.updatedAt=now;
 } else if(command.type==='order.customer') {
  const o=s.orders.find(o=>o.id===p.id);assert(o,'Pedido no encontrado.');o.customerId=customerId;
 } else if(command.type==='order.payment') {
  const o=s.orders.find(o=>o.id===p.id);assert(o&&o.status!=='cancelled','Pedido no disponible.');assert(clean(p.invoiceRef),'Indica la referencia del sistema de facturación.');o.paymentConfirmed=true;o.invoiceRef=clean(p.invoiceRef);o.paidAt=now;
 } else if(command.type==='customer.save') {
  const name=clean(p.name);const phone=normalizePhone(p.phone);assert(name.length>=2,'Escribe el nombre del cliente.');assert(phone.length>=10&&phone.length<=15,'Introduce un teléfono válido.');assert(p.consent===true,'El cliente debe aceptar guardar su ficha.');
  const found=s.customers.find(c=>c.phone===phone);if(found){assert(!p.id||found.id===p.id,'Ese teléfono pertenece a otra ficha.');Object.assign(found,{name,promotions:p.promotions===true,updatedAt:now});result={id:found.id,existing:true};}else {const c={id:uid(),name,phone,consent:true,promotions:p.promotions===true,createdAt:now};s.customers.push(c);result={id:c.id};}
 } else throw new Error('Operación no reconocida.');
 s.revision++;s.audit.push({id:uid(),type:command.type,at:now});s.audit=s.audit.slice(-300);s.idempotency.push({key:command.key,result});s.idempotency=s.idempotency.slice(-500);return {state:s,result};
}
let clockOffset=0;export const setClockOffset=n=>{clockOffset=Number(n)||0;};export const serverTime=()=>Date.now()+clockOffset;
export const remaining=(t,now=serverTime())=>t.endAt?Math.max(0,t.endAt-now):0;
export function clock(ms){const sec=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
export const orderLabels={pending:'Recibido',preparing:'En preparación',ready:'Listo para retirar',delivered:'Entregado',cancelled:'Cancelado'};
export function publicOrder(o) {return o?{number:o.number,status:o.status,createdAt:o.createdAt,updatedAt:o.updatedAt,items:o.items,total:o.total,table:o.table}:null;}
export function publicBoard(s,type){return type==='orders'?{orders:s.orders.filter(o=>['preparing','ready'].includes(o.status)).map(o=>({number:o.number,status:o.status,updatedAt:o.updatedAt}))}:{stations:s.stations,tickets:s.tickets.filter(t=>t.status==='active'&&t.area===(type==='park'?'park':'play')).map(t=>({number:t.number,stationId:t.stationId,area:t.area,endAt:t.endAt,minutes:t.minutes})),capacity:s.capacity};}
