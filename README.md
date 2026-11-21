# Divermanía · Menú, parque y zona gamer

La aplicación conserva el proyecto Firebase **divermania-3f104** y el alojamiento en Cloudflare Pages. La nueva versión añade menú basado en el PDF, taquilla, sesiones por tiempo, clientes frecuentes, cocina y pantallas vinculadas. Los dos HTML originales se conservan byte por byte en `originales/`.

Las dos entradas son **`/cliente`** y **`/admin`**. Las URLs con `.html` también se admiten; el alojamiento puede redirigirlas a URLs sin extensión. Inventario, recetas, clientes, imágenes, ticketeras y TV se abren dentro del administrador.

Para activar el proyecto con tu propia cuenta, sigue [ACTIVAR-FIREBASE.md](ACTIVAR-FIREBASE.md).

## Un solo administrador

Todos los apartados del panel anterior están integrados: resumen, pedidos/cocina, pedido manual, mesas/QR, catálogo/recetas, inventario y finanzas. No se abren ventanas del panel antiguo ni se incrustan sus menús. `gestion.html?tab=manual`, `mesas`, `catalogo`, `inventario`, `finanzas` y `pedidos` redirigen a su sección equivalente; la fuente original sigue conservada en `originales/`.

- `/admin?page=manual`: nombre, teléfono opcional en local, mesa/retiro/delivery, dirección, notas, variantes y modificadores. Guardar crea el pedido una sola vez, genera turno y seguimiento y permite preparar WhatsApp al cliente. No realiza el cobro.
- `/admin?page=tables`: 10 mesas inicialmente, cantidad configurable por administración (1–100), QR por mesa para abrir, copiar, descargar PNG con margen blanco o imprimir/guardar PDF. Los enlaces conservan `?mesa=N`. En revisión los QR abren datos de prueba y no sincronizan dispositivos reales.
- `/admin?page=finances`: resumen y gráfico, compras con entrada de stock, movimientos, CxC y CxP. Lee las colecciones existentes `transacciones`, `cxc`, `cxp`; conserva sus nombres de campos. Marcar una cuenta saldada actualiza su estado sin generar otro cobro/gasto automáticamente. Los cambios nuevos pasan por operaciones protegidas e idempotentes.

La TV muestra número y nombre de pila junto al tipo de entrega; no muestra teléfono, dirección ni apellido. Mantiene las transiciones y el pulso de recién listos. Los canjes incluidos se identifican como canjes de pase.

### Formas de avisar

1. Seguimiento por enlace o QR del pedido: estado en vivo y sonido con la página abierta; avisos del navegador cuando son compatibles y el cliente da permiso. No hay Web Push para el navegador cerrado.
2. TV del local: número, nombre y alerta visual/sonora, útil sin teléfono.
3. WhatsApp manual: el botón prepara el mensaje con el estado actual y enlace de seguimiento; la persona del equipo confirma el envío. WhatsApp automático requiere una integración de Business Platform/proveedor y no se activa por generar un QR.

## Pantallas, tiempos y taquilla

La pantalla de pedidos conserva cada tarjeta al recibir cambios, anima la entrada, el traslado a listos y la salida, y resalta los recién listos durante ocho segundos. El primer conjunto de pedidos recibido al abrir la pantalla se toma como estado inicial y no vuelve a llamar todos los turnos. El carrusel rota cada nueve segundos con productos disponibles en el catálogo, tarifas informadas de parque/gamer, horario de Caracas y una invitación general a celebrar cumpleaños, sin fechas de eventos inventadas. El QR visible abre un menú donde se puede elegir mesa, retiro o delivery.

Taquilla pide el nombre del niño o jugador y permite un adulto responsable separado. Cada pase tiene un código `TAQ-000001` generado con el contador del servidor. El comprobante externo es opcional y solo relaciona el pase con otro sistema de caja. Las ampliaciones generan sufijos `-A01`, `-A02` si no se aporta comprobante. La confirmación de pago sigue siendo obligatoria. Los nombres se muestran al equipo; las pantallas públicas mantienen números de pase.

Con la página abierta y el sonido activado en ese dispositivo, los avisos suenan a cinco y un minuto; al llegar a cero aparece una alerta visual y una alarma que se repite cada doce segundos hasta reconocerla. Reconocer una alarma silencia este dispositivo y no libera la estación. La ampliación reactiva los avisos con la nueva hora final. El navegador requiere una interacción para habilitar audio; revisar volumen, pantalla activa y comportamiento real en cada TV/PC. La alarma se produce en el navegador del encargado o de la pantalla compartida, sin superponerse al HDMI del juego.

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
- Pantallas de pedidos con fotos y QR; pantallas de gamer/parque con cuentas regresivas y avisos. No se superponen mensajes al juego que llega por HDMI.
- Vinculación de pantallas con código de un solo uso de 10 caracteres, vencimiento de 10 minutos, sesión de dispositivo, latidos cada minuto y revocación. Su funcionamiento real requiere publicar Firebase Functions y reglas.
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
- `/imagenes.html`: elegir imágenes incluidas, pegar una URL o subir JPG/PNG/WebP hasta 5 MB a Firebase Storage. En preview se conservan solo en el navegador, hasta 2 MB por archivo.
- `/televisores.html`: vinculación de dispositivos, con rol de administración.
- `/?view=board&kind=orders`: pedidos; `kind=gamer` y `kind=park`: tiempos.
- `/gestion.html?tab=...`: enlaces anteriores, redirigidos a los módulos integrados.

## Publicar frontend en Cloudflare Pages

La aplicación puede servirse estáticamente desde la raíz del repositorio con la configuración actual de Pages. Para un despliegue con build, usar `npm run build` y directorio `dist`. El build no necesita dependencias de frontend. No se deben servir `originales/` como una aplicación alternativa en producción; el build los excluye.

`npm run build -- --preview` genera una revisión aislada. Los subdominios de preview de Cloudflare (`*.divermania.pages.dev`) también se aíslan automáticamente; el dominio de producción `divermania.pages.dev` conserva el modo Firebase. Todos sus HTML activan almacenamiento de prueba y no importan ni escriben datos del negocio. Abrir la vista de revisión en otro dispositivo no enlaza datos locales; la versión real utiliza Firebase.

## Puesta en marcha necesaria antes de reemplazar main

Subir esta rama a GitHub **no publica por sí solo** Functions, reglas de Firestore, cuentas de Authentication ni roles. El Firebase web config identifica el proyecto pero no proporciona permisos administrativos.

1. Con acceso autorizado al proyecto, revisar el plan y la configuración actuales. Cloud Functions necesita un plan compatible (normalmente Blaze). Esta rama no cambia facturación ni habilita servicios por sí sola.
2. Habilitar el proveedor Email/Password en Firebase Authentication y crear las cuentas del equipo. Añadir `divermania.pages.dev` a los dominios autorizados cuando corresponda.
3. Asignar un rol verificado a cada cuenta (`admin`, `cash`, `entrance`, `gamer`, `kitchen`). El script `scripts/set-staff-role.mjs UID ROL` usa credenciales administrativas del entorno autorizado; no se deben compartir claves privadas por chat ni guardarlas en Git.
4. Instalar las dependencias del backend con `npm ci --prefix functions`. Publicar el servicio y triggers con `firebase deploy --only functions --project divermania-3f104`. El predeploy copia el dominio compartido al paquete de Functions.
5. Comprobar funciones y reglas en un entorno de pruebas/emuladores y revisar cualquier diferencia con las reglas existentes antes de aplicarlas. `firestore.rules` protege los datos internos y reserva las operaciones de precios/stock a los servicios de servidor. Puede requerirse permiso de firma de tokens en la cuenta de servicio para la vinculación de pantallas.
6. Coordinar la publicación del frontend y `firebase deploy --only firestore:rules,firestore:indexes --project divermania-3f104`. La aplicación antigua escribe pedidos directamente; aplicar las reglas nuevas antes de actualizar el cliente bloquearía ese flujo antiguo. No se deben dar por protegidas las colecciones hasta aplicar y comprobar las reglas.
7. Iniciar sesión como administrador y usar **Catálogo → Cargar menú del PDF**. La carga actualiza nombres coincidentes, conserva sus recetas y no elimina otros productos. No se ejecuta al abrir la página ni al publicar el código.
8. Completar los precios faltantes y las recetas con cantidades reales. En “Parque y Play” registrar las estaciones físicas y definir aforo, perro del paquete y receta de cotufas.
9. Emitir un pase, activarlo, probar alertas y el canje. Tomar un pedido y verificar descuento de ingredientes, cocina, seguimiento y registro de referencia del facturador.
10. Para subir imágenes habilitar Firebase Storage en el bucket configurado, revisar `storage.rules` contra las reglas existentes y publicar `firebase deploy --only storage --project divermania-3f104`. La regla incluida permite imágenes públicas en `menu/` y carga solo por administradores autenticados. Revisar reglas de otras carpetas antes de reemplazarlas. La galería incluida y las URLs externas no requieren subir archivos a Storage.
11. Vincular cada pantalla desde su navegador con el código del administrador, activar pantalla completa y sonido, y comprobar su revocación. Si el televisor no tiene navegador compatible, usar TV Box o una computadora por HDMI.

No se ha modificado la base real ni publicado servicios en Firebase durante la preparación de esta rama. El diseño puede revisarse por separado antes de activar esas operaciones.

## Validación y límites

`npm test` comprueba reglas de negocio y el backend con un almacén transaccional simulado: precios de servidor, stock, reintentos, exclusividad de estación, roles, canjes, códigos de TV, clientes, tarifas, variantes, privacidad y estados de pases públicos, cambios de imagen sin alterar receta, altas de insumos y compatibilidad con pedidos anteriores. Se verifican lecturas antes de escrituras en las transacciones. Estas pruebas no sustituyen probar las reglas con el emulador y las cuentas reales.

Se comprobó el renderizado de las vistas y formularios con un DOM de prueba. La herramienta de navegador real no está disponible en este entorno; la revisión visual, audio en TVs y permisos reales deben verificarse en la puesta en marcha.

El sistema solo muestra avisos del pedido con la página abierta. No incluye Web Push con el navegador cerrado ni envío automático de WhatsApp. El botón de WhatsApp prepara el mensaje; la persona confirma su envío. El sistema actual de facturación sigue emitiendo la factura; esta versión guarda su referencia. Para integración automática se necesita conocer su API o formato de importación.

Horarios en Venezuela: lunes a jueves 11:00–19:30; viernes y sábado 11:00–20:30; domingo 09:00–16:00. Las fotografías tienen carácter ilustrativo y provienen del material proporcionado; ver `assets/menu/CREDITOS.txt`.

## Comprobación con los emuladores de Firebase

Con Java 21 y las dependencias de Functions instaladas, `npm run test:firebase` ejecuta Authentication y Firestore sobre el proyecto ficticio `demo-divermania`. La prueba aborta antes de importar el backend si faltan los hosts locales o el proyecto no coincide. No requiere iniciar sesión ni utiliza el proyecto del negocio.

Se comprueban permisos por roles con tokens de Authentication, seguimiento público sin listados, revocación de una TV, bloqueo de escrituras directas de stock, dos pedidos simultáneos de la última unidad, devolución al cancelar, reintentos de compra y exclusividad de una Play. Las llamadas al controlador del backend se ejecutan con `.run` contra Firestore emulado; esta prueba no sustituye el recorrido HTTP de Functions desplegadas ni las pruebas entre dispositivos reales.

Las reglas preparadas reservan las escrituras de catálogo, inventario, transacciones y cuentas a los servicios del servidor. Las lecturas siguen los permisos de cada área. Su publicación debe coordinarse con el frontend nuevo: el código antiguo realiza escrituras directas.
