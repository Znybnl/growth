# Audit SFD et phase5 — #609

## Écarts identifiés et traités

| Exigence SFD | Écart des phases précédentes | Traitement |
| --- | --- | --- |
| §7 Budget | Pas de synthèse globale | Moyenne pondérée et projection100, recalcul immédiat |
| §7.3 Coûts manquants | Champ vide converti en zéro sans distinction | Champ facultatif, marqueur persistant, état incomplet et accès au lot |
| §7.4 Stocks | Risque de lire le budget comme une dépense exacte | Mention obligatoire et avertissement sur stocks limités |
| §13 Édition | Continuer l’édition ne quittait pas l’avertissement d’abandon | Retour au panneau sans perdre les saisies ; Abandonner restaure les valeurs |
| §14 Serveur | Le brouillon>100% pouvait passer l’API | Refus aussi en brouillon ; dépassement local autorisé comme décidé |
| §15 Règles | Saisies hors bornes corrigées silencieusement, explications manquantes | Erreurs explicites côté UI/serveur, descriptions et option100% accessible |
| §16 État vide | Pas d’accès direct aux compositions | Trois entrées, bon onglet initial et accès Mes lots |
| §17 Libellés longs | Pas d’avertissement dans le panneau | Avertissement non bloquant, limite120 existante inchangée |
| §12 Coût d’une composition | Unité ambiguë dans les cartes | Coût/participation et nom du profil rappelé lors du remplacement |
| Compatibilité de l’éditeur classique | Aperçu hors page à1280px, découvert par le test de coût | Aperçu sous le formulaire jusqu’à1600px, puis colonne bornée à300px |

La compétence frontend-design a guidé les blocs compacts, les raccourcis et
les états incomplets, en conservant le design system et sans nouvelle décoration.

## Calcul et données

La somme est calculée avant arrondi monétaire. Les chances0 ne contribuent pas,
PERDU n’est pas un lot. Total invalide : montants remplacés par des tirets.
Coût inconnu sur une chance positive : Estimation incomplète et montants non
annoncés comme complets. La configuration et publication ne dépendent pas de
la connaissance des coûts. Stocks/retirés n’altèrent pas cette projection.

Pas de migration : le JSON privé existant conserve le marqueur facultatif
`estimatedUnitCostKnown:false`. Le coût numérique0 reste compatible avec les
colonnes/RPC historiques. L’interface distingue ce support technique du vrai
zéro saisi. La DAL atomique associe le marqueur au nouvel ID persistant ;
relecture, éditeur classique, réutilisation et duplications le conservent.
Un coût confirmé retire le marqueur. Les anciens zéros restent inchangés :
impossible d’en déduire rétroactivement lesquels signifiaient « inconnu ».
Les KPI historiques restent hors refonte et ne sont pas recalculés à partir
de ce marqueur ; seul le nouveau budget annonce sa complétude.

Les limites de règles restent0–365jours de validité,1–365jours entre parties,
0–8760heures de disponibilité. Aucune règle de date/remise n’est changée ni
inventée pour les valeurs historiques. L’option100% n’est jamais activée par
une composition ; si le marchand l’active, les contrôles existants s’appliquent.

## Améliorations ultérieures à valider

- « Récemment utilisés » reste un tri par création de l’occurrence de lot,
  pas une date d’utilisation réelle : ajouter un suivi de réutilisation dédié
  exigerait une décision sur les données, et n’est pas dissimulé dans cette refonte.
- Les profils40/70/100 sont des propositions génériques à recetter. Un catalogue
  riche en réductions peut fournir plusieurs réductions ; une sélection éditoriale
  par métier serait plus qualitative qu’un classement par coût seul, mais doit
  être validée métier et ne doit pas inventer de lots ou conditions.
- Une éventuelle complétude des KPI historiques avec coûts inconnus demanderait
  un audit transversal des agrégats, distinct de cette estimation de configuration.

## Tests, recette et livraison

Commandes : `npm run test:prize-budget -w @okado/web-app`,
`npm run test:prize-compositions -w @okado/web-app`,
`npm run test:reusable-prizes -w @okado/web-app`,
`npm run test:marketing-action-library -w @okado/web-app`,
`npm run test:admin-campaigns -w @okado/web-app`,
`npm run lint -w @okado/web-app`, `npm run build -w @okado/web-app`,
`npm run smoke:prize-library -w @okado/web-app` et les six suites E2E
`wizard-prize-budget`, `wizard-prize-compositions`, `wizard-reusable-prizes`,
`wizard-prize-library`, `wizard-prize-audit`, `wizard-prize-composition`.

Recette : saisir3%à20€,17%à4€,30%à6€, vérifier3,08€/308€. Effacer un coût,
vérifier l’état incomplet, sauvegarder puis recharger ; renseigner0 et vérifier
qu’il est reconnu. Modifier puis annuler le coût. Tester jeu sans lot, stock
limité, dépassement local, règles hors bornes, puis roue et ticket publiés.
Les tests n’envoient aucun e-mail et n’écrivent aucune campagne réelle.

Résultats locaux :34 E2E phases1–5 réussis,1 contrôle supplémentaire de
l’éditeur classique à1280px et11 contrôles responsive/reflow de320 à1920px
réussis. Cinq tests budget/persistance,4 compositions,6 réutilisation,
8 bibliothèque d’actions/publication,40 administration,24 catalogue et
7 lectures/performance réussis. Build Next16.3.8 et8 smoke CSS compilés
réussis ; lint0erreur (4 avertissements préexistants hors périmètre),
ESLint ciblé et diffcheck propres. Captures budget complet/incomplet,
paramètres invalides et éditeur classique inspectées à1280×720/600 et
mobile320/390px. La relecture React confirme des calculs dérivés sans effet
de synchronisation ni lecture réseau supplémentaire, des champs associés
à leurs messages et une conservation des brouillons pendant les fenêtres.

Les premiers tests ont révélé deux sélecteurs devenus inexacts : le bouton
est Enregistrer sur un jeu publié, et les règles contiennent maintenant
deux cases (celle du lendemain est ciblée par son nom). Corrigés sans
augmenter les délais ni ajouter de retries. Le contrôle global de l’éditeur
classique a ensuite détecté puis confirmé la correction du débordement de
son aperçu à1280px ; aucune assertion de débordement n’a été retirée.

PR empilée sur #615, qui dépend de #613 puis #612. Pas de merge/production
sans validation propriétaire, retarget main et checks requis. Retour arrière :
revert sans SQL ni purge. Les lots restent ordinaires ; un ancien code ignore
le marqueur des coûts inconnus, ce qui est la limite fonctionnelle du rollback.
