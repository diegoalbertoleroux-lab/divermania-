export const paymentMethods={efectivo:'Efectivo',zelle:'Zelle',binance:'Binance',pago_movil:'Pago móvil',transferencia:'Transferencia',punto:'Punto de venta',tarjeta:'Tarjeta',otro:'Otro'};
export const currencies=['USD','VES','EUR','USDT'];
// rate always means units of the received currency per USD. Work in cents.
export function normalizePayments(rows,dueCents,{partial=false}={}){
 if(!Number.isSafeInteger(dueCents)||dueCents<=0||!Array.isArray(rows)||!rows.length||rows.length>12)throw new Error('Revisa el saldo y los pagos.');
 let remaining=dueCents;
 const parts=rows.map(row=>{
  const currency=row.currency||'USD',method=row.method||'efectivo',received=Number(row.amount??row.originalAmount),rate=currency==='USD'?1:Number(row.rate);
  if(!currencies.includes(currency)||!paymentMethods[method]||!Number.isFinite(received)||received<=0||received>1e8||!Number.isFinite(rate)||rate<=0||rate>1e8)throw new Error('Revisa moneda, método, monto y tasa de cada pago.');
  const tenderedCents=Math.round(received*100/rate);if(!Number.isSafeInteger(tenderedCents)||tenderedCents<1)throw new Error('El pago es demasiado pequeño.');
  if(remaining<=0)throw new Error('El pedido ya está cubierto. Quita las líneas sobrantes.');
  const amountCents=Math.min(remaining,tenderedCents),changeCents=tenderedCents-amountCents;
  if(changeCents&&method!=='efectivo')throw new Error('Un pago electrónico no puede superar el saldo pendiente.');
  remaining-=amountCents;
  return {currency,method,rate:currency==='USD'?null:rate,receivedAmount:Math.round(received*100)/100,originalAmount:Math.round(amountCents*rate)/100,amountCents,changeAmount:Math.round(changeCents*rate)/100,externalRef:String(row.externalRef||'').trim().slice(0,150)};
 });
 if(!partial&&remaining)throw new Error('Falta completar el pago del importe total.');
 return {parts,amountCents:dueCents-remaining,remainingCents:remaining,currency:parts.length===1?parts[0].currency:'MIXED',method:parts.length===1?parts[0].method:'mixto',originalAmount:parts.length===1?parts[0].originalAmount:null,rate:parts.length===1?parts[0].rate:null,externalRef:parts.map(p=>p.externalRef).filter(Boolean).join(' · '),rateRecordedAt:Date.now()};
}
