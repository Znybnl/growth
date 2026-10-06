# Catalogue Beauté — issue #466

## Périmètre approuvé le 6 octobre 2026

Six spécialités et 61 suggestions fidèles aux tableaux de [l'issue #466](https://github.com/Znybnl/growth/issues/466). Aucune normalisation collective des probabilités. À l'ajout, les deux éditeurs préremplissent les conditions et cochent l'achat requis si une prestation payante ou une nouvelle pose est imposée. Une réduction à tarif normal, un lot autonome ou un produit offert ne déclenche pas cette case. Le marchand peut ajuster les valeurs.

Ne modifier aucun lot de jeu existant ni suggestion personnalisée. Garder les anciennes catégories ambiguës seulement si référencées, sans reclassifier les établissements.

## Audit préalable, en lecture seule

`cd apps/web-app` puis `node scripts/audit-beauty-catalog.mjs`. Les variables de connexion sont chargées sans être affichées. Résultat du 6 octobre : 7 suggestions Beauté standard inchangées, 0 suggestion personnalisée détectée ; 3 établissements utilisent « Institut & soins », 2 utilisent « Ongles & cils ». Les deux catégories doivent donc être conservées sur cette base.

La migration vérifie à nouveau les références au moment de son exécution : une suggestion historique personnalisée constitue aussi une utilisation, même masquée. L'UI offre six choix aux nouveaux profils, et conserve uniquement la catégorie historique déjà enregistrée dans le profil en cours.

## Migration, après validation du propriétaire

- Fichier : `supabase/migrations/20261006_beauty_catalog_466.sql`.
- Précondition : migrations catalogue de juillet 2026 et sous-secteurs du 24 septembre présentes. Exécuter la migration versionnée, jamais les anciens scripts de seed (qui réécrivent les suggestions).
- Transaction avec verrou court des tables de profil/catalogue : sauvegarde privée des seules lignes standard identiques à la référence, suppression seulement si leur état est toujours identique à la sauvegarde, élargissement des contraintes, insertion de 61 identifiants stables avec `ON CONFLICT DO NOTHING`.
- Aucune modification des lignes `merchants`, `campaigns`, `prizes`, gains, stocks, contacts ou conditions enregistrées. Les données personnelles ne sont ni lues ni copiées par cette migration. Les autres secteurs restent intacts.
- `beauty_catalog_466_backup` : RLS activée, aucun droit pour public/anon/authenticated, aucune policy publique. La table conserve les snapshots du catalogue pour récupération.
- Conserver l'alias `Massage & spa` pour les profils et suggestions historiques ; il se lit comme `Massage & Spa` et n'est harmonisé dans un profil que lors de sa sauvegarde explicite.
- Déployer l'application compatible **avant** la migration. Sans migration, elle conserve le catalogue existant ; les nouvelles catégories ne doivent pas être enregistrées tant que leurs contraintes ne sont pas migrées. La disponibilité locale ne prouve pas une livraison production.
- Après migration : compter les 61 identifiants `ps-beauty-466-*`, vérifier les six nombres 7/10/12/11/10/11, le catalogue d'un compte Beauté de test et une campagne existante. Les personnalisations éventuellement conservées s'ajoutent à ces comptes.

## Retour arrière

`supabase/rollback/20261006_beauty_catalog_466.sql`, uniquement sur validation du propriétaire : supprime les nouvelles suggestions **encore identiques** à leur référence et restaure les snapshots historiques sans écraser une ligne présente. Conserve les profils, nouvelles catégories, éventuelles personnalisations et la sauvegarde privée. Idempotence testée.

Ne pas supprimer les nouvelles catégories des contraintes après qu'un profil les a choisies, ni remettre automatiquement un ancien binaire qui ne les comprend pas. Préférer un correctif en avant ou revenir seulement sur le catalogue en gardant le code compatible. Les suggestions modifiées après livraison restent présentes volontairement.

## Vérifications et recette

- `npm run verify:source`, `npm run lint:web`, `npm run build:web`.
- `npm run test:beauty-catalog -w @okado/web-app` : valeurs, sélection/repli/alias, API et session, migration PostgreSQL PGlite réelle, idempotence, RLS, données préservées et retour arrière.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/beauty-catalog.spec.ts --project chromium` depuis `apps/web-app` : vrais composants avec réponses API synthétiques, écritures bloquées, wizard/classique, conditions modifiables, profils, concurrence et 320/390/1280 px. Fixture de développement uniquement, 404 en production.
- La vérification React contrôle le partage du chargement, l'annulation via AbortController, la portée établissement/activité, les dépendances primitives et l'absence de transformation des lots existants.

Recette propriétaire après migration : choisir une spécialité dans Mon compte, ouvrir Suggestions de lots dans les deux éditeurs, ajouter un supplément conditionné puis une réduction non conditionnée ; vérifier coût/probabilité/condition/case d'achat, les modifier puis enregistrer un brouillon de test. Recharger et vérifier les valeurs. Ouvrir une campagne antérieure et confirmer que ses lots/stocks n'ont pas changé. Vérifier la gestion admin du catalogue et un compte d'un autre secteur. Ne pas utiliser un jeu marchand réel pour ces essais sans autorisation.

À ce stade, aucune migration, sauvegarde de campagne ni publication de production n'a été effectuée. Validation propriétaire requise avant merge et déploiement.

### Résultats locaux du 6 octobre 2026

15/15 tests catalogue/migration/rollback, 22/22 tests navigateur et 37/37 tests de non-régression administrateur réussis. Build et vérification UTF-8/source réussis. Lint : 0 erreur, 4 avertissements préexistants hors périmètre (`window.location.assign` dans les composants de compte/connexion). Captures 320/390/1280 px inspectées ; aucun débordement horizontal du catalogue ni erreur JavaScript dans ces contrôles. Le build de production confirme la barrière 404 de la fixture.
