# Release #473 — Notifications de gains à l’établissement

Issue : https://github.com/Znybnl/growth/issues/473. Plan et contenu détaillé approuvés par le propriétaire ; validation des rendus puis autorisation de merge/production restent requises.

## Résultat utilisateur

Mon compte → Utilisateur → Notifications de gains, préférence **personnelle par établissement**, désactivée par défaut. E-mail du compte comme destinataire. À chaque gain, quotidien, hebdomadaire ou mensuel. Synthèses au passage quotidien du matin, heure de France et horaire indicatif, sans garantie de 9 h (compromis confirmé par le propriétaire). Périodes locales : veille / semaine précédente / mois précédent ; aucun e-mail vide. Date/heure, prénom et nom, jeu et lot **dans l’e-mail** (noms approuvés le 6 octobre), sans e-mail du participant, QR ou code de retrait. Le listing couvre tous les gains ; parties de 40 lignes maximum, numérotées. Une période commencée après activation peut naturellement être partielle (pas d’historique rejoué).

Les quatre messages n’affichent aucun logo Okado. En-tête avec le nom du site ; « Les gains » et période datée dans les synthèses ; pied de page vers les préférences du bon établissement (fréquence/désactivation), avec contrôle des droits et connexion obligatoire. Le listing est lisible sur mobile, avec date dans une colonne et participant/jeu/lot dans l’autre.

## Impacts et non-régressions

- Retour propriétaire PR #474 : supprimer l’émoticône cadeau de l’objet et du titre de l’alerte immédiate, en HTML et texte. L’objet devient « Nouveau gain — [établissement] » ; le titre « Un nouveau gain ». Les synthèses, données dynamiques, préférences et e-mails des participants ne sont pas modifiés. Le contrôle dédié et les rendus des quatre modèles vérifient cette absence.
- Ajout de trois tables privées et de fonctions service role ; aucune réécriture de campagne, lot, contact, consentement ou stock. Le trigger ne concerne que les gains réels persistés. Les previews restent dans leur table séparée.
- Enregistrement durable dans la transaction de gain ; un échec SQL ne doit jamais être ignoré au prix d’une notification perdue. La migration doit donc être vérifiée avant livraison, y compris un gain réel avec notifications désactivées. Le traitement réseau est exclusivement après réponse ou au cron.
- Droits et adresse revérifiés à chaque envoi. Seuls le prénom et le nom sont copiés dans le job/payload privé, pas l’e-mail du participant, QR ou code de retrait ; aucun nom dans les événements/logs. Le snapshot du job est effacé après acceptation, annulation ou effacement du lead concerné ; les événements suivent le lead par cascade.
- L’e-mail de gain du joueur, les probabilités, la réserve de stock, le parcours public, le retrait et les métriques existants sont inchangés.
- Une nouvelle fréquence s’applique aux événements non préparés ; les jobs déjà préparés gardent leur fréquence/payload. Désactiver annule les jobs en attente, pas les e-mails déjà acceptés par Resend.

## Pré-requis et livraison

1. Validation propriétaire des quatre rendus fictifs. Sauvegarde Supabase contrôlée selon le runbook ; consigner le SHA candidat et la cible, sans secrets.
2. Jouer `supabase/migrations/20261006_merchant_gain_notifications_473.sql` sur la cible validée, avant mise en service des routes. La migration est additive et sans rétroactivité. Ne pas activer des comptes marchands réels pour tester.
3. **Choix confirmé par le propriétaire : aucun changement de forfait.** Resend/configuration habituels conservés ; cron `0 8 * * *` une fois par jour (08:00 UTC, matin français à horaire indicatif). Maintenance `15 3 * * *` inchangée pour la planification et utilisée après réponse comme reprise quotidienne. Aucun cron fréquent, achat ou fournisseur supplémentaire. L'interface ne promet plus 9 h. Vérifier les deux tâches quotidiennes protégées et la limite de durée 300 s. Source des limites : https://vercel.com/docs/cron-jobs/usage-and-pricing.
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

Worker protégé : dix jobs par défaut pour le callback d'un gain ; passages quotidiens bornés à 200 jobs et 240 s, rythme 600 ms entre jobs. La maintenance déduit le temps déjà consommé de son budget, après réponse et même si une purge échoue ; les autres opérations de maintenance sont conservées. Lease cinq minutes, `SKIP LOCKED`, clé `merchant-gain/[job UUID]`. Échec fournisseur : délai exponentiel, arrêt après six tentatives en `needs_review`. La reprise de 03:15 UTC est normalement à moins de 23 h du passage de 08:00 UTC ; si elle aussi échoue ou est manquée, un envoi ambigu passe en `needs_review`, sans renvoi automatique après 23 h (Resend garde les clés 24 h : https://resend.com/docs/dashboard/emails/idempotency-keys). Une acceptation Resend est notée `sent`, pas une preuve de réception ; les bounces doivent être contrôlés chez Resend. Ne pas remettre un job ambigu à `pending` sans vérifier son acceptation fournisseur.

Surveiller `failed` et `limitReached` du cron, ses 401/503, les événements de reprise de maintenance, l'ancienneté des événements non préparés et les jobs `needs_review`. Les périodes manquées sont rattrapées dans l'ordre ; au-delà du budget/200 jobs, le reste demeure en attente, sans troncature. Une saturation demande un contrôle opérationnel, pas un achat automatique de forfait. Le seuil SQL de 9 h locale est une éligibilité, pas un horaire garanti : hors du fuseau français la période peut attendre le passage suivant. Un retrait d’accès, changement d’adresse ou reset de gain arrête un job préparé plutôt que rejouer un payload potentiellement déjà accepté. Si une participation est effacée, la partie préparée qui la contient est annulée et expurgée : les autres gains de cette partie restent consultables dans Résultats, sans renvoi risquant un doublon.

## Preuves et limites

Révision quotidienne confirmée par le propriétaire : **32/32** tests notifications, **16/16** e-mail joueur, **5/5** tests d'interface/routes à 320/390/1280 px, **37/37** administration campagnes, **12/12** profils administrateur et **22/22** catalogue Beauté après synchronisation avec `main`. Lint : zéro erreur / quatre avertissements préexistants ; build Next.js réussi. Tests de planification quotidienne, 25 parties en un passage, bornage à 200 sans perte, budget épuisé sans réservation, reprise SQL à 03:15 avant 23 h sans anticiper la nouvelle synthèse et reprise après erreur de purge. La migration est inchangée.

**Release non exécutée** : contrôle cible en lecture seule = tables de notification absentes (`PGRST205`), aucun accès SQL direct configuré. Les métadonnées du projet Vercel `growth` confirment Resend mais ne listent pas `CRON_SECRET`, `MERCHANT_GAIN_NOTIFICATIONS_ENABLED` ni `MERCHANT_GAIN_NOTIFICATIONS_ORIGIN` en production. Aucun secret lu/affiché, aucune variable changée, aucun achat, envoi réel, merge ou déploiement. Appliquer la migration après contrôle de sauvegarde, finaliser la configuration puis vérifier le schéma avant livraison. Créer `CRON_SECRET` active également la maintenance historique (purges/reprises/images) : cet effet doit être explicitement pris en compte lors de la configuration, pas présenté comme un paramètre limité aux notifications. Le worktree est conservé jusqu'à livraison réussie.

Révision professionnelle PR #474 : tests notifications **25/25** (dont absence de l’émoticône dans l’objet/HTML/texte des quatre modèles), non-régression e-mail joueur **16/16**, source et build réussis ; lint **0 erreur / 4 avertissements préexistants**. Douze rendus 680/390/320 px régénérés sans débordement, composite desktop et synthèse à 320 px inspectés ; scénario de 40 lignes longues à 320 px réussi. Aucun envoi réel, changement SQL ou activation. Les améliorations éditoriales supplémentaires proposées au propriétaire restent des recommandations, pas des changements de périmètre implémentés.

Révision après retour propriétaire du 6 octobre : tests notifications **24/24**, E2E **5/5**, e-mail joueur **16/16**, source/lint/build OK (quatre avertissements ESLint préexistants). Rendus des quatre modèles avec noms fictifs à 680/390/320 px, inspectés visuellement ; cas de 40 lignes longues à 320 px sans débordement. La migration encore non livrée contient maintenant la lecture des noms : utiliser sa dernière version candidate, sans régénérer les anciens payloads figés. Aucun envoi réel, migration de cible ou activation de production dans cette révision.

Contrôles locaux du 6 octobre 2026 : `verify:source` OK ; lint web **0 erreur / 4 avertissements préexistants** de navigation interne ; build Next.js **OK**. `test:gain-notifications` **20/20**, E2E ciblés **5/5**, non-régression administration **37/37**, e-mail joueur **16/16**. Génération des quatre e-mails et **12 rendus** à 680/390/320 px : pas de débordement horizontal, inspection visuelle desktop et mobile effectuée. Le test d’erreur initial utilisait un sélecteur `alert` ambigu avec l’annonceur Next.js ; il a été limité au composant, puis tous les E2E ont été rejoués avec succès. L’audit npm initial du dépôt signale 24 vulnérabilités (1 faible, 6 modérées, 15 élevées, 2 critiques) : elles n’ont pas été corrigées hors périmètre et ne constituent pas une preuve de sécurité globale.

- `test:gain-notifications` : migration/rollback PostgreSQL PGlite isolé, RLS, cinq fréquences, fuseaux/DST, roue/ticket/pertes/previews, zéro rétroactivité, parties 40/40/5 pour 85 gains, leases, reprises, droits/adresse/reset, redaction d’un lead supprimé, rendu dynamique et échappement.
- E2E du composant réel avec API interceptée ; 320/390/1280 px, sauvegarde et erreurs.
- Quatre rendus exacts, 12 captures desktop/mobile. Aucun vrai e-mail, aucune écriture dans la base cible, aucune migration ou activation de production prétendue.
- Lint et build requis, tests de non-régression e-mail joueur et administration. Avertissements préexistants ESLint et audit npm à consigner dans la PR, pas à masquer ni corriger hors périmètre.

## Retour arrière

Mettre `MERCHANT_GAIN_NOTIFICATIONS_ENABLED=false`, retirer le cron de notification puis rollback Vercel vers le dernier déploiement sain. Exécuter si nécessaire `supabase/rollback/20261006_merchant_gain_notifications_473.sql` : suspend les préférences et jobs et retire seulement le trigger d’enqueue, sans toucher aux gains ni effacer le schéma. Le trigger d’expurgation à l’effacement reste actif. Conserver les données de configuration pour audit ; aucune relance historique à la remise en service. Une reprise après rollback requiert réapplication du trigger via la migration et validation propriétaire.
