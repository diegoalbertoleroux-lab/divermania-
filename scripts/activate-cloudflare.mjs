// Execute in the owner's Google Cloud Shell. Secrets stay in memory and Cloudflare's encrypted bindings.
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readSecret} from './secret-input.mjs';
import {normalizeCloudflareToken,cloudflareError} from './cloudflare-auth.mjs';
import {googleError,withIamRetry,inspectGoogleSetup} from './google-setup.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),project='divermania-3f104',pages='divermania',branch='codex/divermania-menu-control';
const stage=process.argv[2]||'check',allowed=['check','prepare','admin','publish','diagnose'];
if(!allowed.includes(stage)){console.log('Uso: node scripts/activate-cloudflare.mjs check|prepare|admin|publish|diagnose');process.exit(1);}
const backup=join(root,'.divermania-backups'),recordFile=join(backup,'activation.json');
let prompt,cloudflareToken,googleToken;
function question(text){prompt??=createInterface({input:process.stdin,output:process.stdout});return prompt.question(text);}
async function hiddenQuestion(label){
  prompt?.close();prompt=null;
  return readSecret(label,{normalize:normalizeCloudflareToken,invalidMessage:'Usa el botón Copiar del token personal completo. El nombre, el ID y la clave global no sirven para este paso.'});
}
function run(command,args,extraEnv={}){const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:{...process.env,...extraEnv}});if(result.error||result.status!==0)throw new Error('Falló '+command+'. Detén este paso y comparte únicamente el mensaje del error.');}
function capture(command,args){const result=spawnSync(command,args,{cwd:root,encoding:'utf8'});if(result.error||result.status!==0)throw new Error('No se pudo obtener la autorización de Google. Ejecuta gcloud auth login en esta terminal y vuelve a intentarlo.');return result.stdout.trim();}
async function google(url,{method='GET',body,allow404=false}={}){
  googleToken||=capture('gcloud',['auth','print-access-token']);
  const response=await fetch(url,{method,headers:{Authorization:'Bearer '+googleToken,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(response.status===404&&allow404)return null;
  if(!response.ok)throw googleError({url,method,status:response.status,data,secrets:[googleToken,cloudflareToken]});return data;
}
async function cf(path,{method='GET',body,allow404=false}={}){
  const response=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+cloudflareToken,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(response.status===404&&allow404)return null;
  if(!response.ok||data.success===false)throw cloudflareError(response,data);return data.result;
}
async function readRecord(){try{return JSON.parse(await readFile(recordFile,'utf8'));}catch{return {};}}
async function saveRecord(record){await mkdir(backup,{recursive:true,mode:0o700});await writeFile(recordFile,JSON.stringify(record,null,2),{mode:0o600});}
async function authorizeCloudflare(){
  console.log('Introduce un token de Cloudflare con: Account Settings Read, Cloudflare Pages Edit y Workers KV Storage Edit.');
  console.log('Se crea en https://dash.cloudflare.com/profile/api-tokens . No lo envíes por chat.');
  console.log('Copia solo el valor completo que Cloudflare muestra al crear el token, incluido su prefijo cfut_. No copies el ID ni el nombre.');
  cloudflareToken=await hiddenQuestion('Token de Cloudflare (oculto): ');
  await cf('/user/tokens/verify');
  const accounts=await cf('/accounts?per_page=50'),matches=[];
  for(const account of accounts){const found=await cf(`/accounts/${account.id}/pages/projects/${pages}`,{allow404:true});if(found)matches.push({account,config:found});}
  if(matches.length!==1)throw new Error('El token debe tener acceso a una única cuenta con el proyecto Pages «divermania». Limita sus recursos a esa cuenta.');
  const {account,config}=matches[0];console.log('Cuenta de Cloudflare encontrada: '+account.name+' · Pages: '+config.name);return {accountId:account.id,config};
}
async function dependencies(){try{await access(join(root,'node_modules/esbuild/package.json'));}catch{run('npm',['ci']);}}
async function snapshotRules(){
  const name=`https://firebaserules.googleapis.com/v1/projects/${project}`,release=await google(name+'/releases/cloud.firestore',{allow404:true});
  if(!release)throw new Error('No se encontró una base Firestore activa con reglas. Revisa Firestore Database en la consola antes de publicar.');
  const ruleset=await google('https://firebaserules.googleapis.com/v1/'+release.rulesetName),stamp=new Date().toISOString().replace(/[:.]/g,'-');
  await mkdir(backup,{recursive:true,mode:0o700});await writeFile(join(backup,'firestore-'+stamp+'.json'),JSON.stringify({release,ruleset},null,2),{mode:0o600});
  console.log('Reglas actuales respaldadas en .divermania-backups/ (fuera de Git).');return release;
}
async function serviceAccount(){
  const accountId='divermania-worker',email=`${accountId}@${project}.iam.gserviceaccount.com`,base=`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`;
  console.log('Google: consultando la cuenta de servicio de la conexión…');
  let account=await google(base+'/'+email,{allow404:true});
  if(!account){console.log('Google: creando la cuenta de servicio…');account=await google(base,{method:'POST',body:{accountId,serviceAccount:{displayName:'Divermanía · Cloudflare Worker'}}});}
  const policyUrl=`https://cloudresourcemanager.googleapis.com/v1/projects/${project}`;
  console.log('Google: verificando y asignando permisos de datos y acceso…');
  await withIamRetry(async()=>{
    const policy=await google(policyUrl+':getIamPolicy',{method:'POST',body:{options:{requestedPolicyVersion:3}}});policy.bindings??=[];let changed=false;
    for(const role of ['roles/datastore.user','roles/firebaseauth.admin']){let binding=policy.bindings.find(x=>x.role===role&&!x.condition);if(!binding){binding={role,members:[]};policy.bindings.push(binding);}const member='serviceAccount:'+email;if(!binding.members.includes(member)){binding.members.push(member);changed=true;}}
    if(changed)await google(policyUrl+':setIamPolicy',{method:'POST',body:{policy}});
  });
  console.log('Google: creando la credencial privada para Cloudflare (su valor no se mostrará)…');
  const key=await google('https://iam.googleapis.com/v1/'+account.name+'/keys',{method:'POST',body:{privateKeyType:'TYPE_GOOGLE_CREDENTIALS_FILE',keyAlgorithm:'KEY_ALG_RSA_2048'}});
  return {value:Buffer.from(key.privateKeyData,'base64').toString(),keyName:key.name};
}
async function configure(accountId,config){
  const base=`/accounts/${accountId}`,namespaces=await cf(base+'/storage/kv/namespaces?per_page=100');
  let namespace=namespaces.find(n=>n.title==='divermania-menu-images');if(!namespace)namespace=await cf(base+'/storage/kv/namespaces',{method:'POST',body:{title:'divermania-menu-images'}});
  const secretEnvironments=['production','preview'].filter(name=>!config.deployment_configs?.[name]?.env_vars?.FIREBASE_SERVICE_ACCOUNT);
  // A new key is only created when a binding is missing. Its value is never written to disk.
  const key=secretEnvironments.length?await serviceAccount():null;if(key)await saveRecord({...await readRecord(),keyName:key.keyName});
  const deployment_configs={};
  for(const name of ['production','preview']){const current=config.deployment_configs?.[name]||{};deployment_configs[name]={compatibility_date:'2026-04-01',compatibility_flags:[...new Set([...(current.compatibility_flags||[]),'nodejs_compat'])],kv_namespaces:{...current.kv_namespaces,MENU_IMAGES:{namespace_id:namespace.id}},env_vars:{NODE_VERSION:{type:'plain_text',value:'22'},FIREBASE_PROJECT_ID:{type:'plain_text',value:project},...(key&&secretEnvironments.includes(name)?{FIREBASE_SERVICE_ACCOUNT:{type:'secret_text',value:key.value}}:{})},...(current.wrangler_config_hash?{wrangler_config_hash:current.wrangler_config_hash}:{})};}
  // PATCH merges secret names, as in Wrangler Pages secret put; existing secrets are not printed or replaced.
  await cf(base+'/pages/projects/'+pages,{method:'PATCH',body:{deployment_configs}});
  return {namespaceId:namespace.id,...(key?{keyName:key.keyName}:{})};
}
async function deploy(accountId,deploymentBranch){
  run(join(root,'node_modules/.bin/wrangler'),['pages','deploy','dist','--project-name',pages,'--branch',deploymentBranch,'--commit-dirty=true'],{CLOUDFLARE_API_TOKEN:cloudflareToken,CLOUDFLARE_ACCOUNT_ID:accountId,WRANGLER_SEND_METRICS:'false'});
  const deployments=await cf(`/accounts/${accountId}/pages/projects/${pages}/deployments?per_page=20`),found=deployments.find(d=>d.deployment_trigger?.metadata?.branch===deploymentBranch&&d.latest_stage?.status==='success');
  if(!found?.url)throw new Error('Comprueba el resultado del despliegue en Cloudflare Pages antes de continuar.');return found.url;
}
async function probe(url){
  for(let attempt=0;attempt<6;attempt++){
    try{
      const health=await fetch(url+'/api/health',{signal:AbortSignal.timeout(15000)}).then(r=>r.json());if(!health.configured||health.backend!=='cloudflare-workers')throw new Error();
      for(const type of ['clock','catalog.public']){const response=await fetch(url+'/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{type,payload:{},key:crypto.randomUUID()}}),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok||data.error)throw new Error();}
      console.log('Servidor y lectura del catálogo comprobados. No se crearon pedidos ni se cambiaron existencias.');return;
    }catch{if(attempt===5)throw new Error('El despliegue existe, pero aún no pasó la comprobación de conexión. No se publicaron reglas. Revisa permisos de la cuenta de servicio y el despliegue de Pages.');console.log('Esperando la propagación de la conexión…');await new Promise(resolve=>setTimeout(resolve,3000));}
  }
}
async function adminAccount(record){
  const email=(await question('Correo de tu cuenta existente en Firebase Authentication: ')).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Correo inválido.');
  const base=`https://identitytoolkit.googleapis.com/v1/projects/${project}`;
  const data=await google(base+'/accounts:lookup',{method:'POST',body:{email:[email]}}),user=data.users?.[0];if(!user)throw new Error('Crea primero esta cuenta en Firebase → Authentication → Usuarios, con Email/Password habilitado.');if(user.disabled)throw new Error('La cuenta está deshabilitada.');
  const claims=JSON.parse(user.customAttributes||'{}');await google(base+'/accounts:update',{method:'POST',body:{localId:user.localId,customAttributes:JSON.stringify({...claims,role:'admin'})}});
  await saveRecord({...record,adminUid:user.localId});console.log('Cuenta administradora autorizada. La contraseña no se ha consultado ni cambiado.');
}
async function publish(accountId,config,record){
  if(!record.previewUrl||record.accountId!==accountId||!record.adminUid)throw new Error('Completa primero las etapas prepare y admin.');
  const lookup=await google(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,{method:'POST',body:{localId:[record.adminUid]}}),user=lookup.users?.[0];if(!user||user.disabled||JSON.parse(user.customAttributes||'{}').role!=='admin')throw new Error('La cuenta administradora no está lista.');
  await probe(record.previewUrl);const previousRules=await snapshotRules();
  // Create and validate the new ruleset before any change to the live release.
  const content=await readFile(join(root,'firestore.rules'),'utf8'),ruleset=await google(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`,{method:'POST',body:{source:{files:[{name:'firestore.rules',content}]}}});
  const projectPath=`/accounts/${accountId}/pages/projects/${pages}`;
  const deployments=await cf(projectPath+'/deployments?env=production&per_page=20'),previousDeployment=config.canonical_deployment?.id||deployments.find(d=>d.latest_stage?.status==='success')?.id;
  if(!previousDeployment)throw new Error('No se encontró una publicación anterior para poder restaurarla si falla el paso.');
  const releaseUrl=`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`;
  const setRules=name=>google(releaseUrl,{method:'PATCH',body:{release:{name:`projects/${project}/releases/cloud.firestore`,rulesetName:name},updateMask:'ruleset_name'}});
  let deploymentUrl;
  try{
    await cf(projectPath,{method:'PATCH',body:{production_branch:branch,build_config:{...config.build_config,build_command:'npm ci && npm run build',destination_dir:'dist',root_dir:''}}});
    deploymentUrl=await deploy(accountId,branch);await probe(deploymentUrl);await setRules(ruleset.name);
  }catch(error){
    console.log('La publicación no se completó. Restaurando la versión y configuración anteriores…');
    let restored=true;
    try{await cf(projectPath,{method:'PATCH',body:{production_branch:config.production_branch,build_config:config.build_config}});}catch{restored=false;}
    try{await cf(projectPath+'/deployments/'+previousDeployment+'/rollback',{method:'POST',body:{}});}catch{restored=false;}
    try{const current=await google(releaseUrl);if(current.rulesetName!==previousRules.rulesetName)await setRules(previousRules.rulesetName);}catch{restored=false;}
    throw new Error(error.message+' '+(restored?'Se restauraron la publicación y las reglas anteriores.':'No se pudo verificar toda la restauración. Revisa Pages y Firestore antes de usar la aplicación.'));
  }
  await saveRecord({...record,productionUrl:'https://divermania.pages.dev',deploymentUrl,publishedAt:new Date().toISOString()});
  console.log('Publicación completada. Firebase permanece en Spark. No se desplegaron Functions ni se activó facturación.');
  console.log('Cliente: https://divermania.pages.dev/cliente\nAdministrador: https://divermania.pages.dev/admin\nTV pedidos: https://divermania.pages.dev/?view=board&kind=orders');
  console.log('Ahora inicia sesión y comprueba un pedido, el stock, un pase y las pantallas en dos dispositivos.');
}
try{
  console.log(`Divermanía · Firebase Spark + Cloudflare Workers Free · Etapa: ${stage}`);
  capture('gcloud',['config','get-value','project']);await google(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)`);
  let record=await readRecord();
  if(stage==='diagnose')await inspectGoogleSetup({google,project});
  else if(stage==='admin')await adminAccount(record);
  else{
    const {accountId,config}=await authorizeCloudflare();
    if(stage==='check')console.log('Acceso a Firestore y Cloudflare verificado. No se cambió la configuración.');
    if(stage==='prepare'){
      await snapshotRules();await dependencies();run('npm',['test']);run('npm',['run','build']);
      const connection=await configure(accountId,config),previewBranch='firebase-spark-check',previewUrl=await deploy(accountId,previewBranch);await probe(previewUrl);
      record={...record,...connection,accountId,previewUrl,preparedAt:new Date().toISOString()};await saveRecord(record);
      console.log('Preparación terminada. La página principal y sus reglas siguen sin reemplazarse.');
      console.log('Siguiente: node scripts/activate-cloudflare.mjs admin\nDespués: node scripts/activate-cloudflare.mjs publish');
    }
    if(stage==='publish'){await dependencies();run('npm',['test']);run('npm',['run','build']);await publish(accountId,config,record);}
  }
}catch(error){console.error(error.message);process.exitCode=1;}finally{prompt?.close();cloudflareToken=null;googleToken=null;}
