> **Ruta vigente sin tarjeta:** utiliza [ACTIVAR-CLOUDFLARE.md](ACTIVAR-CLOUDFLARE.md). La instalación usa Firebase Spark + Cloudflare Workers y KV. No ejecutes los pasos de Functions/Storage de esta guía anterior: las etapas correspondientes se han bloqueado en el script para evitar activar servicios que requieren facturación.

# Activar Divermanía con tu cuenta de Google

Los archivos del cliente y el administrador ya están en esta rama de GitHub. Cloudflare publica sus cambios. Firebase Functions, reglas y cuentas se configuran por separado: no se actualizan solo al subir HTML.

## Abrir la terminal de tu cuenta

Abre [Google Cloud Shell](https://shell.cloud.google.com/?project=divermania-3f104). Autoriza el uso de tu cuenta si Google lo solicita. La terminal está en la parte inferior. No compartas contraseñas, tokens ni archivos de claves.

Si aún no tienes esta rama descargada, pega este bloque completo en esa terminal:

```bash
git clone --branch codex/divermania-menu-control https://github.com/diegoalbertoleroux-lab/divermania-.git divermania-control
cd divermania-control
node scripts/activate-firebase.mjs check
```

Si GitHub pide autenticación, usa tu cuenta autorizada desde Cloud Shell; también puedes descargar el ZIP de esta rama en GitHub. El repositorio debe ser accesible para poder clonarlo.

Si Firebase pide iniciar sesión, ejecuta el comando que imprime la terminal y sigue su enlace en el navegador. Mantén los códigos dentro de esa sesión de Cloud Shell. El primer paso solo verifica acceso; no cambia la base de datos. Si el directorio ya existe por un intento anterior, entra en él y ejecuta `git pull --ff-only` antes del comando `check`.

## Publicar el servicio

En la misma terminal:

```bash
node scripts/activate-firebase.mjs backend
```

Publica únicamente las Functions del código `divermania-control`. No carga datos de ejemplo ni reemplaza reglas de Firestore. Cloud Functions requiere un plan compatible (normalmente Blaze); si Firebase solicita activar facturación, ese cambio debe hacerlo el propietario desde la consola. Si un comando falla, conserva el mensaje y resuelve ese paso antes de continuar.

## Crear tu acceso de administrador

En [Firebase Authentication](https://console.firebase.google.com/project/divermania-3f104/authentication/users), activa el proveedor **Correo electrónico/contraseña** y crea la cuenta que utilizarás en el panel, o utiliza una cuenta que ya exista en ese proyecto. No publiques su contraseña.

Después ejecuta:

```bash
node scripts/activate-firebase.mjs admin
```

La terminal solicita el correo de esa cuenta y le asigna el rol `admin`; no crea cuentas ni cambia contraseñas. Si Google solicita credenciales ADC, sigue el comando que imprime la terminal y completa la autorización con tu cuenta en Google. No necesitas generar una clave de cuenta de servicio.

## Coordinar el paso a producción

El cliente antiguo escribe directamente y el nuevo usa el servicio. **No reemplaces las reglas hasta tener lista la publicación del frontend nuevo.** Guarda una copia de las reglas actuales en Firebase para poder volver atrás. El cambio de frontend y reglas debe coordinarse con esta rama; no basta con abrir el enlace de demostración.

Cuando corresponda aplicar las reglas revisadas:

```bash
node scripts/activate-firebase.mjs rules
```

Para permitir subir fotos, habilita Firebase Storage en el bucket configurado, revisa las reglas existentes de otras carpetas y después ejecuta:

```bash
node scripts/activate-firebase.mjs storage
```

Este último paso es opcional si eliges fotos incluidas o URLs externas.

## Comprobar el local

En el administrador real: carga el menú del PDF, completa las recetas con cantidades reales, registra existencias y prueba un pedido. Comprueba que quitar un ingrediente evita su descuento, y cancelar antes de cocinar devuelve stock. Registra una ficha autorizada, compra de nuevo con el mismo teléfono y revisa que aparece una sola ficha con historial. Prueba un pase pagado, su activación en la entrada, reloj, canje y una TV vinculada.

Las rutas finales son `/cliente` y `/admin`. Los enlaces de revisión de Cloudflare y el Site de demostración mantienen datos locales de prueba; no equivalen al negocio activo.

## Prueba previa completada en entorno local

La prueba `npm run test:firebase` usa Authentication y Firestore emulados, sin credenciales ni datos reales. Se comprobó que los movimientos pasan por el servicio protegido, que dos pedidos no consumen dos veces la última unidad y que los reintentos no duplican compras. La prueba usa un proyecto ficticio y bloquea su ejecución contra el proyecto real. Aún se debe validar el servicio HTTP desplegado, las cuentas reales y los equipos del local antes de cambiar a producción.
