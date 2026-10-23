# Stratégie de test — Okado

Le suivi de clic Google et l’option de clic requis (#638) se vérifient avec `npm run test:google-click -w @okado/web-app` : vraies fonctions SQL de tirage et participation sous PGlite, refus RLS, association du clic, journal d’acceptation et vrais handlers API avec fournisseurs simulés. `e2e/google-click-required.spec.ts` contrôle le Wizard dans MerchantShell à 1280×720, 1280×600 et 390 px, l’annulation/acceptation/sauvegarde, le déblocage sur roue/ticket, la reprise après erreur de clic et les actions facultatives/sociales.

### Compositions sectorielles — #623

`test:prize-compositions` contrôle25contextes (secteurs, sous-secteurs Beauté et
types de restauration), recettes déterministes40/70/100, coûts, conditions,
copies, données invalides/manquantes/inactives et refus des contextes inconnus.
Migration testée dans PostgreSQL isolé :35ajouts, idempotence, conservation des
campagnes et personnalisations, manifeste privé inaccessible à anon, rollback
ne supprimant que les insertions intactes. `sector-prize-compositions.spec.ts`
exerce création sans lot, choix explicite, sauvegarde roue/ticket/admin, erreurs
et vide, avec captures1280×720/600 et320/390px. Les régressions bibliothèque,
budget et réutilisation restent couvertes ; aucun e-mail ni écriture en production.

Relecture PR #624 : le contrat réseau du catalogue est validé avant rendu
(enveloppe, types des champs utilisés, valeurs numériques, IDs uniques).
Un catalogue malformé produit un état d'erreur avec réessai et création manuelle,
pas un faux état vide. Les tests vérifient aussi le retour à un catalogue valide
sans ajout automatique. Le détail montre les conditions proposées et l'achat
requis selon le même mapping que la copie, avec captures à 1280×720/600 et mobile.


### Tirage 100 % gagnant — #629

`test:guaranteed-draw` exécute les fonctions SQL migrées et leur rollback dans
PGlite, le helper mémoire et le vrai handler de préparation avec infrastructure
simulée. Exclusion du 0 %, poids fractionnaires, redistribution après épuisement,
refus atomique sans lot, restitution, droits privés/invoker et retour arrière
sont testés. Les bornes sont déterministes côté JS et un échantillon SQL de
10 000 tirages est seedé. Il ne garantit pas un quota exact de gains.
`guaranteed-draw-rules.spec.ts` contrôle la case sans modification des chances
et l'aide du wizard/éditeur classique à 1280×720/600 et sur mobile. La preview
produit reste volontairement différente ; ne pas l'utiliser pour mesurer les
probabilités réelles. Voir [preuves et migration](releases/2026-10-23-guaranteed-draw-629.md).

### Ajustement local des libellés de roue — #631

`wheel-template-background.spec.ts` conserve le minimum de référence de 25 px
et teste son exception locale lorsqu'un texte ne tient pas. Les contrôles de
`wheel-prize-visibility.spec.ts` vérifient le lot long, sa réduction et son
dégagement par rapport au bouton, sans réduction de PERDU, à 320/390 px,
ainsi que le vrai wizard/iframe à 1280×720/600. Les suites Beauty Pop, thèmes
et finitions sont conservées. Aucun changement de moteur ou de données.

### Visibilité des lots de roue — #628

`test:wheel-segments` et `wheel-prize-visibility.spec.ts` vérifient que le
headspa de la reproduction et tous les lots distincts restent présents avant
le tirage, puis que chaque résultat exact reste visible pour l'animation.
Les tests unitaires couvrent 1 à 50 lots, libellés identiques, pertes répétées,
probabilités invalides et absence de mutation. Les rendus des six modèles
Beauté et d'Éclat sont contrôlés en public/aperçu à 320/390 px, puis le vrai
wizard/iframe avec les cinq lots à 1280×720/600. Aucune API réelle appelée.

### Habillage Beauty Pop — #626

`beauty-pop.spec.ts` vérifie les assets WebP, la bibliothèque et les budgets
de poids, les textes/pointeur sans chevauchement à320/390×740px, les fonds
manuels et changements de modèle, la rotation indépendante du contour et
un résultat unique, puis le vrai wizard/iframe à1280×720/600.
Les suites fonds/finitions Beauté, Éclat, palettes et contrastes sont rejouées.
Les assertions adaptent uniquement le contour Beauty Pop remplacé par un
cadre métallique stationnaire ; les autres rendus gardent leurs contrôles.
Captures inspectées dans [le dossier de validation](design/beauty-pop-626.md).

### Budget et finitions — #609 phase5

`test:prize-budget` vérifie le cas SFD3,08€/308€, les coûts inconnus/zéro,
les lots de chance nulle et chances invalides, les stocks limités, les bornes
des règles, le refus serveur d’un brouillon>100%, puis la vraie DAL de
sauvegarde/relecture avec base simulée : marqueur JSON conservé et vrai zéro
à nouveau reconnu. Copies inconnues distinctes des vrais zéros.
`wizard-prize-budget.spec.ts` exerce recalcul, édition/abandon/continuer,
zéro explicite, liens des coûts manquants, raccourcis état vide, règles
invalides sans écriture et sauvegarde de jeux roue/ticket déjà publiés.
Captures1280×720/600 et320/390px, vrai cadre et API interceptées ; les anciens
parcours phases1–4 restent rejoués. Le succès ne prouve pas une écriture réelle
ni un déploiement. Contrôles serveur admin, catalogue et permissions conservés.

### Compositions proposées — #609, phase 4

`test:prize-compositions` contrôle les profils 40/70/100 %, les arrondis,
le coût pondéré par participation, les catalogues vides/inactifs/invalides,
la déduplication, les champs Beauté et les copies indépendantes sans stock
historique. `wizard-prize-compositions.spec.ts` teste les trois onglets,
le détail, l’application sur jeu vide, la confirmation et son annulation sur
jeu rempli, les modifications puis le payload de sauvegarde sans PERDU,
les erreurs/réessais et le clavier. Captures 1280×720/600 et 320/390 px.
Les API sont interceptées : aucune campagne réelle n’est modifiée.
Les suites phases 1–3 et le smoke CSS compilé restent obligatoires.

## Téléchargements — #596

`e2e/admin-campaign-qr.spec.ts` contrôle la popin immédiate, QR visible/clic
droit, SVG téléchargé, refus/réessai, annulation des préparations lentes,
nettoyage des URL, double clic, un seul dialogue depuis Jeu prêt, menus réels
Wizard/éditeur, export CSV et affiche : confirmation, sauvegarde lente/échouée,
réessai puis PNG réel. Captures 1280 × 720, 320 et 390 px et focus clavier.
Les handlers testés dans `test:admin-campaigns` gardent les ACL et ne comptent
pas une consultation inline comme un téléchargement. Fixtures développement
seulement, API interceptées ; aucun accès à une base réelle.

L'objectif est de détecter les régressions importantes sans transformer le projet en processus lourd. Une livraison est validée sur le comportement, pas sur une revue de code manuelle par le propriétaire.

## Règle simple

1. L'agent exécute les contrôles adaptés au changement.
2. L'agent explique en langage clair ce qui a changé, les risques et les résultats.
3. Pierre-Henri BRUNELLE réalise seulement le test fonctionnel indiqué lorsque le changement est visible ou sensible.
4. Le merge et la production attendent son accord explicite.

## Contrôles automatisés existants

### Réutilisation des lots — #609, phase 3

`test:reusable-prizes` couvre les vrais handlers marchand/admin et la DAL avec
sessions/base simulées : 401/403/404, ciblage de l'établissement, exclusion du
jeu courant, projection sans médias/participants/stock restant, pagination de
601 lignes avec plafond abaissé, tri/dédoublonnage et copies indépendantes avec
IDs courts. Aucun changement de schéma ou RLS, aucune écriture réelle.

`wizard-reusable-prizes.spec.ts` exerce le vrai wizard/cadre marchand, lecture
à l'ouverture de l'onglet seulement, copie limitée confirmée, stock nul ou
fractionnaire refusé, conversion en illimité, conditions/achat conservés,
ajustement de probabilité, doublons/double clic, personnalisation et sauvegarde,
onglets clavier, chargement/erreur/réessai/vide et route cible administrative.
Captures 1280×720/600 et 320/390 px ; les requêtes sont interceptées. Les GET
réels anonymes sont aussi vérifiés. La fixture demeure inaccessible en production.

### Composition et bibliothèque des lots — #609, phases 1 et 2

Complément #611 : la bibliothèque est contrôlée à 1280×720/600, 1894×1040
et 320/390 px avec sept suggestions, en-tête/fermeture/pied intégralement
dans le viewport avant et après défilement du catalogue. Le test
`smoke:prize-library`, exécuté après le build en CI, rend le vrai composant
avec les CSS compilés (seule l'enveloppe portail est substituée pour le SSR).
Il refuse les styles du module absents et vérifie les dimensions, l'absence
de débordement et le pied fixe sur cinq viewports. Ce smoke sans interaction
ne remplace pas les E2E clavier, ajout et ajustement, ni une recette Vercel.
Il ne requiert aucune route de développement en production ni aucune donnée réelle.

Audit du 21 octobre : tester le focus **visible** après ajout en fin de catalogue
et après annulation d'un ajustement, sur ordinateur et mobile ; la présence du
focus dans le dialogue ne suffit pas. Vérifier que l'annulation ne crée aucun
lot, que la position du catalogue est restaurée, que les chances restantes et
les coûts indicatifs sont expliqués et que les états court/vide/erreur ont une
hauteur naturelle sur ordinateur, également avec les CSS compilés.

`wizard-prize-composition.spec.ts` et `wizard-prize-library.spec.ts` vérifient
l’édition des lots, l’ajustement direct des chances, les dépassements provisoires
avec alerte unique, l’ajout multiple et la prévention des doublons, le choix
explicite de la part disponible, les champs envoyés et le blocage des répartitions
invalides avant tout appel API. Les captures 1280×720/600 et 320/390 px couvrent
le panneau et la bibliothèque, clavier/focus, chargement/erreur/réessai/vide.
La suite `wizard-responsive.spec.ts` complète la matrice jusqu’à 1920 px.
Les API sont interceptées ; aucune donnée métier n’est écrite.
`test:beauty-catalog` vérifie les secteurs, le mapping, l’authentification et
l’indépendance des identifiants de lots entre jeux.

`wizard-prize-audit.spec.ts` complète le contrôle avant recette : catalogue
dense, onze lots à libellés longs, captures 1280×720/600 et 320/390 px,
absence de débordement dans les fenêtres/lignes et lot ciblé visible sous la
barre fixe. La composition teste aussi un nouveau stock limité, sa copie
indépendante et le total à zéro. `test:marketing-action-library` vérifie le
refus serveur d’une publication sans chance gagnante, sans bloquer les brouillons.
Voir `docs/releases/2026-10-20-wizard-prizes-sfd-audit-609.md` pour les réserves
explicitement laissées aux phases suivantes.

### Vitrine et découverte des modèles — #601

`site-refresh.spec.ts` vérifie le défilement manuel, l’aperçu natif modal,
Échap/le focus restitué, les destinations des cartes métiers et le suivi
compact. La matrice 320/360/390/768/1280/1440 px contrôle le débordement et
l’ordre des CTA avant l’illustration mobile. `product-proof.spec.ts` couvre les
six onglets Beauté, un seul panneau visible et les touches fléchées/Home/End ;
les synthèses/relances détaillées restent testées sur Beauté.
`landing-conversion.spec.ts` exerce les clics modèles/spécialités avec le vrai
SDK sur token fictif et réseau intercepté. Les nouveaux contrôles confirment
également l’absence de POST métier et de mesure après refus. Les suites démo,
SEO, articles, marque/FAQ et consentement sont conservées.

### Contrôle visuel obligatoire des écrans à 1280 px — #576

Complément #600 : `wizard-polish-600.spec.ts` vérifie les illustrations sans
letterboxing, les champs à trois lignes, la barre d’actions sticky à
1280×600/720, 390 px et 640×360, les cartes partagées (dont sélection), la
progression à 250 px et les saisies envoyées aux endpoints marchand/admin
interceptés. Comparer les tailles, familles, interlignes et dimensions des
textes du brouillon aux vrais rendus de jeu à 390×740 dans des pages séparées,
pour cinq roues et deux tickets. Les cas visuels portent `@visual-1280`.
Vérifier aussi le cadre limité à 260 px, l’augmentation du sous-titre de 2 px,
les palettes Éclat/Moderne, les cadeaux et le pointeur de la miniature Moderne,
et l’absence de chevauchement entre son texte secondaire et sa roue.
L’iframe visuelle est inerte ; la popin doit conserver Tab/Escape et le retour
du focus. Aucune API réelle ni écriture de données de test.

Toute création/modification d'écran doit ajouter ou adapter un test navigateur
**1280×720**, dans le vrai cadre de navigation applicable (menu, en-tête et
barres d'actions inclus), plus **1280×600** pour les écrans denses. Contrôler
aussi le mobile pertinent. Couvrir les états touchés : formulaire, tableau,
erreurs et popin ; aucune donnée personnelle ou requête métier réelle dans les
fixtures. Ne pas utiliser le simple viewport d'un composant nu pour conclure
que l'écran complet tient dans l'application.

Dans le SaaS : `e2e/helpers/visual-1280.ts` fournit la capture et le contrôle de
débordement horizontal des pages/formulaires. Le test porte le tag
`@visual-1280` et se lance avec :

```powershell
npm run test:visual-1280 -w @okado/web-app
```

Le job CI **Visual checks at 1280px** exécute ces tests et publie leurs captures
et le rapport Playwright dans l'artefact `visual-1280` (7 jours). **Les assertions
et captures ne remplacent pas l'inspection visuelle** : ouvrir les images,
vérifier lisibilité, chevauchements, zones tronquées, focus et actions, puis
consigner le résultat dans la PR. Ce n'est pas un comparateur pixel avec une
baseline automatiquement approuvée. Le helper est réutilisable ; la couverture
initiale porte sur le Wizard, pas automatiquement sur tous les écrans futurs.
Pour la landing, appliquer la même exigence dans ses tests navigateur.

`e2e/wizard-responsive.spec.ts` rend le vrai `MerchantShell` et le Wizard sur
fixture développement : jeu/lots à 1280×600/720, création/édition et assistance,
roue/ticket, brouillon non sauvegardé visible dans l'aperçu, clavier/Escape/focus,
320/390/768/1024/1366/1440/1536/1920 px, formulaire et téléphone contenus.
Les réductions de viewport équivalentes au reflow 125/150/200 % vérifient la
redistribution CSS et la conservation de l'état ; elles ne constituent pas
une mesure du zoom du navigateur, du facteur d'échelle OS ou de conformité
WCAG complète. API/HTTPS interceptées, aucun stockage ou e-mail réel.
[Mesures, analyse et recette](releases/2026-10-18-responsive-wizard-576.md).

### QR de prévisualisation — #578

`npm run test:preview-qr -w @okado/web-app` teste le handler, le SVG et les jetons
signés avec infrastructure isolée : session/propriété, brouillon, 30 minutes,
reprises sans événement de téléchargement. `e2e/preview-qr.spec.ts` teste le
composant partagé à 320/390/1280 px et les reprises marchand/admin après
403/500, HTML, panne réseau ou SVG invalide. Fixture interdite en production,
API interceptées, captures synthétiques inspectées, aucun appel base ou e-mail
réel. Le replay historique prouve HTTP 200 pour la requête signalée ; ce n'est
pas une preuve des pixels historiques. [Analyse et recette #578](releases/2026-10-18-preview-qr-replay-578.md).

### Actions du Wizard et liens de Mon compte — #564

`e2e/marketing-action-library.spec.ts` teste les composants réels du Wizard et
de Mon compte dans la fixture `template-rendering-proof`, interdite hors
développement. À 320/390/768/1440 px : titre exact « Les actions », absence du
suffixe « Facultatif », mêmes icônes de marques, badges de présence, fiche Google
préservée, saisie sans sauvegarde implicite, sauvegarde explicite sur le bon site
et conservation des liens non modifiés. Les API sont interceptées et les données
synthétiques ; aucune preuve d'écriture Supabase réelle n'est revendiquée.

### Options du Wizard et polices Beauté — #551 / #553

`e2e/wizard-options-551-553.spec.ts` utilise les vrais Wizard/éditeur et rendus de
jeu dans la fixture développement existante `template-rendering-proof`, HTTP 404
en production. Toutes les API et sorties HTTPS sont interceptées : création
`review_prompt` sans URL Google, objectif/actions/collecte existants conservés,
sélection des trois familles sur chaque roue/ticket (Éclat inclus), corps de sauvegarde réel
et réhydratation synthétique, rendus intégré/public/prévisualisation à 320/1280 px.
Les rendus vérifient aussi la famille CSS calculée et des accents/retours à la ligne.
La validation d'entrée accepte chaque couple template/police, sans changer les
défauts ni les options d'affiche. Rejouer aussi `beauty-wheel-themes.spec.ts` et
`test:wizard-marketing-actions -w @okado/web-app`. Aucun compte, gain ou e-mail
réel n'est créé ; cette recette ne teste pas une écriture en base de production.

`test:analytics-consent -w @okado/web-app` vérifie les deux implémentations,
absence/refus/expiration/version du choix, retrait et nouvel accord, nettoyage
des identifiants sans toucher aux autres stockages, minimisation des propriétés
et absence d'envoi serveur sans consentement ou sans contexte de requête.
`test:data-lifecycle -w @okado/web-app` exécute le SQL historique sous PGlite
sur des données fictives (seuils 3/5 ans depuis création, dépendances, absence de
métadonnées libres en archive, droits/RLS et exécution répétée). Ces suites sont
dans la CI ; elles ne prouvent ni le contrat fournisseur ni l'activation de la
maintenance sur la production.

`analytics-consent.spec.ts`, dans chaque application, teste le vrai SDK et le
bandeau : aucun appel avant accord, refus durable, reprise après accord,
suppression navigateur au retrait et navigation disponible. L'API PostHog et
Vercel Analytics sont interceptés, le token est une fixture locale, aucun
événement n'est transmis au projet réel. Les indices headless du navigateur
de test sont neutralisés uniquement dans la fixture pour vérifier la capture
humaine ; le filtrage des bots du code applicatif reste inchangé. Pour lancer
ces tests, construire/démarrer la landing et le SaaS local avec
`NEXT_PUBLIC_POSTHOG_KEY=phc_consent_fixture` et `NEXT_PUBLIC_POSTHOG_ENABLED=true`.
Ne jamais réutiliser une clé réelle pour cette recette.

Suite #617 : `e2e/cookie-menu-placement.spec.ts` vérifie le contrôle cookies en
bas à droite, hors de la barre supérieure et sans superposition à Déconnexion.
Un espace réservé sous le vrai `MerchantShell` protège les actions du wizard ;
le contrôle reste sous le menu mobile et les fenêtres métier. Marchand et
administration (alertes incluses), 1280×720/600 et
320/390 px : menu défilable, actions non recouvertes, ouverture au clavier,
retour du focus et refus durable. Le site public conserve son contrôle flottant.
Les captures doivent être inspectées ; API et analytics sont interceptées.

Suite SEO du 21 octobre 2026 (#507) : la suite unitaire parcourt tous les
articles du registre dans les deux helpers et vérifie les libellés réellement
filtrés, ainsi que les slugs inconnus, segments privés et paramètres refusés.
`landing-conversion.spec.ts` teste le listing et des articles des deux lots
avec le vrai SDK : refus, accord, retrait, page inconnue classée `/other`,
navigation interne de découverte distincte d'un vrai départ vers
l'inscription. Les requêtes analytics et l'inscription externe sont
interceptées ; aucun compte ni événement PostHog de production n'est créé.

Complément #592 : `analytics-identity.spec.ts` vérifie les vrais paquets du SDK,
leurs identifiants et le contexte du site dans le vrai shell : session existante,
premier événement métier, connexion avant redirection, plusieurs établissements,
focus/route après perte d'identité, changement d'utilisateur et retrait/nouvel
accord. L'e-mail authentifié est mis à jour dans le profil (y compris son
changement), dédupliqué et exclu des événements ordinaires. Aucun alias
automatique. La CI possède un job dédié avec clé fictive et réseau intercepté ;
les tests unitaires incluent le vrai handler QR (identité principale, site actif,
refus d'une campagne étrangère) et la liste blanche des profils. Le bandeau
commun est capturé à 1280×720, 320 et 390 px. L'historique PostHog et les données
de production ne sont pas modifiés par ces contrôles.

#498 : `npm run test:metrics -w @okado/web-app` vérifie les helpers partagés,
les vrais repository/handlers, les nouveaux agrégats SQL et rollback sous PGlite :
1 005 contacts/opt-ins, historique de retrait prouvé/inconnu, premier jour UTC,
pertes/expiration, stock 20 %/illimité/épuisé, essais sans Stripe, ratio pondéré,
refus publics, caisse/forçage/achat, réinitialisation et clés idempotentes.
Rejouer les suites #496, notifications, e-mails, Supervision et essais. Les sept
scénarios `participation.spec.ts` couvrent aussi le vrai clic social à 320/390/1280 px,
deux clics volontaires distincts et aucun événement en preview. API interceptées,
aucune écriture métier réelle ni e-mail pendant les tests.

#496 : `npm run test:participations -w @okado/web-app` exécute la migration réelle sous PGlite, les vrais handlers avec infrastructure isolée, les capacités signées et le client de grattage. Couvrir pertes anonymes, gain/perte avec formulaire avant/après jeu, doublons, 1 005 parties, UTC, sites, RLS, sessions expirées/brouillons, anciennes preuves et rollback sans suppression de données. `e2e/participation.spec.ts` utilise le vrai parcours sur fixture développement à 320/390/1280 px, toutes API interceptées : préparation non comptée, premier grattage sans coordonnées, absence de deuxième requête et preview sans compteur réel. Aucun accès base ni e-mail réel ; fixture HTTP 404 en production.

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

## Démo marketing responsive — #514

`apps/landing-page/e2e/landing-demo.spec.ts` vérifie l'accueil, Restaurants et
Instituts de beauté à 320/390/768/1440 px : roue contenue dans le téléphone,
étapes et résultats accessibles, boutons tactiles, absence de débordement,
parcours avec/sans simulation Google, retour du focus et remise à zéro des
champs. Un scénario clavier et mouvement réduit couvre le parcours sans saisie ;
un autre annule le résultat différé lors d'un redémarrage pendant la rotation.
Les captures sont locales ; les coordonnées sont fictives, le choix de mesure
est refusé et les requêtes analytics interceptées. Aucun POST métier attendu.
Rejouer aussi les suites SEO, marque/FAQ et consentement existantes.

Complément #516 : contrôler les huit secteurs/quatre pertes et le centre
gagnant à 337,5° (rotation cible 1 777,5°), les logos sans étoile, puis les
parcours Google sans note/1 étoile/5 étoiles sur les trois pages. Les tests
contrôlent les radios natifs au clavier, la remise à zéro de la note et des
champs depuis Google/l'e-mail, l'absence de requête Google/POST et de stockage
local/session supplémentaire. La confirmation explicite l'e-mail/spams ;
l'aperçu utilise une adresse fictive fixe et un QR non utilisable, jamais les
coordonnées saisies. Les KPI restent inchangés et les nouvelles étapes n'ajoutent
aucun événement ni propriété analytics.

Simplification #516 : contrôler les noms inchangés « Le bistro » / « L’atelier
beauté », les libellés repris du SaaS, l'absence d'encart pédagogique et des
mentions répétées de simulation dans le téléphone. Un seul avertissement reste
à l'extérieur. Le QR illustratif est visible dès la confirmation ; aucun lien
de retrait réel ni téléchargement n'est exposé. Rejouer les mêmes parcours,
radios clavier, reset et protections réseau/stockage après l'allègement.

## E2E : mise en place progressive

Complément #536 : la démo ne propose plus de validation marchand ni son CTA,
sur les trois pages. Vérifier le focus confirmation → aperçu e-mail, les KPI
inchangés, l'absence d'appel métier/stockage et le reset. Les captures de la
roue, action, formulaire, confirmation et e-mail sont inspectées aux quatre
largeurs ; les textes/boutons restent contenus et la roue complète. Le retrait
réel SaaS n'est pas modifié. Les preuves métier et synthèses de #520 restent
couvertes par `product-proof.spec.ts`.

Complément #605 : les neuf captures de modèles sont rendues à 390×844 CSS px,
au facteur 2, sans le portail indicateur Next.js dans la capture seulement.
Les tests vérifient les dimensions intrinsèques, les centres de roue assortis
aux modèles, les zones de grattage contenues (216 px maximum, tous modèles)
et leur centrage horizontal et vertical dans les captures de téléphone
sur les neuf tickets, en public, aperçu et jeu-prévisualisation.

### Qualité du funnel d'acquisition — #507

`landing-conversion.spec.ts` exerce le vrai SDK, avec tous les paquets gzip/JSON
interceptés : début/fin une fois par tentative, pas de double comptage sur les
retours, reset, refus/absence/retrait, absence de replay après accord, CTA avant
navigation, pages autorisées et UTM sans donnée libre. Les quatre tailles de la
landing sont couvertes ; le token est la fixture locale, jamais une clé réelle.

`acquisition-identity.spec.ts` nécessite deux builds locaux avec cette fixture :
`PLAYWRIGHT_BASE_URL=http://localhost:3310 LANDING_TEST_BASE_URL=http://localhost:3308
npm run test:e2e -w @okado/web-app -- acquisition-identity.spec.ts`.
Les espaces d'URL www/app sont intégralement redirigés vers ces serveurs locaux ;
le POST signup et l'onboarding sont simulés, toute autre sortie est bloquée.
Vérifier cookie partagé, identifiant anonyme conservé au début d'inscription et
rapprochement `$identify` au même identifiant marchand que le contrat serveur.
Ce test n'est pas une création de compte ni une preuve de conversion organique.
Sans le second serveur explicitement fourni, ce scénario est ignoré.

La suite isolée `test:analytics-consent` vérifie aussi les routes sensibles
regroupées en `/other`, les UTM rejetés, les options d'envoi immédiat et la
synchronisation volontaire des deux implémentations. Relancer lint/build des
deux apps, les suites de consentement et les régressions publiques d'auth.

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

### Relances d’expiration — #304

`test:reward-reminders` exécute le vrai SQL sous PostgreSQL PGlite (défauts sans écriture, droits, isolation, 20 jours, DST, J−N, passages tardifs, activation avant le passage, minuit local, exclusions, payload immuable, reprise/lease/verrou, désactivation, absence de doublon et rollback). La correction quotidienne est réexécutable, préserve les préférences/données et désactive uniquement le job Supabase obsolète s’il existe. Les vrais handlers/worker sont testés avec dépendances isolées : origine/session/compte, secret cron commun, ancien schéma refusé, arrêt serveur, reprises dans le budget, idempotence, rendu et données non nominatives. La configuration Vercel teste un seul ajout quotidien et les trois crons existants inchangés. `reward-reminders.spec.ts` couvre le composant réel sur fixture de développement, API interceptées, à 320/390/1280 px ; compte/site, persistance, lecture seule, validation indépendante de l’autre formulaire. Rejouer les tests e-mail initial, notifications et Supervision. Maquettes 680/390/320 px issues du vrai renderer, QR fictif ; fixture HTTP 404 en production, routes sans session/secret 401. Aucun test ne programme ni n’envoie de relance réelle.

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

## Surface opaque du ticket à gratter — #633

`e2e/template-rendering-511.spec.ts` vérifie sur les onze templates que le canvas de jeu contient bien un revêtement opaque avec le motif effectivement peint, et pas seulement une image source chargée. La recette couvre la prévisualisation, le jeu public et la prévisualisation de jeu ; elle ne modifie ni le grattage ni les probabilités.

## Catalogue Beauté — #466

`npm run test:beauty-catalog -w @okado/web-app` vérifie les six catégories et les 61 lignes, le mapping condition/achat, le repli général, les alias, les personnalisations, la session API et l'absence de cache. La migration et son retour arrière sont exécutés réellement dans PostgreSQL embarqué PGlite (dépendance de test uniquement) : conservation des lots et des autres secteurs, contraintes conditionnelles, RLS, réexécution et protection des modifications administratives. Aucun accès Supabase pour ces tests.

`e2e/beauty-catalog.spec.ts` utilise les vrais éditeurs et l'onboarding sur une fixture synthétique, avec interception des API et blocage des écritures : les six bibliothèques dans les deux parcours, conditions modifiables, conservation d'un lot existant, chargements concurrents et affichage à 320/390/1280 px. `/dev/beauty-catalog-proof` est inaccessible en production. L'audit préalable `scripts/audit-beauty-catalog.mjs` est en lecture seule et ne retourne que des compteurs, sans identité d'établissement ni secret.

Recette et limites : [livraison #466](releases/beauty-catalog-466.md). Une fixture ne prouve pas l'exécution de la migration en production.

## Fiche établissement administrative — #475

Compléments #473/#484 : les tests du handler/DAL vérifient les options multiples exactes, le défaut désactivé sans écriture, l’association utilisateur/compte avant lecture, deux utilisateurs partageant un compte et leurs sites distincts, une lecture groupée des préférences, et l’erreur sans faux statut désactivé. La migration de contexte synthèse est exécutée sous PGlite et vérifie le décompte via `redeemed_at`, les retraits de gains antérieurs, les bornes de période, l’isolation d’établissement, les stocks actifs/épuisés/illimités et le refus des rôles authentifiés. Le rendu teste le KPI et le bloc stocks en HTML/texte, absents des alertes immédiates. Les E2E contrôlent la sélection indépendante de plusieurs canaux, le retrait de tous les choix, le changement de site, le défaut et l’absence de débordement à 320/390/1280 px.

`npm run test:admin-profiles -w @okado/web-app` teste le handler, le repository et le DTO réels avec infrastructure simulée uniquement dans le processus de test : 401/403 avant lecture, compte absent/archivé, multi-sites associés sans site étranger ni doublon, exclusion des secrets ajoutés au profil à l’exécution, valeurs absentes et numériques nulles, URL non sûres, erreur sans fuite de données, absence de préchargement dans Pilotage et fixture interdite en production. Aucun accès à une base réelle ni écriture.

`e2e/admin-establishment-profile.spec.ts` teste le vrai composant avec réponses synthétiques à 320/390/1280 px : fiche complète, sélection de site, champs absents, liens externes sûrs, dimensions et défilement interne sans débordement, chargement/erreur/reprise, fermeture, focus confiné et restauré. Il vérifie aussi le refus HTTP réel d’un visiteur sur la nouvelle route. La fixture `/dev/admin-location-profile-proof` est limitée au développement, sans contournement d’authentification serveur. Recette propriétaire : Pilotage → Voir la fiche, consulter un compte mono-site puis multi-sites, vérifier ses coordonnées/liens et refermer ; les informations et la sélection de site active doivent rester inchangées.

## Métadonnées de partage des jeux — #486

`npm run test:social-metadata -w @okado/web-app` couvre roue et ticket à gratter, l'association établissement/promesse, le sous-titre propre au jeu en description et les replis lorsque des champs sont vides. Un smoke test HTTP sur le HTML initial vérifie `title`, Open Graph et Twitter, puisque les robots de partage doivent lire ces métadonnées sans exécuter le JavaScript.

## Compte rendu attendu

### Réception des webhooks Resend — #573

`npm run test:resend-webhook -w @okado/web-app` utilise le vrai SDK avec signatures HMAC synthétiques : en-têtes Svix, compatibilité historique complète sans mélange/repli abusif, corps brut UTF-8, signature incorrecte, horodatage périmé/futur, JSON invalide, secret absent et panne de stockage. Les événements invalides ne sont jamais persistés ; les erreurs ne divulguent pas les détails internes.

Après `npm run build:web`, `npm run smoke:resend-webhook -w @okado/web-app` lance le vrai serveur compilé et une API de stockage simulée, toutes deux sur loopback, avec clés fictives. Il vérifie les refus HTTP 400 sans appel base, la réponse 200 après mise à jour du suivi et archivage via la vraie DAL, puis HTTP 503 et reprise après une panne simulée. Ces contrôles sont en CI. Aucune base, secret, livraison ou adresse réelle n'est utilisée ; ils ne remplacent pas le replay signé ciblé après déploiement autorisé.

### Fiabilité de Supervision — #491

Non-régression #492 : `e2e/support-scroll.spec.ts` utilise le vrai cadre marchand dans la fixture de développement (`?shell=1`), avec données fictives et API interceptées. À 320/390/1280 px et 1536 × 540 px, vérifier une seule zone verticale scrollable (`main`), aucun débordement du document, légendes accessibles contenues dans chaque tableau, défilement horizontal au clavier, erreur dépliée et fin de page accessible. Aucun changement de permissions ou de données ; la fixture demeure interdite en production.

`test:support-incidents` inclut les tests DAL/page, filtres, pannes partielles, refus administratifs et journalisation planifiée non nominative. La RPC réelle et son rollback sont exécutés sous PGlite : plus de 50 résultats, recherche historique et littérale, pagination sans doublon, microsecondes, établissement, dates et statuts, événements sans envoi associé, états de notification et refus anon/authenticated. `e2e/support-monitoring.spec.ts` vérifie le rendu à 320/390/1280 px, filtres GET, remise à zéro des pages, liens conservant les filtres, absence de débordement, source indisponible et historiques traités. Les données de la fixture sont fictives ; `/dev/support-monitoring` reste HTTP 404 en production. Rejouer aussi les tests de notifications et les suites d’acquittement/tableaux existantes. Aucun envoi ni modification de gain réel.

### Incidents d’e-mail traités — #487

Complément #489 : `e2e/support-tables.spec.ts` vérifie les quatre tableaux réels superposés à 320/390/1280 px, en-têtes accessibles, longues erreurs non sécables, absence de débordement de page, défilement au clavier, action d’acquittement conservée, historique et états vides. La fixture `/dev/support-tables` utilise uniquement des données synthétiques, sans accès base ni session, et reste HTTP 404 en production. Les tests serveur existants vérifient aussi le rendu de la vraie page, les filtres actifs/traités et le refus d’un marchand.

`npm run test:support-incidents -w @okado/web-app` couvre les vrais handlers, la DAL et le rendu de Supervision avec infrastructure simulée, puis la migration/RPC et son rollback sous PostgreSQL PGlite : admin uniquement, refus visiteur/marchand/origine étrangère, validation, identité non injectable, timestamp sans perte de précision, conflit sans faux succès, compteur exact au-delà de 20 lignes, filtre traités et exclusion des compteurs Pilotage/navigation. Les tests SQL contrôlent les droits anon/authenticated/service_role, la clôture idempotente, la réapparition après événement/statut nouveau, les anciens événements nuls et la conservation des données et reprises. Aucun e-mail réel ni écriture de production.

`e2e/support-email-incidents.spec.ts` teste le vrai bouton à 320/390/1280 px avec API interceptée : chargement, erreur de conflit, reprise, succès, absence de doublon et de débordement. La fixture est HTTP 404 en production et ne donne aucun accès administrateur. Les refus HTTP de la vraie route sont également exercés. Recette propriétaire : Supervision → Marquer comme traité → vérifier disparition de l’alerte et compteurs, puis filtre Traités → vérifier statut réel et date ; ne pas renvoyer l’e-mail pour ce test.

Chaque demande de merge ou de production doit indiquer, en quelques lignes :

- le résultat utilisateur livré ;
- les parcours testés ;
- les commandes exécutées et leur résultat ;
- les tests manuels à effectuer par le propriétaire ;
- les risques connus ou limites restantes.

## Performances des écrans marchands — #500

`test:page-performance`, les tests SQL complémentaires de `test:metrics` et `e2e/page-performance.spec.ts` contrôlent les charges utiles sans médias, la parité des indicateurs, les ACL privées, l'isolation multi-sites, les conditions des lots, la déduplication des alertes et les invalidations concurrentes. Les tests navigateur utilisent une fixture synthétique 404 en production et aucune base réelle. Voir [protocole avant/après et limites des mesures](releases/2026-10-14-page-performance-500.md).

## Popins de gain — #558

`e2e/gain-popins.spec.ts` couvre la roue et le ticket, en public/prévisualisation,
avec/sans conditions et collecte avant/après jeu. La première popin de gain ne
présente plus les conditions, mais la confirmation détaillée les conserve,
y compris en repli sur le résultat préparé si la réponse finale les omet. Les
tests contrôlent aussi dates/QR/téléchargement, consentement inchangé, échec et
nouvelle tentative, absence de lot et captures mobile/desktop. Serveur local en
mémoire, mutations et sorties HTTPS interceptées : aucun envoi ni écriture réelle.
