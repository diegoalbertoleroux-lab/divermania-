export const toCents=value=>{const n=Number(value);if(!Number.isFinite(n)||n<=0||n>10000000||Math.round(n*100)<1)throw new Error('Indica un monto positivo válido.');return Math.round(n*100);};
export function financeEntry(p,now=Date.now()){
 const amountCents=toCents(p.amount),description=String(p.description||'').trim().slice(0,400);if(!description)throw new Error('Escribe una descripción.');if(!['income','expense'].includes(p.direction))throw new Error('Tipo de movimiento inválido.');return {tipo:p.direction==='income'?'Ingreso Extra':'Gasto (Otro)',montoUsd:amountCents/100,amountCents,desc:description,fecha:new Date(now).toISOString()};
}
export function debtEntry(p,now=Date.now()){
 if(!['cxc','cxp'].includes(p.kind))throw new Error('Tipo de cuenta inválido.');const name=String(p.name||'').trim().slice(0,150);if(!name)throw new Error('Indica el cliente o proveedor.');const amountCents=toCents(p.amount);return {...(p.kind==='cxc'?{cliente:name}:{proveedor:name}),monto:amountCents/100,amountCents,estado:'Pendiente',fecha:new Date(now).toISOString(),description:String(p.description||'').trim().slice(0,400)};
}
export function financeSummary(state){
 const archived=new Set((state.archivedOrders||[]).map(o=>o.id));const f=state.finances||{},transactions=f.transactions||Object.values(state.legacy?.transacciones||{}),orders=state.orders.filter(o=>o.paymentConfirmed&&(o.status!=='cancelled'||o.receiptRecorded===true)),collected=orders.reduce((sum,o)=>sum+o.total,0);
 let extra=0,expenses=0;for(const t of transactions){if(t.orderId&&archived.has(t.orderId))continue;const cents=t.amountCents??Math.round(Number(t.montoUsd||0)*100);if(!Number.isFinite(cents))continue;if(/Gasto|Compra/i.test(t.tipo))expenses+=cents;else if(/Ingreso/i.test(t.tipo))extra+=cents;}
 return {collected:collected+extra,expenses,balance:collected+extra-expenses,receivables:(f.receivables||Object.values(state.legacy?.cxc||{})).filter(d=>d.estado!=='Pagado').reduce((s,d)=>s+Math.max(0,(d.amountCents??Math.round(Number(d.monto||0)*100))-(d.paidCents||0)),0),payables:(f.payables||Object.values(state.legacy?.cxp||{})).filter(d=>d.estado!=='Pagado').reduce((s,d)=>s+Math.max(0,(d.amountCents??Math.round(Number(d.monto||0)*100))-(d.paidCents||0)),0)};
}
