// Cloudflare Pages redirects /file.html to /file. Both URLs must select the same app.
const staffPages={admin:'areas',administrador:'areas',inventario:'inventory',ticketeras:'tickets',imagenes:'images',televisores:'screens'};
const legacyTabs={manual:'manual',mesas:'tables',catalogo:'catalog',inventario:'inventory',finanzas:'finances',pedidos:'orders',dashboard:'overview'};
const publicViews={cliente:'menu',seguimiento:'track',pase:'pass'};
const views=new Set(['menu','staff','track','pass','board']);
export function resolveRoute(pathname='/',search='',entry={}){
 const name=pathname.replace(/\/+$/,'').split('/').at(-1).replace(/\.html$/i,'').toLowerCase();
 const params=new URLSearchParams(search),requested=params.get('view');
 const fixedView=name==='gestion'?'staff':Object.hasOwn(staffPages,name)?'staff':publicViews[name];
 const view=fixedView||(entry.view==='staff'?'staff':views.has(requested)?requested:entry.view||'menu');
 return {view,page:params.get('page')||(name==='gestion'?legacyTabs[params.get('tab')]||'overview':null)||staffPages[name]||entry.page||'areas'};
}
