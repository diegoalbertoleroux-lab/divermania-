# Actualización operativa de Divermanía

Se mantiene la aplicación web en Cloudflare Pages y Workers con Firestore y Authentication. Publicar esta actualización no vacía la base de datos, no inventa bebidas o gramajes y no cambia el menú público por las preferencias de un empleado.

## Pedidos y rendimiento

- El seguimiento diferencia consulta inicial, pedido registrado y pedido inexistente. Consulta una proyección pública pequeña sin cargar Authentication.
- El servidor devuelve el recibo confirmado a caja. El dispositivo incorpora la orden sin esperar la suscripción de Firestore. Los reintentos conservan la misma clave.
- El tablero cuenta con una consulta de recuperación si la conexión en vivo no termina de iniciar.
- El build agrupa la interfaz y comparte una sola instancia del estado. El precache incluye módulos usados, no todas las fuentes sin compilar. La cámara se descarga al utilizarla.
- La aplicación instalada abre la interfaz guardada y actualiza su copia en segundo plano. Los cambios operativos siempre requieren confirmación del servidor.
- Las fotos nuevas grandes se reducen en el dispositivo antes de subirlas cuando el navegador lo permite.
- El menú del cliente no tiene enlaces al panel del equipo, tampoco en demostración.

## Caja y pagos

Nuevo pedido muestra cantidad, precio unitario de venta y subtotal, permite favoritos personales y ofrece Guardar y cobrar.

Registrar pago permite varias líneas, abonos y saldo pendiente: efectivo, Zelle, Binance, pago móvil, transferencia, punto, tarjeta y otro; USD, VES, EUR y USDT. Para monedas diferentes de USD se registra la tasa real, expresada como unidades de esa moneda por USD. La referencia de cada pago es opcional. Completar restante rellena el saldo y Pagado completo aparece al cubrirlo. Solo el efectivo permite vuelto y este no se cuenta como ingreso.

Los nuevos turnos pertenecen al usuario que los abre. Sus movimientos se acumulan en esa caja y se conserva un registro de cierre con responsable, esperado, contado y diferencia. Se cuentan USD, Bs y EUR separadamente; los métodos electrónicos se detallan por moneda. Los turnos compartidos anteriores se conservan: ciérralos antes de abrir uno personal.

Reportes y cierres permite consultar métodos, áreas, categorías, costos de referencia y turnos. Consultar costos requiere su permiso específico. Conciliar métodos compara el movimiento neto registrado en un período con lo comprobado en la plataforma y conserva la diferencia. No equivale al saldo de una cuenta bancaria ni ejecuta pagos.

Las devoluciones de dinero son registros de pagos efectuados por fuera. Se conservan separadas de la cancelación y de la reposición de mercancía.

## Inventario

- Historial por artículo con entradas, salidas, responsables y saldos cuando el registro los contiene.
- Proveedores, plazo de entrega y órdenes de compra con cantidades pendientes, parciales y recibidas.
- Recepción por bultos: cantidad de bultos por contenido. La entrada y el pago se registran juntos. Una compra a crédito crea una cuenta por pagar, sin fingir salida de efectivo.
- Lotes y vencimientos en nuevas recepciones. Las ventas y comida incluida consumen primero los lotes con vencimiento más próximo; las cancelaciones previas a preparación restauran sus cantidades una vez. El stock identificado como vencido no se vende.
- Mermas y devoluciones descuentan las cantidades registradas de los lotes. El equipo debe retirar físicamente el lote correspondiente.
- Existencia disponible separada de unidades reservadas en pedidos nuevos; al comenzar cocina la reserva pasa a consumo. El conteo físico descuenta esas reservas para no duplicarlas. Antes del primer conteo tras actualizar, atiende o concilia los pedidos de la versión anterior.
- Conteo por sección pendiente de aprobación. Si hubo movimientos posteriores, se exige repetirlo para no sobrescribirlos. Los artículos con lotes requieren conciliar también sus cantidades por lote antes de seguir vendiendo.
- Devolución a proveedor con reintegro ya recibido o saldo por cobrar.
- Reposición calculada con consumo registrado de los últimos 30 días, mínimos, cobertura y plazo de entrega. Las recetas incompletas subestiman consumo y quedan señaladas; no se inventan cantidades.
- Historial de precios y recetas con comparación antes y después para los cambios nuevos.

Las existencias anteriores que no tienen lote no adquieren un vencimiento ficticio. El último costo de compra permite referencias de margen; no representa utilidad neta ni costo histórico completo de ventas. Las copias exportadas incluyen las nuevas colecciones según los permisos de la cuenta.

## Clientes y comprobantes

La ficha del representante se identifica por documento y conserva varios niños. Se vincula con la ficha anterior por teléfono para evitar duplicados. Los pases agregan nombres nuevos a la familia autorizada y permiten reutilizar los ya guardados. No se requiere crear una ficha familiar para una compra rápida de comida.

El ticket del pedido incluye productos, precio unitario, total y QR de seguimiento. La comanda de cocina destaca número, variantes y observaciones; sus reimpresiones desde el mismo dispositivo se marcan como copia. La impresión sigue siendo opcional por el diálogo del equipo, con formatos de 58/80 mm. WhatsApp abre la conversación del teléfono registrado con el mensaje preparado; el empleado confirma el envío.

## Chat y televisores

El chat se abre desde la cabecera en un panel rápido. El inbox consulta mensajes mientras se usa la app; muestra contador, aviso y sonido si está habilitado. Activar notificaciones solicita permiso y, donde se admite Push API, registra ese dispositivo para recibir un aviso con la app cerrada. El aviso no incluye el contenido privado del mensaje. Se requiere internet, permiso del sistema y compatibilidad del navegador; no se garantiza aviso con el dispositivo apagado o bajo restricciones del sistema operativo. En iPhone puede requerirse instalar la web en la pantalla de inicio.

Las pantallas de pedidos adaptan su distribución al espacio y paginan los turnos. El modo Menú digital se elige al vincular un televisor y rota productos y precios disponibles. Se comprobaron vistas horizontales y verticales. Cada modelo de TV debe probarse con pantalla completa y zoom apropiado.

## Apariencia

Los colores principal, menú lateral, tarjetas, fondo y texto siguen siendo privados de cada usuario. Se corrigen textos que conservaban el naranja anterior. Las alertas mantienen sus colores de significado.

El selector incluye más de cien familias web abiertas y fuentes de Office ya instaladas. Se carga únicamente la fuente elegida. No distribuye todas las fuentes propietarias de Word o Canva; una fuente local necesita estar instalada en cada dispositivo. El cliente y las TVs conservan su identidad.

## Validación

- Pruebas de dominio y servidor, incluidos pagos mixtos, reintentos, vuelto, familias, proveedores, recepción a crédito, conteos, auditoría, lotes vencidos y cajas de usuarios independientes.
- Worker empaquetado ejecutado con workerd.
- HTTP del Worker y API REST de Firestore con Authentication y Firestore emulados en demo-divermania. Incluye nuevos pagos divididos, familias y consumo/restauración de lotes. No usa datos del negocio.
- Chromium: chat rápido, familias, pedido, QR, WhatsApp dirigido, pagos, proveedores, reposición, reportes, preferencias por usuario y menú público sin enlaces internos.
- TV 1366×768, 1920×1080, 1280×720 y 720×1280, con colas paginadas y sin desbordamiento del documento.
- Aplicación instalada con red deshabilitada para abrir la interfaz y el menú guardados. No se habilitan escrituras operativas sin conexión.

La validación física de impresora, cámara, altavoces, TV y notificaciones del sistema debe realizarse en los equipos del local. El acceso real sigue dependiendo de conexión, permisos y cuotas de los proveedores; esta actualización no ofrece una garantía de cero interrupciones.
