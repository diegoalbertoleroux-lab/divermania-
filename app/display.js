import {promotionalSlides,displayMessages,fulfillmentOf,displayKey,orderDisplayName} from '../shared/presentation.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pageIndex=0,pageAt=0;
let mountedKind=null,previous=null,announcementUntil=0,announcementText='',promoIndex=0,promoAt=0,messageAt=0,slideId='',messageIndex=0,context,latest,slideTimer;
const pulseUntil=new Map(),leaving=new Map();
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
function boardShell(kind,c){return `<main class="board live-display ${kind==='menu'?'menu-display':''}"><header class="board-header">${c.clientBrand()}<div class="display-connection"><span class="dot"></span><span id="display-connection">Conectando</span></div><div><div class="board-clock" id="board-clock"></div><small>${esc(c.deviceName||'Disfruta. Nosotros llevamos el tiempo.')}</small></div></header><div class="display-title-row"><div class="board-title">${kind==='menu'?'Nuestro menú · Comida y diversión':kind==='orders'?'Tu pedido, cada vez más cerca':kind==='gamer'?'Zona gamer · Cada partida cuenta':'Parque infantil · Tiempo para divertirse'}</div><button class="btn small" data-action="fullscreen">${c.icon('screen')} Pantalla completa</button></div><div class="ready-announcement" id="ready-announcement" role="status" aria-live="polite" hidden>${c.icon('sound')}<span></span></div><div id="display-content">${kind==='orders'?`<div class="board-columns"><section class="board-section"><h2>${c.icon('clock')} En preparación <span id="preparing-count" class="display-count">0</span></h2><div id="display-preparing" class="turn-grid" aria-label="Pedidos en preparación"></div><div id="preparing-empty" class="display-empty">Tu turno aparecerá aquí.</div></section><section class="board-section ready"><h2>${c.icon('check')} Listos para retirar <span id="ready-count" class="display-count">0</span></h2><div id="display-ready" class="turn-grid" aria-label="Pedidos listos para retirar"></div><div id="ready-empty" class="display-empty">Estamos preparando algo rico.</div></section></div>`:''}</div><section class="board-promotion display-promotion"><div class="board-promotion-photo" id="display-promo-visual"></div><div class="display-promo-copy" id="display-promo-copy"><span id="board-promo-eyebrow"></span><h2 id="board-promo-title"></h2><p id="board-promo-price"></p><small id="board-promo-detail"></small><div class="promo-indicators" id="promo-indicators" aria-label="Promociones"></div></div><div class="board-promo-qr"><div id="board-menu-qr"></div><strong>Escanea y pide desde tu mesa</strong><span>Abre el menú y sigue tu pedido.</span></div></section><div class="display-message" id="display-message"></div><footer class="board-foot"><span id="display-foot-status"></span><div class="actions"><button class="btn small" data-action="sound" id="display-sound"></button></div></footer></main>`;}
export function updateDisplay(state,kind,c){
 context=c;latest=state;
 if(mountedKind!==kind||!document.querySelector('.live-display')){
  mountedKind=kind;previous=null;slideId='';promoAt=0;messageAt=0;announcementUntil=0;pulseUntil.clear();for(const timer of leaving.values())clearTimeout(timer);leaving.clear();
  document.querySelector('#app').innerHTML=boardShell(kind,c);c.makeQR('board-menu-qr',location.origin+'/cliente',136);
  if(!slideTimer)slideTimer=setInterval(()=>updateDisplayClock(Date.now()),500);
 }
 document.querySelector('#display-connection').textContent=c.preview?'Vista previa local':c.status==='offline'?'Sin conexión':c.error?'Revisar conexión':c.status==='live'?'En línea':'Conectando…';
 document.querySelector('#display-foot-status').textContent=c.preview?'Datos de prueba · No se envían al negocio':c.error?'El equipo debe revisar la conexión de la pantalla.':'Divermanía · Sigue tu número de turno';
 document.querySelector('#display-sound').innerHTML=c.icon('sound')+(c.soundEnabled?' Sonido activado':' Activar sonido');
 if(kind==='orders')updateOrders(c.orders,c);else if(kind==='menu')renderMenuBoard();
 else document.querySelector('#display-content').innerHTML=c.content;
 updateDisplayClock(Date.now());
}
function renderMenuBoard(){const all=latest.catalog.filter(p=>p.enabled!==false&&Number.isInteger(p.price)),size=innerWidth<600?4:innerHeight<600?6:8,pages=Math.max(1,Math.ceil(all.length/size));if(Date.now()-pageAt>10000){pageAt=Date.now();pageIndex=(pageIndex+1)%pages;}const products=all.slice((pageIndex%pages)*size,(pageIndex%pages+1)*size);document.querySelector('#display-content').innerHTML='<div class="digital-menu-grid">'+products.map(p=>`<article>${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:''}<div><small>${esc(p.category||p.cat)}</small><h2>${esc(p.name)}</h2><strong>${context.money(p.price)}</strong></div></article>`).join('')+'</div><p class="menu-pagination">'+(pageIndex%pages+1)+' / '+pages+'</p>';}
function updateOrders(orders,c){
 const now=Date.now(),current=new Map(orders.map(o=>[displayKey(o),o])),fresh=previous===null?[]:orders.filter(o=>o.status==='ready'&&previous.get(displayKey(o))?.status!=='ready');
 for(const o of fresh)pulseUntil.set(displayKey(o),now+8000);
 if(fresh.length){announcementText=fresh.length===1?`Pedido ${fresh[0].number}, ${orderDisplayName(fresh[0])}, listo para retirar.`:`Pedidos ${fresh.map(o=>o.number).join(', ')}, listos para retirar.`;announcementUntil=now+8000;c.onReady();}
 for(const el of document.querySelectorAll('[data-turn-key]'))if(!current.has(el.dataset.turnKey)&&!leaving.has(el.dataset.turnKey)){
  const key=el.dataset.turnKey;el.classList.add('turn-leaving');leaving.set(key,setTimeout(()=>{el.remove();leaving.delete(key);},reduced()?0:280));
 }
 const sorted=orders.slice().sort((a,b)=>a.status==='ready'?(b.updatedAt||0)-(a.updatedAt||0):a.number-b.number);
 for(const order of sorted){
  const key=displayKey(order);let el=[...document.querySelectorAll('[data-turn-key]')].find(el=>el.dataset.turnKey===key),parent=document.querySelector(order.status==='ready'?'#display-ready':'#display-preparing');if(!parent)continue;
  const type=fulfillmentOf(order),label={table:'En mesa',pickup:'Para retirar',delivery:'Delivery'}[type];
  if(!el){el=document.createElement('div');el.className='turn-number turn-card turn-entering';el.dataset.turnKey=key;el.innerHTML=`<strong></strong><span class="turn-customer"></span><span class="turn-type"></span>`;setTimeout(()=>el.classList.remove('turn-entering'),450);}
  if(leaving.has(key)){clearTimeout(leaving.get(key));leaving.delete(key);el.classList.remove('turn-leaving');}
  const moved=el.parentElement&&el.parentElement!==parent;
  el.querySelector('strong').textContent=String(order.number);el.querySelector('.turn-customer').textContent=orderDisplayName(order);el.querySelector('.turn-type').innerHTML=c.icon(type==='delivery'?'external':type==='table'?'grid':'bag')+esc(label);el.setAttribute('aria-label',`Pedido ${order.number}, ${order.status==='ready'?'listo para retirar':'en preparación'}, ${label}, ${orderDisplayName(order)}`);
  const oldRect=moved&&el.getBoundingClientRect?el.getBoundingClientRect():null;
  // Append in the right order without replacing a card: pulses survive unrelated snapshots.
  parent.appendChild(el);el.dataset.orderStatus=order.status;
  if(moved&&oldRect&&!reduced()){const rect=el.getBoundingClientRect();el.animate?.([{transform:`translate(${oldRect.left-rect.left}px,${oldRect.top-rect.top}px) scale(.92)`,opacity:.5},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});}
 }
 const preparing=orders.filter(o=>o.status==='preparing').length,ready=orders.filter(o=>o.status==='ready').length;
 document.querySelector('#preparing-count').textContent=String(preparing);document.querySelector('#ready-count').textContent=String(ready);
 document.querySelector('#preparing-empty').hidden=preparing>0;document.querySelector('#ready-empty').hidden=ready>0;
 if(c.dataReady)previous=current;else previous=null;
}
function updateDisplayClock(now){
 if(!context||!document.querySelector('.live-display'))return;if(mountedKind==='menu')renderMenuBoard();paginateTurns(now);
 for(const el of document.querySelectorAll('[data-turn-key]'))el.classList.toggle('turn-fresh',now<(pulseUntil.get(el.dataset.turnKey)||0));for(const [key,until] of pulseUntil)if(now>=until)pulseUntil.delete(key);
 const banner=document.querySelector('#ready-announcement');banner.hidden=now>=announcementUntil;if(!banner.hidden)banner.querySelector('span').textContent=announcementText;
 const slides=promotionalSlides(latest.catalog,now);if(!slides.length)return;
 if(!promoAt)promoAt=now;if(now-promoAt>=9000){promoIndex=(promoIndex+1)%slides.length;promoAt=now;}
 const slide=slides[promoIndex%slides.length],signature=JSON.stringify(slide);
 if(slideId!==signature){
  slideId=signature;const visual=document.querySelector('#display-promo-visual'),copy=document.querySelector('#display-promo-copy');
  visual.innerHTML=slide.image?`<img id="board-promo-image" src="${esc(slide.image)}" alt="${esc(slide.title)}">`:`<div class="promo-art promo-art-${slide.kind}">${context.icon({park:'tree',gamer:'game',party:'heart',schedule:'clock'}[slide.kind]||'bag')}</div>`;
  document.querySelector('#board-promo-eyebrow').textContent=slide.eyebrow;document.querySelector('#board-promo-title').textContent=slide.title;document.querySelector('#board-promo-price').textContent=Number.isInteger(slide.price)?context.money(slide.price):'';document.querySelector('#board-promo-detail').textContent=slide.detail;
  document.querySelector('#promo-indicators').innerHTML=slides.map((_,i)=>`<i class="${i===promoIndex%slides.length?'active':''}"></i>`).join('');
  if(!reduced()){copy.animate?.([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});visual.animate?.([{opacity:0},{opacity:1}],{duration:450});}
 }
 if(!messageAt||now-messageAt>=9000){messageAt=now;document.querySelector('#display-message').textContent=displayMessages[(messageIndex++)%displayMessages.length];}
}

function paginateTurns(now){for(const grid of document.querySelectorAll('.turn-grid')){const section=grid.closest('.board-section'),cards=[...grid.querySelectorAll('[data-turn-key]')];if(!cards.length)continue;const visible=cards.find(c=>!c.hidden)||cards[0],cardHeight=Math.max(100,visible.getBoundingClientRect().height),padding=parseFloat(getComputedStyle(section).paddingBottom)||0,gap=parseFloat(getComputedStyle(grid).rowGap)||8,height=Math.max(100,section.getBoundingClientRect().bottom-grid.getBoundingClientRect().top-padding),columns=innerWidth<600?2:3,rows=Math.max(1,Math.floor((height+gap)/(cardHeight+gap))),size=columns*rows,pages=Math.max(1,Math.ceil(cards.length/size)),page=Math.floor(now/8000)%pages;grid.style.gridTemplateColumns='repeat('+columns+',minmax(0,1fr))';cards.forEach((c,i)=>c.hidden=Math.floor(i/size)!==page);grid.setAttribute('aria-label','Página '+(page+1)+' de '+pages);}}
