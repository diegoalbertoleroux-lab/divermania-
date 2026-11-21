export async function notifyOrderReady(order){
 if(!('Notification' in window)||Notification.permission!=='granted'||!document.hidden)return;
 const title='Tu pedido está listo',options={body:`Pedido #${order.number}. Puedes acercarte al área de entrega.`,tag:'order-'+(order.id||order.number),icon:'/icon.svg'};
 try{const registration=await navigator.serviceWorker?.getRegistration?.();if(registration?.showNotification)await registration.showNotification(title,options);else new Notification(title,options);}catch{/* Tracking must keep working when the browser does not support notifications. */}
}
