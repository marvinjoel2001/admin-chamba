# Revision del flujo del admin

Fecha: 2026-10-07. Codex. Revision de codigo y contratos locales con
reproducciones aisladas de las funciones reales. Sin cambios funcionales.

## Hallazgos

### [P2] Dinero ganado incluye ofertas rechazadas

`src/pages/workers-page.tsx:719` suma todas las ofertas cuyo trabajo termino,
sin exigir `offerStatus === 'accepted'`. El historial del backend en
`backend-chamba/src/modules/mobile/services/mobile-users.service.ts:613`
devuelve ofertas aceptadas y rechazadas: un trabajo terminado por otra persona
puede incrementar el importe mostrado para quien perdio la oferta.

Reproduccion: oferta aceptada de Bs 100 y rechazada de Bs 80; muestra Bs 180
en vez de Bs 100. No se verificaron pagos ni se afirma que este importe los ejecute.
Correccion propuesta: filtrar ganadoras y tipar el historial; revisar tambien
el listado rotulado como trabajos realizados.

### [P2] El mapa de trabajos realizados descarta el historial actual

`src/pages/workers-page.tsx:290` filtra por `job.status`, `latitude` y `longitude`.
El DTO del backend en `mobile-users.service.ts:623` devuelve `requestStatus`
y no devuelve coordenadas. Incluso un trabajo completado queda excluido.

Reproduccion: respuesta de historial con trabajo completado y oferta aceptada;
el mapa recibe cero marcadores. Correccion propuesta: acordar un DTO con
coordenadas y usar `requestStatus`; validar numeros sin descartar el valor cero.

### [P2] Un fallo de envio en soporte elimina el borrador sin advertencia

`src/pages/disputes-page.tsx:190` vacia el texto antes del POST y el `catch`
silencia el error. El administrador pierde su respuesta y no sabe que no llego.

Reproduccion: el POST simulado falla; el borrador queda vacio y la funcion
resuelve sin indicar fallo. Correccion propuesta: conservar el borrador hasta
confirmar persistencia, mostrar error y permitir reintento. Revisar tambien
los errores de carga y resolucion.

### [P2] Una respuesta vieja mezcla dos trabajos en el modal

`src/pages/requests-page.tsx:162` y `:202` escriben detalle y notificados sin
invalidar peticiones al cambiar o cerrar el trabajo seleccionado.

Reproduccion: abrir A, abrir B, resolver B y despues A; detalle y trabajadores
vuelven a A aunque se selecciono B. Fotos, contactos y ofertas pueden pertenecer
al trabajo equivocado. Correccion propuesta: invalidar respuestas antiguas con
limpieza del efecto, identificador de peticion o AbortController, y limpiar datos
al iniciar otra carga.

## Verificacion

- `npm run build`: TypeScript y Vite correctos. Advertencia de chunks grandes.
  El primer intento fallo por permisos del sandbox; fuera del sandbox paso.
- `node --test docs/reproduce-admin-findings.cjs`: 4 reproducciones confirmadas.
  Estos tests afirman el comportamiento defectuoso actual; que pasen NO significa
  que los defectos esten corregidos. Extraen funciones con el parser TypeScript
  y usan fixtures locales, sin red, tokens ni cambios en produccion.
- No hay script de tests del admin en package.json. No se verifico el flujo
  autenticado en navegador ni contra Postgres real.

## Coordinacion y capturas

- Canal detallado: `Projectos/comunicacion-agentes.md`.
- Claude revisa app/backend. Codex no edito esos repositorios ni opero emuladores.
- Se encontraron nueve PNG en `Projectos/capturas-app/`; se inspeccionaron
  `worker_02_billetera.png` y `cliente_90_chat-historial.png`.
- El chat muestra historial de solo lectura, coherente con el flujo terminal.
  La billetera distingue importes de cobros; mantener esa distincion al revisar
  el admin. Las capturas NO demuestran las cuatro fallas por si solas.
- Revisar datos de cuentas y preparar versiones aprobadas antes de publicar las
  capturas en la web. No se copiaron a public/ ni se publicaron.
- Los emuladores usan Railway de produccion. No se publicaron solicitudes,
  aceptaron ofertas, enviaron mensajes, cancelaron trabajos ni realizaron pagos.
