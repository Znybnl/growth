# Participations distinctes des scans et contacts — #496

## Résultat

Une partie commencée compte même en cas de perte anonyme ou d'abandon du formulaire gagnant. Le scan et le contact restent des mesures distinctes. Le premier grattage est enregistré par une route vérifiée ; une préparation de ticket sans grattage n'est pas une partie.

## Migration obligatoire avant déploiement

`supabase/migrations/20261013120000_participation_metrics_496.sql` : vue privée des preuves existantes, trois RPC privées de comptage/enregistrement, index de session, remplacement compatible des deux RPC d'agrégation existantes. Aucun UPDATE/DELETE des joueurs, gains, stocks ou campagnes ; aucun envoi ni purge. Les signatures existantes sont conservées. Aucun nouveau fournisseur, cron, forfait ou secret à configurer : signature avec la configuration serveur existante.

Avant application, consigner sauvegarde et SHA candidat, contrôler la cible autorisée et suivre le runbook des migrations. La migration de production n'est pas jouée par les tests isolés. Jouer puis vérifier les objets privés et RPC sur la cible avant de livrer le code dépendant.

## Recette propriétaire

1. Jeu de test roue sans collecte avant jeu : noter scans/participations/contacts, ouvrir sans jouer (scan seulement), puis perdre (participations +1, contacts inchangés).
2. Ticket : cliquer Jouer ne compte pas encore ; gratter compte +1. Plusieurs gestes, retries et formulaire ne donnent pas une deuxième partie.
3. Gain : vérifier formulaire, e-mail et retrait inchangés ; abandonner un formulaire ne supprime pas la partie.
4. Comparer Accueil, Campagnes, Résultats, courbes et sélecteur ; vérifier contacts/opt-ins séparés, conversion et coût par participation.
5. Tester la preview sans variation des indicateurs ni du stock, puis changer d'établissement et consulter la vue multisite.

## Limites explicites

- Les anciennes parties sans événement/contact finalisé n'ont pas une preuve suffisante ; pas de reconstitution automatique des sessions abandonnées. Les événements historiques sans session/contact gardent leur identifiant d'événement, faute de clé de dédoublonnage plus précise.
- Les dates des graphiques restent UTC, désormais avec jours calendaires complets.
- Le client de grattage retente les échecs transitoires avec la même session et keepalive. Une coupure définitive avant réception serveur ne peut pas être certifiée comme un jeu enregistré. La signature et la session expirent à 15 minutes, comme la réservation existante.
- Les listes/CSV restent des contacts ; Pilotage annonce « contacts collectés », pas une fausse liste de toutes les participations.
- Les agrégats ne lisent pas les archives après le cycle de conservation existant. Aucun changement de conservation ni création d'un compteur illimité.

## Retour arrière

Revenir d'abord à l'ancien déploiement applicatif, puis, après arrêt des clients dépendants, appliquer `supabase/rollback/20261013120000_participation_metrics_496.sql`. Il restaure les définitions d'agrégation précédentes et retire uniquement les nouveaux objets ; les événements de jeu collectés restent conservés. Un rollback Vercel seul n'annule pas le SQL. Pendant la fenêtre additive, l'ancien code continue de fonctionner mais conserve ses anciens libellés/calculs de contacts.

## Preuves

Tests SQL/RLS/rollback PGlite, vrais handlers avec base simulée, capacités falsifiées/étrangères/expirées/preview, client sans coordonnées/reprise. Navigateur Chromium sur fixture développement sans écriture : 320/390/1280 px. Lint et build requis ; la production reste non modifiée jusqu'à validation du propriétaire.
