# Relance avant expiration — #304

## Décisions validées le 12 octobre 2026

- Réglage commun au compte marchand (workspace), pour tous ses établissements,
  dans Mon compte → Utilisateur. Modifiable par propriétaire/administrateur,
  consultable par les membres actifs ; aucun interrupteur par campagne ou collaborateur.
- Case décochée par défaut pour tous les comptes, délai initial de 7 jours.
  Délai en jours entiers positifs, limité techniquement à 365 jours.
- Une seule relance de service au **joueur** par gain réel. Validité initiale
  d’au moins 20 × 24 heures, e-mail/QR/échéance présents, gain non retiré et
  disponible. Aucune prévisualisation, aucune modification des stocks/consentements.
- Jour civil de l’expiration dans le fuseau de l’établissement moins N jours,
  déclenchement prévu à 09:00, heures d’été/hiver calculées avec IANA. Repli
  Europe/Paris pour un ancien fuseau absent/invalide. Pas de rattrapage des jours passés.
- Planification Supabase approuvée, envoi via Resend existant, sans nouveau
  fournisseur, forfait Vercel ou modification des crons de notifications.
- Même modèle visuel que l’e-mail initial : logo ou nom, lot, conditions,
  période, QR, code de secours, rendez-vous et personnalisation de corps/pied,
  couleur, expéditeur et Reply-to. Titre/objet/préheader adaptés à la relance.
  Les données viennent du gain/site/jeu, pas des exemples de la maquette.

## Implémentation / limites de ponctualité

Outbox privée distincte de l’e-mail initial, identité unique par lead,
lease par job et verrou de worker. Envoi revérifié juste avant appel Resend :
préférence/version, date, retrait, adresse courante et rattachement site/compte.
Le payload est immuable pendant les reprises ; la clé `reward-expiry/<job-id>`
reste stable. Tentatives ambiguës arrêtées sans nouvel envoi après la fenêtre
opérationnelle, sans réutiliser une identité acceptée. Changer le délai ne crée
pas de nouvelle relance si une tentative a déjà commencé.

La fenêtre opérationnelle est 09:00 inclus → 09:05 exclus : elle permet
le démarrage, la cadence et de courtes reprises du même passage, **pas un
rattrapage plus tard dans la journée**. Activation/modification après l’heure
prévue ne rattrape pas la relance manquée. Une indisponibilité ou un volume
excessif peut donc faire manquer des relances ; cet arbitrage privilégie la règle
« pas de rattrapage ». Aucun système ne garantit la réception dans la boîte
mail exactement à 09:00 ; l’heure est celle du déclenchement visé.

Cadence prudente de 3 s entre tentatives (hors tests), budget 210 s, plafond
200 jobs par passage et lease globale de 270 s ; les appels planifiés qui se
chevauchent ne multiplient pas les envois. Plusieurs passages dans la fenêtre
peuvent terminer le lot. Le trafic d’autres e-mails peut encore provoquer une
limitation fournisseur ; les reprises sont bornées, la limite signalée dans le
Journal. Aucun débordement au lendemain ni purge activée.

Le journal Supervision conserve les compteurs non nominatifs et les échecs
`reward_expiry_reminder_run`. Les IDs fournisseur et statuts détaillés sont dans
`reward_reminder_jobs`, réservé au serveur/support. « sent » signifie accepté
par Resend, pas reçu en boîte mail ; les webhooks Resend restent archivés par
le chemin existant. Le tableau des e-mails initiaux n’est pas détourné.

Le payload contenant adresse/QR/conditions est expurgé après acceptation,
annulation ou arrêt nécessitant une vérification. L’effacement du gain supprime
son job par cascade. Les paramètres/leases ne contiennent aucune donnée joueur.

## Release — ne pas activer avant validation de la maquette

1. Vérifier cible et sauvegarde selon MIGRATION_RELEASE_RUNBOOK.
2. Appliquer `supabase/migrations/20261012090000_reward_expiry_reminders_304.sql`.
   Additive/réexécutable ; aucune activation de préférence ou cron, aucun e-mail.
3. Contrôler le schéma et le refus anon/authenticated ; lint/build/tests sur le SHA.
4. Après validation explicite, déployer l’application. Config serveur production
   uniquement : `REWARD_REMINDERS_ORIGIN=https://app.okado.app`,
   `REWARD_REMINDERS_ENABLED=true`, `REWARD_REMINDER_CRON_SECRET` secret dédié
   aléatoire d’au moins 32 caractères. Réutiliser RESEND_API_KEY/RESEND_FROM_EMAIL.
   Aucun secret NEXT_PUBLIC, aucune activation en preview/local.
5. Activer pg_cron/pg_net dans le Supabase existant, stocker seulement le secret
   dédié dans Vault sous `okado_reward_reminder_secret` via le tableau de bord.
   Ne pas coller de valeur dans le dépôt, une Issue, les logs ou une commande shell.
6. Exécuter `supabase/operations/304-schedule-reward-reminders.sql` sur la cible
   de production autorisée. Job nommé dédié ; une vérification DB chaque minute,
   requête HTTPS seulement si un compte est activé et un site dans 09:00–09:04.
   Le secret Resend reste sur le serveur applicatif, jamais dans ce job.
7. Les cases utilisateur restent décochées : activer seulement sur demande du
   marchand. Vérifier un site de test autorisé à la prochaine échéance ; les
   tests locaux isolés ne prouvent pas l’exécution du cron réel.

Sources officielles : [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart),
[Vault](https://supabase.com/docs/guides/database/vault),
[idempotence Resend — 24 h](https://resend.com/docs/dashboard/emails/idempotency-keys).
La fenêtre de 5 minutes reste largement inférieure à la fenêtre fournisseur.

## Vérifications / recette

- `npm run test:reward-reminders -w @okado/web-app` : PostgreSQL PGlite réel,
  handlers et worker avec dépendances simulées ; aucune base/envoi réel.
- Chromium `e2e/reward-reminders.spec.ts` : 320/390/1280 px, défaut, persistance,
  état commun en changeant de site, autre compte, lecture seule/erreurs et
  formulaire de compte indépendant même si le délai saisi est invalide.
- `test:reward-email`, `test:gain-notifications`, `test:support-incidents` pour
  les non-régressions ; lint/build et vérification de source.
- Maquette exacte : `node --experimental-strip-types --import ./scripts/ts-alias-loader.mjs scripts/preview-reward-reminder.mjs`.
  Données fictives et QR non valide, HTML/texte et captures 680/390/320 px.
  Le logo fourni reste pris en compte ; la maquette sans image utilise le nom.
- Le build production doit refuser `/dev/reward-reminder-proof` (404), la route
  de réglage sans session (401) et le déclencheur sans secret (401).

## Preuves locales — 12 octobre 2026

89 tests réussis : 14 relance (SQL/API/worker/rendu), 4 Chromium,
16 e-mail de gain, 40 notifications marchand et 15 incidents e-mail.
Lint : aucune erreur, 4 avertissements préexistants sur la navigation de
composants hors périmètre. Build Next.js/TypeScript réussi, vérification UTF-8
et `git diff --check` réussies. Le smoke test du build production local donne
404 sur la fixture de développement et 401 sur les deux nouvelles routes
sans session/secret. Captures examinées à 320 px pour le réglage et à
680/390/320 px pour le rendu de l’e-mail, sans débordement horizontal.

Aucun compte réel, envoi, activation, migration ou cron de production n’a été
modifié pour ces tests. La livraison reste soumise à la validation du
propriétaire et au contrôle du schéma/fuseau sur la cible autorisée.

## Retour arrière

Mettre REWARD_REMINDERS_ENABLED=false et désactiver uniquement
`okado-reward-expiry-reminders-304` dans Supabase Cron, puis rollback applicatif.
Si nécessaire, appliquer le rollback fourni : désactive les préférences,
annule/arrête les jobs restant et expurge les payloads, sans toucher aux gains,
stocks, e-mails initiaux, autres crons ou tables d’audit. Aucun DROP en production.
