// Cloudflare Pages redirects /file.html to /file. Both URLs must select the same app.
const staffPages={admin:'areas',administrador:'areas',inventario:'inventory',ticketeras:'tickets',imagenes:'images',televisores:'screens'};
const publicViews={cliente:'menu',seguimiento:'track',pase:'pass'};
const views=new Set(['menu','staff','track','pass','board']);
export function resolveRoute(pathname='/',search='',entry={}){
 const name=pathname.replace(/\/+$/,'').split('/').at(-1).replace(/\.html$/i,'').toLowerCase();
 const params=new URLSearchParams(search),requested=params.get('view');
 const fixedView=Object.hasOwn(staffPages,name)?'staff':publicViews[name];
 const view=fixedView||(entry.view==='staff'?'staff':views.has(requested)?requested:entry.view||'menu');
 return {view,page:params.get('page')||staffPages[name]||entry.page||'areas'};
}
