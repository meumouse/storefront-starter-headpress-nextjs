# Headpress Storefront Starter

[English](README.md) · **Português** · [Español](README.es.md)

Um projeto inicial de loja virtual em Next.js para WooCommerce, com o motor de comércio headless
[Headpress](https://meumouse.com). Clone, rode um comando e você terá uma loja funcionando como ponto
de partida, com ou sem um site WordPress.

## Início rápido

```bash
npm install
```

```bash
npm run demo
```

Depois abra [http://localhost:3000](http://localhost:3000). O `npm run demo` inicia um WordPress
simulado e a loja, sem nenhuma configuração. Se a porta 3000 estiver ocupada, o Next.js mostra qual
porta escolheu.

| Experimente | Como |
| --- | --- |
| Entrar | `demo@example.com` / `demo-password` |
| Cupom | `WELCOME10`, ou `FREE100` para um pedido sem etapa de pagamento |
| CEP | Qualquer CEP válido, como `01310-100` |
| CPF e data de nascimento | `529.982.247-25` e qualquer data passada |
| Cartão | `4111 1111 1111 1111`, qualquer data futura e qualquer CVV |
| Pix | Escolha Pix: o pedido de demonstração é pago após 45 segundos |
| Recuperação de carrinho | Abra `/cart/recover/demo-token` |
| Preferências de mensagens | Abra `/unsubscribe/demo-token` |

## O que está incluído

- **Catálogo:** página inicial, loja, categorias, tags, busca com sugestões, filtros e paginação na
  URL, páginas de produto com variações, avaliações e JSON-LD.
- **Carrinho:** gaveta e página, cupons, progresso do frete grátis, frete por CEP.
- **Checkout:** página única, endereço brasileiro com busca de CEP, frete, pagamento e confirmação.
- **Contas:** login com refresh token em cookie httpOnly, pedidos, endereços, favoritos e perfil.
- **Conteúdo:** blog e páginas publicados pelo WordPress.
- **SEO e consentimento:** metatags e redirecionamentos do WordPress, sitemap, banner de cookies e
  analytics.
- **Resiliência:** a loja continua abrindo com o WordPress fora do ar, e uma indisponibilidade nunca
  vira um 404.
- **Idiomas:** textos da interface em inglês, português e espanhol.

## Plugins compatíveis

| Plugin | O que adiciona | Pasta |
| --- | --- | --- |
| Headpress | Configuração, rotas, contas, SEO, revalidação | `src/lib/headpress` |
| Parcelas Customizadas | Preços à vista e parcelamento | `src/integrations/installments` |
| HubGo / Envora | Cotação de frete e prazo de entrega | `src/integrations/shipping` |
| Cielo Store API | Crédito, débito com 3DS e Pix | `src/integrations/cielo` |
| PayPal Store API | Carteira, cartão e Pix | `src/integrations/paypal` |
| Sellback | Recuperação de carrinhos abandonados | `src/integrations/sellback` |

Cada integração é opcional e fica em uma única pasta. Veja
[docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) (em inglês).

## Conectando sua loja

```bash
cp .env.example .env.local
```

Defina `NEXT_PUBLIC_WP_URL` e siga [docs/WORDPRESS_SETUP.md](docs/WORDPRESS_SETUP.md) (em inglês).

```bash
npm run dev
```

> Catálogo, carrinho, frete e um pedido por transferência foram validados em um WordPress real.
> Cielo, PayPal e Sellback foram testados com o servidor simulado. O guia de configuração traz uma
> lista de verificação para a primeira conexão, e [docs/STORE_API.md](docs/STORE_API.md) traz a
> matriz de compatibilidade com a Store API do WooCommerce.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run demo` | WordPress simulado e `next dev` |
| `npm run dev` | `next dev` usando `NEXT_PUBLIC_WP_URL` |
| `npm run mock` | Apenas o WordPress simulado |
| `npm run build` | Build de produção |
| `npm run verify` | Lint, tipos, testes e build |
| `npm run test` | Testes unitários |
| `npm run check:routes` | Compara o mapa de rotas com o WordPress |

## Personalizando

- **Visual:** edite `src/styles/tokens.css`. Veja [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- **Idioma:** defina `NEXT_PUBLIC_STORE_LOCALE` como `en`, `pt-BR` ou `es`.
- **Textos:** edite os arquivos em `src/i18n`.
- **Formas de pagamento:** adicione um provider. Veja [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Documentação

A documentação técnica está em inglês.

| Documento | Conteúdo |
| --- | --- |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Fases, decisões e backlog |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Estrutura, cache, sessões e pagamentos |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | Cada plugin, e como adicionar ou remover um |
| [docs/STORE_API.md](docs/STORE_API.md) | Compatibilidade com a Store API e lacunas conhecidas |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, componentes e identidade visual |
| [docs/WORDPRESS_SETUP.md](docs/WORDPRESS_SETUP.md) | Conexão e publicação |
| [AGENTS.md](AGENTS.md) | Convenções para desenvolvedores e agentes de código |

## Tecnologias

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query, Vitest e o SDK
[`@meumouse.com/headpress`](https://www.npmjs.com/package/@meumouse.com/headpress).
