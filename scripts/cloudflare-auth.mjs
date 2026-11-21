// Only token values are accepted. Never print the supplied value or a remote error message.
export function normalizeCloudflareToken(value){
  let token=String(value??'').trim();
  const unquote=text=>text.length>=2&&['"',"'",'`'].includes(text[0])&&text.at(-1)===text[0]?text.slice(1,-1).trim():text;
  token=unquote(token).replace(/^Authorization\s*:\s*/i,'').replace(/^Bearer\s+/i,'');token=unquote(token);
  // Current user tokens retain their cfut_ prefix and checksum; old 40-character tokens still work.
  if(/^cfut_[A-Za-z0-9_-]{41,128}$/.test(token)||/^[A-Za-z0-9_-]{40}$/.test(token))return token;
  throw new Error('Copia el valor completo del token personal, no su nombre ni su ID.');
}

export function cloudflareError(response,data){
  const codes=[];
  function collect(errors){for(const error of errors||[]){if(Number.isInteger(error.code))codes.push(error.code);collect(error.error_chain);}}
  collect(data?.errors);const unique=[...new Set(codes)],error=new Error();error.codes=unique;error.status=response.status;
  const summary=`Cloudflare respondió HTTP ${response.status}${unique.length?' (códigos '+unique.join(', ')+')':''}. `;
  if(unique.includes(6003)||unique.includes(6111)){
    error.message=summary+'El formato de la autorización no fue aceptado. Vuelve a copiar el token completo con el botón Copiar de Cloudflare. Conserva el prefijo cfut_ y el final del valor. No necesitas cambiar los permisos por este error.';
  }else if(response.status===401||unique.includes(1000)||unique.includes(9109)||unique.includes(9106)){
    error.message=summary+'Cloudflare no aceptó el token. Comprueba que sea el token personal vigente y que lo hayas copiado completo; si fue revocado o venció, genera otro.';
  }else if(response.status===403||unique.includes(10000)){
    error.message=summary+'La autorización no permite este paso. Revisa el acceso a la cuenta y los permisos Account Settings Read, Cloudflare Pages Edit y Workers KV Storage Edit.';
  }else{
    error.message=summary+'No se pudo completar el paso. Comparte solo este mensaje, sin el token.';
  }
  return error;
}
