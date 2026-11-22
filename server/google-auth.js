import {OperationError} from './errors.js';
import {Buffer} from 'node:buffer';

const encoder=new TextEncoder();
const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
const algorithm={name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'};
const JWKS_URL='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export function serviceAccountCredentials(raw,project){
  let credentials;try{credentials=JSON.parse(raw);}catch{throw new OperationError('unavailable','Falta configurar la conexión privada del servidor.');}
  if(credentials.project_id!==project||!credentials.client_email?.endsWith('@'+project+'.iam.gserviceaccount.com')||!credentials.private_key?.includes('BEGIN PRIVATE KEY'))throw new OperationError('unavailable','La conexión del servidor no corresponde al proyecto autorizado.');
  return credentials;
}

// Credentials and OAuth access tokens stay inside the Worker, never in frontend files.
export function createGoogleAuth({credentials,project,fetcher=fetch,now=Date.now,jwksUrl=JWKS_URL}){
  let signingKey,access,accessUntil=0,pendingAccess,keys=new Map(),keysUntil=0,lastKeyFetch=0,clientSettings,clientUntil=0,pendingClient;
  async function sign(claims){
    signingKey||=crypto.subtle.importKey('pkcs8',Buffer.from(credentials.private_key.replace(/-----[^-]+-----|\s/g,''),'base64'),algorithm,false,['sign']);
    const unsigned=encode({alg:'RS256',typ:'JWT',...(credentials.private_key_id?{kid:credentials.private_key_id}:{})})+'.'+encode(claims);
    const signature=await crypto.subtle.sign(algorithm,await signingKey,encoder.encode(unsigned));
    return unsigned+'.'+Buffer.from(signature).toString('base64url');
  }
  async function accessToken(){
    if(access&&now()<accessUntil)return access;
    if(pendingAccess)return pendingAccess;
    pendingAccess=(async()=>{
      const issued=Math.floor(now()/1000),assertion=await sign({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:issued,exp:issued+3600});
      const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString()});
      const data=await response.json();if(!response.ok||!data.access_token)throw new OperationError('unavailable','No se pudo autorizar la conexión del servidor con Firebase.');
      access=data.access_token;accessUntil=now()+(Math.min(Number(data.expires_in)||3600,3600)-120)*1000;return access;
    })().finally(()=>{pendingAccess=null;});return pendingAccess;
  }
  async function request(path,body){
    const response=await fetcher(`https://identitytoolkit.googleapis.com/v1/projects/${project}/${path}`,{method:'POST',headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new OperationError('unavailable','Firebase no pudo comprobar la cuenta autorizada.');return data;
  }
  async function verifyIdToken(token){
    try{
      if(typeof token!=='string'||token.length>16000)throw new Error();
      const parts=token.split('.');if(parts.length!==3)throw new Error();
      const header=JSON.parse(Buffer.from(parts[0],'base64url').toString()),claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());
      const seconds=Math.floor(now()/1000);
      if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200||claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||!Number.isInteger(claims.exp)||claims.exp<=seconds||!Number.isInteger(claims.iat)||claims.iat>seconds+60||!Number.isInteger(claims.auth_time)||claims.auth_time>seconds+60)throw new Error();
      if(now()>=keysUntil||!keys.has(header.kid)&&now()-lastKeyFetch>=60000){
        lastKeyFetch=now();const response=await fetcher(jwksUrl);if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.keys))throw new Error();
        const fresh=new Map();for(const key of data.keys)if(key.kty==='RSA'&&key.kid)fresh.set(key.kid,await crypto.subtle.importKey('jwk',key,algorithm,false,['verify']));
        keys=fresh;keysUntil=now()+Math.min(Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control')||'')?.[1])||3600,21600)*1000;
      }
      const key=keys.get(header.kid);if(!key||!await crypto.subtle.verify(algorithm,key,Buffer.from(parts[2],'base64url'),encoder.encode(parts[0]+'.'+parts[1])))throw new Error();
      return {uid:claims.sub,token:claims};
    }catch{throw new OperationError('unauthenticated','La sesión venció o no es válida. Vuelve a iniciar sesión.');}
  }
  async function createCustomToken(uid,claims){const issued=Math.floor(now()/1000);return sign({iss:credentials.client_email,sub:credentials.client_email,aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',iat:issued,exp:issued+3600,uid,claims});}
  async function revokeRefreshTokens(uid){await request('accounts:update',{localId:uid,validSince:String(Math.floor(now()/1000))});}
  async function publicClientConfig(){
    if(clientSettings&&now()<clientUntil)return clientSettings;
    if(pendingClient)return pendingClient;
    pendingClient=(async()=>{
      const response=await fetcher(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`,{headers:{Authorization:'Bearer '+await accessToken()}}),data=await response.json(),apiKey=data.client?.apiKey;
      if(!response.ok||typeof apiKey!=='string'||!/^AIza[A-Za-z0-9_-]{35}$/.test(apiKey))throw new OperationError('unavailable','No se pudo obtener la configuración pública de acceso.');
      clientSettings={apiKey,projectId:project,authDomain:project+'.firebaseapp.com'};clientUntil=now()+300000;return clientSettings;
    })().finally(()=>{pendingClient=null;});return pendingClient;
  }
  async function listUsers(){const response=await fetcher(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchGet?maxResults=200`,{headers:{Authorization:'Bearer '+await accessToken()}});if(!response.ok)throw new OperationError('unavailable','No se pudo consultar al equipo.');return response.json();}
  async function getUser(uid){const result=await request('accounts:lookup',{localId:[uid]});const u=result.users?.[0];if(!u)return null;return {...u,customClaims:JSON.parse(u.customAttributes||'{}')};}
  async function setCustomUserClaims(uid,claims){await request('accounts:update',{localId:uid,customAttributes:JSON.stringify(claims)});}
  async function createUser({uid,email,password,displayName}){
    const {apiKey}=await publicClientConfig();
    const response=await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(apiKey),{method:'POST',headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},body:JSON.stringify({targetProjectId:project,localId:uid,email,password,displayName,returnSecureToken:false})});
    const data=await response.json();
    if(!response.ok){if(data.error?.message?.includes('EMAIL_EXISTS'))throw new OperationError('failed-precondition','Ese correo ya tiene una cuenta. Selecciónala en el equipo para asignar sus permisos.');throw new OperationError('unavailable','No se pudo crear la cuenta. Revisa correo, contraseña y conexión.');}
    return {uid:data.localId,email};
  }
  return {accessToken,verifyIdToken,createCustomToken,revokeRefreshTokens,publicClientConfig,listUsers,getUser,setCustomUserClaims,createUser};
}
