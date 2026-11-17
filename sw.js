const VERSION='divermania-v3';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Orders, staff sessions and Firebase requests must always use the network.
