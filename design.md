# Design - TechPhone Store

Locked design system for the TechPhone Store multi-page redesign. Existing routes, API contracts, forms, and user flows remain unchanged.

## Genre

Modern-minimal retail. The storefront should make product comparison and purchase feel confident. The admin area should make inventory and order work fast and legible.

## Macrostructure family

- Storefront and marketing: Asymmetric Commerce. A visual hero, editorial product-led sections, and varied grids.
- Transaction and account pages: Guided Task Flow. A clear primary action with compact supporting information.
- Admin pages: Operations Workbench. Persistent navigation, dense but breathable controls, tables, and contextual panels.

## Theme

Noir & Gold: one dark, luxurious theme for storefront and admin (no light variant).

- `--color-paper`: `oklch(12.5% 0.006 70)` obsidian black, with a slow warm-gold light drift and a fine film grain (`body::before` / `body::after` in `luxe.css`).
- Surfaces are smoked glass (`--color-glass`, `backdrop-filter`) edged with a thin champagne hairline (`--color-glass-edge`).
- `--color-ink`: `oklch(95% 0.018 85)` ivory; `--color-ink-muted`: `oklch(80% 0.022 80)`.
- `--color-accent`: `oklch(80% 0.105 82)` champagne gold, with dark espresso text on gold (`--color-accent-ink`, `--color-on-gold`). Rose gold is reserved for discount badges.
- Primary actions use brushed gold (`--gradient-gold`); headings, prices and stats use gold foil text (`--gradient-text`, `--gradient-gold-rich`).
- Bootstrap's `--bs-*` variables follow the same palette.

All raw colors live in `frontend/src/assets/styles/tokens.css`. Status colors remain semantic.

## Typography

- Display: Space Grotesk, 600 and 700, normal style.
- Body: IBM Plex Sans, 400 through 700.
- Mono: ui-monospace, 500 for order codes, voucher codes, and compact technical metadata.
- Display tracking: `-0.035em`.
- Display scale: `clamp(2.4rem, 4.5vw, 4.8rem)`.

## Spacing and shape

Use the named 4-point scale in `frontend/src/assets/styles/tokens.css`. Cards, panels, images, and dialogs use a 16px radius. Controls use 12px. Only small status labels may be pill-shaped.

## Motion

- Easing: named CSS cubic-bezier tokens only (`--ease-out`, `--ease-spring`, ...).
- 3D: product, category and stat cards tilt toward the pointer; the hero slider tilts gently inside a slowly turning gold frame with a periodic light sweep. `frontend/src/utils/visualEffects.js` only writes CSS variables (`--nb-rx`, `--nb-ry`, `--nb-mx`, `--nb-my`) and reveal classes; it never touches app state.
- Scroll reveal: sections and cards rise in with a short stagger (`.nb-reveal` / `.is-in`).
- Ambient: slow gold light drift, animated hairlines before eyebrows, floating story stats, pulsing AI chat launcher, light sweep on gold buttons; product images rest slightly dimmed and light up on hover like a showcase.
- Reduced motion: all animation, tilt and reveal are disabled.

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
