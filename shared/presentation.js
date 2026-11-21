import {packages,schedules} from './settings.js';
export const controlReference=number=>'TAQ-'+String(number).padStart(6,'0');
export const visitorName=t=>t.childName||t.name||'Visitante';
export function fulfillmentOf(o){if(['table','pickup','delivery'].includes(o.fulfillment))return o.fulfillment;if(o.deliveryType==='Delivery'||o.tipoEntrega==='Delivery')return 'delivery';return o.table&&o.table!=='Retiro'||o.mesa?'table':'pickup';}
export function orderDisplayName(o){if(o.displayName!==undefined)return String(o.displayName).trim().slice(0,32)||'Visitante';if(o.kind==='package'||o.voucherId)return 'Canje de pase';const name=String(o.name||o.cliente||'Visitante').trim().split(/\s+/)[0];return name.slice(0,32)||'Visitante';}
export function boardOrder(o){return {id:o.id,number:o.number,status:o.status,updatedAt:o.updatedAt,fulfillment:fulfillmentOf(o),displayName:orderDisplayName(o)};}
export const displayKey=o=>String(o.id||o.number);
export function daySchedule(now=Date.now()){
 const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/Caracas',weekday:'short'}).format(now);
 return day==='Sun'?schedules[2]:['Fri','Sat'].includes(day)?schedules[1]:schedules[0];
}
export function promotionalSlides(catalog,now=Date.now()){
 const products=catalog.filter(p=>p.enabled!==false&&Number.isInteger(p.price)&&p.price>0&&p.image),recommended=products.filter(p=>p.cat==='combos'),featured=(recommended.length?recommended:products).slice(0,5);
 const slides=featured.map(p=>({id:p.id,kind:'food',eyebrow:'MIENTRAS DISFRUTAS',title:p.name,detail:'Personalízalo desde el menú.',price:p.price,image:p.image}));
 const schedule=daySchedule(now);
 const park=packages.park.find(p=>p.minutes===60),play=packages.play.find(p=>p.minutes===60);
 slides.splice(Math.min(1,slides.length),0,{id:'park',kind:'park',eyebrow:'PARQUE INFANTIL',title:'Una hora para jugar.',detail:'60 minutos + perro y cotufas. Pago en taquilla.',price:park.price});
 slides.splice(Math.min(3,slides.length),0,{id:'gamer',kind:'gamer',eyebrow:'ZONA GAMER',title:'La próxima partida te espera.',detail:'60 minutos + perro y cotufas. Consulta disponibilidad.',price:play.price});
 slides.push({id:'birthday',kind:'party',eyebrow:'CELEBRA EN DIVERMANÍA',title:'Tu próximo cumpleaños, aquí.',detail:'Consulta en taquilla las opciones y disponibilidad para tu celebración.'},{id:'schedule',kind:'schedule',eyebrow:'HORARIO INFORMADO PARA HOY',title:`${schedule.open} – ${schedule.close}`,detail:'Comida, parque y zona gamer. Pregunta al equipo por las actividades del día.'});
 return slides;
}
export const displayMessages=['Tu turno sigue visible mientras disfrutas.','Una partida más, un antojo más.','Escanea el menú y sigue disfrutando.','Si no llevas teléfono, el equipo toma tu pedido.'];
// State is independent of DOM rerenders, timers and the audio toggle.
export class SessionAlarms{
 constructor(){this.entries=new Map();}
 acknowledge(t){const e=this.entries.get(t.id);if(e&&e.endAt===t.endAt)e.acknowledged=true;}
 poll(tickets,now,{audible=false}={}){
  const events=[],expired=[],live=new Set();let sound=null;
  for(const t of tickets){if(t.status!=='active'||!Number.isFinite(t.endAt))continue;live.add(t.id);let e=this.entries.get(t.id);if(!e||e.endAt!==t.endAt){e={endAt:t.endAt,level:'',soundLevel:'',lastEndSound:null,acknowledged:false};this.entries.set(t.id,e);}
   const ms=t.endAt-now,level=ms<=0?'end':ms<=60000?'one':ms<=300000?'five':'';
   if(level!==e.level){if(level&&!e.acknowledged)events.push({ticket:t,level});e.level=level;}
   if(e.acknowledged)continue;
   if(level==='end'){expired.push(t);if(audible&&(e.lastEndSound===null||now-e.lastEndSound>=12000)){sound='end';e.lastEndSound=now;}}
   else if(level&&audible&&e.soundLevel!==level){e.soundLevel=level;sound??='warning';}
  }
  for(const id of this.entries.keys())if(!live.has(id))this.entries.delete(id);
  return {events,expired,sound};
 }
}
