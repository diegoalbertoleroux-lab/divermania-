import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCloudflareToken,cloudflareError} from '../scripts/cloudflare-auth.mjs';

const example='cfut_'+'A'.repeat(40)+'0'.repeat(8);
test('Entrada de Cloudflare conserva el prefijo y checksum y admite copias con Bearer o comillas',()=>{
  for(const input of [example,' '+example+'\n','Bearer '+example,'"Bearer '+example+'"',"'"+example+"'",'Authorization: Bearer '+example])assert.equal(normalizeCloudflareToken(input),example);
  assert.equal(normalizeCloudflareToken('a'.repeat(40)),'a'.repeat(40));
});
test('Nombre, ID, clave global y token truncado se rechazan sin imprimir el valor recibido',()=>{
  for(const input of ['Divermania','a'.repeat(32),'cfk_'+'A'.repeat(48),'cfut_'+'A'.repeat(20),'curl example.invalid'])assert.throws(()=>normalizeCloudflareToken(input),error=>!error.message.includes(input));
});
test('6003/6111 se identifica como formato sin culpar a los permisos ni incluir texto remoto',()=>{
  const error=cloudflareError({status:400},{errors:[{code:6003,message:'SECRET',error_chain:[{code:6111,message:'SECRET'}]}]});assert.deepEqual(error.codes,[6003,6111]);assert.match(error.message,/formato/);assert.match(error.message,/No necesitas cambiar los permisos/);assert.ok(!error.message.includes('SECRET'));
});
test('Autenticación y autorización tienen indicaciones distintas y códigos seguros',()=>{
  assert.match(cloudflareError({status:401},{errors:[{code:1000}]}).message,/no aceptó el token/);
  assert.match(cloudflareError({status:403},{errors:[{code:10000}]}).message,/permisos/);
});
