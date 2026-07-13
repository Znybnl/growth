# Relate - Style Reference

Source: `C:/Users/PBRUNELLE/Downloads/DESIGN.md`

This file replaces the previous Sequence reference and is now the source of truth for Okado UI homogenization work.

## Intent

Relate is a light, compact, product-first SaaS design system. It uses a warm near-white canvas, tight Inter typography, quiet white product cards, subtle shadows, and one vivid blue accent used as a highlighter rather than a heavy paint bucket.

The target feeling for Okado back-office screens should be:

- Light, precise and calm.
- Compact enough for operational use.
- Premium SaaS rather than playful admin panel.
- Product UI as the visual hero.
- Few decorative effects outside the hero/landing zones.
- Blue used for focus, links and very limited primary emphasis.

## Design Direction

The app should feel like a polished product workspace:

- Off-white canvas: `#fcfcfc`, not harsh pure white.
- Pale blue wash for alternate sections or highlighted backgrounds.
- Compact cards with 8px radius for app UI.
- Large feature/marketing cards with 40px radius.
- Inputs and buttons with 12px radius.
- Inter-first typography, maximum weight 600 for SaaS chrome.
- Tight negative tracking on large headings.
- Very subtle shadows only.

Public game and poster templates are intentionally more expressive and can keep Anton/display treatments. This reference applies primarily to SaaS, account, dashboard, campaign, data, admin, auth and landing surfaces.

## Color Tokens

| Name | Value | Token | Role |
| --- | --- | --- | --- |
| Linen Canvas | `#fcfcfc` | `--color-linen-canvas` | Primary page background and default quiet surface |
| Sky Wash | `#f0f4fe` | `--color-sky-wash` | Pale blue-tinted sections, active nav backgrounds and soft bands |
| Midnight Ink | `#020520` | `--color-midnight-ink` | Primary display/headline text |
| Graphite | `#14141e` | `--color-graphite` | High-emphasis headings and strong body text |
| Slate | `#374151` | `--color-slate` | Navigation, labels and medium body text |
| Ash | `#696a72` | `--color-ash` | Secondary body and captions |
| Fog | `#95959b` | `--color-fog` | Placeholder and disabled states |
| Steel | `#6b7280` | `--color-steel` | Muted helper text |
| Signal Blue | `#145aff` | `--color-signal-blue` | Inline accent, focus ring, links and emphasis |
| Hero Blue Fade | `linear-gradient(rgb(59, 130, 246) 0%, rgb(20, 90, 255) 100%)` | `--gradient-hero-blue-fade` | Rare filled CTA gradient |
| Primary Action Accent | `#0f1f3d` | `--color-primary-action-accent` | Outlined action border and text |
| Emerald Status | `#16ca2e` | `--color-emerald-status` | Status badge only |
| Coral Alert | `#f26052` | `--color-coral-alert` | Error/destructive status only |
| Azure Info | `#0099ff` | `--color-azure-info` | Info/supporting status only |
| Amber Tag | `#ffa64d` | `--color-amber-tag` | Warning tag/status only |

## Typography

Primary font: `Inter`

Rules:

- Body: 14px / 1.43, weight 400, tracking `0.06px`.
- Small headings: 18px / 1.4, weight 500-600, tracking `-0.16px`.
- Card/page section headings: 22px / 1.25, weight 600, tracking `-0.22px`.
- Large headings: 40px / 1.08, weight 600, tracking `-0.76px`.
- Display headings: 56px / 1.05, weight 600, tracking `-1.51px`.
- Avoid 700/800 weights in SaaS UI chrome.
- Use monospaced typography only for numeric/product values when useful.

## Spacing And Shapes

Density: compact.

| Element | Value |
| --- | --- |
| Compact app cards | `8px` radius |
| Badges | `4px` radius |
| Buttons | `12px` radius |
| Inputs | `12px` radius |
| Images/screenshots | `16px` radius |
| Modals | `32px` radius |
| Large marketing cards | `40px` radius |
| Pill nav / chips | `100px` radius |
| Page max width | `1200px` |
| Section gap | `80px` |
| Element gap | `8-12px` |

Shadows:

```css
--shadow-sm: rgba(0, 0, 0, 0.1) 0px 0px 4px -2px;
--shadow-sm-strong: rgba(0, 0, 0, 0.25) 0px 0px 4px -2px;
--shadow-blue-glow: rgba(20, 90, 255, 0.1) 0px 0px 50px -28px, rgba(0, 0, 0, 0.18) 0px 0px 3px -1px;
```

## Component Rules

### Primary Outlined Button

- Background: `rgba(255,255,255,0.8)`.
- Border: `1px solid #0f1f3d`.
- Text: `#0f1f3d`.
- Radius: `12px`.
- Padding: about `15px 20px`.
- Inter 14-16px, weight 500.
- This should be the common primary action in SaaS chrome.

### Primary Filled Button

- Gradient: `linear-gradient(rgb(59,130,246) 0%, rgb(20,90,255) 100%)`.
- Text: white.
- Radius: 12px.
- Inter 14px, weight 600.
- Use only for the single highest-emphasis action in a view.

### Compact Product Card

- Background: `#ffffff`.
- Radius: 8px.
- Shadow: `rgba(0,0,0,0.1) 0px 0px 4px -2px`.
- Padding: 12-16px.
- Used for dashboard cards, rows, compact admin/product UI.

### Large Feature Card

- Background: `#fcfcfc`.
- Radius: 40px.
- Soft multi-layer shadow.
- Padding: 52px vertical / 72px horizontal.
- Used for landing and larger feature sections, not dense admin tables.

### Text Input

- Background: `#ffffff` on light contexts.
- Border: `1px solid #cfcfcf`.
- Focus ring: `rgba(0,153,255,1) 0px 0px 0px 3px`.
- Radius: 12px.
- Padding: 15px.
- Text: 14px Graphite.
- Placeholder: Fog.

### Status Badge

- Background: semantic color at 10% opacity.
- Text: full semantic color.
- Radius: 4px.
- Padding: 2px 6px.
- Inter 12px, weight 500.
- Use semantic colors only for statuses.

### Navigation

- Background: `#fcfcfc` with light blur.
- Links: 14px Slate.
- Active item: Sky Wash pill, Graphite text, weight 500.
- No shadows on nav items.

## Do

- Use `#fcfcfc` as the default app canvas.
- Use Inter with tight tracking on large headings.
- Keep SaaS UI compact.
- Use 8px compact cards and 12px inputs/buttons.
- Use blue as a highlighter/focus signal, not a blanket fill.
- Keep card shadows feather-light.
- Use status colors only for status badges.
- Use product UI screenshots/mockups as visuals on landing pages.

## Do Not

- Do not use pure black or pure white as the main visual language.
- Do not use filled blue everywhere.
- Do not mix 16/20/24px card radii inside dense app UI.
- Do not use heavy shadows on buttons or nav.
- Do not use font weights above 600 for SaaS headings.
- Do not add colorful decoration outside hero/marketing illustration areas.

## Okado-Specific Interpretation

The Relate reference fits Okado best as follows:

- Back-office SaaS: compact Relate UI.
- Landing pages: Relate hero/feature rhythm with large 40px feature cards.
- Public game pages: keep expressive template-specific styling, but admin controls around them should use Relate.
- Poster/game preview panels: product preview surfaces can be large feature cards, but controls remain compact cards.

## CSS Starter

```css
:root {
  --color-linen-canvas: #fcfcfc;
  --color-sky-wash: #f0f4fe;
  --color-midnight-ink: #020520;
  --color-graphite: #14141e;
  --color-slate: #374151;
  --color-ash: #696a72;
  --color-fog: #95959b;
  --color-steel: #6b7280;
  --color-signal-blue: #145aff;
  --gradient-hero-blue-fade: linear-gradient(rgb(59, 130, 246) 0%, rgb(20, 90, 255) 100%);
  --color-primary-action-accent: #0f1f3d;
  --color-emerald-status: #16ca2e;
  --color-coral-alert: #f26052;
  --color-azure-info: #0099ff;
  --color-amber-tag: #ffa64d;
  --font-inter: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --text-body: 14px;
  --leading-body: 1.43;
  --tracking-body: 0.06px;
  --text-heading: 22px;
  --leading-heading: 1.25;
  --tracking-heading: -0.22px;
  --text-heading-lg: 40px;
  --leading-heading-lg: 1.08;
  --tracking-heading-lg: -0.76px;
  --text-display: 56px;
  --leading-display: 1.05;
  --tracking-display: -1.51px;
  --radius-card-compact: 8px;
  --radius-badge: 4px;
  --radius-input: 12px;
  --radius-button: 12px;
  --radius-image: 16px;
  --radius-modal: 32px;
  --radius-card-large: 40px;
  --shadow-card-compact: rgba(0, 0, 0, 0.1) 0px 0px 4px -2px;
  --shadow-card-strong: rgba(0, 0, 0, 0.25) 0px 0px 4px -2px;
  --surface-canvas: #fcfcfc;
  --surface-tinted-wash: #f0f4fe;
  --surface-card: #ffffff;
}
```
