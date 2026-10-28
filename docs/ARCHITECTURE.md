# Architecture — Okado

Ce document décrit l'architecture utile à la maintenance du produit. Il privilégie une compréhension simple plutôt qu'une description exhaustive du code.

## Vue d'ensemble

```text
okado.app / www.okado.app  →  site marketing
app.okado.app              →  SaaS marchand et parcours publics de jeu
                                  ↓
                         Supabase (auth, données, fichiers)
                                  ↓
                    Resend (e-mails) · Stripe (paiement)
                                  ↓
                              Vercel (déploiement)
```

## Applications et domaines

| Élément | Rôle | Déploiement |
|---|---|---|
| `apps/landing-page` | Site marketing public | `okado.app` et `www.okado.app` |
| `apps/web-app` | SaaS marchand, pages de jeu, retrait et API | `app.okado.app` |
| Supabase | Authentification, base de données, stockage | Service géré externe |
| Vercel | Hébergement et déploiement des deux applications | Production |

## Environnements

- **Local** : développement et vérification avant livraison.
- **Production** : environnement accessible aux marchands et joueurs.
- Il n'y a pas de préproduction séparée. La prévisualisation d'un jeu est un parcours produit de test, isolé des données de production ; elle ne remplace pas une préproduction technique.

## Données et accès

### Coût de lot non renseigné — #609 phase5

Le champ numérique historique reste compatible avec les RPC et les KPI existants.
L’indication facultative `prizeSettings[id].estimatedUnitCostKnown=false` utilise
le JSON `campaign_local_settings` déjà sauvegardé atomiquement avec les lots.
Lecture de configuration, éditeurs wizard/classique, copies et bibliothèque
propagent ce marqueur. Son absence ne transforme jamais un ancien zéro en inconnu.
Le nouveau budget utilise cette distinction, sans migration ni réécriture
historique des coûts/statistiques ; la valeur numérique0 reste le support
technique d’un nouveau coût non renseigné, pas une estimation complète annoncée.

### Indicateurs communs — #498

La RPC privée get_campaign_metric_counts fournit les agrégats communs à overview/summary.
get_merchant_metric_details apporte opt-ins et attentes par lot sans charger les contacts ;
get_platform_operational_metrics agrège Pilotage en base. La vue privée security_invoker
campaign_effective_redemptions lit la date effective et la preuve historique admissible,
sans réécrire de lead. Un trigger renseigne/annule redeemed_at dans la même mutation
que le statut, y compris pour l'ancien chemin marchand. Les retraits caisse/forcés restent
transactionnels, via leurs RPC privées avec contrôles inchangés ; le chemin forcé direct
à plusieurs requêtes est retiré. Le total des retraits conserve les lignes dont la date
est inconnue, tandis que les répartitions ne les inventent pas. Les RPC/vues sont service_role
uniquement ; les handlers conservent l'authentification, le périmètre établissement et le PIN.

record_marketing_click conserve un identifiant stable d'action et de clic ; sa clé unique
par jeu/événement rend une reprise idempotente. Le endpoint public valide action/type et
ne permet ni association arbitraire à un contact ni événement game_played. Les anciens
clients sans métadonnées restent compatibles, avec clic non attribué. Les lectures de
liste/repli utilisent une pagination ordonnée avec total exact, pas la longueur d'une page.
Contrat, limites, migration et retour arrière : [livraison #498](releases/consistent-metrics-498.md).

### Comptage des participations — #496

Complément #638 : le clic existant reçoit une capacité HMAC courte, qui permet à la route de préparation de rattacher l’événement enregistré à la session exacte. La RPC privée `create_draw_session_with_marketing` enveloppe la transaction de tirage existante ; le contexte est figé sur les événements métier, puis lu par la vue privée `campaign_participation_marketing` sans modifier les compteurs canoniques. Le réglage de campagne référence une acceptation versionnée dans `google_click_warning_acceptances`, validée par trigger. [Migration, contrôles et rollback](releases/2026-10-23-google-click-638.md).

La vue privée `campaign_participations` (security_invoker, SELECT service_role uniquement) dédoublonne les événements `game_played` et les contacts historiques finalisés par identité de session, puis de lead quand le lien manque. La date retenue est la première preuve de jeu, pas la date ultérieure du formulaire. Il n'y a ni nouvelle collecte de données personnelles ni réécriture historique. Les archives et durées de conservation existantes sont inchangées.

La roue enregistre déjà l'événement côté serveur dans sa transaction de préparation. Le ticket appelle `/api/public/draw/played` au premier grattage avec une capacité HMAC courte délivrée seulement pour une vraie session. La RPC privée verrouille la session et enregistre l'événement au plus une fois, sans gain, stock, contact ou e-mail. Une capacité de preview est d'un autre type et ne peut pas être réutilisée. L'API d'événements arbitraires refuse toujours `game_played`.

Les RPC overview et summary gardent leurs signatures : `games_count` devient le comptage commun de participations, `leads_count` reste le nombre de contacts. Les jours des graphiques sont explicitement UTC, avec bornes calendaires et agrégation en base (pas de plafond REST à 1 000 lignes). Migration, limites réseau/historique et rollback : [livraison #496](releases/participation-metrics-496.md).

- Le marchand est responsable de traitement pour les données de ses contacts. Okado est sous-traitant technique pour la plateforme.
- Les données d'un établissement ne doivent jamais être accessibles par un autre marchand sans autorisation explicite.
- Seul Pierre-Henri BRUNELLE détient les accès aux sauvegardes Supabase/Vercel et aux secrets de production.
- Les secrets restent exclusivement dans les variables d'environnement ; ils ne sont jamais inscrits dans le dépôt, les Issues, les PR ou les logs.

## Frontières fonctionnelles à préserver

- Les parcours publics (jeu, QR de retrait, prévisualisation) ne donnent pas accès à l'espace marchand.
- Un QR de diffusion, un QR de retrait et un QR de prévisualisation ont des usages distincts.
- La prévisualisation est explicitement identifiée et n'affecte ni stock ni indicateurs de production.
- Le retrait exige le PIN marchand ; un retrait forcé exige en plus un motif journalisé.

## Déploiement et retour arrière

- Les changements sont vérifiés localement puis publiés depuis `main` après validation explicite du propriétaire.
- Vercel déploie la production. En cas de régression, le rollback Vercel vers le dernier déploiement sain est prioritaire ; le correctif est analysé ensuite.
- Toute migration Supabase doit suivre les règles de `AGENTS.md` et posséder un plan de retour arrière.

## Notifications de gains (Issue #473)

### Contrainte d'exploitation approuvée

Décision du propriétaire du 6 octobre 2026 : les notifications doivent réutiliser l'envoi d'e-mails existant (Resend et sa configuration serveur), sans imposer un forfait Vercel supérieur ni un nouveau fournisseur. Aucun changement d'abonnement ou service payant supplémentaire sans accord explicite préalable. Cette contrainte s'applique aux choix de planification comme aux envois ; ne pas confondre le fournisseur d'e-mails avec le mécanisme qui déclenche une synthèse.

Le prénom et le nom sont lus dans le lead lors de la préparation et copiés uniquement dans le job/payload privé ; les événements et logs restent non nominatifs. Les snapshots préparés demeurent stables pendant les reprises et suivent l’expurgation existante. Les anciens snapshots sans nom restent lisibles. Le lien de préférences contrôle la session et l’accès au site, sélectionne cet établissement via le cookie existant, puis ouvre Mon compte sans modifier les options.

Le trigger d’insertion sur les **leads réels** enregistre un événement durable par utilisateur/site/canal activé et autorisé. La clé des événements inclut le canal afin que le même lead puisse être traité séparément pour l’immédiat et chacune des synthèses. Ajouter un canal ne recrée aucun événement historique ; désélectionner un canal supprime ses événements et annule ses jobs non transmis sans toucher aux autres canaux. Aucune requête réseau dans ce trigger ; aucune modification de la table de prévisualisation. Les API de finalisation réelle appellent un worker dans `after()` (Next.js 16), sans nouvelle attente d’e-mail dans la réponse joueur. Le cron protégé récupère les interruptions et prépare les synthèses closes.

Les tables `merchant_gain_notification_preferences`, `merchant_gain_notification_events` et `merchant_gain_notification_jobs` ont RLS activée, sans accès anon/authenticated. Les préférences stockent une liste de canaux, désactivée par défaut ; l’ancienne colonne et la RPC mono-canal restent maintenues comme projection compatibilité. Seules les routes serveur authentifiées utilisent la service role, avec contrôle multisite et origine des mutations ; les RPC privées revérifient les droits. Une lease transactionnelle et une clé Resend stable par job protègent les reprises. Le nom du site et le fuseau sont figés à la préparation, puis le HTML/texte/objet/expéditeur exacts avant l’envoi, pour conserver le payload même à travers les déploiements. Les parties contiennent au plus 40 gains, sans tronquer la période. Les détails, le payload et l’adresse sont effacés du job après acceptation ou annulation, et à l’effacement d’une participation concernée. Les événements sont supprimés par cascade avec le lead.

La RPC serveur `get_merchant_gain_notification_digest_context` fournit uniquement aux synthèses le nombre de retraits dont `redeemed_at` est dans la fenêtre du job (indépendamment de la date de gain) et les stocks des campagnes actives du même établissement. Elle est `SECURITY DEFINER`, restreinte à `service_role`, et ne retourne aucune donnée personnelle. Le KPI et les stocks sont inclus dans le payload e-mail immuable au même titre que les lignes de gains. La migration complémentaire est `20261007110000_gain_notification_digest_context_484.sql` ; son retrait supprime uniquement cette RPC.

Le propriétaire valide un passage quotidien le matin à horaire indicatif, sans garantie de 9 h. Le cron de synthèses est `0 8 * * *` (08:00 UTC, 09:00 en hiver / 10:00 en été en France, déclenchement indicatif). L'alerte immédiate utilise Resend après la réponse joueur, sans attendre un cron. Une route indépendante `/api/internal/gain-notifications/recovery`, à `15 3 * * *`, reprend les envois interrompus/échoués avant la fenêtre de sécurité de 23 h ; aucune purge ni tâche fréquente. La maintenance historique garde sa planification, mais ne travaille que si `MAINTENANCE_ENABLED=true`, désactivé par défaut : configurer `CRON_SECRET` pour les notifications ne doit pas activer les purges. Le seuil SQL de 9 h locale exclut la nouvelle période du matin lors de la reprise nocturne pour les sites français ; les périodes anciennes éligibles peuvent être rattrapées. Hors de France, l'éligibilité locale peut reporter une période au passage suivant. Chaque passage traite au plus 200 jobs, avec budget de 240 s et rythme de 600 ms ; une saturation est signalée, les parties non tentées restent persistées. Le dispatcher n’envoie que lorsque `VERCEL_ENV=production` et `MERCHANT_GAIN_NOTIFICATIONS_ENABLED=true`. Le drapeau est désactivé par défaut ; la migration SQL, la configuration et la validation des e-mails précèdent l’activation. Une acceptation fournisseur n’est pas une preuve de réception dans la boîte mail. Procédure et limites : [release #473](releases/issue-473-merchant-gain-notifications.md).

## À ne pas supposer

### Relances d’expiration — #304

Réglage partagé au workspace, RPC privées service_role et autorisation des membres/propriétaires côté serveur. Outbox distincte et unique par gain, leases de job/worker, payload exact persistant pour les reprises et clé Resend stable ; contrôle d’éligibilité/préférence/version avant transmission. Un cron Vercel quotidien dédié (`0 8 * * *`) appelle la route protégée avec le `CRON_SECRET` existant. Il ne partage pas le budget de la fonction des synthèses : leurs crons et dispatchers sont inchangés. La même configuration Resend et `MERCHANT_GAIN_NOTIFICATIONS_ORIGIN` sont utilisées ; aucun Vault/pg_cron/pg_net à configurer. L’éligibilité porte sur le jour civil local J−N, sans rattrapage des jours passés ni promesse de 9 h locale. Le marqueur SQL privé `reward_reminder_schedule_version` empêche le nouveau worker d’envoyer sur l’ancien schéma horaire. L’opt-in est la case du compte ; `REWARD_REMINDERS_ENABLED=false` est un arrêt serveur facultatif, pas un prérequis d’activation. Reprises courtes dans le même budget, borne 23 h préservée. Journal non nominatif, payload expurgé après acceptation/annulation/arrêt et suppression par cascade à l’effacement du gain. Le modèle initial et son suivi restent indépendants. [Configuration et rollback](releases/reward-expiry-reminders-304.md).

### Supervision administrative — #491

La RPC privée `get_support_monitoring` réalise recherche, jointures, comptages et pagination en base, avec paramètres liés et liste fixe de sources. Seul `service_role` peut l’exécuter ; page et DAL revérifient l’administrateur. Les lectures des quatre sources et du sélecteur sont parallèles ; une panne partielle reste visible et n’annule pas les autres lectures. Aucun payload de webhook, snapshot de gain ou payload d’e-mail n’est renvoyé. Les passages programmés et de reprise enregistrent désormais un résultat global non nominatif dans `business_logs`, attendu avant la réponse HTTP, sans changer la planification ou le worker. Un échec de journalisation ne transforme pas un envoi accepté en échec/reprise. Les anciens passages ne sont pas inventés ni reconstitués.

- Les règles RLS, les schémas Supabase et les API font foi dans le code et les migrations ; ils doivent être inspectés avant toute modification de données ou d'autorisation.
- Une nouvelle intégration externe, un nouveau sous-traitant ou un nouveau transfert de données exige une analyse avant implémentation.

## Lectures des écrans marchands — #500

Les écrans de consultation utilisent un snapshot SQL privé sans images ni configuration complète ; les métriques canoniques #498 restent la source de calcul. La déduplication React est limitée au rendu courant et à une clé d'établissement. Les alertes navigation/Accueil partagent un fournisseur client réinitialisé au changement de compte/site et un agrégat service_role. Les profils multi-sites restent bornés à l'adhésion vérifiée, lus par lots paginés. Voir [analyse, migration et retour arrière](releases/2026-10-14-page-performance-500.md). Aucun changement de région sans confirmation de la région primaire Supabase.


## Affiliation du compte — #677

`affiliate_accounts.workspace_id` porte le programme ; un index unique partiel
impose une seule fiche canonique par workspace. Les anciennes fiches/codes restent
comme alias via `canonical_account_id`, sans réécriture des factures ou montants.
Les attributions possèdent les deux workspace_id : unicité du filleul et interdiction
d’auto-parrainage entre sites. Des triggers de compatibilité dérivent ces champs
pour les écritures de la version applicative précédente pendant le déploiement.

Le listing administratif lit les propriétaires/adhésions/workspaces et propose
les comptes sans fiche comme désactivés. L’activation, réservée à la plateforme,
crée la fiche si nécessaire. Aucune création n’est conditionnée à une visite de
Mon compte. La carte active est fournie côté serveur aux seuls rôles owner/admin,
avec le même périmètre quel que soit le site sélectionné. Les lectures sont paginées.
La RPC privée `record_affiliate_paid_invoice_677` verrouille l’attribution et
crée la commission/fixe la fenêtre dans une même transaction. Le statut canceled
n’empêche pas une nouvelle facture payée pendant la fenêtre initiale. La clé
unique de facture empêche les doubles commissions. [Livraison et rollback](releases/2026-10-28-affiliate-accounts-677.md).
