# Stratégie de test — Okado

L'objectif est de détecter les régressions importantes sans transformer le projet en processus lourd. Une livraison est validée sur le comportement, pas sur une revue de code manuelle par le propriétaire.

## Règle simple

1. L'agent exécute les contrôles adaptés au changement.
2. L'agent explique en langage clair ce qui a changé, les risques et les résultats.
3. Pierre-Henri BRUNELLE réalise seulement le test fonctionnel indiqué lorsque le changement est visible ou sensible.
4. Le merge et la production attendent son accord explicite.

## Contrôles automatisés existants

| Contrôle | Usage |
|---|---|
| `npm run verify:source` | Vérifie les fichiers critiques et l'encodage. |
| `npm run lint:web` / `npm run lint:landing` | Vérifie la qualité statique de l'application touchée. |
| `npm run build:web` / `npm run build:landing` | Vérifie que l'application touchée se construit. |
| `npm run smoke:critical` | Exerce les flux critiques avec un compte et un environnement explicitement configurés. À lancer uniquement avec l'autorisation adaptée, car il crée puis nettoie des données de test. |
| `npm run smoke:security` | Vérifie les garde-fous de sécurité prévus par le projet. |
| `npm run test:e2e` | Lance les tests navigateur Playwright du SaaS. Le serveur local démarre automatiquement, sauf si `PLAYWRIGHT_BASE_URL` désigne une URL de test explicite. |
| `npm run test:reward-email -w @okado/web-app` | Vérifie le modèle recommandé, les anciens standards, les personnalisations, conditions/dates, QR et code de secours, échappement HTML et lien RDV conditionnel. Contrôle le rendu en 680/390/320 px sans envoyer d’e-mail ni écrire en base. |
| `npm run test:gain-notifications -w @okado/web-app` | Vérifie migrations/RLS dans PostgreSQL isolé PGlite, les vraies routes et le worker avec dépendances simulées, sélections simultanées, répétition volontaire des gains dans chaque canal, activation non rétroactive et désactivation isolée, dates d’expiration/statut récupéré, périodes locales, listings complets et reprises idempotentes. Inclut cron quotidien, reprise indépendante avant 23 h, maintenance désactivée par défaut sans purge, traitement au-delà de 20 parties, budget et limite de volume sans troncature. Aucune écriture de production ni e-mail réel. |
| `npm run test:landing` | Après `npm run build:landing`, vérifie les logos, CTA, FAQ et liens du site marketing sur desktop, mobile 390 px et mobile 320 px. Lance le site construit sur le port 3200, sauf si `PLAYWRIGHT_BASE_URL` est renseignée. Aucun compte ni écriture métier. |

La CI GitHub exécute la vérification de source, le lint et le build de l'application web, ainsi que le lint et le build du site marketing, pour les PR et `main`.

La [matrice des parcours critiques](TEST_MATRIX.md) relie chaque parcours bloquant à sa preuve actuelle et indique les tests restant à ajouter.

## E2E : mise en place progressive

### Notifications de gains — #473

Le retour propriétaire du 6 octobre ajoute les tests SQL de lecture des noms, stabilité et expurgation des snapshots privés ; échappement HTML, noms absents/partiels et compatibilité des anciens jobs ; objets datés aux changements de mois/année et parties numérotées. Le lien de préférences est testé sans session, sans droit sur le site et en multisite : cookie de site autorisé, redirection interne fixe et aucune mutation de préférence. Les rendus doivent montrer les noms et le pied de page, sans logo Okado.

`npm run test:e2e -w @okado/web-app -- gain-notification-settings.spec.ts` teste le composant réel dans une fixture uniquement développement, à 320/390/1280 px : défaut désactivé, choix simultané des quatre canaux, sauvegarde, rechargement, isolation par établissement et erreurs sans faux succès. Les API de préférences sont interceptées ; la fixture n’accorde aucun accès et renvoie 404 en production. Les droits des vraies routes sont vérifiés séparément par les tests serveur.

`node --experimental-strip-types scripts/preview-gain-notifications.mjs` depuis `apps/web-app` génère le HTML exact des quatre modèles avec données fictives et 12 captures à 680/390/320 px, sans Resend ni Supabase. Inspection visuelle requise après génération ; compatibilité Gmail/Outlook réelle à valider avec un destinataire de test autorisé avant activation générale. Les tests isolés ne prouvent ni la migration de production ni le fonctionnement du cron Vercel.

Le socle Playwright est suivi dans l'Issue [#2](https://github.com/Znybnl/growth/issues/2). Les premiers tests non destructifs couvrent les pages de connexion et d'inscription, l'explication d'un QR de prévisualisation invalide et l'absence de donnée révélée par un code de retrait inconnu. Un test d'accès au Wizard existe aussi, mais ne s'exécute qu'avec un compte de test fourni explicitement par `OKADO_E2E_EMAIL` et `OKADO_E2E_PASSWORD`.

### Compte de test de référence

- **Adresse** : `e2e@okado.app`.
- **Usage** : seul compte autorisé pour les E2E qui s'authentifient ou créent des données métier.
- **Secret** : les variables `OKADO_E2E_EMAIL` et `OKADO_E2E_PASSWORD` restent uniquement dans `apps/web-app/.env.local` et, lorsque les E2E seront exécutés en CI, dans les secrets GitHub Actions. Elles ne sont jamais versionnées ni nécessaires au runtime Vercel de production.
- **Cloisonnement** : le compte possède son établissement et son workspace dédiés. Tous les jeux et données créés par les tests commencent par `E2E —` et sont nettoyés à la fin du scénario lorsque cela est possible.
- **Nettoyage** : chaque nouvelle session supprime les jeux, participations et données de test créés lors de son exécution ; aucun jeu E2E ne doit rester utilisable après un test réussi.
- **E-mails de gain** : leur envoi vers `e2e@okado.app` est explicitement autorisé afin de vérifier le parcours de bout en bout. Les e-mails créés par le smoke portent l'objet `[TEST]` et le test vérifie leur prise en charge par le système d'envoi. Aucun autre destinataire ne doit être utilisé par défaut.
- **Interdiction** : ne jamais diffuser ses QR codes, l'utiliser pour un commerce réel ou mélanger ses données à celles d'un marchand existant.

Les tests E2E ne deviennent des checks CI obligatoires qu'après stabilisation d'un parcours. Cette progression évite qu'un test instable bloque les livraisons.

## Parcours bloquants

Un changement qui touche l'un de ces parcours doit avoir une preuve de test automatisée ou manuelle avant production. Si le parcours échoue, la livraison est bloquée.

| Parcours | Vérification minimale |
|---|---|
| Inscription, connexion et session | Créer ou connecter un compte, arriver au bon espace et conserver la session. |
| Onboarding et Wizard | Accéder au Wizard, enregistrer un brouillon, compléter puis publier un jeu valide. |
| Jeu public | Ouvrir le QR de diffusion et jouer sur roue et ticket à gratter. |
| Actions et collecte e-mail | Vérifier l'ordre des actions par visite, la collecte indépendante et le consentement marketing facultatif. |
| Gain et e-mail | Vérifier le résultat, le code/QR de retrait et l'e-mail correspondant. |
| Retrait | Vérifier le PIN, le retrait normal, le retrait forcé avec motif et le blocage d'un second retrait. |
| Prévisualisation | Vérifier l'isolation des stocks et indicateurs. |
| Résultats, export et stocks | Vérifier les indicateurs, les contacts et la cohérence du stock disponible. |
| Multi-sites | Vérifier la séparation des établissements et le changement de site. |
| Paiement | Vérifier le parcours uniquement lorsqu'il est modifié. |

## Choisir le bon niveau de test

- **Changement visuel localisé** : lint, build et vérification visuelle de la page touchée.
- **Changement métier ou API** : lint, build, test du parcours concerné et non-régression des autorisations/données.
- **Changement auth, jeu, gain, retrait, e-mail, paiement, prévisualisation ou multi-sites** : contrôles précédents + smoke ou E2E adapté + validation fonctionnelle du propriétaire.
- **Évolution majeure** : régression complète de tous les parcours du tableau avant production.

## Rose poudré / Noir & Or — #462 / #463

Rejouer `beauty-wheel-backgrounds.spec.ts`, `beauty-rose-noir.spec.ts`, `beauty-wheel-polish.spec.ts`, `beauty-wheel-themes.spec.ts`, `wheel-template-background.spec.ts` et `halloween-wheel.spec.ts` en Chromium sur le serveur de développement. Contrôles : fonds natifs/manuels/couleurs sans mutation, anciennes couleurs enregistrées, images décodées, galerie, mobile 320/390 px, couverture à 1280 px, roue centrée Noir & Or, vrais lots/contrastes/voisins, clic/résultat unique et finitions #461. Les appels de jeu sont interceptés, sans écriture métier. Après build, contrôler les URL statiques et optimisées des deux fonds sur le SHA candidat Vercel ; la fixture doit rester HTTP 404 en production.

## Roue Halloween dorée — #456

- Unitaire : `node --experimental-strip-types --import ./scripts/ts-alias-loader.mjs --test src/lib/halloween-wheel-theme.test.mjs` depuis `apps/web-app` : tous les lots et le résultat conservés, 1 à 50 lots, aucune mutation des sources.
- Navigateur local : démarrer `npm run dev -- --port 3000 --webpack`, puis `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/halloween-wheel.spec.ts e2e/wheel-template-background.spec.ts --project=chromium` (adapter la définition de variable à PowerShell).
- Les fixtures `/dev/halloween-proof` ne sont accessibles qu’en développement. Les APIs du jeu sont interceptées : aucun lot réservé, aucun e-mail envoyé, aucune écriture métier.
- Vérifier 320/390/600/1280 px, chargement des dix assets (fond, cadre affiné, calligraphie affinée, texture et six pictogrammes), hydratation, logo texte/image/aucun, sous-titre, titre éditable, zéro espacement sans superposition, miniature non interactive, clic/auto-animation et formulaire du véritable lot. Le contrôle géométrique à 390 px préserve une largeur de roue de 82 % et vérifie les deux espacements initiaux communs de 50 px, sans redimensionner un titre personnalisé ; les valeurs sauvegardées restent prioritaires.
- Vérifier l’exception de packaging Halloween dans `.vercelignore`, puis les dix URL statiques et les URL `/_next/image` du fond, cadre et mot-symbole sur la preview Vercel du SHA candidat (HTTP 200, réponse image décodable). Le contrôle local ne couvre pas les exclusions de déploiement.
- Rejouer le vrai cadre de téléphone du wizard : sans sous-titre et avec sous-titre long/non sécable, à 320/390/1280 px. Vérifier la couverture jusqu’au bas de l’écran, la teinte dorée indépendante du logo blanc, le bloc secondaire à 60 % sans débordement et le disque carré non étiré.
- Contrôler également qu’un build production refuse la route de fixture. Comparaison et images : [validation visuelle](design/halloween-wheel-456.md).

## Fonds de roues issus des tickets — #458

- `e2e/beauty-wheel-backgrounds.spec.ts` : fonds natifs identiques aux tickets, import/bibliothèque prioritaire, couleur personnalisée conservée, URL absente non bloquante, aucune mutation des paramètres, miniatures et absence de propagation vers les autres roues.
- Fixtures synthétiques `/dev/beauty-wheel-backgrounds`, limitées au développement ; tester les vrais composants de l'aperçu et du jeu public à 390 px, images effectivement chargées et sans SVG décoratif superposé. Intercepter l'API de lecture ; aucune écriture métier ou e-mail.
- Rejouer `beauty-wheel-themes.spec.ts`, `wheel-template-background.spec.ts` et `halloween-wheel.spec.ts` pour les lots, couleurs, fonds et interactions existantes. Vérifier que le build production renvoie 404 pour la fixture.

## Finitions des roues Beauté — #460

- `e2e/beauty-wheel-polish.spec.ts` : six thèmes `beauty-*`, aperçu compact et jeu public à 320/390 px, JOUER sans icône et police agrandie non tronquée, reflet haut-gauche, police DM Sans des vrais lots, contour coloré unique + liseré blanc, pointeur en relief et identifiants SVG uniques. Éclat est testé séparément : centre uni/bord blanc/poids 700 et taille héritée, pointeur facetté, anneau SVG blanc de 18 unités identiques à la base de #461, miniature d'origine et clic/résultat inchangés.
- Logo texte/image/aucun : filet uniquement sous le texte. Vérifier les choix de contour personnalisés et l'absence de changement hors Beauté.
- Retour PR #461 : mesurer la réduction exacte de 1 px de JOUER à 320/390 px, vérifier l'absence du pseudo-élément de filet blanc intérieur, la bordure centrale non blanche et son ombre, le liseré blanc extérieur de 2 px et les miniatures actualisées.
- Pour chaque thème, rejouer le clic qui ouvre l'action puis l'animation jusqu'à son unique callback de résultat, sans API métier. Le mécanisme, la rotation et les probabilités ne sont pas modifiés.
- Rejouer les suites #458, thèmes Beauté, fonds de roues et Halloween ; vérifier les captures et le build. Les fixtures demeurent exclusivement accessibles en développement.
- Référence, captures et recette : [finitions Beauté](design/wheel-polish-460.md).

## Assistance administrative aux jeux — #467

`npm run test:admin-campaigns -w @okado/web-app` teste les vrais handlers et le repository avec session/base/stockage simulés exclusivement dans le processus de test : jeu marchand sans audit, ancien créateur différent, compte multi-sites, mauvais site/jeu, refus 401/403 avant lecture, sauvegarde sans changement de propriétaire, création toujours brouillon, journalisation, affiche/logo et jeton de prévisualisation limité au jeu. Le rendu de la liste vérifie les liens, le filtre compte et la pagination au-delà de 500 jeux. Aucun accès Supabase réel ni e-mail.

Rejouer `admin-campaign-access.spec.ts` sur le serveur local pour le refus HTTP des visiteurs et du compte marchand E2E. Recette propriétaire : Pilotage → Voir les jeux d’un marchand → Modifier le jeu, tester son aperçu et son QR de test, puis son affiche/logo ; vérifier les données conservées et qu’une sauvegarde ne publie pas un brouillon. Les modifications d’un jeu actif prennent effet sur ce jeu, comme dans l’éditeur marchand. Aucun test ne doit modifier une campagne réelle sans instruction explicite.

## Duplication administrative vers un marchand — #469

La suite `test:admin-campaigns` couvre aussi les vrais handlers de duplication avec base/session/stockage simulés : source appartenant à l’établissement actif de l’admin, cibles associées au compte, sites archivés, refus 401/403/404, sélection invalide, brouillons sans historique/stock consommé, adaptation facultative de l’identité et des liens, audit et erreur partielle. Les helpers réels de copie des médias sont testés avec un bucket simulé (propriété/origine, dédoublonnage et indépendance de stockage).

`e2e/admin-campaign-duplication.spec.ts` exerce les vrais composants à 320/390/1280 px : menu admin vs marchand, recherche/pagination, sélection, option d’identité, création et liens, affichage des échecs partiels, non-répétition et absence d’erreur d’hydratation. Les requêtes de cette fixture synthétique `/dev/admin-duplication-proof` sont interceptées ; aucun accès administrateur n’est accordé par la fixture, qui renvoie 404 en production. `admin-campaign-access.spec.ts` teste les refus HTTP réels. Recette propriétaire : depuis une campagne de l’établissement administrateur, dupliquer vers un compte pilote de test, vérifier ses données/logo/liens/affiche et son stock initial, puis ouvrir le brouillon depuis Pilotage. La source doit rester inchangée ; aucun test ne modifie un commerce réel.

## QR de diffusion administrateur — #470

La suite `test:admin-campaigns` vérifie la nouvelle route avec sessions/base simulées et le vrai générateur SVG partagé : refus 401/403 avant lecture, jeu absent/site archivé, erreur de base sans divulgation, bon lien public sans jeton de test, fichier téléchargeable privé, brouillon sans publication et audit technique hors indicateurs marchand. Les tests de rendu/câblage couvrent la liste, le Wizard et sa confirmation. Les permissions HTTP réelles sont ajoutées à `admin-campaign-access.spec.ts`. La fixture `/dev/admin-qr-proof` (404 en production) teste les vrais composants à 320/390/1280 px et le téléchargement d’un fichier synthétique, sans contourner l’authentification serveur.

Recette : Pilotage → Voir les jeux → QR de diffusion, puis Modifier le jeu et Télécharger le QR de diffusion après enregistrement. Scanner le SVG d’un jeu publié doit ouvrir le bon jeu public ; celui d’un brouillon ne le publie pas. Le QR de test reste temporaire et isolé. Aucune campagne réelle n’est modifiée par les tests.

## Catalogue Beauté — #466

`npm run test:beauty-catalog -w @okado/web-app` vérifie les six catégories et les 61 lignes, le mapping condition/achat, le repli général, les alias, les personnalisations, la session API et l'absence de cache. La migration et son retour arrière sont exécutés réellement dans PostgreSQL embarqué PGlite (dépendance de test uniquement) : conservation des lots et des autres secteurs, contraintes conditionnelles, RLS, réexécution et protection des modifications administratives. Aucun accès Supabase pour ces tests.

`e2e/beauty-catalog.spec.ts` utilise les vrais éditeurs et l'onboarding sur une fixture synthétique, avec interception des API et blocage des écritures : les six bibliothèques dans les deux parcours, conditions modifiables, conservation d'un lot existant, chargements concurrents et affichage à 320/390/1280 px. `/dev/beauty-catalog-proof` est inaccessible en production. L'audit préalable `scripts/audit-beauty-catalog.mjs` est en lecture seule et ne retourne que des compteurs, sans identité d'établissement ni secret.

Recette et limites : [livraison #466](releases/beauty-catalog-466.md). Une fixture ne prouve pas l'exécution de la migration en production.

## Fiche établissement administrative — #475

Compléments #473/#484 : les tests du handler/DAL vérifient les options multiples exactes, le défaut désactivé sans écriture, l’association utilisateur/compte avant lecture, deux utilisateurs partageant un compte et leurs sites distincts, une lecture groupée des préférences, et l’erreur sans faux statut désactivé. Les E2E contrôlent la sélection indépendante de plusieurs canaux, le retrait de tous les choix, le changement de site, le défaut et l’absence de débordement à 320/390/1280 px.

`npm run test:admin-profiles -w @okado/web-app` teste le handler, le repository et le DTO réels avec infrastructure simulée uniquement dans le processus de test : 401/403 avant lecture, compte absent/archivé, multi-sites associés sans site étranger ni doublon, exclusion des secrets ajoutés au profil à l’exécution, valeurs absentes et numériques nulles, URL non sûres, erreur sans fuite de données, absence de préchargement dans Pilotage et fixture interdite en production. Aucun accès à une base réelle ni écriture.

`e2e/admin-establishment-profile.spec.ts` teste le vrai composant avec réponses synthétiques à 320/390/1280 px : fiche complète, sélection de site, champs absents, liens externes sûrs, dimensions et défilement interne sans débordement, chargement/erreur/reprise, fermeture, focus confiné et restauré. Il vérifie aussi le refus HTTP réel d’un visiteur sur la nouvelle route. La fixture `/dev/admin-location-profile-proof` est limitée au développement, sans contournement d’authentification serveur. Recette propriétaire : Pilotage → Voir la fiche, consulter un compte mono-site puis multi-sites, vérifier ses coordonnées/liens et refermer ; les informations et la sélection de site active doivent rester inchangées.

## Compte rendu attendu

Chaque demande de merge ou de production doit indiquer, en quelques lignes :

- le résultat utilisateur livré ;
- les parcours testés ;
- les commandes exécutées et leur résultat ;
- les tests manuels à effectuer par le propriétaire ;
- les risques connus ou limites restantes.
