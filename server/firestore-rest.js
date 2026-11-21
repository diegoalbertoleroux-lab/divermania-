import {OperationError} from './errors.js';

export function encodeValue(value){
  if(value===null)return {nullValue:null};
  if(value instanceof Date)return {timestampValue:value.toISOString()};
  if(Array.isArray(value))return {arrayValue:{values:value.map(encodeValue)}};
  if(typeof value==='string')return {stringValue:value};
  if(typeof value==='boolean')return {booleanValue:value};
  if(typeof value==='number'&&Number.isFinite(value))return Number.isSafeInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  if(value&&typeof value==='object')return {mapValue:{fields:encodeFields(value)}};
  throw new OperationError('invalid-argument','El registro contiene un valor inválido.');
}
export const encodeFields=value=>Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,encodeValue(v)]));
export function decodeValue(value){
  if('nullValue' in value)return null;
  if('integerValue' in value)return Number(value.integerValue);
  if('doubleValue' in value)return Number(value.doubleValue);
  if('booleanValue' in value)return value.booleanValue;
  if('stringValue' in value)return value.stringValue;
  if('timestampValue' in value)return new Date(value.timestampValue);
  if('arrayValue' in value)return (value.arrayValue.values||[]).map(decodeValue);
  if('mapValue' in value)return decodeFields(value.mapValue.fields);
  if('referenceValue' in value)return value.referenceValue;
  throw new OperationError('failed-precondition','El registro contiene un tipo de dato no compatible.');
}
export const decodeFields=fields=>Object.fromEntries(Object.entries(fields||{}).map(([key,value])=>[key,decodeValue(value)]));
const quote=field=>/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)?field:'`'+field.replaceAll('\\','\\\\').replaceAll('`','\\`')+'`';
function masks(data,prefix=''){return Object.entries(data).filter(([,v])=>v!==undefined).flatMap(([key,value])=>{const path=prefix+quote(key);return value&&typeof value==='object'&&!Array.isArray(value)&&!(value instanceof Date)&&Object.keys(value).length?masks(value,path+'.'):[path];});}

// Small Admin-compatible adapter using Firestore's native transactions. No client-side stock writes.
export function createFirestore({project,accessToken,fetcher=fetch,baseUrl='https://firestore.googleapis.com',pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  const root=`projects/${project}/databases/(default)/documents`,url=baseUrl+'/v1/'+root;
  async function api(suffix,{method='POST',body,allowMissing=false}={}){
    const response=await fetcher(url+suffix,{method,headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(response.status===404&&allowMissing)return null;
    let result;try{result=await response.json();}catch{throw new OperationError('unavailable','La conexión con la base de datos se interrumpió. Reintenta la misma operación.');}
    if(!response.ok){const status=result.error?.status,error=new OperationError(status==='RESOURCE_EXHAUSTED'?'resource-exhausted':status==='ABORTED'?'aborted':status==='NOT_FOUND'?'not-found':'unavailable',status==='RESOURCE_EXHAUSTED'?'Se alcanzó un límite de uso de la base de datos.':'No se pudo completar la operación en Firebase. Conserva el pedido e inténtalo de nuevo.');error.httpStatus=response.status;error.retryable=status==='ABORTED'||response.status===409;throw error;}
    return result;
  }
  const pathOf=name=>{if(!name?.startsWith(root+'/'))throw new OperationError('internal','Respuesta inesperada de la base de datos.');return name.slice(root.length+1);};
  function snapshot(path,data){const ref=doc(path),value=data?decodeFields(data.fields):undefined;return {id:ref.id,ref,exists:!!data,data:()=>structuredClone(value)};}
  function doc(path){if(typeof path!=='string'||!path||path.split('/').length%2!==0||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new OperationError('invalid-argument','Ruta de documento inválida.');return {path,id:path.split('/').at(-1),get:async()=>snapshot(path,await api('/'+path.split('/').map(encodeURIComponent).join('/'),{method:'GET',allowMissing:true})),set:async(data,options)=>commit([setWrite(path,data,options)]),update:async data=>commit([setWrite(path,data,{merge:true},true)]),delete:async()=>commit([{delete:root+'/'+path}])};}
  function setWrite(path,data,options,update=false){return {update:{name:root+'/'+path,fields:encodeFields(data)},...(options?.merge?{updateMask:{fieldPaths:masks(data)}}:{}),...(update?{currentDocument:{exists:true}}:{})};}
  async function commit(writes,transaction){if(writes.length>500)throw new OperationError('invalid-argument','La operación contiene demasiados cambios.');return api(':commit',{body:{writes,...(transaction?{transaction}:{})}});}
  async function getAll(refs,transaction){
    if(!refs.length)return [];
    const result=await api(':batchGet',{body:{documents:refs.map(ref=>root+'/'+ref.path),...(transaction?{transaction}:{})}}),rows=Array.isArray(result)?result:[result],found=new Map();
    for(const item of rows)if(item.found)found.set(pathOf(item.found.name),item.found);else if(item.missing)found.set(pathOf(item.missing),null);
    return refs.map(ref=>{if(!found.has(ref.path))throw new OperationError('unavailable','No se pudo validar el inventario completo.');return snapshot(ref.path,found.get(ref.path));});
  }
  function batch(){const writes=[];return {set(ref,data,options){writes.push(setWrite(ref.path,data,options));return this;},update(ref,data){writes.push(setWrite(ref.path,data,{merge:true},true));return this;},delete(ref){writes.push({delete:root+'/'+ref.path});return this;},commit:()=>commit(writes)};}
  async function runTransaction(callback){
    for(let attempt=0;attempt<5;attempt++){
      let transaction;
      try{
        ({transaction}=await api(':beginTransaction',{body:{options:{readWrite:{}}}}));
        const writes=[];let writing=false;
        const checkRead=()=>{if(writing)throw new OperationError('internal','La transacción debe validar los datos antes de guardarlos.');};
        const tx={get:async ref=>{checkRead();return (await getAll([ref],transaction))[0];},getAll:async(...refs)=>{checkRead();return getAll(refs,transaction);},set(ref,data,options){writing=true;writes.push(setWrite(ref.path,data,options));},update(ref,data){writing=true;writes.push(setWrite(ref.path,data,{merge:true},true));},delete(ref){writing=true;writes.push({delete:root+'/'+ref.path});}};
        const result=await callback(tx);await commit(writes,transaction);return result;
      }catch(error){
        if(transaction)try{await api(':rollback',{body:{transaction}});}catch{}
        if(!error.retryable||attempt===4)throw error;
        await pause(25*2**attempt+Math.floor(Math.random()*25));
      }
    }
  }
  function collection(path){return {doc:(key=crypto.randomUUID().replaceAll('-',''))=>doc(path+'/'+key),get:async()=>{const docs=[];let pageToken;do{const result=await api('/'+path.split('/').map(encodeURIComponent).join('/')+'?pageSize=300'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):''),{method:'GET'});for(const item of result.documents||[])docs.push(snapshot(pathOf(item.name),item));pageToken=result.nextPageToken;if(docs.length>10000)throw new OperationError('resource-exhausted','Hay demasiados registros para esta consulta.');}while(pageToken);return {docs};}};}
  return {doc,collection,batch,getAll:(...refs)=>getAll(refs),runTransaction};
}
