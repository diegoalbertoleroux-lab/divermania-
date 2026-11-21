import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readSecret} from '../scripts/secret-input.mjs';

class Terminal extends EventEmitter{
  isTTY=true;isRaw=false;paused=true;
  setRawMode(value){this.isRaw=value;}
  resume(){this.paused=false;}
  pause(){this.paused=true;}
  send(text){this.emit('data',Buffer.from(text));}
}
function prompt(){const input=new Terminal();let printed='';const result=readSecret('Token (oculto): ',{input,output:{write:text=>{printed+=text;}}});return {input,result,printed:()=>printed};}
const example='test-token-only-not-a-real-secret-123456';
test('Enter vacío no cierra la entrada oculta ni devuelve el control a la consola',async()=>{
  const p=prompt();let completed=false;p.result.then(()=>{completed=true;});
  p.input.send('\r\n\r');await Promise.resolve();assert.equal(completed,false);assert.equal(p.input.isRaw,true);assert.equal(p.input.listenerCount('data'),1);
  p.input.send(example+'\r');assert.equal(await p.result,example);assert.ok(!p.printed().includes(example));assert.equal(p.input.isRaw,false);assert.equal(p.input.paused,true);assert.equal(p.input.listenerCount('data'),0);
});
test('Pegado delimitado por el terminal y entrada inválida nunca imprimen el secreto',async()=>{
  const p=prompt();p.input.send('una entrada incorrecta\r');assert.equal(p.input.isRaw,true);
  p.input.send('\u001b[20');p.input.send('0~'+example+'\u001b[201~\r');assert.equal(await p.result,example);assert.ok(!p.printed().includes(example));assert.ok(!p.printed().includes('una entrada incorrecta'));
});
test('Cancelar restaura el terminal y no conserva escuchas ni muestra el token',async()=>{
  const p=prompt(),rejected=assert.rejects(p.result,/Operación cancelada/);p.input.send(example+'\u0003');await rejected;assert.equal(p.input.isRaw,false);assert.equal(p.input.listenerCount('data'),0);assert.ok(!p.printed().includes(example));
});
test('Entrada sin terminal se rechaza antes de leer credenciales',async()=>{await assert.rejects(readSecret('Token',{input:{isTTY:false},output:{write(){throw new Error('Unexpected output');}}}),/terminal interactiva/);});
