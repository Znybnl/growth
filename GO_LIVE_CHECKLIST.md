# Checklist Go-Live Okado

Cette checklist doit être jouée avant chaque ouverture à un client pilote.

## Validations réalisées

Dernière vérification locale : 2026-07-10.

- [x] `npm run smoke:security -w @okado/web-app` : OK.
- [x] `npm run smoke:critical -w @okado/web-app` : OK.
- [x] `npm run check:gotomarket -w @okado/web-app` : OK.
- [x] `npm run check:gotomarket -w @okado/web-app -- --live` : OK après neutralisation du problème de certificat local Node sur ce poste.
- [x] Migration P0 sécurité détectée dans Supabase configuré localement : tables `public_rate_limits`, `daily_participation_locks` et RPC `consume_public_rate_limit` disponibles.

Note : l'exception TLS utilisée pour le check local ne doit pas être configurée en production.

## 1. État du déploiement

- [ ] Domaine `https://app.okado.app` accessible depuis un navigateur externe.
- [ ] Certificat HTTPS valide sans erreur navigateur.
- [ ] Dernier déploiement Vercel basé sur `main`.
- [ ] Variables Vercel Production complètes : Supabase, Stripe, Resend, Google Places, PostHog EU.
- [ ] `npm run check:gotomarket -w @okado/web-app -- --live` exécuté et documenté.

## 2. Authentification et accès

- [ ] Connexion email/mot de passe OK.
- [ ] Connexion Google OK avec un compte existant.
- [ ] Connexion Google OK avec un nouveau compte.
- [ ] Compte standard sans accès direct à `/support` et `/backgrounds`.
- [ ] Compte admin autorisé avec accès Supervision et Bibliothèque.

## 3. Parcours marchand critique

- [ ] Inscription puis onboarding complets.
- [ ] Création d'une animation roue.
- [ ] Création d'une animation ticket à gratter.
- [ ] Sauvegarde d'une animation existante.
- [ ] Génération et téléchargement QR code.
- [ ] Génération et téléchargement affiche PNG.
- [ ] Export données depuis la page Données.

## 4. Parcours client critique

- [ ] Page de jeu publique accessible.
- [ ] Action marketing Google ouverte dans un nouvel onglet.
- [ ] Participation gagnante avec prénom + email.
- [ ] Participation perdante affichée correctement.
- [ ] Email de gain reçu avec QR code et conditions.
- [ ] QR vendeur scannable.
- [ ] Retrait validé une seule fois.
- [ ] Tentative de retrait multiple bloquée.

## 5. Paiement, emails et webhooks

- [ ] Checkout Stripe test ou live OK.
- [ ] Webhook Stripe reçu dans Supervision.
- [ ] Statut abonnement synchronisé dans Supabase.
- [ ] Email Resend envoyé depuis une adresse `@okado.app`.
- [ ] Webhook Resend reçu dans Supervision.
- [ ] Renvoi e-mail protégé contre le spam.

## 6. Sécurité et données

- [ ] `npm run smoke:security -w @okado/web-app` exécuté sur l'environnement cible.
- [ ] Aucun accès cross-merchant constaté.
- [ ] Migration `20260710_security_p0_hardening.sql` jouée sur l'environnement cible.
- [ ] RLS active sur tables sensibles : merchants, merchant_users, campaigns, prizes, leads, draw_sessions, reward_email_deliveries, reward_email_events, business_logs.
- [ ] RPC de tirage bornées par campagne active, stock et statut de session.
- [ ] Backup/export Supabase réalisé avant ouverture pilote.

## 7. Observabilité

- [ ] PostHog reçoit les événements : `signup_completed`, `onboarding_completed`, `campaign_created`, `campaign_saved`, `campaign_published`, `draw_started`, `draw_finalized`, `reward_email_sent`, `reward_email_failed`, `prize_redeemed`, `stripe_checkout_started`, `subscription_active`.
- [ ] Supervision affiche les e-mails en échec.
- [ ] Supervision affiche les webhooks récents.
- [ ] Supervision affiche les gains sans retrait.
- [ ] Supervision affiche les erreurs métier récentes.

## Critères No-Go

- Auth Google instable.
- Sauvegarde campagne instable.
- Paiement Stripe non répercuté dans Supabase.
- Email de gain non envoyé.
- Retrait QR utilisable plusieurs fois.
- Accès possible aux données d'un autre marchand.
- Affiche PNG différente du template sélectionné sur un cas standard.
