# Wizard, dernières campagnes et contrôle visuel 1280 px — #576

## Décision propriétaire et périmètre

Le 18 octobre 2026, le propriétaire demande de traiter les recommandations
de #576 et d'ajouter une vérification visuelle à 1280 px lors de toute création
ou modification d'écran. Le formulaire est prioritaire ; pas de zoom global ni
de modification des tailles de texte ou espacements du jeu enregistré.

Les changements concernent le Wizard, le choix de jeu partagé, le tableau des
dernières campagnes de l'accueil (extension demandée le même jour), les tests
et les consignes de livraison. Menu global, jeu public, autorisations, API de
sauvegarde, lots et données en base inchangés. Pas de migration.

## Dernières campagnes de l'accueil — extension propriétaire

Le tableau existant n'était visible qu'à partir de 1536 px (`2xl`). À 1280 px,
les campagnes étaient présentées en cartes, avec leurs statistiques sur
plusieurs lignes, malgré une largeur utile suffisante pour un tableau.

`DashboardRecentCampaigns` est maintenant partagé entre la vraie page serveur
et la fixture de développement. Il reçoit la liste déjà filtrée et triée par
la page ; aucune nouvelle lecture, formule, pagination ou transformation des
KPI. Les états actif/pause/stock épuisé gardent leur priorité et leurs libellés.

Le CSS local utilise la largeur du contenu de la carte : tableau dès **760 px
utiles**, cartes en dessous. À **1280 px**, le vrai menu et les marges laissent
984 px à la section, soit environ **934 px** au tableau. Six colonnes présentent
sur une ligne le nom/statut, le type de jeu, les scans, les participations, la
conversion et les actions. Les chiffres restent intégraux, alignés à droite ;
le nom long peut être abrégé visuellement, son texte intégral restant dans le
DOM accessible et dans l'infobulle native. Les tailles de police sont conservées.

Le tableau a de vrais en-têtes HTML et les noms servent d'en-têtes de ligne.
La limite verticale de 380 px et les en-têtes fixes sont conservés ; le dernier
jeu reste accessible au défilement. Le menu Modifier/Données/Prévisualiser
réutilise le composant existant. Sous le seuil, les cartes gardent tous les
indicateurs et affichent les noms longs sur plusieurs lignes.

### Preuves et recette de l'accueil

`e2e/dashboard-responsive.spec.ts` : **3 scénarios réussis**, dont 2 taggés
`@visual-1280` ; les **5 tests taggés de la PR** passent ensemble. La fixture
emploie le vrai MerchantShell et le vrai tableau, avec six campagnes fictives,
les deux mécaniques, les trois statuts, un jeu sans lot, un nom long, des
compteurs à huit chiffres et une conversion supérieure à 100 % conservée.
L'état vide est aussi couvert. La fixture illustre le contexte de l'accueil ;
elle ne reproduit pas le graphique, les contacts et les stocks de la page réelle.

À 1280×720 et 1280×600 : une ligne par campagne (hauteur ≤64 px), aucun chiffre
ou en-tête tronqué et aucun défilement horizontal interne. Menu au clavier,
liens propres à la campagne et retour du focus contrôlés. À 320/390/768/1024 px :
cartes accessibles et menu contenu dans le viewport ; à 1120/1920 px : tableau.
Redimensionnement, dernier jeu et en-têtes fixes contrôlés ; aucune erreur JS.

Captures `accueil-campagnes-1280x600.png`, `accueil-campagnes-1280x720.png`,
`accueil-actions-1280x600.png`, `accueil-actions-1280x720.png` et
`accueil-campagnes-vide-1280x720.png` jointes au rapport Playwright et inspectées.
Captures complémentaires 320/390/1120 px inspectées localement.
Les nouvelles captures taggées rejoignent l'artefact CI `visual-1280` existant.

Après cette extension : **21 tests d'indicateurs réussis**, lint sans erreur
(4 warnings préexistants), build/TypeScript et contrôle source vérifiés.
Serveur compilé : accueil anonyme **307 /connexion**, fixture **404**, connexion
**200** ; serveurs locaux dédiés arrêtés après les contrôles.
Le premier lancement du nouveau test ciblait deux `span[title]` (statut et
nom) : le sélecteur du nom a été précisé avant la reprise réussie de la suite.
Toutes les données sont fictives et les API/sorties HTTPS interceptées.

Recette propriétaire : Accueil à 1280 px, lire une campagne sur une ligne,
ouvrir son menu, vérifier un nom long au survol, puis accéder au dernier jeu
par défilement. Sur téléphone, vérifier le passage aux cartes et les actions.

## Mise en page retenue

La largeur utile est celle du Wizard **après déduction du menu et des marges**,
observée via `ResizeObserver` :

- sous 900 px : progression avec sélecteur accessible, formulaire pleine
  largeur, bouton **Voir l’aperçu** dans son en-tête ;
- 900–1199 px : progression horizontale compacte ; formulaire et colonne
  d'aperçu de 240 px si la hauteur disponible le permet ;
- à partir de 1200 px : progression verticale de 190 px, formulaire, aperçu
  dans une colonne de 280 px si la hauteur le permet.

La hauteur disponible tient compte des vrais en-têtes, actions, progression et
viewport de défilement. Si le téléphone ferait moins de 200 px de large, il est
accessible dans une popin au lieu de garder une colonne vide ou une miniature
illisible. Le scroll ne déclenche pas de changement de colonnes. Le cadre de
référence **300×550** et son contenu restent inchangés : on ajuste ensemble
la transformation et l'espace réellement réservé dans la page.

Un seul rendu live est monté : dans la colonne ou dans la popin, jamais les
deux simultanément. L'aperçu utilise le brouillon courant sans l'enregistrer ;
la prévisualisation serveur et le QR de test existants restent distincts.
La fermeture au clavier et le retour du focus réutilisent `DialogShell`.

Les cartes Roue/Ticket ont une largeur minimale cible de 220 px ou occupent
toute la ligne. Leur illustration suit leur largeur. Les trois champs des
lots utilisent un auto-fit avec minimum 140 px, puis deux/une colonnes selon
leur conteneur. Nom, conditions et règles métier inchangés. Le formulaire a
20 px de padding sur ordinateur et ses actions de pied se replient librement.
L'en-tête compact est moins haut et la barre supérieure dupliquée reste sur
grands écrans ; Retour, Continuer, enregistrement et publication conservent
leurs actions existantes dans le formulaire.

## Mesures locales

Avant : reproduction de #576 sur main `fcd230b`, avec espace du menu/marges
simulé. Après : vrais composants **MerchantShell + Wizard**, données fictives,
API interceptées, navigateur Chromium, zoom CSS nominal. Les différences de
montage sont explicites ; pas de mesure de performance ou session de production.

| Fenêtre CSS | Formulaire avant | Formulaire après | Carte avant | Carte après | Aperçu après |
| --- | ---: | ---: | ---: | ---: | --- |
| 1280×600 | 336 | 984 | 128 | 464 | Popin à la demande |
| 1280×720 | 336 | 984 | 128 | 464 | Popin à la demande |
| 1366×768 | 422 | 810 | 171 | 377 | ~206 px, entier |
| 1440×900 | 496 | 884 | 208 | 414 | 240 px |
| 1536×864 | 592 | 730 | 256 | 337 | ~278 px |
| 1920×1080 | 976 | 1114 | 448 | 529 | 280 px |

Le mode aperçu peut différer pour une création, un nom long ou d'autres barres
d'actions : la décision se fonde sur l'espace réellement mesuré, pas un profil
de résolution figé. Les mesures ci-dessus concernent la fixture d'édition.

## Vérification

```powershell
npm run test:visual-1280 -w @okado/web-app
npm run lint:web
npm run build:web
npm run verify:source
```

Avec le serveur local dédié de test, depuis `apps/web-app` :

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3340'
npx playwright test e2e/wizard-responsive.spec.ts e2e/beauty-catalog.spec.ts e2e/template-rendering-511.spec.ts e2e/marketing-action-library.spec.ts e2e/wizard-options-551-553.spec.ts --project=chromium
```

Le helper `selectWizardStep`
permet aux suites existantes d'utiliser soit le sélecteur compact, soit les
boutons de progression, avec les mêmes règles d'accès. Rejouer aussi le
catalogue et les rendus de templates modifiés indirectement.

Les captures initiales ont fait apparaître un en-tête encore trop haut à
1280×600 : une seconde itération a réduit la densité de cet en-tête et déplacé
le bouton d'aperçu dans le formulaire. Les captures finales sont attachées au
rapport Playwright. Elles doivent être inspectées : leur génération seule ne
vaut pas validation visuelle.

Résultats locaux : **11 tests responsive**, **69 scénarios navigateur de
non-régression** (catalogue, actions, couleurs/rendus et polices), **37 tests
administratifs et 5 tests des actions initiales** validés. Dans le lancement
global, une assertion du nouveau scénario d'erreur ciblait trois alertes
légitimes : le sélecteur a été précisé, puis toute la suite responsive a été
rejouée avec succès. Pas de modification du comportement métier des erreurs.
Le lancement **CI=true**, sans serveur externe, démarre le serveur de test et
valide les **3 tests taggés @visual-1280**. Captures des cartes, champs, erreurs,
actions et aperçu courant inspectées. Lint sans erreur (4 warnings de navigation
préexistants), build/TypeScript, contrôle UTF-8 et `git diff --check` réussis.
Serveur compilé : fixture de test **404**, Wizard sans session **307 /connexion**,
page de connexion **200**. Les serveurs locaux dédiés sont arrêtés après contrôle.
La recette est locale/synthétique, pas une sauvegarde d'un marchand en production.

La nouvelle obligation 1280 px est inscrite dans `AGENTS.md`, la stratégie de
test et la checklist de livraison. La CI exécute les tests taggés et archive
les captures ; elle ne découvre pas toute seule les écrans à couvrir lors
d'une évolution future. Chaque PR d'interface doit adapter sa couverture.

## Recette et retour arrière

À 1280×600 puis 1280×720 : choisir Roue/Ticket, modifier titre/lot, ouvrir
l'aperçu, fermer par Escape, retrouver le brouillon ; vérifier en création,
édition et assistance sans publication réelle. À 1366×768 et grand écran,
vérifier l'aperçu cadré puis **Agrandir**. Redimensionner sans changer les
valeurs, conserver les contrôles des erreurs/publication et les choix d'actions.
Contrôler mobile et navigation clavier. Aucun test ne doit publier un jeu réel.

Retour arrière : revert de la PR ; aucune donnée à restaurer. Le merge et la
production nécessitent la validation explicite du propriétaire.
