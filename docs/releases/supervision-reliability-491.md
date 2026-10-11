# Supervision fiable — #491

## Résultat

Quatre tableaux conservés, résumé compact, compteurs exacts, recherche en base, pagination indépendante, période UTC et établissement. Envois joueur et notifications établissement sont distingués ; leurs files d’attente actuelles restent indépendantes du filtre historique. Les sources indisponibles ne sont jamais affichées comme des compteurs à zéro. Les gains non retirés ne sont pas des incidents techniques.

## Analyse et sécurité

La lecture précédente recherchait seulement dans des listes de 20/30/50 éléments et le journal indisponible devenait vide. Un ancien webhook suffisait à afficher une synchronisation active. La nouvelle RPC administrative réalise des jointures et comptages en base, sans transfert de toutes les participations. Les valeurs de filtre sont liées ; les fragments SQL sont fixes. Droits anon/authenticated révoqués ; administrateur vérifié dans page et DAL. Le DTO exclut payload fournisseur, contenu d’e-mail, secrets, instantanés nominaux de synthèse et PIN.

Les tables existantes, leurs RLS, l’acquittement, les gains, stocks, préférences, règles de reprise et calendrier ne sont pas modifiés. Seule écriture nouvelle : une trace attendue du résultat du cron/recovery, sans participant ni adresse, afin que la dernière exécution soit durable. Le logger global précédent abandonnait les événements sans merchantId. Une trace échouée ne change pas le résultat d’envoi.

## Migration

Jouer `supabase/migrations/20261011220000_support_monitoring_491.sql` avant le déploiement applicatif. Migration additive, réexécutable, ne réécrit aucune ligne ; ancien code compatible. Elle dépend du schéma livré pour #473/#484/#487. Vérifier sauvegarde/cible/SHA selon le runbook de migrations, puis `check:supabase` et smoke sécurité sur cible autorisée. Aucun schéma de production n’a été modifié par les tests locaux.

Retour arrière : rollback applicatif d’abord, puis suppression de la seule RPC via `supabase/rollback/20261011220000_support_monitoring_491.sql`. Les traces déjà écrites et toutes les données métier restent intactes.

## Recette propriétaire

1. Supervision : vérifier les quatre tableaux et la date d’actualisation, puis actualiser.
2. Filtrer un établissement, une journée UTC et un texte ancien ; vérifier le total et passer à la page suivante. Les filtres doivent rester et un nouveau filtre doit réinitialiser les pages.
3. E-mails : comparer Tous les envois / Incidents à traiter / Incidents traités ; distinguer gain joueur et synthèse. Aucun envoi n’est déclenché. Ne pas acquitter une anomalie réelle pour tester.
4. Vérifier les événements non associés et le dernier webhook daté ; aucune mention « Synchronisation active ».
5. Vérifier les gains sans alerte technique et le journal. Le premier passage de cron après livraison renseignera la dernière exécution ; les anciennes exécutions globales n’existaient pas en base.
6. Sur mobile 320/390 px, défiler horizontalement dans chaque tableau sans élargissement de la page.

## Limites explicites

L’écran ne sonde pas Resend/Vercel/Supabase et ne garantit pas la réception en boîte mail. Les webhooks anciens ne sont pas recréés ; les e-mails de prévisualisation et autres messages hors tables suivies ne sont pas ajoutés. Une attente de préparation peut être normale avant clôture d’une synthèse. Les lignes/compteurs sont cohérents par requête mais pas un snapshot transactionnel unique entre les quatre sources. Une date de webhook n’est pas un SLA. Les filtres de jours sont UTC, pas une période métier locale. L’adresse des notifications acceptées demeure expurgée selon la règle existante. Ces évolutions complètent la PR #490, qui regroupe la mise en tableaux et leur fiabilisation ; aucune fusion ni livraison production n’est encore autorisée.

## Vérifications locales

- 15 tests support/DAL/page/SQL et rollback réussis.
- 40 tests de notifications et migrations/RLS réussis.
- 11 tests Chromium réussis (tableaux, filtres, incidents, 320/390/1280 px) ; la suite de quatre scénarios de fiabilité est rejouée après le dernier ajustement du résumé.
- Lint : zéro erreur, quatre avertissements préexistants hors périmètre. Build web et vérification de source réussis.
- Captures synthétiques mobile et desktop inspectées. Build production lancé brièvement pour le smoke : fixture 404, visiteur /support redirigé vers /connexion. Aucun envoi ni écriture de production.
