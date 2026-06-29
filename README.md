# okado

Prototype Next.js construit a partir de la SFD `SFD_MVP_activation_client_magasin_v2.docx`.

## Ce qui est livre

- Dashboard marchand par defaut `/` avec sidebar, KPI, campagnes prioritaires et leads recents.
- Ecrans dedies `campaigns`, `campaigns/new`, `campaigns/[id]/edit` et `data`.
- Parcours client mobile `campaign/[id]` : branding, formulaire, etape d'activation, roue de la chance et redemption.
- Endpoints mockes alignes sur la SFD pour preparer le branchement Supabase / Vercel.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS v4
- Store mock en memoire dans `src/lib/store.ts`

## Routes principales

- `/`
- `/campaigns`
- `/campaigns/new`
- `/campaigns/[id]/edit`
- `/data`
- `/campaign/camp-sora-review`
- `/api/public/campaign/[id]`
- `/api/public/event`
- `/api/public/draw`
- `/api/public/redeem`
- `/api/merchant/stats`
- `/api/merchant/leads`
- `/api/campaigns/setup`
- `/api/campaigns/[id]`

## Demarrage

```bash
npm install
npm run dev
```

## Variables utiles

- `GOOGLE_PLACES_API_KEY` : cle serveur Google Places API utilisee pour rechercher un etablissement et generer automatiquement le lien d'avis Google.

## Verification effectuee

- `npm run lint`
- `npm run build`
- Verification navigateur sur `/`, `/campaigns` et `/campaign/camp-sora-review`

## Etape suivante recommandee

1. Remplacer `src/lib/store.ts` par un repository Supabase.
2. Ajouter Supabase Auth pour le back-office marchand.
3. Persister `campaign_events`, leads, prizes et redemption en base.
4. Connecter une vraie generation QR et l'upload media via Supabase Storage.
