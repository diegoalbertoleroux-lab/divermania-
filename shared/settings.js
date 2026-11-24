export const schedules=[{days:'Lunes a jueves',open:'11:00',close:'19:30'},{days:'Viernes y sábado',open:'11:00',close:'20:30'},{days:'Domingo',open:'09:00',close:'16:00'}];
export const packages={park:[{minutes:15,price:200,food:[]},{minutes:30,price:400,food:['popcorn']},{minutes:60,price:600,food:['hotdog','popcorn']}],play:[{minutes:15,price:200,food:[]},{minutes:30,price:400,food:[]},{minutes:60,price:500,food:['hotdog','popcorn']},{minutes:120,price:600,food:['hotdog','popcorn']}]};
export const extraController={price:130,enabled:false,billingUnit:null};
export const foodNames={hotdog:'Perro del paquete · tipo por confirmar',popcorn:'Cotufas del paquete'};
export const packageLabel=p=>`${p.minutes===120?'2 horas':p.minutes===60?'1 hora':p.minutes+' minutos'}${p.food.length?' + '+p.food.map(x=>x==='hotdog'?'perro':'cotufas').join(' y '):''}`;
export function normalizePhone(value){let s=String(value||'').replace(/\D/g,'');if(s.length===11&&s.startsWith('0'))s='58'+s.slice(1);return s;}
export function businessDay(ms){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
