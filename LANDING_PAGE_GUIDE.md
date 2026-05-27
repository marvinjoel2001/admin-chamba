# Guía de Diseño y Funcionalidades para la Landing Page: Chamba App 🚀

Esta guía contiene toda la información de marca, tokens de diseño (colores, tipografía y efectos de **glassmorphism**), flujos de funcionalidad de la aplicación móvil (`app-chamba`) y del panel de administración (`admin-chamba`) necesarios para construir una landing page premium, moderna y de alto impacto que cautive a los usuarios y chambistas.

---

## 🎨 Sistema de Diseño Visual (Design Tokens)

El estilo visual de la marca Chamba se define como **Premium Glassmorphism**. Utiliza fondos oscuros profundos con destellos de luz de color (glows), paneles translúcidos con desenfoque de fondo y acentos vibrantes de color violeta y oro. Esta combinación genera una sensación futurista, limpia y sumamente profesional.

### 1. Paleta de Colores de la Marca

Para lograr coherencia visual con la app de producción y el panel de administración, utiliza los siguientes códigos de color en tu landing page:

| Rol de Color | Código HEX | Variable Tailwind | Descripción |
| :--- | :--- | :--- | :--- |
| **Fondo Base** | `#07111F` | `bg-background` | Azul pizarra muy oscuro y profundo, usado en la app móvil. |
| **Fondo Alternativo** | `#0B172A` | `bg-background-accent`| Tono intermedio para secciones destacadas. |
| **Fondo Admin** | `#0b0b0f` | `bg-admin-dark` | Negro puro elegante utilizado en el panel administrativo. |
| **Primario (Violeta)** | `#8B5CF6` | `text-primary` / `bg-primary` | Color principal de acento. Representa tecnología y profesionalismo. |
| **Primario Light** | `#A78BFA` | `text-primary-light` | Violeta pastel brillante para textos sobre fondo oscuro o estados hover. |
| **Primario Dark** | `#6D28D9` | `bg-primary-dark` | Violeta profundo para contenedores e interactivos. |
| **Secundario (Oro/Amarillo)** | `#EAB308` | `text-secondary` | Amarillo cálido que representa valor, brillo y energía del trabajo. |
| **Texto Principal** | `#F8FAFC` | `text-slate-50` | Blanco puro con tinte azulado frío de alta legibilidad. |
| **Texto Muted/Secundario** | `#9FB0C6` | `text-slate-400` | Gris azulado suave para subtítulos, descripciones y textos secundarios. |
| **Éxito (Verde)** | `#22C55E` | `text-success` | Indicador de transacciones seguras o chambas completadas. |
| **Error (Rojo)** | `#F97373` | `text-error` | Indicador de alertas o disputas. |

---

### 2. Especificación de Glassmorphism (Efecto Vidrio Esmerilado)

El efecto de vidrio esmerilado translúcido es la firma visual de **Chamba**. En lugar de usar contenedores sólidos simples, utiliza paneles translúcidos con bordes delgados semitransparentes y desenfoque de fondo (**backdrop-filter**).

#### Estilo Oscuro (Dark Glassmorphism)
Ideal para secciones hero, tarjetas de características y el diseño principal:
```css
.glass-panel-dark {
  background-color: rgba(13, 23, 42, 0.72); /* Azul oscuro translúcido */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12); /* Borde blanco sutil */
  border-radius: 24px;
  box-shadow: 0 16px 42px rgba(2, 6, 23, 0.4);
}
```

#### Estilo Claro (Light Glassmorphism)
Si decides habilitar una sección con estilo claro o modo claro de alta gama:
```css
.glass-panel-light {
  background-color: rgba(255, 255, 255, 0.65); /* Blanco translúcido */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.15); /* Borde sutil con tono violeta */
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(139, 92, 246, 0.08);
}
```

#### Entradas de Datos de Vidrio (Glass Inputs)
Para formularios de registro o captación de leads en la landing page:
```css
.glass-input {
  background-color: rgba(7, 17, 31, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #F8FAFC;
  transition: all 0.3s ease;
}

.glass-input:focus {
  border-color: rgba(139, 92, 246, 0.85); /* Acento violeta */
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  outline: none;
}
```

---

### 3. Glows de Fondo (Efecto Aura de Luz)

Para darle vida y profundidad dinámica a la landing page, añade elementos fijos o absolutos detrás del contenido principal usando gradientes radiales sutiles.

```html
<!-- Glow Violeta Superior Izquierdo -->
<div class="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none z-[-1]"
     style="background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%);"></div>

<!-- Glow Dorado Inferior Derecho -->
<div class="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none z-[-1]"
     style="background: radial-gradient(circle, rgba(234, 179, 8, 0.1) 0%, rgba(0,0,0,0) 70%);"></div>
```

### 4. Tipografía Recomendada
Para un aspecto premium de alta gama, evita las tipografías estándar del sistema y carga estas fuentes de Google Fonts:
*   **Títulos principales e interactivos**: `Plus Jakarta Sans` (pesos 700 y 800) o `Outfit`. Tienen curvas modernas muy sofisticadas.
*   **Cuerpo de texto**: `Inter` o `Plus Jakarta Sans` (pesos 400 y 500) para una legibilidad óptima.

---

## 💡 Propuesta de Valor y Pitch del Producto

Para capturar leads o descargas, la Landing Page debe comunicar con precisión qué hace Chamba y por qué es única.

**Definición de Chamba**: "Chamba es la plataforma móvil definitiva bajo demanda que conecta de forma inmediata a clientes locales con profesionales calificados y verificados (*chambistas*) para resolver tareas domésticas y técnicas de forma segura, rastreable y sin fricciones."

### Propuesta para el Cliente (¿Necesitas ayuda con algo?)
*   **Conexión Inmediata**: Publica una tarea (Electricidad, Plomería, Limpieza) en segundos y recibe ofertas competitivas de chambistas cercanos en tiempo real.
*   **Seguridad Garantizada**: Todos los chambistas pasan por una estricta verificación de identidad física y biométrica facial.
*   **Transparencia de Precios**: Tú seleccionas la oferta que mejor se adapte a tu presupuesto y necesidades. El pago queda protegido en garantía (Escrow) hasta que confirmes que el trabajo fue excelente.
*   **Rastreo en Tiempo Real (GPS)**: Observa en el mapa cómo tu Chambista se desplaza hacia tu ubicación exacta en tiempo real.
*   **Comentarios Reales**: Califica y lee reseñas verificadas de otros clientes del vecindario.

### Propuesta para el Chambista / Trabajador (¿Quieres ganar dinero con tu talento?)
*   **Tus Propios Términos**: Elige qué trabajos aceptar, cuándo trabajar y cuánto cobrar por tus servicios mediante ofertas personalizadas.
*   **Flujo Constante de Clientes**: Olvídate de buscar clientes. Recibe solicitudes cercanas directamente en tu celular según tu especialidad.
*   **Pagos Seguros e Inmediatos**: Tu dinero se deposita en tu billetera digital Chamba tan pronto completes la tarea, listo para transferencia bancaria.
*   **Comisiones Flexibles**: Configuración de tarifas base y comisiones justas gestionadas dinámicamente para maximizar tus ganancias.
*   **Perfil Profesional Premium**: Construye tu reputación digital con calificaciones excelentes que atraerán más clientes.

---

## 🛠️ Mapa de Funcionalidades (Para mostrar en la Web)

Para ilustrar el funcionamiento de la app con animaciones o mocks visuales, presenta estas características clave estructuradas por flujos:

### 1. La Experiencia en la Aplicación Móvil (`app-chamba`)
*   **Registro Multirrol e Identidad Inteligente**: Los usuarios se registran y cargan su documento de identidad y una selfie en tiempo real. El sistema los valida velozmente para activar su cuenta.
*   **Explorador de Servicios**: Mapa interactivo nativo que muestra profesionales activos en la zona.
*   **Buzón de Licitación Abierta**: El cliente detalla su necesidad con fotos y descripción. Los chambistas ofertan al instante. El cliente compara perfiles, calificaciones y precios en una sola pantalla de decisión.
*   **Chat Seguro Integrado**: Sistema de comunicación en vivo para aclarar dudas y enviar fotos adicionales sin revelar números de teléfono personales.
*   **Seguimiento por GPS Activo**: Seguimiento por mapa del viaje del chambista hasta la puerta del cliente.
*   **Billetera Digital Integrada**: Monitorea ingresos acumulados, retiros completados e historial completo de transacciones.

### 2. El Respaldo del Panel Administrativo (`admin-chamba`)
La landing page debe proyectar solidez operativa. Muestra que detrás de la app hay un panel de control avanzado que garantiza la seguridad y soporte del ecosistema:
*   **Verificación Humana y Biométrica de Documentos**: Pipeline en tiempo real donde administradores auditan minuciosamente el DNI (frente y dorso) y la foto facial del chambista (usando la API de Cloudinary) antes de habilitarlo en la calle.
*   **Mapa de Control de Operaciones**: Monitoreo en vivo de toda la flota de trabajadores activos, solicitudes activas y disputas vigentes sobre un mapa en tiempo real (Mapbox).
*   **Centro de Arbitraje de Disputas**: En caso de desacuerdo, un mediador humano analiza registros de chat, fotos tomadas en el sitio y testimonios para resolver la disputa justamente (reembolsando al cliente o liberando fondos al chambista).
*   **Gestor Inteligente de Categorías**: Administración dinámica de tarifas, comisiones porcentuales de la plataforma e íconos personalizados para cada tipo de oficio.
*   **Billetera de Plataforma**: Control centralizado de retiros, transacciones y estados financieros.

---

## 📐 Estructura Sugerida para la Landing Page

Para guiar la construcción, te sugerimos estructurar la página en las siguientes 7 secciones utilizando el diseño Premium de Chamba:

1.  **Hero Section (Sección Principal)**:
    *   *Fondo*: Oscuro con gradiente de glow violeta y amarillo.
    *   *Texto*: "Tu ayuda de confianza, al instante." con tipografía `Plus Jakarta Sans`.
    *   *Visual*: Captura de pantalla en perspectiva (Mockup) de la aplicación de usuario mostrando el mapa interactivo con chambistas flotantes en tarjetas de vidrio esmerilado.
    *   *CTA*: Botón vibrante violeta: "Descargar App Chamba" y "Unirse como Profesional".
2.  **Toggle de Experiencias ("Cómo Funciona")**:
    *   Un interruptor interactivo premium para cambiar la vista entre **"Para Clientes"** y **"Para Profesionales"**. Al alternarlo, cambian las animaciones o capturas mostradas y las propuestas de valor.
3.  **Grid de Tarjetas de Características (Glassmorphism)**:
    *   3 tarjetas interactivas de vidrio esmerilado (`glass-panel-dark` o `glass-panel-light` con efectos hover de elevación y glows).
    *   *Temas*: 1) GPS en tiempo real, 2) Pagos Protegidos en Garantía, 3) Chat e Historial.
4.  **Sección de Confianza y Seguridad ("Vetting")**:
    *   Muestra el proceso de validación. Una de identificación y una selfie convirtiéndose en un check verde verificado. Esto transmite la seguridad fundamental de que no entra cualquiera a tu hogar.
5.  **Grid de Categorías**:
    *   Tarjetas pequeñas con micro-animaciones al pasar el mouse (hover).
    *   *Categorías a mostrar*: Plomería 🚰, Electricidad ⚡, Limpieza 🧹, Jardinería 🏡, Pintura 🎨, Climatización ❄️.
6.  **El Corazón de la Operación (ServiceFlow Admin Showcase)**:
    *   Muestra una vista limpia del panel administrativo para infundir confianza corporativa (soporte 24/7, mediadores reales para solución de disputas, y pagos procesados con transparencia).
7.  **Final CTA / Descargas**:
    *   Botón doble de descarga para iOS (App Store) y Android (Google Play) con estilo de botón de vidrio esmerilado oscuro con bordes brillantes.

---

## 💻 Código Tailwind Listo para Usar en tu Nueva Landing Page

Para que empieces de inmediato, añade estas configuraciones a tu archivo `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        chamba: {
          bg: '#07111F',
          bgAccent: '#0B172A',
          bgAlt: '#111C30',
          adminBg: '#0b0b0f',
          primary: '#8B5CF6',
          primaryLight: '#A78BFA',
          primaryDark: '#6D28D9',
          secondary: '#EAB308',
          text: '#F8FAFC',
          muted: '#9FB0C6',
          success: '#22C55E',
          error: '#F97373',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        chambaGlass: '20px',
      }
    }
  }
}
```

Y agrega esta clase de animación en tu archivo `index.css` para darle suavidad premium:

```css
@keyframes pulseGlow {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.animate-pulse-glow {
  animation: pulseGlow 6s infinite ease-in-out;
}
```
