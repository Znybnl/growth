# Okado

Application SaaS BtoB pour créer et piloter des animations locales en boutique ou restaurant : roue de la fortune, ticket à gratter, QR code, collecte de leads, dotations, retrait de lots et suivi marchand.

## Stack

- Next.js App Router
- React 19
- Supabase Auth, Database et Storage
- Stripe Checkout et Customer Portal
- Resend pour les emails transactionnels
- Vercel Analytics et PostHog EU

## Démarrage local

```bash
npm install
npm run dev
```

Avant de lancer l'application, compléter `.env.local` à partir de `.env.example`.

## Variables d'environnement critiques

- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique Supabase utilisée par le navigateur et le SSR.
- `SUPABASE_SERVICE_ROLE_KEY` : clé serveur Supabase pour les opérations privilégiées.
- `RESEND_API_KEY` : clé API Resend.
- `RESEND_FROM_EMAIL` : expéditeur validé, par exemple `OKADO <noreply@okado.app>`.
- `RESEND_WEBHOOK_SECRET` : secret du webhook Resend.
- `STRIPE_SECRET_KEY` : clé API Stripe serveur.
- `STRIPE_PRICE_ID_MONTHLY` : identifiant du prix mensuel Stripe, actuellement 20 euros/mois.
- `STRIPE_WEBHOOK_SECRET` : secret de signature du webhook Stripe.
- `GOOGLE_PLACES_API_KEY` : clé serveur Google Places API pour générer les liens d'avis Google.
- `NEXT_PUBLIC_POSTHOG_KEY` : clé projet PostHog exposable côté navigateur.
- `NEXT_PUBLIC_POSTHOG_HOST` : host PostHog, `https://eu.i.posthog.com` pour la région EU.
- `ALLOW_INSECURE_LOCAL_TLS` : uniquement pour certains postes locaux avec inspection TLS, jamais en production.

## Contrôle Go-To-Market technique

Lancer avant un déploiement ou une validation de production :

```bash
npm run check:gotomarket
```

Pour vérifier aussi que les endpoints de production répondent :

```bash
npm run check:gotomarket -- --live
```

Le script vérifie les variables critiques, les conventions Stripe, Supabase et Resend, et bloque notamment l'utilisation de `@resend.dev` qui limite les emails aux adresses de test.

## Webhooks production

Configurer les endpoints suivants dans les outils externes :

- Stripe : `https://app.okado.app/api/webhooks/stripe`
- Resend : `https://app.okado.app/api/webhooks/resend`

Événements Stripe attendus :

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Authentification Supabase

Configuration minimale production :

- Site URL : `https://app.okado.app`
- Redirect URL Google app : `https://app.okado.app/api/auth/google/callback`
- Redirect URI Google Console : `https://aeespnvqrfgzuuhchnnp.supabase.co/auth/v1/callback`

## Vérifications avant premiers clients pilotes

- `npm run lint`
- `npm run build`
- `npm run check:gotomarket -- --live`
- `npm run smoke:critical` sur l'environnement cible
- `npm run smoke:security` sur l'environnement cible
- Backup/export Supabase effectué avant ouverture pilote

Documents d'exploitation :

- `GO_LIVE_CHECKLIST.md` : checklist opérationnelle avant ouverture pilote.
- `SECURITY_AUDIT.md` : matrice de sécurité et points de contrôle API/RLS.
- `PILOT_PLAYBOOK.md` : support d'exploitation pour les premiers restaurants pilotes.

## Critères No-Go

- Connexion email ou Google instable.
- Sauvegarde campagne impossible.
- Paiement Stripe non répercuté dans Supabase.
- Email de gain Resend non envoyé ou domaine non validé.
- Retrait QR utilisable plusieurs fois.
- Un marchand peut accéder aux données d'un autre marchand.
