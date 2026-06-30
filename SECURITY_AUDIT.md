# Audit sécurité Okado

Dernière mise à jour : 2026-06-30.

## Modèle d'accès applicatif

- La session back-office repose sur Supabase Auth via les cookies SSR.
- Les pages marchandes utilisent `requireAuthenticatedSession()`.
- Les routes API marchandes doivent résoudre le marchand connecté et borner les opérations avec `merchantId`.
- Les mutations marchandes utilisent `assertTrustedMutationRequest()` pour limiter les requêtes cross-origin.
- Les menus `Supervision` et `Bibliothèque` sont réservés aux administrateurs SaaS.

## Routes publiques assumées

Ces routes sont volontairement publiques et doivent rester protégées par validation d'entrée, contrôle campagne active, abonnement actif et rate limit :

- `GET /api/public/campaign/[id]`
- `POST /api/public/event`
- `POST /api/public/draw/session`
- `POST /api/public/draw/finalize`
- `POST /api/public/draw`
- `GET /api/public/redeem/[code]/qr`
- `GET /campaign/[id]`
- `GET /redeem/[code]`

## Routes sensibles à vérifier à chaque release

- Campagnes : création, modification, suppression, duplication, QR, affiche, email.
- Données : export leads, recherche lead/email/code retrait.
- Lots : retrait, réinitialisation, modification stock.
- Facturation : checkout Stripe, portail client.
- Administration : bibliothèque d'images, supervision.
- Webhooks : Stripe et Resend avec signature obligatoire.

## RLS Supabase attendu

Les tables suivantes doivent avoir RLS activé ou être exclusivement manipulées via service role/RPC bornées :

- `merchants`
- `merchant_users`
- `campaigns`
- `campaign_actions`
- `campaign_events`
- `prizes`
- `leads`
- `draw_sessions`
- `reward_email_deliveries`
- `reward_email_events`
- `business_logs`
- `background_library_images`

## RPC critiques

- `create_draw_session`
- `finalize_draw_session_and_create_lead`
- `draw_campaign_prize_and_create_lead`
- `get_merchant_campaign_overview`

Ces fonctions doivent rester bornées par campagne, stock, statut de session et marchand lorsque applicable. Les fonctions `security definer` doivent fixer explicitement le `search_path` et ne jamais exposer de sélection cross-merchant.

## Critères d'acceptation sécurité

- `npm run smoke:security` passe sur l'environnement cible.
- Un marchand standard ne voit pas `/support` ni `/backgrounds`.
- Un marchand standard ne peut pas lire, modifier, dupliquer, supprimer ou exporter une campagne d'un autre marchand.
- Un code de retrait ne peut être consommé qu'une seule fois.
- Un essai expiré bloque la page de jeu et l'export, mais laisse accès au compte/facturation.
- Les webhooks Stripe/Resend sans signature valide retournent une erreur.

## Points de vigilance restants

- Le rate limiting public est applicatif et doit être revu si le volume pilote augmente fortement.
- Les routes publiques ne doivent jamais retourner d'informations sensibles sur le marchand ou les autres participants.
- Toute nouvelle route API doit être ajoutée à cette matrice avant merge.
