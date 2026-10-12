# Relance avant expiration — #304

## Décision actuelle — 12 octobre 2026

Le propriétaire confirme que 9 h est **approximatif** et demande l’adaptation
vers le processus Vercel Hobby / Resend existant. L’ADR 0003 remplace l’ADR 0002 :
ne pas configurer Vault/pg_cron/pg_net ni exécuter l’ancien script d’installation.

- Réglage commun au compte marchand, dans Mon compte → Utilisateur, modifiable
  par propriétaire/admin et consultable par les membres actifs.
- Case désactivée par défaut, délai initial 7 jours, entier de 1 à 365.
- Une seule relance au joueur par gain réel disponible/non retiré/non expiré,
  validité initiale ≥20 × 24 h, e-mail et QR présents. Pas de preview/test.
- Jour civil J−N dans le fuseau du site, au passage effectif quotidien. Pas de
  fenêtre de cinq minutes, pas de rattrapage des jours précédents. Activation
  ou modification avant le passage du jour prise en compte.
- Modèle d’e-mail initial réutilisé : marchand/logo, lot, conditions/dates,
  QR/code de secours, RDV, corps/pied/couleurs/expéditeur/Reply-to. Objet/titre
  adaptés à la relance ; rendu validé inchangé, aucun exemple en dur.
- E-mails initiaux, synthèses, données joueur, stocks, consentements, retrait,
  préférences de notifications et purges restent inchangés.

## Planification et configuration

Un seul ajout dans `apps/web-app/vercel.json` :
`/api/internal/reward-reminders`, `0 8 * * *` (quotidien, compatible Hobby).
Les trois autres crons ne changent pas. La fonction des relances a son budget
indépendant : pas de temps pris à la fonction des synthèses.

Configuration **existante** réutilisée, production uniquement :
`CRON_SECRET`, `MERCHANT_GAIN_NOTIFICATIONS_ORIGIN=https://app.okado.app`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`. Aucune nouvelle variable obligatoire,
clé fournisseur, connexion ou configuration de planificateur dans Supabase.
L’opt-in est la case du compte. Un arrêt serveur facultatif
`REWARD_REMINDERS_ENABLED=false` bloque le worker. Local/preview sont toujours
refusés avant lecture/envoi. Les anciennes variables dédiées de #304 sont
ignorées ; ne pas les créer pour cette version.

08:00 UTC donne un déclenchement indicatif 09:00–09:59 en hiver et
10:00–10:59 en été en France métropolitaine sur Hobby. Ce n’est ni une promesse
de réception à 9 h ni d’une même heure locale dans tous les fuseaux. Le jour
civil d’éligibilité reste celui du site : une invocation décalée ne rattrape
pas un autre jour.

Source officielle : [limites Cron Hobby](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Reprises, isolation et capacité

Outbox privée distincte de l’e-mail initial, identité unique par gain, leases
job/worker, payload immuable et clé Resend `reward-expiry/<job-id>` stable.
Éligibilité/date, préférence/version, retrait, adresse et rattachement compte
sont revérifiés juste avant le fournisseur. Changer le délai ne crée jamais
une deuxième relance d’un gain déjà tenté/transmis.

Cadence 3 s, budget 210 s, plafond 200 tentatives par passage, lease globale
270 s. En cas de réponse fournisseur ambiguë, le worker peut attendre 30 s
dans ce même budget et reprendre avec **le même payload et la même clé**.
Le SQL limite à cinq tentatives et s’arrête au plus tard à 23 h de la première
tentative, même si un jour DST dure 25 h. Aucun retry au-delà du jour prévu.
Une interruption/indisponibilité/saturation peut faire manquer des rappels ;
ils ne sont pas envoyés le lendemain. La limite et les échecs sont journalisés.
Plusieurs familles d’e-mails partagent Resend : la cadence réduit la pression,
sans promettre un débit fournisseur illimité. Réévaluer la capacité si le volume
dépasse le budget ; aucun changement de forfait n’est introduit.

Journal `reward_expiry_reminder_run` sans données nominatives ; statuts/IDs
fournisseur dans la table privée. « sent » signifie accepté, pas reçu en boîte
mail. Le payload contenant adresse/QR est expurgé après acceptation,
annulation/arrêt ; suppression du gain → suppression du job par cascade.

## Migration et livraison — avant le prochain merge

1. La première migration `20261012090000_reward_expiry_reminders_304.sql` a
   été jouée et contrôlée lors de la release #494. Ne pas la modifier/rejouer
   seule pour cette adaptation.
2. Appliquer **`20261012160000_reward_reminder_daily_vercel_304.sql`** selon
   MIGRATION_RELEASE_RUNBOOK : remplace seulement l’éligibilité horaire et ajoute
   un marqueur de schéma privé. Arrête uniquement un ancien job Supabase nommé
   `okado-reward-expiry-reminders-304`, s’il existe ; aucun autre job/secret,
   aucune préférence ou donnée n’est supprimé, aucun compte activé.
3. Contrôle de schéma **en lecture** : GET `limit=0` pour les colonnes/tableaux,
   refus anon/authenticated, refus d’un utilisateur inconnu et RPC privée
   `reward_reminder_schedule_version()` = `vercel-daily-v1`. Un contrôle HEAD
   seul n’est pas une preuve suffisante (faux positif observé avant #494).
4. Après validation propriétaire, fusionner/déployer le SHA testé. Vérifier
   la configuration existante, l’ajout quotidien et les horaires des autres
   crons inchangés. Pas de procédure Vault ou de second secret.
5. Vérifier routes publiques sans session/secret 401 et fixture dev 404.
   Les cases restent décochées ; activer un compte seulement à sa demande.
   Vérifier le prochain passage autorisé : les tests locaux ne prouvent pas
   l’exécution du cron réel et ne déclenchent aucun envoi réel.

Le nouveau worker refuse d’acquérir un job si le marqueur SQL est absent ou
ancien : ne pas déclarer la fonctionnalité active sans la migration corrective.

## Vérifications / recette

- `npm run test:reward-reminders -w @okado/web-app` : vrai SQL PGlite, handlers,
  worker, secret commun, cron quotidien et réseau simulé ; aucune base réelle.
- Chromium `e2e/reward-reminders.spec.ts` à 320/390/1280 px : défaut,
  sauvegarde, compte/site, lecture seule, erreur et formulaire général indépendant.
- `test:reward-email`, `test:gain-notifications`, `test:support-incidents` pour
  les non-régressions ; lint/build, source UTF-8 et diff.
- Maquette issue du vrai renderer inchangée, QR fictif ; tests 680/390/320 px.
- Recette : cocher/décocher, modifier le délai, changer de site du compte,
  vérifier persistance ; passage tardif du bon jour accepté, ancien jour exclu,
  retrait/désactivation avant envoi refusés, aucun double envoi.

Preuves locales de cette adaptation : **94 tests réussis** (19 relance,
4 Chromium, 40 notifications marchands, 16 e-mail initial, 15 incidents).
Lint sans erreur, quatre avertissements préexistants hors périmètre ;
build/TypeScript, vérification UTF-8 et diff réussis. Smoke du build production
local : fixture 404 et routes sans session/secret 401. Capture mobile 320 px
examinée, pas de débordement. Métadonnées Vercel contrôlées en lecture : les
quatre variables réutilisées sont présentes en production, sans lecture ou
exposition des secrets. Aucun envoi, migration ou configuration de production
modifié. La migration corrective reste à jouer avant merge/déploiement.

## Retour arrière

Mettre `REWARD_REMINDERS_ENABLED=false` ou retirer uniquement le cron des
relances, puis rollback applicatif. Le rollback SQL
`supabase/rollback/20261012160000_reward_reminder_daily_vercel_304.sql` restaure
l’ancienne éligibilité et change le marqueur sans supprimer de données ni
réactiver un job Supabase. Le déploiement #494 ne traitera pas les relances sans
son ancienne configuration explicite. Ne pas réinstaller Supabase en rollback
sans nouvelle validation ; les autres e-mails/crons restent inchangés.
