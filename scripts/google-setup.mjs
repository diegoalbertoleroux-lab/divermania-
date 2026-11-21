export function googleError({url,method='GET',status,data,secrets=[]}){
  function safe(value){
    let text=String(value??'');
    for(const secret of secrets)if(secret)text=text.split(secret).join('[oculto]');
    return text.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,'[clave oculta]').replace(/(?:cfut_|cfat_|cfoat_|ya29\.)[A-Za-z0-9._~-]+/g,'[token oculto]').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,700);
  }
  const target=new URL(url),googleStatus=safe(data?.error?.status||'error'),detail=safe(data?.error?.message||'Sin detalle adicional.');
  const error=new Error(`Google: ${method} ${target.hostname}${safe(target.pathname)} → HTTP ${status} (${googleStatus}). ${detail}`);
  error.status=status;error.googleStatus=googleStatus;error.googleMessage=detail;
  if(status===401)error.message+=' Renueva la sesión de Google en Cloud Shell.';
  if(status===403)error.message+=' Comprueba el permiso indicado por Google para este paso.';
  return error;
}

// IAM propagation and policy etag conflicts are transient. Invalid arguments and denied access are not.
export async function withIamRetry(action,{pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.log}={}){
  for(let attempt=0;attempt<6;attempt++){
    try{return await action();}catch(error){
      const pending=(error.status===400||error.status===404)&&/service\s*account.*(?:does not exist|not found)|(?:not found|does not exist).*service\s*account/i.test(error.googleMessage||'');
      const conflict=error.status===409||error.googleStatus==='ABORTED';
      if(attempt===5||!pending&&!conflict)throw error;
      log('Esperando que Google propague la cuenta de servicio y sus permisos…');await pause(1000*2**attempt);
    }
  }
}

export async function inspectGoogleSetup({google,project,log=console.log}){
  const email=`divermania-worker@${project}.iam.gserviceaccount.com`,base=`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`;
  log('Diagnóstico de Google: solo lectura. No se crearán claves ni se cambiarán permisos.');
  log('1. Consultando la cuenta de servicio…');
  const account=await google(base+'/'+email,{allow404:true});log('Cuenta de servicio: '+(account?'existe':'todavía no creada'));
  log('2. Consultando los permisos de conexión…');
  const policy=await google(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}:getIamPolicy`,{method:'POST',body:{options:{requestedPolicyVersion:3}}});
  for(const role of ['roles/datastore.user','roles/firebaseauth.admin'])log(role+': '+((policy.bindings||[]).some(binding=>binding.role===role&&!binding.condition&&binding.members?.includes('serviceAccount:'+email))?'asignado':'pendiente'));
  if(account){
    log('3. Consultando la cantidad de claves, sin mostrar valores…');
    const keys=await google('https://iam.googleapis.com/v1/'+account.name+'/keys?keyTypes=USER_MANAGED');log('Claves de usuario registradas: '+(keys.keys||[]).length);
  }
  log('Diagnóstico terminado. No se modificó la configuración.');
}
