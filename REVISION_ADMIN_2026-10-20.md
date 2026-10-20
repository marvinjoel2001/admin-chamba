# Corrección de regresiones del administrador — 20 de octubre de 2026

Base revisada: `d65514b` (merge de `fix/auditoria-2026-10`). Se confirmó en el navegador de producción que `/map` muestra `RangeError: Maximum call stack size exceeded`.

## Correcciones

- **H-ADMIN-01, mapa bloqueado:** la nueva función `listen` agregaba un listener a su lista y volvía a llamarse a sí misma. Ahora registra el evento con `socket.on`. Se conserva el socket compartido, el procesamiento agrupado de posiciones y la limpieza exclusiva de los listeners del mapa al salir de la pantalla.
- **H-ADMIN-02, alta de trabajadores:** el patrón `/S+@S+.S+/` rechazaba correos habituales. La validación ahora acepta direcciones normales y con subdominio o alias `+`, rechaza direcciones mal formadas y aplica el mismo recorte de espacios que el envío. Se bloquean los envíos repetidos mientras la operación está en curso.

## Validación

`npm test`: **8 pruebas aprobadas**, con componentes reales de React y sus efectos. Las llamadas HTTP, el transporte de sockets y el renderizador WebGL se sustituyen por dobles controlados en las pruebas automatizadas.

1. Montaje del mapa, una suscripción por evento y limpieza sin desconectar el socket compartido.
2. Recepción de posiciones de trabajadores/clientes, publicación de solicitudes y cambio de estado.
3. Carga de datos del mapa cuando no hay socket disponible.
4. Validación de correos válidos e inválidos al crear trabajadores.
5. Envío normalizado y protección contra duplicados durante el guardado.
6. Decimales, comisión y sentido de los saldos en Billetera.
7. Reportes web: actualización por evento, cambio de pestaña y limpieza de listeners.
8. Trabajos: búsqueda inicial del encabezado y actualización posterior.

`npm run build`: **aprobado**, TypeScript y Vite. Se conserva el aviso existente sobre el tamaño de los bundles.

## Comprobación visual

Entorno local aislado con datos ficticios: interfaz en `http://127.0.0.1:5177`, API y Socket.IO de QA en `127.0.0.1:3017`. El mapa usa el renderizador real de Mapbox.

- Mapa: marcadores y solicitudes visibles, centrado, popup, círculo de 5 km y cobertura de dos trabajadores (uno disponible).
- Navegación entre mapa, trabajadores, billetera y reportes web, y regreso al mapa: una sola conexión Socket.IO, sin desbordamiento de pila.
- Formulario: correo normal habilita Crear; se cancela la prueba sin crear cuentas.
- Billetera: Bs 300.50 de ganancias y Bs 30.05 de comisión, con el sentido correcto del saldo.
- Reportes y suscriptores: pestañas y datos visibles.

Capturas y API ficticia: `../PRUEBAS_ADMIN_2026-10-20/`. No se crean usuarios ni se modifican solicitudes, dinero o configuración de producción. Se consultó el contrato actual del backend en `origin/main` (`d09217b0`) sin modificar su checkout.

## Publicación

El push requiere la autorización de Marvin según `../COORDINACION_AGENTES.md`. Antes de recibirla, la corrección solo está disponible localmente. La confirmación en Vercel requiere comprobar después la versión desplegada y volver a abrir `/map`.
