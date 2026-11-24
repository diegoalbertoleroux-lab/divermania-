export function consumeLots(lots,qty,stock,now=Date.now()){
 const day=new Date(now).toLocaleDateString('en-CA',{timeZone:'America/Caracas'}),next=structuredClone(lots),expired=next.filter(l=>l.expires&&l.expires<day).reduce((n,l)=>n+Math.max(0,l.remaining||0),0);
 if(qty>stock-expired+1e-9)throw new Error('Hay existencias vencidas. Revisa lotes y registra la merma antes de vender.');
 let remaining=qty;const moves=[];
 for(const l of next.sort((a,b)=>(a.expires||'9999').localeCompare(b.expires||'9999'))){if(remaining<=0)break;if(l.expires&&l.expires<day)continue;const take=Math.min(remaining,Math.max(0,l.remaining||0));if(take){l.remaining-=take;remaining-=take;moves.push({id:l.id,qty:take});}}
 return {lots:next,moves};
}
export function restoreLots(lots,moves){const next=structuredClone(lots);for(const move of moves||[]){const lot=next.find(l=>l.id===move.id);if(lot)lot.remaining+=move.qty;}return next;}
export function removeLots(lots,qty){const next=structuredClone(lots).sort((a,b)=>(a.expires||'9999').localeCompare(b.expires||'9999'));for(const l of next){const take=Math.min(qty,Math.max(0,l.remaining||0));l.remaining-=take;qty-=take;if(qty<=0)break;}return next;}
