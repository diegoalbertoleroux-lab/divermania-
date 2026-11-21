// Run from the owner's authenticated Google Cloud Shell; never paste private keys into this file.
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {access} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
const root=fileURLToPath(new URL('../',import.meta.url)),project='divermania-3f104',stage=process.argv[2];
const stages=['check','backend','admin','rules','storage'];
if(!stages.includes(stage)){console.log('Uso: node scripts/activate-firebase.mjs check|backend|admin|rules|storage');process.exit(0);}
function run(command,args){const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error('El paso falló. No continúes con los siguientes hasta resolverlo.');}
const cli=['--yes','--package=firebase-tools@14.22.0','firebase'];
function firebase(args){run('npx',[...cli,...args,'--project',project]);}
async function dependencies(){try{await access(new URL('../functions/node_modules/firebase-admin/package.json',import.meta.url));}catch{run('npm',['ci','--prefix','functions']);}}
const prompt=createInterface({input:process.stdin,output:process.stdout});
try{
 console.log('Proyecto: '+project+' · Etapa: '+stage);
 if(stage==='check')firebase(['projects:list']);
 if(stage==='backend')throw new Error('Esta instalación utiliza Firebase Spark + Cloudflare Workers. Ejecuta node scripts/activate-cloudflare.mjs prepare. No despliegues Functions.');
 if(stage==='admin'){
  await dependencies();const email=(await prompt.question('Correo de la cuenta existente en Firebase Authentication: ')).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Correo inválido.');
  const require=createRequire(new URL('../functions/package.json',import.meta.url)),{initializeApp,applicationDefault}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth');initializeApp({credential:applicationDefault(),projectId:project});const auth=getAuth(),user=await auth.getUserByEmail(email);await auth.setCustomUserClaims(user.uid,{...user.customClaims,role:'admin'});console.log('Rol admin asignado a la cuenta existente. Vuelve a iniciar sesión en el panel.');
 }
 if(stage==='rules'){
  const answer=await prompt.question('Este paso reemplaza las reglas de Firestore. Ejecuta solo con el frontend nuevo listo para publicar y tras guardar las reglas actuales. Escribe PUBLICAR REGLAS: ');if(answer!=='PUBLICAR REGLAS')throw new Error('No se publicaron reglas.');firebase(['deploy','--only','firestore:rules,firestore:indexes']);
 }
 if(stage==='storage'){
  throw new Error('Las fotos nuevas se guardan en Cloudflare KV. Esta instalación no utiliza Firebase Storage ni activa facturación.');
 }
}catch(error){console.error(error.message);if(!['backend','storage'].includes(stage))console.error('Autorización de CLI: npx --yes --package=firebase-tools@14.22.0 firebase login --no-localhost');if(stage==='admin')console.error('Si falta autorización ADC para asignar roles: gcloud auth application-default login');process.exitCode=1;}finally{prompt.close();}
