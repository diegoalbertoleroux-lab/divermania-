export async function cashSnapshot(tx,db,actor){if(!actor)return tx.get(db.doc('turnos/current'));const [personal,shared]=await tx.getAll(db.doc('turnos/current_'+actor),db.doc('turnos/current'));return personal.data()?.status==='open'?personal:shared;}
export function cashPost(tx,db,snapshot,payment,cents,direction=1){
 const s=snapshot?.data();if(s?.status!=='open')return;
 const totals={usd:0,ves:0,noncash:0,...s.totals},methods={...s.methods};
 for(const part of payment.parts||[{...payment,amountCents:cents}]){
  const amount=part.amountCents,original=Math.round(Number(part.originalAmount??amount/100)*100);
  if(part.method==='efectivo'&&part.currency==='USD')totals.usd+=direction*amount;
  else if(part.method==='efectivo'&&part.currency==='VES')totals.ves+=direction*original;
  else if(part.method==='efectivo'){totals.otherCash??={};totals.otherCash[part.currency]=(totals.otherCash[part.currency]||0)+direction*original;}else totals.noncash+=direction*amount;
  const key=part.method+'_'+part.currency;methods[key]=(methods[key]||0)+direction*original;
 }
 const fields={totals,methods,ledgerVersion:s.ledgerVersion||0,requiresReview:s.ledgerVersion!==1};
 tx.update(snapshot.ref,fields);tx.set(db.doc('turnos/'+s.id),fields,{merge:true});
}
