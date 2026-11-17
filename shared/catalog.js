export const normalizeName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export const categoryLabels={perros:'Perros',hamburguesas:'Hamburguesas',pizzas:'Pizzas',snacks:'Snacks',bebidas:'Bebidas',combos:'Combos',fiesta:'Fiesta'};
export function catalogFields(p,old={},inventory={}){
 const name=String(p.name||'').trim(),price=Number(p.price),mode=p.inventoryMode||old.inventoryMode||'recipe';
 if(!name||p.price===null||p.price===''||!Number.isFinite(price)||price<0)throw new Error('Indica nombre y precio válidos.');
 if(!['recipe','unit'].includes(mode))throw new Error('Tipo de inventario inválido.');
 const options=p.options??old.options??[],values=options.flatMap(o=>o.values||[o.value||o.label||o]);
 const cleanRows=rows=>{if(!Array.isArray(rows)||rows.length>60)throw new Error('Receta inválida.');const seen=new Set();return rows.map(row=>{const ing=inventory[row.id];if(!ing)throw new Error('Registra el ingrediente antes de guardar la receta.');if(seen.has(row.id))throw new Error('Un ingrediente aparece dos veces en la misma receta.');seen.add(row.id);const qty=row.qty===null||row.qty===''||row.qty===undefined?null:Number(row.qty);if(qty!==null&&(!Number.isFinite(qty)||qty<=0))throw new Error('Las cantidades deben ser positivas o quedar pendientes.');return {id:row.id,qty};});};
 let receta=[],recipeDraft=[],recipesByOption={},recipeDraftsByOption={},stockItemId=null,configured=false;
 if(mode==='unit'){
  stockItemId=p.stockItemId||old.stockItemId;const item=inventory[stockItemId];if(!item||item.unit!=='und')throw new Error('Selecciona el producto empacado del inventario, medido en unidades.');
  if(values.length)throw new Error('Cada presentación empacada debe tener su propio producto, sin variantes de receta.');configured=true;
 }else{
  recipeDraft=cleanRows(p.recipeDraft??p.receta??old.recipeDraft??old.receta??[]);receta=recipeDraft.filter(r=>r.qty!==null);
  for(const option of values){const rows=cleanRows(p.recipeDraftsByOption?.[option]??p.recipesByOption?.[option]??old.recipeDraftsByOption?.[option]??old.recipesByOption?.[option]??[]);recipeDraftsByOption[option]=rows;recipesByOption[option]=rows.filter(r=>r.qty!==null);}
  configured=values.length?values.every(o=>recipeDraftsByOption[o].length&&recipeDraftsByOption[o].every(r=>r.qty!==null)):recipeDraft.length>0&&recipeDraft.every(r=>r.qty!==null);
 }
 const all=values.length?Object.values(recipesByOption).flat():receta,ingredientOptions=[...new Set(all.map(i=>i.id))].map(id=>({id,name:inventory[id].name}));
 return {name,price,priceCents:Math.round(price*100),cat:p.cat||old.cat||'snacks',desc:String(p.desc??old.desc??old.description??'').slice(0,600),image:String(p.image??old.image??'').slice(0,2000),options,inventoryMode:mode,stockItemId,receta,recipeDraft,recipesByOption,recipeDraftsByOption,ingredientOptions,modifiersByOption:Object.fromEntries(Object.entries(recipesByOption).map(([o,rows])=>[o,rows.map(i=>inventory[i.id].name)])),recipeStatus:configured?'configured':'pending',enabled:p.enabled!==false};
}
export function mergeMenuProduct(raw,old={}){
 const next={...raw,id:old.id||raw.id,price:raw.priceCents===null?null:raw.priceCents/100};
 for(const key of ['receta','recipeDraft','recipesByOption','recipeDraftsByOption','inventoryMode','stockItemId','ingredientOptions','modifiersByOption'])if(Object.hasOwn(old,key))next[key]=old[key];
 if(old.options?.length)next.options=old.options;
 if(old.recipeStatus)next.recipeStatus=old.recipeStatus;
 else next.recipeStatus=old.receta?.length?'configured':'pending';
 next.enabled=raw.priceCents!==null&&raw.enabled!==false;
 return next;
}
