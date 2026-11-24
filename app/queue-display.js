const $=s=>document.querySelector(s);
let timer,latest,context,initial=true,previous=new Map(),page=0,changedAt=0,hideControls;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function updateQueue(state,c){
 latest=c.orders||[];context=c;
 if(!$('.queue-display')){
  initial=true;previous=new Map();page=0;changedAt=Date.now();
  $('#app').innerHTML=`<main class="queue-display"><header class="queue-header"><img src="/logodivermania.png" alt="Divermanía"><span class="queue-connection" id="queue-connection" role="status"></span><time id="board-clock" class="queue-clock"></time></header><section class="queue-columns">${[['preparing','En preparación'],['ready','Listos para retirar']].map(([s,title])=>`<section class="queue-panel" data-queue-status="${s}"><h1>${title}<span id="queue-count-${s}"></span></h1><div class="queue-cards" id="queue-${s}"></div><p class="queue-page" id="queue-page-${s}"></p></section>`).join('')}</section><div class="queue-controls"><button class="btn" data-action="fullscreen">${c.icon('screen')} Pantalla completa</button><button class="btn" data-action="sound" id="queue-sound"></button></div><div class="sr-only" id="queue-announcement" role="status" aria-live="polite"></div></main>`;
  for(const event of ['pointermove','pointerdown','keydown'])document.addEventListener(event,revealControls);
  if(!timer)timer=setInterval(()=>{if($('.queue-display'))layout();},500);
  revealControls();
 }
 const fresh=latest.filter(o=>o.status==='ready'&&previous.get(o.id)!=='ready');
 if(!initial&&fresh.length){c.onReady();$('#queue-announcement').textContent=fresh.length===1?'Pedido '+fresh[0].number+' listo para retirar.':fresh.length+' pedidos listos para retirar.';}
 if(c.dataReady){initial=false;previous=new Map(latest.map(o=>[o.id,o.status]));}
 $('#queue-connection').textContent=c.status==='offline'?'Sin conexión':c.error?'Revisar conexión':'';
 $('#queue-sound').innerHTML=c.icon('sound')+(c.soundEnabled?'Sonido activado':'Activar sonido');
 layout();
}
function revealControls(){const root=$('.queue-display');if(!root)return;root.classList.add('queue-interacting');clearTimeout(hideControls);hideControls=setTimeout(()=>{if(!root.querySelector('.queue-controls:focus-within'))root.classList.remove('queue-interacting');},4500);}
function layout(){
 if(!$('.queue-display'))return;const now=Date.now();if(now-changedAt>=8000){page++;changedAt=now;}
 $('#board-clock').textContent=new Date(now).toLocaleTimeString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
 for(const status of ['preparing','ready']){
  const list=latest.filter(o=>o.status===status).sort((a,b)=>status==='ready'?(b.updatedAt||0)-(a.updatedAt||0):a.number-b.number),grid=$('#queue-'+status),count=$('#queue-count-'+status),foot=$('#queue-page-'+status);
  count.textContent=list.length;
  const rect=grid.getBoundingClientRect(),cols=Math.max(1,Math.min(3,Math.floor((rect.width+12)/190))),rows=Math.max(1,Math.floor((rect.height+12)/170)),capacity=cols*rows,pages=Math.max(1,Math.ceil(list.length/capacity)),index=page%pages,visible=list.slice(index*capacity,(index+1)*capacity),usedRows=Math.max(1,Math.ceil(visible.length/cols)),cellWidth=(rect.width-12*(cols-1))/cols,cellHeight=Math.min(260,(rect.height-12*(usedRows-1))/usedRows),digits=Math.max(3,...visible.map(o=>String(o.number).length)),font=Math.max(22,Math.min(150,cellHeight*.48,cellWidth*.86/(digits*.61)));
  grid.style.setProperty('--queue-cols',cols);grid.style.setProperty('--queue-card-height',Math.max(80,cellHeight)+'px');grid.style.setProperty('--queue-number-size',font+'px');
  const signature=JSON.stringify([visible.map(o=>[o.id,o.number,o.displayName||o.name,o.fulfillment||o.table]),cols,Math.round(font)]);
  if(grid.dataset.signature!==signature){grid.dataset.signature=signature;grid.innerHTML=visible.map(o=>`<article class="queue-card" data-turn-key="${esc(o.id||o.number)}"><strong>${esc(o.number)}</strong><span>${esc(String(o.displayName||o.name||'Visitante').trim().split(/\s+/)[0])}</span><small>${o.fulfillment==='delivery'?'Delivery':o.fulfillment==='table'||o.table&&o.table!=='Retiro'?'En mesa':'Para retirar'}</small></article>`).join('')||'<p class="queue-empty">'+(status==='ready'?'Los pedidos listos aparecerán aquí.':'Los pedidos en preparación aparecerán aquí.')+'</p>';}
  foot.textContent=pages>1?'Página '+(index+1)+' de '+pages:'';
 }
}
