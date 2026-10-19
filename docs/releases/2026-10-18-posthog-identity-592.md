# Identification des utilisateurs PostHog — #592

## Diagnostic et résultat

Audit du 18 octobre 2026, **212872 EU** vérifié par l'API privée avant lecture.
Le connecteur reçoit 404 sur ce projet ; l'accès privé local autorisé fonctionne.
Le nom du projet n'est pas une preuve d'identité : seul son identifiant a été
utilisé. Aucun accès au projet Mediatrak 272039.

Sur les sept derniers jours, l'utilisateur signalé correspond à **trois profils**
liés à trois identifiants établissement/utilisateur. Les trois portent le même
identifiant utilisateur technique ; deux sont identifiés, un ne l'est pas.
Le profil du compte principal possède déjà un e-mail historique ; les deux
autres ne l'ont pas. Le relevé ciblé des avertissements de fusion sur cette
période n'a retourné aucune ligne : on ne conclut pas à un rejet d'ingestion.
Aucune coordonnée ou clé privée n'est conservée dans ce compte rendu.

La cause vérifiée est l'utilisation de `session.merchant.id` / `merchant.id`
(site actif) pour former le distinct_id avec le user.id. Le shell rappelait
identify au changement d'établissement, donc changeait l'identité. La connexion
par mot de passe émettait aussi login_completed sans identifier auparavant.
Le filtre de confidentialité exclut volontairement les e-mails et $set : un
identifiant technique visible n'est donc pas, à lui seul, une absence d'identité.

## Correction

Conserver le format historique du compte principal **user.merchantId:user.id**,
partagé entre client et serveur. Cela réutilise le profil principal existant,
au lieu de créer une nouvelle convention pour tous les comptes. Les événements
gardent l'établissement actif dans merchantId ; les autorisations continuent
à utiliser le site actif, seul l'argument du tracking change.

Connexion, inscription et callback Google utilisent le compte principal du
payload authentifié. Login_completed passe par le transport immédiat avant
redirection, comme signup_started. Le shell vérifie l'identité aux changements
de route/site, focus/visibilité et consentement. Un ID inchangé ne produit pas
de nouveau paquet identify via le SDK. L'e-mail est actualisé au chargement de
session ou à son changement, pas à chaque route/focus.

Le composant d'identité est placé avant les écrans dans le shell : leur premier
événement métier au montage reçoit déjà l'identité canonique. Une page vue
automatique émise avant la résolution de la session applicative peut encore
porter l'identité navigateur de cette transition ; les événements antérieurs
ne sont pas réécrits.

L'anonyme initial reste rapprochable. Une identité déjà connue différente est
réinitialisée avant identification, pour ne pas fusionner deux comptes ni
rejouer indéfiniment une tentative de fusion historique. Déconnexion et panne
SDK sont couvertes. Pas de modification de l'authentification, session, compte,
établissement, permission, base, jeton, consentement ou masquage des joueurs.

## Historique et affichage de l'e-mail

Le profil principal contenant déjà l'e-mail du compte signalé est réutilisé pour
les prochaines visites après déploiement. Les deux autres profils restent dans
l'historique. Aucune fusion ou suppression de personne n'a été exécutée.
Une fusion manuelle des historiques serait irréversible et doit faire l'objet
d'une décision administrative explicite après vérification des deux profils.
Le propriétaire a ensuite explicitement confirmé l'affichage de l'e-mail des
utilisateurs connectés. L'adresse du payload/session authentifié est ajoutée au
profil après accord de mesure et actualisée sans changer l'identifiant. Les deux
applications partagent le même filtre : seul email dans le $set d'identification
du compte est autorisé ; coordonnées joueur, autres propriétés de profil,
$set_once et e-mails d'événements ordinaires restent exclus. L'e-mail n'est pas
stocké dans une super-propriété du SDK. Le bandeau, le texte de confidentialité,
la règle métier et le registre des traitements sont actualisés.

## Vérifications et recette

Tests sans réseau réel : `npm run test:analytics-consent -w @okado/web-app`.
Ils couvrent la parité des deux applications, le consentement/refus/retrait,
l'identité commune, la réparation après perte locale, le changement de compte,
le transport et le vrai handler QR avec le site actif et une campagne étrangère.

Avec une **clé fictive uniquement**, démarrer le serveur dédié puis :

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3340'
npx playwright test e2e/analytics-identity.spec.ts e2e/analytics-consent.spec.ts --project=chromium
```

Le vrai SDK est exécuté avec les sorties PostHog/Vercel et les API interceptées.
La fixture utilise le vrai shell : deux sites, autre utilisateur, perte d'identité,
focus, changement de route, retrait/reprise du choix et connexion par mot de passe.
Les paquets compressés réels sont inspectés, sans désactiver leur compression.
Le navigateur synthétique neutralise ses indices headless uniquement dans le test.
La fixture de développement est inaccessible en build de production.

Résultats : **9 tests unitaires/intégration**, **6 tests navigateur SaaS avec le
vrai SDK** et **3 tests navigateur du site public** réussis, y compris changement
d'e-mail sans nouvelle personne. Un job CI dédié relance les six contrôles SaaS
avec une clé fictive ; preuves d'échec conservées sept jours. Aucun événement
de test n'est transmis au projet réel. Bandeaux 1280×720 et mobile 320/390 px
capturés et inspectés. Build/TypeScript et lint des deux applications réussis
(4 warnings de navigation préexistants dans le SaaS). Le lint avait détecté un
nom de variable réservé dans le nouveau test de handler : renommé et relancé.
Contrôle source/UTF-8 et diff-check réussis. Serveur compilé : fixture **404**,
connexion **200**, accueil anonyme **307 /connexion**. Serveurs dédiés arrêtés.
Les six tests SaaS passent aussi en **CI=true** avec démarrage automatique du
serveur Playwright, sans serveur externe ni variable d'environnement réelle.

Résultats : **9 tests unitaires/intégration**, **6 tests navigateur avec le vrai
SDK** réussis, dont mise à jour d'e-mail sans nouvelle personne. Le job CI dédié
lance ces six contrôles avec une clé fictive et archive les preuves d'échec
pendant sept jours. Aucun événement de test n'est transmis au projet réel.
Le bandeau est capturé à 1280×720 et sur mobile 320/390 px pour inspection.

Rejouer lint, build/TypeScript et verify:source avant la PR. Les contrôles locaux
ne constituent pas une preuve de correction en production : vérifier après le
déploiement autorisé, avec un consentement actif, deux sites puis une reconnexion.
Les nouveaux événements doivent porter l'identité principale unique et le site
actif correct ; l'historique antérieur n'est pas réécrit.

Retour arrière : revert de la PR. Pas de migration ni donnée à restaurer ;
les identifiants historiques restent lisibles. Une nouvelle collecte d'e-mail
ou un rapprochement administratif n'est pas déclenché par ce retour arrière.
Le revert arrête les futurs envois du profil prévus par ce code ; il n'efface
pas les propriétés ou événements déjà reçus par PostHog. Une éventuelle demande
d'effacement reste une opération distincte.
