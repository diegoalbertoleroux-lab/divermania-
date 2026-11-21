export function loginError(error){
  const messages={
    'auth/invalid-api-key':'La configuración de acceso necesita actualizarse. Recarga la página en unos momentos.',
    'auth/app-not-authorized':'Este sitio todavía no está autorizado para iniciar sesión.',
    'auth/unauthorized-domain':'Este dominio todavía no está autorizado para iniciar sesión.',
    'auth/operation-not-allowed':'El acceso con correo y contraseña todavía no está habilitado para esta aplicación.',
    'auth/invalid-email':'Escribe un correo válido.',
    'auth/invalid-credential':'El correo o la contraseña no coinciden. Puedes restablecer la contraseña.',
    'auth/invalid-login-credentials':'El correo o la contraseña no coinciden. Puedes restablecer la contraseña.',
    'auth/wrong-password':'El correo o la contraseña no coinciden. Puedes restablecer la contraseña.',
    'auth/user-not-found':'El correo o la contraseña no coinciden. Puedes restablecer la contraseña.',
    'auth/user-disabled':'Esta cuenta está deshabilitada.',
    'auth/too-many-requests':'Hubo demasiados intentos. Espera un momento antes de volver a entrar.',
    'auth/network-request-failed':'No se pudo conectar. Revisa tu conexión y vuelve a intentarlo.'
  };
  return messages[error?.code]||'No fue posible iniciar sesión. Inténtalo de nuevo.';
}

// The public web identifier is retrieved from the project's authenticated server.
// A private service-account key or an arbitrary project can never become browser configuration.
export function publicFirebaseConfig(data,expectedProject){
  if(data?.projectId!==expectedProject||typeof data.apiKey!=='string'||!/^AIza[A-Za-z0-9_-]{35}$/.test(data.apiKey))throw new Error('Configuración pública de Firebase inválida.');
  return {apiKey:data.apiKey,projectId:expectedProject,authDomain:expectedProject+'.firebaseapp.com'};
}

export function demoLink(href,enabled,origin){
  if(!enabled||!href||href.startsWith('#'))return href;
  let url;try{url=new URL(href,origin);}catch{return href;}
  if(url.origin!==origin||!/^(?:\/(?:admin|cliente|inventario|imagenes|ticketeras|televisores|seguimiento|pase|gestion)(?:\.html)?\/?|\/)$/i.test(url.pathname))return href;
  url.searchParams.set('demo','1');return url.pathname+url.search+url.hash;
}
