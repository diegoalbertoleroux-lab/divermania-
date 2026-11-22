import {OperationError} from './errors.js';
export async function archiveTestOrder({db,tx,p,actor,key,now}){
 if(p.confirm!=='PRUEBAS'||!/^[a-zA-Z0-9_-]{1,150}$/.test(p.id||''))throw new OperationError('invalid-argument','Confirma que el pedido seleccionado es de prueba.');
 const ref=db.doc('pedidos/'+p.id),snap=await tx.get(ref);if(!snap.exists)throw new OperationError('not-found','Pedido no encontrado.');const o=snap.data();if(o.archived)return {id:p.id,alreadyArchived:true};
 const moves=p.restock===true&&!o.stockReverted?Object.entries(o.stockMoves||{}):[];if(moves.some(([id,qty])=>!/^[a-zA-Z0-9_-]{1,150}$/.test(id)||!Number.isFinite(qty)||qty<0))throw new OperationError('failed-precondition','Revisa los movimientos de este pedido.');
 const stocks=moves.length?await tx.getAll(...moves.map(([id])=>db.doc('inventario/'+id))):[];if(stocks.some(s=>!s.exists))throw new OperationError('failed-precondition','Falta un insumo. Concilia el inventario antes de archivar.');
 stocks.forEach((s,i)=>tx.update(s.ref,{stock:Number(s.data().stock||0)+moves[i][1]}));tx.update(ref,{archived:true,testOperation:true,archivedAt:now,archivedBy:actor,...(p.restock?{stockReverted:true}:{})});tx.delete(db.doc('tablero_pedidos/'+p.id));if(o.token)tx.set(db.doc('seguimiento/'+o.token),{status:'cancelled',archived:true},{merge:true});return {id:p.id,restocked:moves.length};
}
