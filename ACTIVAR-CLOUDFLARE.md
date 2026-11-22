# Activación sin tarjeta: Firebase Spark + Cloudflare Workers Free

Se conserva `divermania-3f104`: catálogo, recetas, ingredientes, snacks, pedidos, pases y clientes. Firestore y Authentication continúan en Firebase; las operaciones de servidor se ejecutan en el Worker de Cloudflare Pages. Las fotos nuevas se guardan en un espacio KV gratuito de Cloudflare. No se despliegan Functions, no se usa Firebase Storage para fotos nuevas y no se activa Blaze.

Las páginas, fotos incluidas y tipografías se sirven como archivos estáticos. `_routes.json` limita el Worker a `/api/*`, de modo que abrir una foto o descargar CSS no consume una ejecución del Worker. El navegador conserva las suscripciones en vivo de Firestore; los cronómetros calculan el tiempo desde la hora final sin escribir cada segundo.

## Preparación en tu Google Cloud Shell

Usa la misma terminal autenticada del proyecto:

```bash
cd ~/divermania-control
git pull --ff-only origin codex/divermania-menu-control
node scripts/activate-cloudflare.mjs prepare
```

El asistente pedirá un **token de Cloudflare**, con la entrada oculta. Créalo en https://dash.cloudflare.com/profile/api-tokens → Create Token → Create Custom Token. Autoriza **solo la cuenta donde está Divermanía**, con estos permisos de cuenta:

- Account Settings → Read.
- Cloudflare Pages → Edit.
- Workers KV Storage → Edit.

No pegues el token en el chat, en GitHub ni en un archivo del proyecto. La entrada de la terminal no muestra los caracteres. El token solo se utiliza durante ese proceso; no se guarda en los archivos de la aplicación.

Espera a ver `Token de Cloudflare (oculto):` antes de pegarlo. Si presionas Enter sin pegarlo, el asistente seguirá esperando con la entrada oculta. No pegues el token en una línea de la consola que termina en `$`. Si queda visible en una captura o mensaje, revócalo en Cloudflare y genera otro.

Usa el botón **Copiar** del valor que Cloudflare muestra una sola vez tras crear el token. Conserva el prefijo `cfut_` y todo el final del valor. El nombre del token y su ID no son credenciales válidas. Los errores `6003/6111` indican un formato de autorización no aceptado; no justifican cambiar permisos. El asistente muestra únicamente códigos y orientación fija, nunca el texto recibido ni el token.

`prepare` comprueba el acceso, respalda las reglas actuales, ejecuta las pruebas, configura la conexión privada con permisos de datos/Auth, crea el espacio de fotos y publica una revisión aislada en la rama `firebase-spark-check`. Comprueba el servidor y la lectura del catálogo sin crear pedidos ni alterar existencias. **Todavía no reemplaza la página principal ni publica reglas nuevas.**

La clave del servidor se envía directamente a las variables cifradas de Cloudflare; nunca se imprime, se guarda en el navegador ni se incorpora al repositorio. Si la política de Google impide crear claves de cuentas de servicio, el asistente se detiene: no desactiva esa política.

## Cuenta administradora

En Firebase → Authentication → Sign-in method, habilita **Email/Password** si no está habilitado. En Usuarios, crea tu cuenta de administrador si todavía no existe. Luego:

```bash
node scripts/activate-cloudflare.mjs admin
```

Introduce el correo de esa cuenta existente. El asistente asigna su rol `admin` usando tu autorización de Google; no pide ni cambia la contraseña. Las cuentas de otras áreas mantienen roles separados.

Las llamadas hechas con la sesión de Google incluyen `X-Goog-User-Project: divermania-3f104`. Identity Toolkit necesita ese identificador de proyecto de cuotas para aceptar credenciales de usuario. Indicarlo no cambia Spark ni activa facturación.

## Publicación coordinada

Revisa `firestore.rules` y el respaldo guardado en `.divermania-backups/`. Las reglas nuevas impiden escrituras directas de pedidos, precios y stock, incluso desde un navegador administrador. Esas operaciones pasan por el servidor. El cliente antiguo escribía directamente, por lo que debe publicarse junto con las reglas nuevas.

```bash
node scripts/activate-cloudflare.mjs publish
```

Vuelve a introducir el token de Cloudflare oculto. El asistente verifica la revisión y la cuenta administradora, respalda nuevamente las reglas, prepara el nuevo conjunto de reglas, publica la aplicación y aplica las reglas. Configura Cloudflare para publicar esta rama (`codex/divermania-menu-control`) y usar `npm ci && npm run build`, directorio `dist`. No fusiona ni sobrescribe `main`.

Si un paso falla, conserva el mensaje final y detente. Los respaldos y el registro de activación quedan en `.divermania-backups/`, excluidos de Git. No compartas su contenido íntegro: el registro puede contener identificadores de administración.

Si falla Google durante la creación de la conexión, ejecuta `node scripts/activate-cloudflare.mjs diagnose`. Este diagnóstico usa tu sesión de Google, no pide token de Cloudflare y solo consulta existencia de la cuenta de servicio, permisos y cantidad de claves. No muestra valores de claves ni cambia la configuración. Los errores incluyen el servicio, la petición y el mensaje de Google con las credenciales ocultas. Al asignar permisos se reintentan únicamente los conflictos y la propagación de una cuenta recién creada; los argumentos inválidos y las denegaciones se detienen con su detalle.

Entradas finales:

- Cliente: https://divermania.pages.dev/cliente
- Administrador: https://divermania.pages.dev/admin
- Pedidos en TV: https://divermania.pages.dev/?view=board&kind=orders

Inicia sesión de nuevo para recibir el rol actualizado. Comprueba desde dos dispositivos un pedido, su receta/stock, un pase y una pantalla vinculada. La revisión visual y el sonido deben comprobarse en las TV/PC reales.

## Cuotas gratuitas y copias

Estos servicios tienen límites, no capacidad ilimitada: Workers Free incluye 100.000 solicitudes/día y un límite de CPU por ejecución; Firestore Spark incluye 50.000 lecturas y 20.000 escrituras diarias y 1 GiB de almacenamiento; KV Free incluye 1 GB de almacenamiento, 100.000 lecturas/día y 1.000 escrituras/día. Comprueba siempre las cifras vigentes del panel del proveedor. El tamaño máximo por foto en esta aplicación es 5 MB.

Al alcanzar cuotas pueden rechazarse operaciones; el checkout conserva la clave del pedido para recuperar el resultado sin descontar dos veces. El sistema muestra el error y no cambia silenciosamente a almacenamiento local. El plan gratuito no proporciona una garantía de disponibilidad sin interrupciones. Las copias de reglas del asistente **no son copias de los datos**: la rutina de respaldo de pedidos/inventario debe configurarse y comprobarse antes del uso definitivo.

Para reducir lecturas, el menú público escucha un único documento de revisión y obtiene un catálogo saneado mediante caché del Worker; los cambios del catálogo actualizan esa revisión. Las pantallas mantienen sus consultas activas y necesitan autorización. Los latidos comprueban cada minuto la vinculación, pero solo actualizan `lastSeen` en la base cada cinco minutos. Se eliminaron las configuraciones TTL que requerían facturación.

Fuentes: [Firebase Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [cuotas de Firestore](https://firebase.google.com/docs/firestore/quotas), [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [KV](https://developers.cloudflare.com/kv/platform/pricing/).

## Validación reproducible

```bash
npm ci
npm test
npm run build
node tests/worker-runtime.mjs
```

Para comprobar transacciones y permisos con Authentication y Firestore locales, instala Java 21 y las dependencias del adaptador (`npm ci --prefix functions`), y ejecuta `npm run test:worker`. La prueba aborta si no está en el proyecto ficticio `demo-divermania` con los emuladores locales. Recorre las solicitudes HTTP del Worker y la API REST de Firestore: última unidad en paralelo, cancelación, compras repetidas, permisos, privacidad y estación exclusiva. El verificador de tokens de esa prueba usa el Auth emulado; las firmas de producción se comprueban separadamente con claves de prueba. No ejecuta operaciones sobre el negocio.

## Actualización del espacio de trabajo

La rama `codex/divermania-menu-control` publica automáticamente la interfaz y el Worker mediante Pages. La actualización añade inicio operativo, navegación agrupada, fotografías contenidas, colores y fuentes, sonidos por dispositivo, inventario por secciones, chat privado, guías, referencias de Valery, abonos, moneda/tasa histórica, apertura y conteo de caja, devoluciones, actividad, exportación e instalación PWA.

Para activar los permisos editables, actualiza las reglas desde la misma Cloud Shell que ya tiene tu autorización de Google:

```bash
cd ~/divermania-control
git pull --ff-only origin codex/divermania-menu-control
node scripts/activate-cloudflare.mjs rules
```

Este paso respalda las reglas anteriores, valida y publica las nuevas, y activa un indicador privado de versión. No solicita token de Cloudflare, no cambia existencias y no activa facturación. El Worker impide cambiar perfiles hasta completar este paso: las restricciones de lectura deben acompañar a las de operaciones. Las cuentas del equipo deben volver a entrar después de cambiar sus permisos. La cuenta propietaria se conserva.

Los pedidos web requieren un receptor autorizado con Inicio, Cocina, Taquilla o Nuevo pedido visible. El receptor informa su conexión cada 30 segundos; el servidor deja de aceptar envíos públicos después de 90 segundos sin señal, o inmediatamente al pausar. El carrito se conserva. Un pedido registrado sigue pendiente hasta que el local comienza la preparación. Los reintentos recuperan la misma operación incluso si se pausó la recepción después del primer envío.

Sin conexión se conserva la interfaz visitada, el último menú y borradores; los cambios reales de stock, pagos y pedidos requieren confirmación del servidor. Los tiempos usan su hora de finalización. Compartir los datos de un teléfono es el respaldo previsto; no hay servidor local ni sincronización de ventas entre varios equipos completamente desconectados.

La receta Valery 332 se incorpora como referencia revisable. Las unidades desconocidas deben confirmarse y vincularse a insumos existentes antes de aplicarla a la variante de pollo. Los conteos de las capturas no reemplazan las existencias actuales. La ayuda integrada usa procedimientos definidos; no se presenta como una IA generativa conectada. La impresión opcional usa el diálogo del sistema y requiere la ticketera instalada.

El chat se consulta solo mientras está abierto, con un máximo de 40 mensajes por consulta y cursor incremental. Colores y configuración nuevos se consultan mediante el Worker para funcionar antes de actualizar las reglas. El respaldo exportado respeta los permisos de lectura; una restauración se revisa y concilia antes de reemplazar registros. El balance financiero es operativo, no utilidad contable ni factura fiscal.

Se pueden crear cuentas del equipo desde Usuarios y permisos, con perfil inicial y contraseña. La aplicación no conserva esa contraseña en documentos de operaciones ni en el estado de demostración. Los datos locales de demostración usan claves separadas para carrito, borradores, apariencia y menú guardado.

Validación de esta actualización: pruebas de dominio y servidor (`npm test`), Worker empaquetado con workerd (`node tests/worker-runtime.mjs`), Auth/Firestore emulados con transacciones reales y reglas, y recorridos de navegador Chromium en escritorio, móvil y TV de 1366×768. La impresión se revisa como formato de 58 mm/PDF; la conexión física de la ticketera se comprueba en el local.
