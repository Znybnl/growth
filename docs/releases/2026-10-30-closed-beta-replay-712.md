# Replay SaaS de la bêta fermée — #712

## Décision et portée

Pierre-Henri BRUNELLE confirme le 30 octobre 2026 une autorisation contractuelle
validée avec le juridique pour la relecture des sessions SaaS de bêta fermée à des
fins d’amélioration. Sa dernière précision inclut **les comptes actuels et ceux
créés après le 30 octobre**, sans filtre de date. C’est une instruction du
propriétaire, pas une vérification juridique ni une preuve individuelle de signature
créée par le code. Les accords restent gérés par le propriétaire.

Le serveur autorise les utilisateurs SaaS authentifiés seulement lorsque
`OKADO_REPLAY_PHASE=closed_beta` et `POSTHOG_PROJECT_ID=212872`. Une valeur absente,
inconnue ou `public` désactive ce dispositif. Avant l’admission d’utilisateurs
publics, il faut donc changer ce réglage : aucune date d’ouverture n’a été fournie.

Le périmètre comprend l’accueil SaaS `/`, l’onboarding, la liste des campagnes,
leur création/édition, affiche/e-mail et la bibliothèque de fonds. Les pages de
jeu publiques et leurs iframes, l’authentification, les participants, Mon compte/
abonnement, les retraits et l’administration sensible sont exclus. Le replay
montre les interactions et la structure ; les contenus libres et images restent
masqués. Il ne permet donc pas une recette pixel à pixel des créations.

## Autorisation et confidentialité

- API privée `GET /api/analytics/beta-replay-policy`, `private, no-store`, `Vary: Cookie`.
  Identité issue de la session existante, sans paramètre d’éligibilité du client.
- Autorisation de cinq minutes, renouvelée toutes les quatre minutes, au focus
  et à chaque route/compte. L’échec HTTP, un format invalide, l’expiration,
  l’onglet masqué ou la déconnexion arrêtent la capture. Une réponse ancienne
  ne doit pas réactiver un enregistrement révoqué.
- Instance SDK distincte en mémoire, sans identifiant persistant de replay,
  sans profil ou e-mail ajouté, avec l’identifiant pseudonyme stable compte/utilisateur.
  Aucun événement produit ordinaire dans cette instance ; aucun accord cookies
  fabriqué ni modification de l’analytics existant.
- Saisies et textes masqués sauf une courte liste de libellés UI fixes ; attributs
  privés supprimés, en conservant seulement le CSS public compilé par Next.js pour
  que les replays gardent leur mise en page. Médias, images, SVG, canvas, iframes, éléments privés et contenus
  éditables bloqués. Ni console, ni corps/en-têtes réseau, ni capture JSON-LD.
  URL sans requête, fragment ou identifiant dynamique.
- Projet **212872 EU** exclusivement. Le contrôle privé du 30 octobre confirme
  le bon token local, l’activation des replays et la rétention configurée **30 jours**.
  Aucun réglage fournisseur ni enregistrement réel modifié pendant les tests.

## Livraison et activation

Pas de migration SQL ni de changement de forfait. Après validation propriétaire,
configurer côté serveur SaaS `OKADO_REPLAY_PHASE=closed_beta` et
`POSTHOG_PROJECT_ID=212872`, puis déployer cette configuration et la PR.
Conserver la clé d’ingestion existante, vérifiée pour 212872 ; aucune clé personnelle
PostHog ne doit être envoyée au navigateur. La valeur par défaut documentée reste
`public` pour éviter toute activation accidentelle dans un nouvel environnement.

En recette de production autorisée, vérifier un parcours de création/édition avec
cookies refusés, puis retrouver la session masquée dans le projet 212872. Un
bloqueur de contenus ou une panne réseau peuvent empêcher l’enregistrement ;
la capture n’est ni rétroactive ni garantie à 100 %.

Le recorder et les snapshots ajoutent du trafic navigateur→PostHog compté dans
son quota replay ; ils ne sont pas stockés dans Vercel. Le renouvellement privé
représente environ 15 requêtes/heure par onglet actif stable, plus les changements
de page/focus. Surveiller les quotas existants ; aucun nouveau service payant ajouté.

## Retour public / arrêt d’urgence

1. Mettre `OKADO_REPLAY_PHASE=public` ou retirer la variable, puis déployer.
2. La politique devient négative sans dépendre de Supabase. Les onglets existants
   s’arrêtent au renouvellement/focus ou à l’expiration de leur autorisation de
   cinq minutes, sans recharger leur JS. Ce n’est pas un arrêt simultané instantané.
3. Vérifier l’absence de nouveaux snapshots bêta, y compris pour les anciens comptes.
   Les buffers sont rejetés après révocation. Les données déjà transmises ne sont
   pas rappelées ; leur effacement reste une opération distincte chez PostHog.
4. L’analytics ordinaire conserve son consentement préalable. Le replay ordinaire
   reste désactivé ; un replay public sur consentement ferait l’objet d’une
   évolution distincte, avec ses critères et tests.

## Vérification

`npm run test:beta-replay -w @okado/web-app` : phase, nouveaux comptes, mauvais
projet, autorisation expirée, routes exclues, masquage et vraie route API avec
authentification simulée. `e2e/beta-replay.spec.ts` charge le SDK et le recorder
installés, intercepte les requêtes PostHog et inspecte les vrais snapshots DOM
**décompressés**. Données fictives uniquement, aucune ingestion réelle. Compléter
par les suites de consentement/identité existantes, le lint et le build.

Résultats locaux du 30 octobre : 7 tests spécifiques, 11 tests de consentement et
2 tests d’inventaire des pages passent ; les 16 scénarios navigateur bêta,
consentement et identité passent. Les trois variantes de choix cookies ont été
recontrôlées après la conservation du CSS public : mise en page présente et
contenus privés toujours absents des snapshots décompressés, même avec une
configuration distante de masquage permissive. Lint sans erreur (4 avertissements
préexistants hors périmètre), build SaaS et vérification UTF-8 valides.

Le serveur Next compilé a été démarré sur loopback avec configuration fictive :
phase publique → politique négative HTTP 200 ; phase bêta sans session → HTTP 401 ;
en-têtes privés/non cachés dans les deux cas ; POST → 405 ; fixture de preuve
`/dev/beta-replay` → 404 en production. Aucun accès Supabase ou PostHog réel dans
ces smoke tests. Ces vérifications ne constituent pas une preuve de déploiement.

Références : [contrôle du démarrage](https://posthog.com/docs/session-replay/how-to-control-which-sessions-you-record),
[masquage](https://posthog.com/docs/session-replay/privacy).
