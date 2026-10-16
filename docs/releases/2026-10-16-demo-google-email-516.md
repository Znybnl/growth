# Identités, roue et parcours Google/e-mail de la démo — #516

## Accord et périmètre

Le propriétaire valide le 16 octobre 2026 la proposition de refonte après
revue du site publié : [issue #516](https://github.com/Znybnl/growth/issues/516).
L'accord concerne la démonstration partagée de la landing et ses variantes
restaurant/beauté, pas les jeux réels ou la configuration des fournisseurs.

## Résultat utilisateur

- Monogrammes et signatures typographiques propres aux enseignes fictives ;
  pas d'étoile Okado utilisée comme logo marchand.
- Huit secteurs et libellés agrandis ; géométrie calculée depuis le nombre de
  secteurs, bouton centré et rotation cohérente avec le premier lot déterminé.
- Écran Google simplifié explicitement simulé, sans compte, publication,
  présélection ou commentaire demandé. Radios de une à cinq étoiles natifs,
  accessibles au clavier ; retour au jeu possible sans note.
- Aucun effet du choix Google ou de sa note sur le gain.
- Formulaire facultatif expliquant la finalité e-mail et CTA « Recevoir mon
  gain » ; confirmation du gain, réception par e-mail et spams explicites.
- Rappel permanent de simulation et absence d'envoi réel ; aperçu d'e-mail
  facultatif avec identité/adresse fictives fixes et QR illustratif non utilisable.
- Explication contextuelle côté commerce ; statistiques d'exemple inchangées.

## Données et limites

Note, prénom et e-mail restent dans l'état React local et sont effacés au
redémarrage/démontage. Aucun appel Google ou service d'e-mail, aucune base,
permission, migration, authentification, probabilité ou attribution réelle.
L'aperçu ne réutilise pas les coordonnées saisies. Aucun nouveau traitement ou
événement analytics ; les appels existants gardent leurs propriétés et gardes
de consentement. Le QR n'encode aucun lien ni capacité de retrait.

Cette simulation ne certifie pas les jeux marchands. Google interdit les
contreparties à un avis et la sollicitation sélective de notes positives ;
le caractère facultatif ne garantit pas à lui seul la conformité de toute
campagne. [Source officielle](https://support.google.com/contributionpolicy/answer/7400114?hl=fr).

## Vérifications et recette

Lint/build de la landing, vérification de source et suites navigateur complètes
à 320/390/768/1440 px, tests isolés du consentement. Recette avec données
synthétiques, refus de mesure et interceptions analytics. Le build local utilise
une clé de fixture : ne pas le publier, Vercel reconstruira depuis le commit.
Les résultats finaux sont consignés dans la PR.

Résultats locaux : **68/68 tests navigateur** sur les quatre tailles d'écran,
puis **20/20 scénarios démo rejoués sur le build final** après les deux finitions
de texte/typographie ; **4/4 tests isolés de consentement**. Lint, build (27 pages),
source/UTF-8 et diff vérifiés. Captures des sept états relues en 320/1440 px,
puis des écrans Google/e-mail en 390/768 px. Rotation réelle contrôlée à
−22,5° à l'arrêt, soit le centre du premier secteur sous le repère ; titres
de panneau visibles sous l'en-tête fixe à 320 px. Revue React : état local,
radios natifs, focus sans réinitialisation au choix d'une note, nettoyage du
timer et animation du conteneur SVG ; aucune dépendance ajoutée.

Recette propriétaire : tester l'accueil et la variante beauté, sans Google puis
avec zéro/une/cinq étoiles ; confirmer sans coordonnées, ouvrir et refermer
l'exemple d'e-mail, puis redémarrer. Vérifier l'identité des enseignes et la
lisibilité des huit secteurs, de la réception par e-mail et du caractère fictif.

## Risques et retour arrière

Risque limité au composant marketing partagé : focus, responsive, radios et
géométrie de roue. Panneaux secondaires extraits, CSS local, état non persistant.
L'avis Google est une illustration et non une validation juridique ou une copie
garantie de l'interface Google. PR et validation propriétaire avant merge et
production ; retour arrière par revert, sans action sur les données.
