# Compositions sectorielles — #623

## Décision validée le 23 octobre 2026
Remplacer le lot fixe des nouveaux jeux par un choix explicite. Trois profils
éditoriaux issus du catalogue partagé actif, jamais une insertion automatique.
Équilibré est recommandé. Suggestions individuelles, Mes lots et création
manuelle restent disponibles. Les jeux existants et suggestions personnalisées
ne sont ni recalculés ni modifiés.

## Recettes
Les colonnes A/B/C/D désignent les suggestions standard exactes (IDs versionnés
dans `prize-composition-recipes.json`). Pas de tri par coût ni de rapprochement
approximatif par libellé. Une suggestion supprimée/désactivée/manquante invalide
uniquement les recettes qui en dépendent ; aucun remplacement inventé.
Les 40/70/100 % restent des propositions modifiables :
- Budget maîtrisé : A à25%, C à15% ; part perdante60%.
- Équilibré : A à35%, C à25%, D à10% ; part perdante30%.
- Généreux : B à50%, C à30%, D à20% ; part perdante0%.
- Une seule remise en pourcentage dans chaque recette. Un bon monétaire peut
  s’ajouter pour les secteurs où aucun cadeau matériel/prestation précis ne serait
  universel. Les coûts sont indicatifs, pas une promesse de dépense réelle.
- Stocks illimités initiaux, copies indépendantes, conditions préremplies.
  Le marchand doit préciser l’offre réellement disponible et ses exclusions avant
  publication ; pas de prestation spécialisée supposée chez tous les sites.
- Achat requis automatiquement lorsque la condition de la suggestion l’impose,
  comme pour les suggestions Beauté ; les nouvelles suggestions standard hors
  Beauté transmettent également leurs conditions. Les autres anciennes suggestions
  hors Beauté gardent leur mapping historique, sans réinterprétation de descriptions
  qui pouvaient n’être que des conseils marketing.

| Secteur / sous-secteur | A — petite remise | B — remise renforcée | C — complément | D — découverte / bon |
| --- | --- | --- | --- | --- |
| Beauté généraliste / multi-activité | -10% PRESTATION | -15% PRESTATION | OPTION OFFERTE | PRODUIT OFFERT |
| Coiffure | -10% COIFFURE | -15% COIFFURE | OPTION OFFERTE | PRODUIT DÉCOUVERTE OFFERT |
| Ongles | -10% ONGLES | -15% ONGLES | OPTION OFFERTE | PRODUIT DÉCOUVERTE OFFERT |
| Regard — cils & sourcils | -10% REGARD | -15% REGARD | OPTION OFFERTE | PRODUIT DÉCOUVERTE OFFERT |
| Massage & Spa | -10% MASSAGE | -15% MASSAGE | OPTION OFFERTE | PRODUIT DÉCOUVERTE OFFERT |
| Soins visage & corps | -10% SOIN | -15% SOIN | OPTION OFFERTE | PRODUIT DÉCOUVERTE OFFERT |
| Automobile | -5% PRESTATION | -10% PRESTATION | AVANTAGE COMPLÉMENTAIRE | BON DE 5 € |
| Retail | -5% ACHAT | -10% ACHAT | CADEAU OFFERT | BON DE 5 € |
| Sport | -10% ACTIVITÉ | -15% ACTIVITÉ | AVANTAGE COMPLÉMENTAIRE | BON DE 5 € |
| Services | -5% PRESTATION | -10% PRESTATION | AVANTAGE COMPLÉMENTAIRE | BON DE 5 € |
| Hôtellerie | -5% SÉJOUR | -10% SÉJOUR | AVANTAGE COMPLÉMENTAIRE | BON DE 10 € |
| Restauration | -10% COMMANDE | -15% COMMANDE | BOISSON OFFERTE | GOURMANDISE OFFERTE |

### Types de restauration (même catalogue, pas de nouvelle taxonomie)
Les recettes A/B/D sont communes. Le complément C dépend explicitement du type :
- Brasserie, Pizzeria, Bar à tapas, Cuisine traditionnelle, Cuisine du monde,
  Bistrot et Food court : boisson sans alcool offerte avec une commande payante.
- Gastronomique, Boulangerie, Coffee shop : boisson chaude offerte avec une
  commande payante.
- Restauration rapide, Glacier, Dark kitchen : supplément offert avec une
  commande payante.
- Type vide ou inconnu : recette Restauration générale (boisson sans alcool).
Les boissons et gourmandises sont sélectionnées par le marchand, pas une boisson
alcoolisée imposée. Une gourmandise n’est pas nécessairement un dessert de restaurant.

### Contextes anciens ou absents
Beauté sans sous-secteur et anciennes catégories ambiguës : généraliste.
Alias Massage & spa normalisé. Secteur non renseigné/inconnu : aucune composition
automatique, création manuelle/suggestions disponibles. On ne change ni le profil
du marchand ni les anciennes catégories en base pour proposer une recette.

## Données et déploiement
**Migration SQL obligatoire avant recette Vercel / mise en production :**
`supabase/migrations/20261023090000_sector_prize_compositions_623.sql`.

35 ajouts seulement :9 suggestions Beauté (4options et5produits pour5spécialités),
20 pour Automobile/Retail/Sport/Services/Hôtellerie,6 Restauration.
Les suggestions Beauté standard déjà adaptées sont réutilisées. Les offres
spécialisées restent disponibles individuellement. Aucun UPDATE/DELETE du catalogue,
aucune écriture dans merchants/campaigns/prizes/leads/draw_sessions.
ON CONFLICT(id) DO NOTHING préserve même une entrée déjà personnalisée sur cet ID.

Manifest privé des insertions effectives, RLS activée, droits public/anon/authenticated
révoqués. Pas de changement aux permissions du catalogue ou à l'API existante.
Rollback fourni : ne retire que les insertions effectives encore strictement
identiques, et préserve les suggestions modifiées après migration. Ne modifie
jamais les copies déjà enregistrées dans un jeu. Rollback applicatif d’abord ;
le retour arrière Vercel ne retire pas les suggestions SQL.

Appliquer uniquement sur cible autorisée après sauvegarde et suivre
`MIGRATION_RELEASE_RUNBOOK.md`. La migration n’est pas exécutée en production
par cette tâche. En son absence, les recettes non complètes restent indisponibles,
la création manuelle et les suggestions existantes restent utilisables.

## Risques / vérifications
Recettes déterministes plutôt qu'une optimisation automatique de coût.
Les chiffres de coûts sont des valeurs de catalogue à vérifier par le marchand.
Un catalogue enrichi n’impose ni prestation, ni tarif, ni règle de participation.
Aucune nouvelle API, secret, dépendance ou permission ; aucun tirage, gain,
notification ou retrait changé.

Tests : tous les secteurs et sous-secteurs,13types de restauration, total exact,
coût pondéré, données absentes/inactives/invalides, contexte inconnu, copies
indépendantes/conditions/achat, PostgreSQL isolé (idempotence, RLS, conservation
et rollback). E2E vrai Wizard/cadre marchand avec API interceptées : création
roue/ticket/admin, choix explicite, payload sauvegardé, états erreur/vide,
remplacement et annulation des jeux existants, captures1280×720/600 et320/390px.
Pas d’écriture métier réelle ni e-mail durant ces vérifications.

## Recette propriétaire
Créer un jeu, atteindre Les lots : aucun lot fixe, trois profils, Équilibré
recommandé. Consulter puis appliquer, personnaliser conditions/coûts et sauvegarder.
Vérifier un institut Regard, un restaurant/coffee shop et un autre secteur après
migration ; ouvrir un ancien jeu et constater que ses lots n’ont pas changé.

## Résultats de vérification
- 42 E2E réussis en une exécution finale avec le serveur Next16.3.8/Turbopack,
  incluant les sept nouveaux scénarios et les phases1à5 précédentes.
- 29 tests compositions/migration réussis (25contextes et4tests transversaux),
  24 catalogue Beauté,5budget,40administration et6réutilisation réussis.
- Lint0erreur,4avertissements préexistants hors périmètre ; ESLint ciblé propre.
- Build Next16.3.8 réussi ;8smoke avec CSS compilés réussis ; verify:source
  et git diffcheck réussis. Captures inspectées à1280×720/600 et320/390px.
- Les premiers essais sous webpack ont montré des incidents intermittents de
  chargement/hydratation du serveur dev. Non reproduits dans l'exécution finale
  complète après redémarrage avec le bundler par défaut ; les assertions
  d'erreurs navigateur n'ont pas été retirées. Le test clavier attend le focus
  réel de la popin avant Échap, sans délais supplémentaires ni retries ajoutés.
- Le premier build a croisé le redémarrage du serveur dev et ses types générés ;
  le build final a réussi serveur dev arrêté. Aucun cache utilisateur supprimé.
- Compétence frontend-design : cartes lisibles selon leur largeur de conteneur,
  lots/chances visibles et recommandation discrète ; relecture React :
  valeurs dérivées sans effet d'initialisation, aucun ajout réseau, IDs ARIA
  distincts entre aperçu inline et bibliothèque, focus et copies indépendantes.

Ces preuves sont locales : API navigateur interceptées, DAL/migrations testées
sur données fictives. Elles ne certifient ni une migration Supabase réelle ni
un déploiement ; validation propriétaire, migration et checks CI restent requis.

## Relecture de la PR #624

Deux améliorations ciblées après la demande de relecture :

- La réponse réseau n'est plus simplement considérée comme typée. Une enveloppe
  incorrecte, une ligne nulle, un champ utilisé par le rendu de mauvais type ou
  un identifiant dupliqué déclenche l'état d'erreur récupérable existant. Un
  vrai tableau vide reste un catalogue vide. Aucune donnée n'est corrigée,
  remplacée ou supprimée silencieusement. Le contrat suit la projection actuelle
  de `toPrizeSuggestion`, notamment le sous-secteur absent omis par l'API.
- Les conditions d'utilisation sont identifiées dans le détail, avec un badge
  d'achat requis dérivé de `prizeFieldsFromSuggestion`, exactement comme lors
  de la copie. La compétence frontend-design a guidé ce repère discret et
  lisible sans refonte des cartes ; aucun changement de condition ni de règle.

Deux tests unitaires et deux scénarios navigateur supplémentaires couvrent la
validation, l'erreur, le réessai, l'accès à la création manuelle et l'absence
d'ajout automatique. Captures du détail, y compris après défilement à 320 px,
dans `apps/web-app/test-results/review-624-final`.

Validation de cette relecture : 44 E2E réussis en une exécution (7 suites),
31 tests compositions/contrat/migration et 24 tests catalogue Beauté réussis.
Lint sans erreur (4 avertissements antérieurs hors périmètre), build Next et
TypeScript réussis, verify:source et diffcheck réussis. Captures du détail
inspectées : badge et conditions lisibles, pied d'actions accessible,
défilement interne sans débordement horizontal. Le premier essai unitaire a
détecté que la fixture SQL exportait un sous-secteur null, contrairement à
l'API qui l'omet : les fixtures réseau reproduisent désormais la projection
serveur, sans changement de stockage ni relaxation du contrat applicatif.

La migration reste inchangée et à jouer avant la validation complète. La CI
de la première version échoue sur l'audit des dépendances Next.js/DOMPurify,
préexistant à cette PR : aucun audit contourné, aucune exception ajoutée,
aucune mise à niveau de dépendance ou mise en production dans cette relecture.
