# Release #473 — Notifications de gains à l’établissement

Issue : https://github.com/Znybnl/growth/issues/473. Plan et contenu détaillé approuvés par le propriétaire ; validation des rendus puis autorisation de merge/production restent requises.

## Résultat utilisateur

Mon compte → Utilisateur → Notifications de gains, préférence **personnelle par établissement**, désactivée par défaut. E-mail du compte comme destinataire. À chaque gain, quotidien, hebdomadaire ou mensuel. Synthèses à partir de 9 h locale (veille / semaine précédente le lundi / mois précédent le premier), sans e-mail vide. Date/heure, jeu et lot **dans l’e-mail**, aucun participant nommé, QR ou code de retrait. Le listing couvre tous les gains ; parties de 40 lignes maximum, numérotées. Une période commencée après activation peut naturellement être partielle (pas d’historique rejoué).

## Impacts et non-régressions

- Ajout de trois tables privées et de fonctions service role ; aucune réécriture de campagne, lot, contact, consentement ou stock. Le trigger ne concerne que les gains réels persistés. Les previews restent dans leur table séparée.
- Enregistrement durable dans la transaction de gain ; un échec SQL ne doit jamais être ignoré au prix d’une notification perdue. La migration doit donc être vérifiée avant livraison, y compris un gain réel avec notifications désactivées. Le traitement réseau est exclusivement après réponse ou au cron.
- Droits et adresse revérifiés à chaque envoi. Les coordonnées du participant ne sont pas copiées. Le snapshot du job est effacé après acceptation, annulation ou effacement du lead concerné ; les événements suivent le lead par cascade.
- L’e-mail de gain du joueur, les probabilités, la réserve de stock, le parcours public, le retrait et les métriques existants sont inchangés.
- Une nouvelle fréquence s’applique aux événements non préparés ; les jobs déjà préparés gardent leur fréquence/payload. Désactiver annule les jobs en attente, pas les e-mails déjà acceptés par Resend.

## Pré-requis et livraison

1. Validation propriétaire des quatre rendus fictifs. Sauvegarde Supabase contrôlée selon le runbook ; consigner le SHA candidat et la cible, sans secrets.
2. Jouer `supabase/migrations/20261006_merchant_gain_notifications_473.sql` sur la cible validée, avant mise en service des routes. La migration est additive et sans rétroactivité. Ne pas activer des comptes marchands réels pour tester.
3. Vérifier le forfait du projet Vercel `growth`. La documentation actuelle autorise les crons fréquents en Pro/Enterprise ; Hobby refuse une fréquence supérieure à une fois par jour. Le connecteur utilisé n’expose pas le forfait : **contrôle non confirmé**, bloquant avant merge/déploiement du cron `*/5 * * * *`. Aucun abonnement n’a été modifié. Source : https://vercel.com/docs/cron-jobs/usage-and-pricing.
4. Variables serveur : `MERCHANT_GAIN_NOTIFICATIONS_ENABLED=false` initialement ; `MERCHANT_GAIN_NOTIFICATIONS_ORIGIN=https://app.okado.app` ; `CRON_SECRET` (partagé avec maintenance), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, service role existante. Ne jamais publier les valeurs sensibles. HTML/texte/objet/expéditeur exacts sont figés avant le premier envoi ; une reprise conserve ce payload malgré un changement de rendu ou configuration. Une migration qui change les anciens payloads nécessite donc une validation séparée, sans régénérer les e-mails ambigus.
5. Après accord, fusionner la PR et contrôler le déploiement Vercel sur le SHA fusionné. Preview/local : aucun envoi marchand, indépendamment du drapeau. Le serveur 3001 n’est pas une preuve de livraison.
6. Sur **le compte E2E autorisé seulement**, activer l’immédiat, réaliser un vrai gain de test roue puis ticket et constater un unique e-mail par gain. Contrôler la synthèse au prochain créneau sur le compte test, le lien Résultats autorisé, la désactivation et l’absence d’envoi preview/perte. Vérifier Gmail/Outlook avec envoi explicitement autorisé. Activer le drapeau global seulement après migration/configuration et accord. Les préférences des autres utilisateurs restent désactivées.

## Contrôles SQL de la cible (lecture seule)

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename like 'merchant_gain_notification_%';
select tgname from pg_trigger
where tgrelid='public.leads'::regclass and not tgisinternal
and tgname in ('queue_merchant_gain_notification','redact_deleted_gain_notification');
select has_function_privilege('anon','public.claim_merchant_gain_notification(timestamptz,text)','EXECUTE') as anon_must_be_false,
       has_function_privilege('authenticated','public.claim_merchant_gain_notification(timestamptz,text)','EXECUTE') as authenticated_must_be_false;
select status,count(*) from public.merchant_gain_notification_jobs group by status;
```

Ne pas lancer une RPC `claim` de production comme contrôle de schéma : elle prépare et réserve des e-mails. `check:supabase` couvre les nouvelles tables/colonnes, le refus anonyme explicite et la RPC de permission en lecture seule, avec des identifiants inexistants. Ses contrôles historiques exercent également un rate-limit et un verrou temporaire : lancer sur la cible seulement dans le cadre de la release validée, comme indiqué au runbook.

## Exploitation et reprise

Worker protégé, dix jobs maximum par appel (jusqu’à 20 si explicitement demandé au helper), lease cinq minutes, `SKIP LOCKED`, clé `merchant-gain/[job UUID]`. Échec fournisseur : délai exponentiel, arrêt après six tentatives en `needs_review`. Après 23 h depuis première tentative ambiguë : `needs_review`, sans renvoi automatique (Resend garde les clés 24 h : https://resend.com/docs/dashboard/emails/idempotency-keys). Une acceptation Resend est notée `sent`, pas une preuve de réception ; les bounces doivent être contrôlés chez Resend. Ne pas remettre un job ambigu à `pending` sans vérifier son acceptation fournisseur.

Surveiller les retours `failed` du cron, ses 401/503, l’ancienneté des événements non préparés et les jobs `needs_review`. Les périodes manquées sont rattrapées dans l’ordre ; au-delà de dix jobs par exécution, le reste attend l’appel suivant. Un retrait d’accès, changement d’adresse ou reset de gain arrête un job préparé plutôt que rejouer un payload potentiellement déjà accepté. Si une participation est effacée, la partie préparée qui la contient est annulée et expurgée : les autres gains de cette partie restent consultables dans Résultats, sans renvoi risquant un doublon.

## Preuves et limites

Contrôles locaux du 6 octobre 2026 : `verify:source` OK ; lint web **0 erreur / 4 avertissements préexistants** de navigation interne ; build Next.js **OK**. `test:gain-notifications` **20/20**, E2E ciblés **5/5**, non-régression administration **37/37**, e-mail joueur **16/16**. Génération des quatre e-mails et **12 rendus** à 680/390/320 px : pas de débordement horizontal, inspection visuelle desktop et mobile effectuée. Le test d’erreur initial utilisait un sélecteur `alert` ambigu avec l’annonceur Next.js ; il a été limité au composant, puis tous les E2E ont été rejoués avec succès. L’audit npm initial du dépôt signale 24 vulnérabilités (1 faible, 6 modérées, 15 élevées, 2 critiques) : elles n’ont pas été corrigées hors périmètre et ne constituent pas une preuve de sécurité globale.

- `test:gain-notifications` : migration/rollback PostgreSQL PGlite isolé, RLS, cinq fréquences, fuseaux/DST, roue/ticket/pertes/previews, zéro rétroactivité, parties 40/40/5 pour 85 gains, leases, reprises, droits/adresse/reset, redaction d’un lead supprimé, rendu dynamique et échappement.
- E2E du composant réel avec API interceptée ; 320/390/1280 px, sauvegarde et erreurs.
- Quatre rendus exacts, 12 captures desktop/mobile. Aucun vrai e-mail, aucune écriture dans la base cible, aucune migration ou activation de production prétendue.
- Lint et build requis, tests de non-régression e-mail joueur et administration. Avertissements préexistants ESLint et audit npm à consigner dans la PR, pas à masquer ni corriger hors périmètre.

## Retour arrière

Mettre `MERCHANT_GAIN_NOTIFICATIONS_ENABLED=false`, retirer le cron de notification puis rollback Vercel vers le dernier déploiement sain. Exécuter si nécessaire `supabase/rollback/20261006_merchant_gain_notifications_473.sql` : suspend les préférences et jobs et retire seulement le trigger d’enqueue, sans toucher aux gains ni effacer le schéma. Le trigger d’expurgation à l’effacement reste actif. Conserver les données de configuration pour audit ; aucune relance historique à la remise en service. Une reprise après rollback requiert réapplication du trigger via la migration et validation propriétaire.
