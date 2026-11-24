import {compositionFields} from '../shared/composition.js';
import {productFromCloud} from '../shared/codec.js';
import {OperationError} from './errors.js';
export function createComposition({db,once}){return async(type,p,key,actor)=>{
 if(type!=='catalog.composition')return null;
 const valid=v=>{if(!/^[a-zA-Z0-9_-]{1,150}$/.test(String(v||'')))throw new OperationError('invalid-argument','Identificador inválido.');return v;};
 return once(type,p,key,actor,async(tx,now)=>{
  const ref=db.doc('catalogo/'+valid(p.id)),product=await tx.get(ref);if(!product.exists)throw new OperationError('not-found','Guarda primero el producto.');
  const choices=[...new Set((p.comboSlots||[]).flatMap(s=>s.choices||[]).map(valid))],ingredientIds=[...new Set((p.extras||[]).flatMap(e=>(e.recipeDraft||[]).map(r=>valid(r.id))))];if(choices.length>100||ingredientIds.length>100)throw new OperationError('invalid-argument','Composición demasiado grande.');
  const children=choices.length?await tx.getAll(...choices.map(id=>db.doc('catalogo/'+id))):[],ingredients=ingredientIds.length?await tx.getAll(...ingredientIds.map(id=>db.doc('inventario/'+id))):[];
  let fields;try{fields=compositionFields(p,productFromCloud(product.id,product.data()),children.filter(d=>d.exists).map(d=>productFromCloud(d.id,d.data())),Object.fromEntries(ingredients.filter(d=>d.exists).map(d=>[d.id,d.data()])));}catch(e){throw new OperationError('invalid-argument',e.message);}
  if(fields.comboSlots.length){const catalog=await db.collection('catalogo').get();if(catalog.docs.some(d=>d.id!==p.id&&d.data().comboSlots?.some(s=>s.choices.includes(p.id))))throw new OperationError('failed-precondition','Este producto ya forma parte de un combo. Quita esa relación antes de convertirlo en combo.');}
  tx.update(ref,{...fields,compositionAt:now,compositionBy:actor});tx.set(db.doc('menu_publico/state'),{revision:key,at:now});return {id:p.id};
 });
};}
