# Compositions — #609, phase 4

## Périmètre et résultat

Implémentation de la SFD §12 et §21 phase 4, demandée par le propriétaire.
Troisième onglet Compositions dans la bibliothèque existante. Aucun catalogue
parallèle : les suggestions actives de l’activité/sous-secteur déjà chargé
alimentent les propositions. Aucun appel réseau supplémentaire.

Choix de proposition, non règles de tirage :

| Profil | Lots maximum | Total gagnant | Répartition indicative |
| --- | --- | --- | --- |
| Budget maîtrisé | 2 | 40 % | Poids décroissants favorisant le coût unitaire le plus faible |
| Équilibré | 3 | 70 % | Poids décroissants favorisant les petits avantages |
| Généreux | 4 | 100 % | Parts égales |

La sélection est classée par coût unitaire, ordre catalogue puis ID. Moins
de suggestions disponibles signifie moins de lots, jamais de lots inventés.
Les chances sont arrondies au centième de point ; le reliquat exact est alloué
au dernier lot pour conserver le total annoncé. PERDU vaut 100 moins ce total.
Les récompenses inactives, malformées, sans coût numérique valide ou libellées
PERDU sont exclues. Les mêmes libellés et descriptions sont regroupés.
Si aucune suggestion exploitable n’existe, afficher l’état vide, sans appliquer
de composition fictive ni ajouter d’élément hors activité.

Ces valeurs sont explicitement indicatives et modifiables, sans promesse
commerciale. Un coût à zéro est valide ; un coût absent n’est pas inventé.
Le coût moyen par participation est Σ(coût unitaire × chance / 100), pas un
coût par gagnant ni un budget global. Le simulateur reste en phase 5.

## Application et non-régressions

Le détail présente les lots, conditions proposées, chances, stock illimité et
coûts. Sur jeu vide, Utiliser cette composition applique et ferme la fenêtre.
Sur jeu rempli, confirmation Remplacer les lots obligatoire. Annuler ou changer
d’onglet ne modifie rien. Échap pendant confirmation revient au détail.

Application dans le brouillon uniquement : nouveaux IDs aléatoires courts,
conditions/achat requis via le mapping des suggestions existant, stock
illimité neuf. Aucune sauvegarde automatique ni écriture d’ancien jeu.
Le marchand peut modifier chaque lot puis sauvegarder par le parcours habituel.
Les paramètres globaux, dont 100 % gagnant, ne sont pas changés. Un avertissement
explique la composition partielle lorsque cette option est conservée.

## Risques, tests et livraison

Risque principal : remplacement des lots locaux. Confirmation explicite,
annulation testée et aucune écriture avant sauvegarde. Pas de migration,
nouvelle permission, API, RLS ou modification du moteur de tirage.

Commandes : `npm run test:prize-compositions -w @okado/web-app`,
`npm run test:reusable-prizes -w @okado/web-app`,
`npx playwright test e2e/wizard-prize-compositions.spec.ts
e2e/wizard-reusable-prizes.spec.ts e2e/wizard-prize-library.spec.ts
e2e/wizard-prize-audit.spec.ts e2e/wizard-prize-composition.spec.ts`,
`npm run lint -w @okado/web-app`, `npm run build -w @okado/web-app`,
`npm run smoke:prize-library -w @okado/web-app`, `git diff --check`.
Le smoke rend le vrai markup avec CSS compilés, sans portail ni données réelles ;
il complète les parcours interactifs, pas une preuve de déploiement.

Résultats locaux : 27 E2E réussis (phases 1–4), puis les 5 E2E phase 4
rejoués après la dernière réduction de densité des cartes. Les trois CTA de
détail sont entièrement visibles à 1280×720. Captures inspectées à 1280×720/600
et 320/390 px, contenu seul défilant, pied fixe. Quatre tests de génération/copie
et six tests d’isolation/réutilisation réussis. Build Next.js 16.3.8 réussi,
lint sans erreur (quatre avertissements préexistants hors périmètre), ESLint
ciblé sans avertissement, huit smoke CSS compilés réussis. Relecture React :
génération mémorisée sur le catalogue, états dérivés sans copie en effet,
IDs créés uniquement à l’application, focus détail/retour et onglets clavier,
aucune lecture supplémentaire ni nouveau cache partagé. Un timeout pendant
une retouche du serveur de développement a été suivi d’une suite complète
réussie sur version stabilisée, sans relever les délais ni ajouter de retries.

Recette : consulter les trois profils sur une activité avec suggestions,
ouvrir le détail, annuler un remplacement, confirmer puis personnaliser un lot.
Vérifier la part perdante et la sauvegarde. Rejouer sur jeu vide, puis 1280×600
et mobile. Aucun merge/déploiement sans validation propriétaire ; dépend de
la PR613 (elle-même basée sur PR612). La CI complète exige une cible main.

Retour arrière : revert de cette PR, aucune opération SQL. Les lots sauvegardés
via une composition sont des lots ordinaires et restent éditables.
