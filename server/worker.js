import {createController} from './control.js';
import {createFirestore} from './firestore-rest.js';
import {createGoogleAuth,serviceAccountCredentials} from './google-auth.js';
import {OperationError} from './errors.js';

const PROJECT='divermania-3f104';
const codes={'invalid-argument':400,unauthenticated:401,'permission-denied':403,'not-found':404,'failed-precondition':409,'resource-exhausted':429,unavailable:503};
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function readLimited(request,limit){
  if(Number(request.headers.get('Content-Length'))>limit)throw new OperationError('invalid-argument','El archivo o solicitud supera el tamaño permitido.');
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new OperationError('invalid-argument','El archivo o solicitud supera el tamaño permitido.');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
const contentTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
export function imageType(bytes){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'image/webp';return null;}

// Dependencies are injectable for HTTP tests against the local Firestore emulator.
export function createWorker({services,cache}={}){
  let savedSecret,runtime;
  function connect(env){
    if(services)return services;
    if(env.FIREBASE_PROJECT_ID!==PROJECT)throw new OperationError('unavailable','Falta completar la configuración de Divermanía.');
    if(runtime&&savedSecret===env.FIREBASE_SERVICE_ACCOUNT)return runtime;
    const credentials=serviceAccountCredentials(env.FIREBASE_SERVICE_ACCOUNT,PROJECT),auth=createGoogleAuth({credentials,project:PROJECT}),db=createFirestore({project:PROJECT,accessToken:auth.accessToken});
    savedSecret=env.FIREBASE_SERVICE_ACCOUNT;runtime={auth,db,controller:createController({db,auth})};return runtime;
  }
  async function authenticate(request,auth){const header=request.headers.get('Authorization');if(!header)return null;if(!/^Bearer [^\s]+$/.test(header))throw new OperationError('unauthenticated','Sesión inválida.');return auth.verifyIdToken(header.slice(7));}
  async function catalog(request,runtime,context){
    const revision=await runtime.db.doc('menu_publico/state').get(),version=revision.data()?.revision||'initial',cacheApi=cache||globalThis.caches?.default;
    const cacheKey=new Request(new URL('/api/_catalog-cache/'+version,request.url),{method:'GET'}),hit=await cacheApi?.match(cacheKey);
    if(hit)return hit;
    const result=await runtime.controller.handle({data:{type:'catalog.public',payload:{},key:crypto.randomUUID()}}),response=json({result});
    if(cacheApi){const copy=new Response(response.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}});await cacheApi.put(cacheKey,copy.clone());return new Response(copy.body,{headers:response.headers});}return response;
  }
  return {async fetch(request,env,context){
    const url=new URL(request.url),path=url.pathname;
    if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
    try{
      const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw new OperationError('permission-denied','Abre esta operación desde la página de Divermanía.');
      if(path==='/api/health'&&request.method==='GET')return json({ok:true,backend:'cloudflare-workers',project:PROJECT,configured:!!env.FIREBASE_SERVICE_ACCOUNT,images:!!env.MENU_IMAGES});
      if(path==='/api/firebase-config'&&request.method==='GET'){
        const config=await connect(env).auth.publicClientConfig();
        return json({apiKey:config.apiKey,projectId:PROJECT,authDomain:PROJECT+'.firebaseapp.com'});
      }
      if(/^\/api\/images\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path)&&['GET','HEAD'].includes(request.method)){
        if(!env.MENU_IMAGES)throw new OperationError('not-found','Imagen no encontrada.');
        const file=await env.MENU_IMAGES.getWithMetadata('menu/'+path.split('/').at(-1),'arrayBuffer');if(!file.value)throw new OperationError('not-found','Imagen no encontrada.');
        return new Response(request.method==='HEAD'?null:file.value,{headers:{'Content-Type':contentTypes[file.metadata?.contentType]?file.metadata.contentType:'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
      }
      if(!['/api/control','/api/images'].includes(path))throw new OperationError('not-found','Ruta no encontrada.');
      if(request.method!=='POST')return json({error:{status:'INVALID_ARGUMENT',message:'Utiliza POST para esta operación.'}},405);
      const runtime=connect(env),actor=await authenticate(request,runtime.auth);
      if(path==='/api/images'){
        if(runtime.controller?.authorizeUpload){await runtime.controller.authorizeUpload(actor);}else if(!actor||!(actor.token.role==='admin'||actor.token.admin===true))throw new OperationError('permission-denied','Solo administración puede subir imágenes.');
        if(!env.MENU_IMAGES)throw new OperationError('failed-precondition','Falta habilitar el almacenamiento gratuito de imágenes en Cloudflare.');
        const bytes=await readLimited(request,5*1024*1024),type=imageType(bytes);if(!type||type!==request.headers.get('Content-Type'))throw new OperationError('invalid-argument','El archivo debe ser una imagen JPG, PNG o WebP válida.');
        const name=crypto.randomUUID()+'.'+contentTypes[type];await env.MENU_IMAGES.put('menu/'+name,bytes,{metadata:{contentType:type}});return json({result:{image:'/api/images/'+name}});
      }
      if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw new OperationError('invalid-argument','Solicitud inválida.');
      let data;try{data=JSON.parse(new TextDecoder().decode(await readLimited(request,256*1024)));}catch(e){if(e instanceof OperationError)throw e;throw new OperationError('invalid-argument','Solicitud inválida.');}
      if(!data||typeof data!=='object'||Array.isArray(data)||!data.data||typeof data.data!=='object'||Array.isArray(data.data)||data.data.payload&&(typeof data.data.payload!=='object'||Array.isArray(data.data.payload)))throw new OperationError('invalid-argument','Solicitud inválida.');
      if(data.data.type==='catalog.public')return await catalog(request,runtime,context);
      const result=await runtime.controller.handle({data:data.data,auth:actor,rawRequest:{ip:request.headers.get('CF-Connecting-IP')||'unknown'}});
      return json({result});
    }catch(error){const known=error instanceof OperationError;return json({error:{status:(known?error.code:'internal').replaceAll('-','_').toUpperCase(),message:known?error.message:'No se pudo completar la operación. Conserva el pedido y vuelve a intentarlo.'}},codes[error.code]||500);}
  }};
}
export default createWorker();
