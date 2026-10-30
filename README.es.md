# Headpress Storefront Starter

[English](README.md) · [Português](README.pt-BR.md) · **Español**

Un proyecto inicial de tienda en línea con Next.js para WooCommerce, impulsado por el motor de
comercio headless [Headpress](https://meumouse.com). Clónalo, ejecuta un comando y tendrás una tienda
funcionando como punto de partida, con o sin un sitio WordPress.

## Inicio rápido

```bash
npm install
```

```bash
npm run demo
```

Luego abre [http://localhost:3000](http://localhost:3000). `npm run demo` inicia un WordPress simulado
y la tienda, sin ninguna configuración. Si el puerto 3000 está ocupado, Next.js muestra el puerto que
eligió.

| Prueba esto | Cómo |
| --- | --- |
| Iniciar sesión | `demo@example.com` / `demo-password` |
| Cupón | `WELCOME10` |
| Código postal | Cualquier CEP válido, como `01310-100` |
| Tarjeta | `4111 1111 1111 1111`, cualquier fecha futura y cualquier CVV |
| Pix | Elige Pix: el pedido de demostración se paga tras 45 segundos |
| Recuperación de carrito | Abre `/cart/recover/demo-token` |
| Preferencias de mensajes | Abre `/unsubscribe/demo-token` |

## Qué incluye

- **Catálogo:** inicio, tienda, categorías, etiquetas, búsqueda con sugerencias, filtros y paginación
  en la URL, páginas de producto con variaciones, reseñas y JSON-LD.
- **Carrito:** panel lateral y página, cupones, progreso de envío gratis, envío por código postal.
- **Checkout:** una sola página, dirección brasileña con búsqueda de CEP, envío, pago y confirmación.
- **Cuentas:** inicio de sesión con refresh token en cookie httpOnly, pedidos, direcciones, favoritos
  y perfil.
- **Contenido:** blog y páginas publicados desde WordPress.
- **SEO y consentimiento:** metaetiquetas y redirecciones de WordPress, sitemap, aviso de cookies y
  analítica.
- **Resiliencia:** la tienda sigue abriendo con WordPress caído, y una interrupción nunca es un 404.
- **Idiomas:** textos de la interfaz en inglés, portugués y español.

## Plugins compatibles

| Plugin | Qué agrega | Carpeta |
| --- | --- | --- |
| Headpress | Configuración, rutas, cuentas, SEO, revalidación | `src/lib/headpress` |
| Parcelas Customizadas | Precios al contado y cuotas | `src/integrations/installments` |
| HubGo / Envora | Cotización de envío y plazos de entrega | `src/integrations/shipping` |
| Cielo Store API | Crédito, débito con 3DS y Pix | `src/integrations/cielo` |
| PayPal Store API | Billetera, tarjeta y Pix | `src/integrations/paypal` |
| Sellback | Recuperación de carritos abandonados | `src/integrations/sellback` |

Cada integración es opcional y vive en una sola carpeta. Consulta
[docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) (en inglés).

## Conectar tu tienda

```bash
cp .env.example .env.local
```

Define `NEXT_PUBLIC_WP_URL` y sigue [docs/WORDPRESS_SETUP.md](docs/WORDPRESS_SETUP.md) (en inglés).

```bash
npm run dev
```

> El proyecto se construyó a partir de los contratos documentados de los plugins y se probó con el
> servidor simulado. La guía de configuración incluye una lista de verificación para la primera
> conexión con un WordPress real.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run demo` | WordPress simulado y `next dev` |
| `npm run dev` | `next dev` con `NEXT_PUBLIC_WP_URL` |
| `npm run mock` | Solo el WordPress simulado |
| `npm run build` | Build de producción |
| `npm run verify` | Lint, tipos, pruebas y build |
| `npm run test` | Pruebas unitarias |
| `npm run check:routes` | Compara el mapa de rutas con WordPress |

## Personalización

- **Apariencia:** edita `src/styles/tokens.css`. Consulta [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- **Idioma:** define `NEXT_PUBLIC_STORE_LOCALE` como `en`, `pt-BR` o `es`.
- **Textos:** edita los archivos en `src/i18n`.
- **Formas de pago:** agrega un provider. Consulta [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Documentación

La documentación técnica está en inglés.

| Documento | Contenido |
| --- | --- |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Fases, decisiones y backlog |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Estructura, caché, sesiones y pagos |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | Cada plugin, y cómo agregar o quitar uno |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, componentes e identidad visual |
| [docs/WORDPRESS_SETUP.md](docs/WORDPRESS_SETUP.md) | Conexión y despliegue |
| [AGENTS.md](AGENTS.md) | Convenciones para desarrolladores y agentes de código |

## Tecnologías

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query, Vitest y el SDK
[`@meumouse.com/headpress`](https://www.npmjs.com/package/@meumouse.com/headpress).
