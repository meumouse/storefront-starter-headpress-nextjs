# Design system

The starter's look is deliberately plain so it is easy to replace. Everything visual comes from one
file of tokens and a small set of primitives.

## Tokens

`src/styles/tokens.css` defines CSS variables prefixed `--ds-`. `src/styles/globals.css` maps them to
Tailwind utilities through `@theme inline`, so a component writes `bg-surface text-ink`, never a raw
color.

| Group | Utilities | Used for |
| --- | --- | --- |
| Surfaces | `bg-canvas`, `bg-surface`, `bg-sunken`, `bg-overlay` | Page, cards, wells, modal backdrop |
| Text | `text-ink`, `text-ink-muted`, `text-ink-subtle`, `text-ink-inverse` | Body, secondary, hints, on dark |
| Lines | `border-line`, `border-line-strong` | Dividers, control borders |
| Brand | `bg-brand`, `bg-brand-hover`, `bg-brand-soft`, `text-on-brand` | Primary actions, highlights |
| Feedback | `success`, `warning`, `danger`, each with `-soft`, and `sale` | Status and promotions |
| Shape | `rounded-control`, `rounded-card`, `rounded-sheet` | Inputs, cards, side panels |
| Elevation | `shadow-card`, `shadow-float` | Cards, overlays |

Colors use `oklch()`, so a family can be shifted by changing the hue and keeping the lightness.

## Rebranding

1. Change the brand hue and surfaces in `tokens.css`.
2. Change the fonts in `src/app/layout.tsx` (`--font-geist-sans` and `--font-geist-mono`).
3. Change the store name and links in `src/config/site.ts`.

If a rebrand needs a change in a component, a token is missing: add one rather than a one-off value.

## Primitives

All in `src/components/ui`. They import only `@/lib/utils`, take text through props, and know nothing
about commerce.

| File | Components |
| --- | --- |
| `button.tsx` | `Button` (`primary`, `secondary`, `ghost`, `link`, `danger`; `sm`, `md`, `lg`, `icon`; `asChild`, `loading`) |
| `field.tsx` | `Input`, `Textarea`, `Select`, `Label`, `Field`, `ChoiceLabel` |
| `feedback.tsx` | `Alert`, `Badge`, `Skeleton`, `Spinner`, `EmptyState` |
| `layout.tsx` | `Container`, `Card`, `PageHeading`, `Separator` |
| `dialog.tsx` | `Dialog`, `Sheet` (Radix Dialog: focus trap, Escape, scroll lock) |
| `pagination.tsx` | `Pagination` |
| `quantity-stepper.tsx` | `QuantityStepper` |
| `rating.tsx` | `Rating` |

## Accessibility baseline

- `Field` connects the label, the control and its message.
- Interactive elements keep the global `:focus-visible` outline.
- Animations stop under `prefers-reduced-motion`.
- Icon-only buttons take an `aria-label`, always from the i18n dictionary.
