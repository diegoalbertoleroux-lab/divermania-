import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {OperationError} from './errors.js';
const enc=new TextEncoder(),b64=bytes=>Buffer.from(bytes).toString('base64url');
const safeEndpoint=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)$/.test(u.hostname)||u.hostname.endsWith('.notify.windows.com')||u.hostname.endsWith('.push.apple.com'))&&!u.username&&!u.password;}catch{return false;}};
export function createPush({db,auth,fetcher=fetch}){
 let cached,pending;
 async function keys(){if(cached)return cached;if(pending)return pending;pending=(async()=>{const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey=b64(await crypto.subtle.exportKey('raw',pair.publicKey));const ref=db.doc('push_config/server');cached=await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists)return old.data();const value={privateKey,publicKey};tx.set(ref,value);return value;});return cached;})().finally(()=>pending=null);return pending;}
 async function subscribe(uid,subscription){if(!safeEndpoint(subscription?.endpoint)||String(subscription.endpoint).length>4096)throw new OperationError('invalid-argument','Suscripción de notificaciones inválida.');const id=createHash('sha256').update(uid+subscription.endpoint).digest('hex');await db.doc('push_subscriptions/'+id).set({uid,endpoint:subscription.endpoint,at:Date.now()});return {ok:true};}
 async function send(sender,recipients=null){
  const subscriptions=(await db.collection('push_subscriptions').get()).docs.filter(d=>d.data().uid!==sender&&(!recipients||recipients.includes(d.data().uid))).slice(0,100);if(!subscriptions.length)return;
  const config=await keys(),key=await crypto.subtle.importKey('jwk',config.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  await Promise.allSettled(subscriptions.map(async snap=>{const s=snap.data();if(!safeEndpoint(s.endpoint))return;const policy=await db.doc('accesos/'+s.uid).get();if(policy.exists&&(policy.data().disabled||!policy.data().caps?.includes('chat')))return;if(!policy.exists){const u=await auth.getUser(s.uid);const role=u?.customClaims?.role;if(!['admin','supervisor','cash','kitchen','entrance','gamer','inventory'].includes(role))return;}
   const header=b64(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),payload=b64(enc.encode(JSON.stringify({aud:new URL(s.endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:'https://divermania.pages.dev'}))),unsigned=header+'.'+payload,signature=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(unsigned)));
   const response=await fetcher(s.endpoint,{method:'POST',headers:{Authorization:'vapid t='+unsigned+'.'+signature+', k='+config.publicKey,TTL:'120',Urgency:'normal'},signal:AbortSignal.timeout(8000)});if([404,410].includes(response.status))await snap.ref.delete();
  }));
 }
 return {publicKey:async()=>({publicKey:(await keys()).publicKey}),subscribe,send};
}
