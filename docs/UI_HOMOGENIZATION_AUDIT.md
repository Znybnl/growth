# UI Homogenization Audit

Reference design: [`docs/DESIGN_REFERENCE.md`](./DESIGN_REFERENCE.md)

Date: 2026-07-10

## Executive Summary

The Okado product is functionally rich, but the back-office UI still mixes several visual systems: legacy custom cards, shadcn components, hardcoded utility classes and page-specific styling. Against the new Relate reference, the main issue is not one isolated component. It is the absence of a strict compact product UI contract for cards, buttons, inputs, badges, row actions and page headers.

The fastest path to a more professional product is not a full redesign. It is a controlled harmonization layer based on the new Relate rules:

- One compact `AppCard` geometry at 8px radius.
- One large marketing/preview card geometry at 40px radius.
- One 12px `AppButton` hierarchy.
- One 12px `AppInput` treatment.
- One `AppBadge` status system.
- One `PageHeader` pattern outside cards.
- One admin-table action menu pattern.

## Reference Rules To Apply

- Canvas: `#fcfcfc`, not pure white.
- Compact app cards: white, 8px radius, feather-light shadow.
- Large landing/preview cards: `#fcfcfc`, 40px radius.
- Buttons: 12px radius, dark outlined by default, blue gradient only for one high-priority CTA.
- Inputs: 12px radius, white background, `#cfcfcf` border.
- Tags/status badges: 4px radius, semantic color at 10% opacity.
- Text: `#020520` / `#14141e` for primary text, `#696a72` / `#95959b` for secondary text.
- Typography: Inter, max 600 weight for SaaS headings, tighter tracking on large headings.

## Current UI Drift

### 1. Border Radius Is Inconsistent

Observed patterns include rounded full pills, 8px, 12px, 16px, 20px, 24px, 30px and 36px cards or containers. This creates the strongest "assembled over time" feeling. The new Relate reference is stricter than the previous one: compact SaaS cards should be 8px, not 20px.

Priority: P0

Recommended adjustment:

- Compact SaaS cards and table row cards: 8px.
- Buttons and inputs: 12px.
- Badges: 4px.
- Modals: 32px.
- Landing/feature/large preview cards: 40px.
- Pill shapes reserved for nav active states and very small chips.

### 2. Inputs Do Not Share A Single Surface Treatment

The account page, campaign editor and data filters use different input backgrounds. Some are white, some are grey, and some look like disabled fields.

Priority: P0

Recommended adjustment:

- Use a shared `AppInput` or shadcn `Input` wrapper.
- Default: white background.
- Border: `#cfcfcf`.
- Radius: 12px.
- Padding around 15px on desktop, slightly tighter on dense tables.
- Focus: Signal Blue ring, subtle but visible.

### 3. Button Hierarchy Is Still Ambiguous

Several pages show too many visually competing actions. Campaign rows in particular expose multiple buttons plus a kebab menu. Some black buttons, blue buttons and gradient buttons compete in the same view.

Priority: P0

Recommended adjustment:

- One visible primary action per view.
- Use outlined dark buttons as the default SaaS primary action.
- Use filled blue gradient only when there is a single top-priority action.
- Row primary action: one visible "Modifier" or neutral action, if needed.
- Secondary row actions move into a shadcn dropdown menu.
- Destructive actions always red text in dropdown, never large black blocks.
- Keep button text white on dark/filled backgrounds.

### 4. Page Titles And Card Titles Are Overused

Some screens still place page-level titles inside large cards. The design reference recommends a clean page header above content, then cards containing only section-specific information.

Priority: P1

Recommended adjustment:

- Create a shared `PageHeader`.
- Remove duplicated card headings when they repeat the page title.
- Use small labels sparingly; Relate prefers compact text hierarchy over many uppercase eyebrow labels.

### 5. Tables Need A Shared Action And Status Pattern

Campaign tables and dashboard priority rows use status dots, text labels and action buttons inconsistently. The color of some dots is not self-explanatory.

Priority: P0

Recommended adjustment:

- Status badge system:
  - Active: Emerald badge.
  - Stock warning/exhausted: Amber badge.
  - Inactive: Fog/Steel badge.
  - Error/blocked: Coral badge.
- Actions:
  - End-of-row shadcn dropdown menu.
  - Same menu item height, icon size and hover state everywhere.

### 6. Dashboard KPI Cards Need The Same Component As Data KPI Cards

The dashboard and data page KPI cards are close but not fully aligned. The dashboard should reuse the strongest KPI visual from the data page.

Priority: P1

Recommended adjustment:

- Shared `MetricCard`.
- Large numeric value.
- Small label in Slate/Ash, not over-tracked uppercase by default.
- Optional trend pill.
- Consistent icon container.
- Numeric values can use a monospaced style if it improves dashboard clarity.

### 7. Admin Menus Need A Clear Section Treatment

The sidebar now has admin-only features, but the visual grouping should be explicit and quiet. This supports the Relate rule of keeping chrome functional, compact and low-noise.

Priority: P1

Recommended adjustment:

- Split main navigation and administration navigation.
- Use a muted section label.
- Avoid repeating brand/account identity blocks.

### 8. Campaign Editor Is The Highest-Risk UI Surface

The campaign editor has the most complexity and the highest chance of feeling inconsistent. The current layout mixes dense forms, preview device, expert options and large CTA blocks.

Priority: P0

Recommended adjustment:

- Keep simple mode visually dominant.
- Move advanced controls behind compact expert sections.
- Use identical card headers: eyebrow + title + optional helper.
- Normalize all controls through shadcn/wrappers.
- Reduce oversized black buttons inside form sections.

### 9. Public Game And Poster UI Should Stay Separate

The public game/poster experience intentionally uses expressive typography and brand-specific visuals. That should not be forced into the Relate SaaS style.

Priority: Guardrail

Recommended adjustment:

- Apply Relate-style homogenization only to the SaaS back-office, auth and landing admin surfaces.
- Keep Anton/display typography for public game and poster templates.
- Do not change wheel/poster rendering during back-office UI cleanup unless explicitly scoped.

## Page-Level Findings

### Dashboard

- KPI cards should reuse one shared metric card.
- Chart tooltip and chart card should follow one shadcn chart treatment.
- "Campagnes prioritaires" should use explicit status badges rather than unexplained dots.
- Row actions should use the same dropdown menu as the campaigns list.
- Canvas and cards should move toward the Relate `#fcfcfc` / 8px compact card system.

### Campaigns

- Campaign row actions remain too visually heavy.
- The kebab menu should be the primary place for duplicate/delete/email/poster actions.
- Columns and labels should be quieter, with status and metrics doing the work.
- "Prévisualiser" should remain a secondary action and open externally only when intended.

### Campaign Editor

- Most important screen to normalize.
- Add an `EditorSectionCard` wrapper.
- Use compact 8px cards for form sections and reserve 40px large cards for the preview/feature container only if it visually helps.
- Expert toggle belongs in the customer experience section, not as a standalone visual block.
- Inputs should all use the same control background.
- Avoid uppercase tracking overload; Relate is compact but not letter-spaced everywhere.

### Data

- Campaign selector and search controls should align on a clean two-row filter area.
- "Saisies et export" table should use full width with one table component.
- Lead status should use consistent badges.
- Chronology should remain compact and lower emphasis.

### Account

- Separate account profile, restaurant/business details, marketing links and affiliation into clear cards.
- Keep "Parrainage" as the last section before save if it remains editable in this page.
- Use dropdown/select styling matching campaign editor.
- Remove mixed grey input surfaces and align with Relate input style.

### Supervision / Bibliotheque / Affiliation Admin

- Treat as administration pages with a shared admin page header.
- Tables should use the same row menu, badge, filters and empty states.
- Avoid visually louder styling than merchant pages.

## Recommended Implementation Plan

### P0 - Component Contract

Create or standardize:

- `AppCard`
- `PageHeader`
- `MetricCard`
- `StatusBadge`
- `RowActionsMenu`
- `FormSectionCard`

## Implementation Status - 2026-07-10

### Applied

- Added a documented Relate reference in `docs/DESIGN_REFERENCE.md`.
- Added shared utility classes for product cards, page titles, section titles, status badges, primary/secondary actions, table headers and form controls.
- Normalized the merchant shell CTA, dashboard, campaigns list, data page, account, affiliation admin, supervision and background library surfaces.
- Normalized auth and onboarding surfaces: canvas, auth shell, input geometry, Google button, signup/signin buttons, onboarding cards and onboarding form fields.
- Normalized email editor page chrome: header card, section cards and top actions.
- Normalized poster editor page header and top actions while preserving poster rendering behavior.
- Kept public game and poster rendering separate from SaaS homogenization, as required by the design guardrail.

### Remaining Guardrails

- Some hardcoded visual classes remain inside email and poster previews because they define the simulated customer-facing output rather than the SaaS back-office chrome.
- The campaign editor remains the highest-risk surface. It has received shared global control normalization and header/preview action cleanup, but a deeper component extraction should be handled as a separate, tested refactor.
- A future pass can introduce actual reusable React primitives (`PageHeader`, `MetricCard`, `StatusBadge`, `FormSectionCard`) once the visual contract is validated in production.

Then migrate Dashboard, Campaigns and Campaign Editor first.

### P1 - Form And Table Cleanup

- Normalize all inputs/selects/textareas.
- Normalize table row actions.
- Normalize status badges.
- Remove duplicate page titles inside cards.
- Replace legacy blue/black button mixtures with outlined Relate button hierarchy.

### P2 - Secondary Pages

- Apply the same wrappers to Account, Data, Supervision, Bibliotheque and Affiliation.
- Add clean empty states and loading states.
- Apply the same Relate card/spacing model to auth and landing pages where relevant.

## Acceptance Criteria

- No more than five intentional radius values in SaaS chrome: 4px, 8px, 12px, 32px, 40px.
- Compact app cards use 8px radius.
- Large landing/feature cards use 40px radius.
- All primary CTAs are visually obvious and use either the outlined dark Relate style or the single blue gradient style.
- All secondary/destructive actions use shadcn menu/action patterns.
- Inputs look identical across Account, Campaign Editor and Data filters.
- Tables use the same row action menu and status badge system.
- Public game/poster rendering is unchanged by SaaS UI cleanup.

## Files To Reference During Implementation

- `apps/web-app/src/app/globals.css`
- `apps/web-app/src/components/ui/button.tsx`
- `apps/web-app/src/components/ui/card.tsx`
- `apps/web-app/src/components/ui/badge.tsx`
- `apps/web-app/src/components/ui/dropdown-menu.tsx`
- `apps/web-app/src/components/merchant/merchant-shell.tsx`
- `apps/web-app/src/app/(merchant)/page.tsx`
- `apps/web-app/src/app/(merchant)/campaigns/page.tsx`
- `apps/web-app/src/components/merchant/campaign-editor.tsx`
- `apps/web-app/src/app/(merchant)/data/page.tsx`
- `apps/web-app/src/components/merchant/account-settings-form.tsx`
