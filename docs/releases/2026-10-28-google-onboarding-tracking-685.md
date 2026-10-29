# Onboarding Google — suivi #685

## Résultat

Le callback Google serveur réellement utilisé émet désormais `signup_completed`
lorsqu’il vient de créer le compte. Le mécanisme `after()`, la garde `isNew` et
le helper de capture existant sont les mêmes que pour la route de session
alternative. Une reconnexion ne devient pas une nouvelle inscription.

L’écran onboarding monte `MerchantAnalyticsIdentity` avant le formulaire. Le
compte principal et le site actif restent distincts ; seuls les identifiants
nécessaires et l’e-mail authentifié autorisé au profil sont fournis au composant.
L’écran partagé est utilisé à la fois par la page authentifiée et par une fixture
réservée au développement. Le garde de session serveur reste sur la vraie page.

Le formulaire capture début, affichage et validation des étapes `profil`,
`reseaux`, `pin`, ainsi que les échecs de validation, HTTP, réseau, réponse
illisible ou navigation. La validation PIN est mesurée après la réponse de
sauvegarde réussie. `onboarding_completed` reste un seul événement serveur.
Les effets dédupliquent le début et la vue inchangée, y compris en Strict Mode,
au focus et après accord tardif. Les transitions réelles peuvent être répétées.

## Données et limites

Les événements transmettent uniquement les clés d’étape et les types d’erreur
bornés, en plus du contexte technique existant. Aucun champ saisi, PIN, URL,
message libre ou profil Google n’est ajouté aux événements ordinaires.
Le consentement reste requis côté navigateur et serveur. Une panne de capture
ne bloque pas les transitions du formulaire ou le résultat enregistré.

Pas de migration, nouvelle dépendance, clé ou configuration PostHog. La cible
existante reste Okado 212872 / EU. Aucun compte historique n’est modifié et aucun
événement d’inscription passé n’est reconstitué. Une prochaine visite consentie
peut rattacher le navigateur s’il conserve encore son identité anonyme.
La sauvegarde progressive d’un brouillon n’appartient pas à cette correction.

## Vérifications

- `test:onboarding-tracking` : neuf tests réussis (six tests callback/écran/garde
  et trois tests existants des étapes). Auth, provisionnement et effets externes
  sont simulés ; redirections, cookies, reconnexion et panne analytics vérifiés.
- `test:analytics-consent` : dix tests réussis, couvrant client/serveur,
  identité, changement de compte/site, profil et consentement.
- `onboarding-tracking.spec.ts` : trois tests navigateur réussis avec le vrai
  écran et le SDK PostHog réel ; toutes les requêtes sont interceptées et la
  clé est fictive. Le lien anonyme → compte précède les événements, les champs
  privés restent absents des paquets et les échecs sont correctement classés.
- Captures des trois étapes en 1280 × 720 et erreur PIN sur mobile 390 px
  inspectées : formulaire défilant, actions accessibles, pas de débordement
  horizontal ni régression de mise en page. Captures locales sous
  `apps/web-app/test-results/onboarding-tracking-685/`.
- Lint SaaS : zéro erreur et quatre avertissements déjà présents. Build SaaS,
  TypeScript, vérification des sources et syntaxe YAML réussis. Les deux suites
  de tracking sont intégrées au workflow existant.
- Contrôle du serveur du build local : fixture de développement en 404,
  onboarding anonyme et callback Google sans code redirigés vers la connexion.

Ces vérifications ne simulent pas une vraie session chez le fournisseur Google
et n’envoient aucun événement à un projet PostHog réel.

## Recette après livraison et retour arrière

Lors d’une nouvelle inscription Google consentie, vérifier un seul
`signup_completed`, le profil de compte et les événements des trois étapes.
Reconnexion à un compte incomplet : retour sur onboarding sans nouvelle
inscription. Sans accord ou après retrait, le formulaire doit rester utilisable
sans événement analytics. Garder le contrôle des nouvelles données de production
dans #685 jusqu’à sa réalisation.

Retour arrière par revert applicatif et redéploiement, sans donnée ni schéma à
restaurer. Les événements déjà capturés restent historiques.
