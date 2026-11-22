// Callable-compatible errors preserve the existing retry protection in the checkout.
export async function controlRequest({fetcher=fetch,token=null,type,payload={},key=crypto.randomUUID(),endpoint='/api/control'}){
  let response;
  try{response=await fetcher(endpoint,{method:'POST',credentials:'same-origin',signal:globalThis.AbortSignal?.timeout?.(15000),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({data:{type,payload,key}})});}catch{const error=new Error('No hay conexión con el servicio. Conserva el pedido y vuelve a intentarlo.');error.code='functions/unavailable';throw error;}
  let data;try{data=await response.json();}catch{const error=new Error('El servicio de control todavía no está disponible.');error.code='functions/unavailable';throw error;}
  if(!response.ok||data.error){const error=new Error(data.error?.message||'No se pudo completar la operación.'),status=data.error?.status||'UNAVAILABLE';error.code='functions/'+status.toLowerCase().replaceAll('_','-');throw error;}
  if(!Object.hasOwn(data,'result')){const error=new Error('El servicio devolvió una respuesta incompleta. Conserva el pedido.');error.code='functions/unavailable';throw error;}
  return data.result;
}
