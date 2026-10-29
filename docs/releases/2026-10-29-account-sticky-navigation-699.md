# Mon compte : barre de navigation au défilement — #699

La barre d’enregistrement précédente était dans un conteneur sticky de hauteur
nulle, distinct des onglets non sticky. Elle pouvait recouvrir le formulaire,
tandis que les onglets sortaient de l’écran. Le test avant correction reproduit
leur disparition après 500 px de défilement.

Une seule barre regroupe désormais les onglets et Enregistrer, dans le flux du
formulaire. Elle s’ancre au scrollport `main`, sous l’en-tête MerchantShell ; le
décalage de -1,5 rem compense le padding supérieur existant de main. Sa hauteur
réelle réserve la place nécessaire. Aucun observer, traduction ou listener de
scroll n’est nécessaire. Le bouton du titre est retiré pour éviter le doublon.

Sur mobile, les onglets et l’action occupent deux lignes. Le fond opaque et la
bordure séparent les commandes du contenu. La grille des établissements utilise
explicitement une colonne réductible sur mobile : un nom long ne déborde plus
sur le côté de la page.

Le scénario `e2e/account-sticky-navigation.spec.ts` vérifie début/milieu/fin du
défilement, onglets et bouton visibles sans superposition, sauvegarde via API
interceptée, confirmation de changement de section et navigation clavier.
Tailles : 1280×720, 1280×600, 390×844, 320×740. Le tag @visual-1280 l’intègre
au contrôle CI existant. La suite d’affiliation couvre aussi la carte du compte
et son lien commun. Captures locales sous test-results/account-sticky-699.

Revue React : suppression de l’état et de l’effet d’observation devenus inutiles,
conservation des rôles tablist/tab/tabpanel, des validations et du handler de
sauvegarde existants. Pas de nouveau fournisseur ni dépendance. Aucun changement
de données, de permission, de tracking ou de schéma SQL.

Retour arrière : revert de la PR. Recette propriétaire : ouvrir Mon compte,
descendre jusqu’aux liens marketing, changer d’onglet, modifier puis enregistrer
une information. La vérification locale ne constitue pas un déploiement.

Vérifications locales : 12 scénarios navigateur distincts validés (4 navigation,
6 affiliation/compte, 2 tracking d’onglets). Le dernier passage ciblé revalide les
4 tailles et les 2 scénarios de tracking après le réglage mobile final. Captures
initiales et défilées inspectées, dont les 3 onglets entièrement visibles à
320 px. Lint SaaS : aucune erreur, 4 avertissements de navigation préexistants.
Vérification des sources, git diff --check et build SaaS final réussis.
