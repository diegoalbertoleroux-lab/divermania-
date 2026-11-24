> **Actualización operativa:** consulta [MEJORAS-OPERACION.md](MEJORAS-OPERACION.md) para pagos divididos, turnos por cajero, familias, compras, lotes, notificaciones y pantallas de menú.

# Divermanía · Menú, parque y zona gamer

La aplicación conserva el proyecto Firebase **divermania-3f104** y el alojamiento en Cloudflare Pages. La nueva versión añade menú basado en el PDF, taquilla, sesiones por tiempo, clientes frecuentes, cocina y pantallas vinculadas. Los dos HTML originales se conservan byte por byte en `originales/`.

Las dos entradas son **`/cliente`** y **`/admin`**. Las URLs con `.html` también se admiten; el alojamiento puede redirigirlas a URLs sin extensión. Inventario, recetas, clientes, imágenes, ticketeras y TV se abren dentro del administrador.

Para activar **sin tarjeta ni Blaze**, sigue [ACTIVAR-CLOUDFLARE.md](ACTIVAR-CLOUDFLARE.md). Firebase Spark conserva Firestore y Authentication; Cloudflare Workers ejecuta las operaciones y KV guarda las fotos nuevas. Las credenciales del servidor se configuran únicamente como secretos cifrados.

El acceso de prueba `/admin?demo=1` permite explorar los módulos sin contraseña con datos locales y conserva ese modo al navegar. El acceso normal utiliza la cuenta autorizada del equipo y ofrece recuperación de contraseña. La configuración web de Authentication se obtiene de `/api/firebase-config`: el servidor consulta el identificador público vigente del proyecto y devuelve únicamente la clave web pública, el proyecto y su dominio. Las credenciales privadas y la configuración administrativa no se devuelven al navegador.

## Un solo administrador

Todos los apartados del panel anterior están integrados: resumen, pedidos/cocina, pedido manual, mesas/QR, catálogo/recetas, inventario y finanzas. No se abren ventanas del panel antiguo ni se incrustan sus menús. `gestion.html?tab=manual`, `mesas`, `catalogo`, `inventario`, `finanzas` y `pedidos` redirigen a su sección equivalente; la fuente original sigue conservada en `originales/`.

- `/admin?page=manual`: nombre, teléfono opcional en local, mesa/retiro/delivery, dirección, notas, variantes y modificadores. Guardar crea el pedido una sola vez, genera turno y seguimiento y permite preparar WhatsApp al cliente. No realiza el cobro.
- `/admin?page=tables`: 10 mesas inicialmente, cantidad configurable por administración (1–100), QR por mesa para abrir, copiar, descargar PNG con margen blanco o imprimir/guardar PDF. Los enlaces conservan `?mesa=N`. En revisión los QR abren datos de prueba y no sincronizan dispositivos reales.
- `/admin?page=finances`: resumen y gráfico, compras con entrada de stock, movimientos, CxC y CxP. Lee las colecciones existentes `transacciones`, `cxc`, `cxp`; conserva sus nombres de campos. Marcar una cuenta saldada actualiza su estado sin generar otro cobro/gasto automáticamente. Los cambios nuevos pasan por operaciones protegidas e idempotentes.

La TV muestra número y nombre de pila junto al tipo de entrega; no muestra teléfono, dirección ni apellido. Muestra logo, reloj y dos columnas grandes; pagina los turnos completos cuando no caben. Los canjes incluidos se identifican como canjes de pase.

### Formas de avisar

1. Seguimiento por enlace o QR del pedido: estado en vivo y sonido con la página abierta; avisos del navegador cuando son compatibles y el cliente da permiso. No hay Web Push para el navegador cerrado.
2. TV del local: número, nombre y alerta visual/sonora, útil sin teléfono.
3. WhatsApp manual: el botón prepara el mensaje con el estado actual y enlace de seguimiento; la persona del equipo confirma el envío. WhatsApp automático requiere una integración de Business Platform/proveedor y no se activa por generar un QR.

## Pantallas, tiempos y taquilla

La pantalla de pedidos utiliza todo el espacio para logo, reloj y dos columnas de turnos. Ajusta columnas, filas y tamaño de número, y rota páginas cada ocho segundos sin cortar tarjetas. Los controles de sonido y pantalla completa aparecen al interactuar y se ocultan después. Menú digital tiene su propia tarjeta en Televisores, con productos, fotos y precios rotativos. Las vistas de tiempos conservan su contenido de parque y gamer.

Taquilla pide el nombre del niño o jugador y permite un adulto responsable separado. Cada pase tiene un código `TAQ-000001` generado con el contador del servidor. El comprobante externo es opcional y solo relaciona el pase con otro sistema de caja. Las ampliaciones generan sufijos `-A01`, `-A02` si no se aporta comprobante. La confirmación de pago sigue siendo obligatoria. Los nombres se muestran al equipo; las pantallas públicas mantienen números de pase.

Con la página abierta y el sonido activado en ese dispositivo, los avisos suenan a cinco y un minuto; al llegar a cero aparece una alerta visual y una sirena continua hasta reconocerla. Reconocer una alarma silencia este dispositivo y no libera la estación. La ampliación reactiva los avisos con la nueva hora final. El navegador requiere una interacción para habilitar audio; revisar volumen, pantalla activa y comportamiento real en cada TV/PC. La alarma se produce en el navegador del encargado o de la pantalla compartida, sin superponerse al HDMI del juego.

Las cotufas incluidas en paquetes se vinculan a un producto del catálogo: receta para preparación en el local, o unidad para bolsa empacada. Ventas y canjes utilizan la misma existencia. Se conserva la compatibilidad con recetas de cotufas guardadas previamente. La revisión local también crea canjes e ingresos de pases, respeta configuración de paquetes y protege reintentos de compras, productos y canjes.

## Recetas e inventario

Catálogo y recetas se abre directamente en el administrador, con una sola navegación. El editor muestra únicamente los ingredientes del producto, permite añadirlos o quitarlos y conserva las cantidades ya guardadas. `data/recipe-templates.json` aporta ingredientes descritos en el PDF: las cantidades que el menú no especifica quedan pendientes, no en cero. Al guardar, los ingredientes nuevos se registran con stock cero, para cargar sus existencias reales en Inventario.

Los productos preparados usan receta en gramos, mililitros o unidades. Los productos empacados (refrescos, Doritos, Pepitos y otros snacks) se vinculan con una existencia en unidades: cada venta descuenta una unidad, sin permitir quitarla como modificador. Cada presentación lleva su propio producto. Cancelar antes de preparar devuelve las existencias una sola vez. La carga del menú conserva recetas, variantes y productos registrados que no figuran en el PDF.

El módulo financiero conserva sus flujos y colecciones originales dentro del administrador, sin una segunda barra lateral ni un iframe.

## Qué se prepara en esta rama

- Menú de 41 productos y combos transcritos del PDF, con categorías, pizzas por tamaño, opciones, modificadores, observaciones, mesa QR, retiro/delivery y seguimiento por enlace. Los dos combos mixtos sin precio están desactivados.
- Naranja y crema, logo original multicolor, fotos del PDF y del repositorio, tipografía de cartel y manuscrita, detalles de pincel y animaciones breves que respetan movimiento reducido.
- Pases pagados en taquilla que comienzan su reloj solo al activarlos en la entrada. Una estación vencida continúa ocupada hasta confirmar salida.
- Tarifas: parque 15 min $2; 30 min con cotufas $4; 60 min con perro y cotufas $6. Gamer 15 min $2; 30 min $4; 60 min con perro y cotufas $5; 120 min con perro y cotufas $6. Control adicional $1,30 documentado, deshabilitado hasta definir si se cobra por sesión o por bloque.
- Canjes únicos de comida incluida: se solicitan a cocina, descuentan únicamente las recetas configuradas y se entregan una sola vez. Administración debe confirmar qué perro incluyen los paquetes y la receta de cotufas.
- Cocina con turnos, ingredientes quitados y estados. Los clientes sin teléfono pueden seguir su número en la TV; quienes lo tienen abren el seguimiento. La impresión del turno sigue siendo opcional, sin requerir ticketeras físicas.
- Pantallas de pedidos con logo, reloj y turnos grandes; menú digital en una vista separada; pantallas de gamer/parque con cuentas regresivas y avisos. No se superponen mensajes al juego que llega por HDMI.
- Vinculación de pantallas con código de un solo uso de 10 caracteres, vencimiento de 10 minutos, sesión de dispositivo, latidos cada minuto y revocación. Su funcionamiento real requiere activar el Worker y publicar las reglas de Firestore.
- Clientes identificados por teléfono normalizado sin duplicados, autorización para guardar historial y consentimiento separado para promociones. Las fichas no se exponen al público. El checkout permite autorizar su registro con el pedido; el teléfono normalizado reúne las compras posteriores, sin sobrescribir una ficha existente desde el acceso público. También se pueden guardar personas que solo usan parque o Play desde taquilla.
- Inventario tiene una pantalla propia con mínimos, alta de insumos, compras y autoconsumo. Los nuevos insumos empiezan en cero; la unidad no se cambia para mantener coherencia con las recetas. Se conservan catálogo, recetas, transacciones, CxC y CxP en los módulos del administrador, con acceso del equipo. Compras y movimientos de stock pasan por transacciones de servidor; las compras suman stock y gasto juntos. Los pases generan un ingreso una sola vez, sin contar dos veces los canjes de comida.
- Las recetas de variantes Carne/Pollo se configuran por separado. Un producto sin receta o gramajes completos se identifica como pendiente; no se inventan consumos exactos.
- El panel financiero cuenta pedidos como cobros solo al confirmar pago externo. Se denomina “Balance operativo”, no utilidad neta. Se consulta la tasa BCV; si falla se muestra “—”, no una tasa ficticia. No se emiten facturas ni se verifican cobros bancarios.

## Direcciones

- `/` y `/cliente.html`: cliente.
- `/?mesa=4`: menú de mesa 4.
- `/seguimiento.html?token=...`: seguimiento de un pedido, sin exponer la ficha del cliente.
- `/admin.html`: acceso y directorio de áreas del equipo.
- `/inventario.html`: insumos, mínimos, compras y autoconsumo.
- `/ticketeras.html`: ticketeras virtuales de pases, turnos y canjes.
- `/pase.html?token=...`: consulta pública de un pase por enlace aleatorio; no expone nombre, teléfono ni referencia de pago. El reloj empieza al activarlo el encargado.
- `/imagenes.html`: elegir imágenes incluidas, pegar una URL o subir JPG/PNG/WebP hasta 5 MB al almacenamiento gratuito de Cloudflare. En preview se conservan solo en el navegador, hasta 2 MB por archivo.
- `/televisores.html`: vinculación de dispositivos, con rol de administración.
- `/?view=board&kind=orders`: pedidos; `kind=menu`: menú digital; `kind=gamer` y `kind=park`: tiempos.
- `/gestion.html?tab=...`: enlaces anteriores, redirigidos a los módulos integrados.

## Publicar frontend en Cloudflare Pages

La aplicación puede servirse estáticamente desde la raíz del repositorio con la configuración actual de Pages. Para un despliegue con build, usar `npm run build` y directorio `dist`. El build no necesita dependencias de frontend. No se deben servir `originales/` como una aplicación alternativa en producción; el build los excluye.

`npm run build -- --preview` genera una revisión aislada. Los subdominios de preview de Cloudflare (`*.divermania.pages.dev`) también se aíslan automáticamente; el dominio de producción `divermania.pages.dev` conserva el modo Firebase. Todos sus HTML activan almacenamiento de prueba y no importan ni escriben datos del negocio. Abrir la vista de revisión en otro dispositivo no enlaza datos locales; la versión real utiliza Firebase.

## Puesta en marcha sin facturación

La ruta de activación vigente es [ACTIVAR-CLOUDFLARE.md](ACTIVAR-CLOUDFLARE.md). Subir archivos a GitHub no asigna permisos en Google ni configura secretos en Cloudflare. El asistente prepara y verifica una revisión, autoriza la cuenta existente de administración y publica aplicación/reglas de forma coordinada. Mantiene `main` y configura Pages para publicar `codex/divermania-menu-control` después de ejecutar la etapa `publish`.

El Worker se genera en `dist/_worker.js`; `_routes.json` lo limita a `/api/*`. Los recursos estáticos no pasan por el Worker. El backend conserva las transacciones nativas de Firestore, sus reintentos y las proyecciones públicas en la misma operación. Las estaciones públicas se actualizan sin triggers. El cliente usa `/api/control` con su token de Firebase, y las pantallas usan su propia sesión para el latido. Las fotos se guardan por administración en el binding KV `MENU_IMAGES`.

Después de la activación, cargar el PDF sigue siendo una acción explícita en Catálogo y conserva recetas existentes. Configurar cantidades reales, estaciones, aforo y productos de los paquetes. Verificar cobros, stock, pases, cocina, seguimiento y las alarmas en dos dispositivos. La facturación fiscal permanece en el sistema existente.

Los archivos de Functions se conservan como adaptador para pruebas locales/compatibilidad, sin desplegarlos. `activate-firebase.mjs backend` y `storage` ya no publican servicios de pago. Las reglas no utilizan TTL. El cliente no importa Functions ni Firebase Storage.

El entorno de desarrollo no recibe las credenciales del propietario. La activación se ejecuta con su cuenta mediante el asistente; el menú y las recetas se cargan explícitamente desde el administrador.

## Validación y límites

`npm test` comprueba reglas de negocio y el backend con un almacén transaccional simulado: precios de servidor, stock, reintentos, exclusividad de estación, roles, canjes, códigos de TV, clientes, tarifas, variantes, privacidad y estados de pases públicos, cambios de imagen sin alterar receta, altas de insumos y compatibilidad con pedidos anteriores. Se verifican lecturas antes de escrituras en las transacciones. Estas pruebas no sustituyen probar las reglas con el emulador y las cuentas reales.

Se comprobó el renderizado de las vistas y formularios con un DOM de prueba. Se verificaron recorridos con Chromium. El audio, las cámaras, los permisos y las ticketeras físicas deben comprobarse en los dispositivos del local.

El sistema solo muestra avisos del pedido con la página abierta. No incluye Web Push con el navegador cerrado ni envío automático de WhatsApp. El botón de WhatsApp prepara el mensaje; la persona confirma su envío. El sistema actual de facturación sigue emitiendo la factura; esta versión guarda su referencia. Para integración automática se necesita conocer su API o formato de importación.

Horarios en Venezuela: lunes a jueves 11:00–19:30; viernes y sábado 11:00–20:30; domingo 09:00–16:00. Las fotografías tienen carácter ilustrativo y provienen del material proporcionado; ver `assets/menu/CREDITOS.txt`.

## Comprobación con los emuladores de Firebase

Con Java 21 y las dependencias de Functions instaladas, `npm run test:firebase` ejecuta Authentication y Firestore sobre el proyecto ficticio `demo-divermania`. La prueba aborta antes de importar el backend si faltan los hosts locales o el proyecto no coincide. No requiere iniciar sesión ni utiliza el proyecto del negocio.

Se comprueban permisos por roles con tokens de Authentication, seguimiento público sin listados, revocación de una TV, bloqueo de escrituras directas de stock, dos pedidos simultáneos de la última unidad, devolución al cancelar, reintentos de compra y exclusividad de una Play. Las llamadas al controlador del backend se ejecutan con `.run` contra Firestore emulado; esta prueba no sustituye el recorrido HTTP de Functions desplegadas ni las pruebas entre dispositivos reales.

Las reglas preparadas reservan las escrituras de catálogo, inventario, transacciones y cuentas a los servicios del servidor. Las lecturas siguen los permisos de cada área. Su publicación debe coordinarse con el frontend nuevo: el código antiguo realiza escrituras directas.

## Worker gratuito: pruebas de conexión y ejecución

`npm run test:worker` recorre la interfaz HTTP del Worker y la API REST transaccional de Firestore con Authentication/Firestore locales en `demo-divermania`. Prueba permisos, stock, concurrencia, devolución, idempotencia y exclusividad de estaciones. `npm run build` genera el bundle; `node tests/worker-runtime.mjs` lo ejecuta en workerd/Miniflare con los servicios externos sustituidos por respuestas de prueba y comprueba criptografía, OAuth, catálogo y archivos estáticos. Ninguna de estas pruebas usa los datos reales ni verifica audio en dispositivos físicos.
