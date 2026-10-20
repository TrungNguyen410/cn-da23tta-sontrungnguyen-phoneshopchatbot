# Design - TechPhone Store

Locked design system for the TechPhone Store multi-page redesign. Existing routes, API contracts, forms, and user flows remain unchanged.

## Genre

Modern-minimal retail. The storefront should make product comparison and purchase feel confident. The admin area should make inventory and order work fast and legible.

## Macrostructure family

- Storefront and marketing: Asymmetric Commerce. A visual hero, editorial product-led sections, and varied grids.
- Transaction and account pages: Guided Task Flow. A clear primary action with compact supporting information.
- Admin pages: Operations Workbench. Persistent navigation, dense but breathable controls, tables, and contextual panels.

## Theme

- `--color-paper`: `oklch(98% 0.006 250)`
- `--color-paper-raised`: `oklch(100% 0 0)`
- `--color-ink`: `oklch(22% 0.035 255)`
- `--color-ink-muted`: `oklch(48% 0.028 255)`
- `--color-rule`: `oklch(90% 0.012 255)`
- `--color-accent`: `oklch(50% 0.19 255)`
- `--color-accent-strong`: `oklch(42% 0.18 255)`
- `--color-focus`: `oklch(56% 0.16 255)`

One cobalt accent anchors links, focus treatment, active navigation, and primary actions. Status colors remain semantic and are not used as decoration.

## Typography

- Display: Space Grotesk, 600 and 700, normal style.
- Body: IBM Plex Sans, 400 through 700.
- Mono: ui-monospace, 500 for order codes, voucher codes, and compact technical metadata.
- Display tracking: `-0.035em`.
- Display scale: `clamp(2.4rem, 4.5vw, 4.8rem)`.

## Spacing and shape

Use the named 4-point scale in `frontend/src/assets/styles/tokens.css`. Cards, panels, images, and dialogs use a 16px radius. Controls use 12px. Only small status labels may be pill-shaped.

## Motion

- Easing: named CSS cubic-bezier tokens only.
- Storefront: opacity and transform transitions for product images, controls, and drawer entry.
- Admin: immediate feedback with short control transitions only.
- Reduced motion: opacity-only transitions no longer than 150ms.

## Interaction stance

- Buttons and controls have visible hover, focus-visible, active, disabled, loading, error, and success states when the component owns those states.
- Keep existing toast semantics. Do not add celebratory notifications.
- Forms keep labels above fields and show errors inline.

## CTA voice

- Primary: cobalt-filled, concise Vietnamese verbs, one line only.
- Secondary: quiet outlined or text action with the same spacing rhythm.

## Shared rules

- Preserve the TechPhone wordmark, route slugs, navigation labels, form names, API shapes, and existing business logic.
- Storefront uses image-led product merchandising. Real catalog/banner images remain the source of visual content.
- Admin uses function-first layouts and never uses storefront hero enrichment.
- All consumer pages must support light and dark color preferences through tokens without changing information architecture.

## Per-page allowances

- Homepage: asymmetric visual hero, category rail, editorial product collections, trust and service section.
- Catalog and detail: product imagery is dominant; filters and purchase controls stay predictable.
- Cart, checkout, account, lookup: compact task-focused hierarchy.
- Admin: Workbench composition with the same token system, not a marketing-page layout.
