import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../shared/routes.js';
for(const [path,page] of [['admin','areas'],['inventario','inventory'],['ticketeras','tickets'],['imagenes','images'],['televisores','screens']]){
 test(`Cloudflare conserva administración al abrir /${path} con o sin .html`,()=>{for(const suffix of ['', '/', '.html'])assert.deepEqual(resolveRoute('/'+path+suffix,'',{view:'menu'}),{view:'staff',page});});
}
test('Cliente y administrador son entradas diferentes, incluso si se sirve el index como fallback',()=>{assert.equal(resolveRoute('/cliente').view,'menu');assert.equal(resolveRoute('/').view,'menu');assert.equal(resolveRoute('/','?view=staff').view,'staff');assert.equal(resolveRoute('/admin','?view=menu').view,'staff');assert.equal(resolveRoute('/cliente','?view=staff').view,'menu');assert.equal(resolveRoute('/admin','?page=inventory').page,'inventory');});
test('Seguimiento, pase y TV mantienen su vista en URLs limpias',()=>{for(const suffix of ['','.html','/']){assert.equal(resolveRoute('/seguimiento'+suffix).view,'track');assert.equal(resolveRoute('/pase'+suffix).view,'pass');}assert.equal(resolveRoute('/','?view=board&kind=gamer').view,'board');});
test('Direcciones del panel anterior seleccionan su nueva sección en administración',()=>{for(const [tab,page] of [['manual','manual'],['mesas','tables'],['catalogo','catalog'],['inventario','inventory'],['finanzas','finances'],['pedidos','orders']])for(const suffix of ['','.html'])assert.deepEqual(resolveRoute('/gestion'+suffix,'?tab='+tab),{view:'staff',page});});
