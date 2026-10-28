# Affiliation au niveau du compte marchand — #677

## Résultat

Un seul programme d'affiliation par compte marchand/workspace : activation,
code, taux, durée et historique restent identiques au changement d'établissement.
La gestion administrative liste les comptes inscrits du plus récent au plus
ancien, avec le nom et l'e-mail de connexion du propriétaire et le nombre de sites.
Elle inclut les comptes sans fiche d'affiliation ; leur code est créé lors de
l'activation administrative, sans dépendre d'une carte ni d'une visite de Mon compte.

La carte revient dans Mon compte / Utilisateur pour les propriétaires et
administrateurs d'un compte activé. Les autres rôles et les comptes désactivés
ne reçoivent pas son contenu. Les lectures sont privées, paginées et parallélisées
avec les autres réglages. Le mode local sans Supabase reste disponible sans carte.

La résiliation ne supprime pas le parrainage. Deux factures mensuelles payées,
trois mois interrompus et deux nouvelles factures mensuelles produisent quatre
commissions. La période initiale de 12 mois calendaires par défaut part du premier
paiement, avec fin exclusive. Elle ne repart pas à zéro à la reprise, même avec
un nouvel identifiant Stripe. Aucun paiement n'est inventé pendant une pause.
Les taux/durées configurés restent applicables ; les versements restent manuels.

## Analyse et données

Le code précédent listait seulement `affiliate_accounts` et créait une fiche via
une carte qui n'était plus montée dans Mon compte. Le statut canceled arrêtait
définitivement le calcul des commissions. Le contrôle initial constatait 16 fiches
désactivées, aucun filleul/commission/paiement, et trois workspaces avec des fiches
en doublon. Le nouveau répertoire lu sans écriture sur la cible retrouve 20 comptes
inscrits distincts, dont quatre multi-sites ; les workspaces sans propriétaire
inscrit ne sont pas présentés comme des comptes utilisateurs.

La migration conserve tous les codes, identifiants, paramètres et montants.
Elle choisit une fiche canonique par workspace (priorité à une fiche déjà active,
puis à l'ancienneté) et conserve les autres comme alias. Si plusieurs programmes
actifs d'un compte ont des paramètres contradictoires, la migration s'arrête et
annule toute la transaction plutôt que d'inventer une règle de fusion.
Les attributions possèdent les workspace_id parrain/filleul : un filleul ne peut
pas être attribué deux fois via ses sites, ni se parrainer au sein de son compte.

Le calcul SQL verrouille l'attribution et enregistre commission et fenêtre dans
une seule transaction. La facture Stripe reste unique. Les dates d'éligibilité
existantes sont conservées ; si elles manquent, les factures historiques donnent
la première date et la durée d'origine. Les API Stripe existantes restent utilisées.
La gestion des remboursements et le paiement manuel ne sont pas modifiés par #677.

## Migration à jouer AVANT déploiement

Fichier : `supabase/migrations/20261028110000_affiliate_merchant_accounts_677.sql`.

1. Identifier la sauvegarde/export selon le runbook de migration, noter le SHA
   candidat et le projet cible sans aucun secret.
2. Jouer le fichier SQL complet. Les triggers de compatibilité renseignent les
   nouveaux champs pour les anciennes écritures pendant l'intervalle de livraison.
   Ne pas modifier les paramètres d'affiliation pendant cet intervalle.
3. Depuis le candidat, lancer `npm run check:supabase` après configuration privée
   de la cible. Le script vérifie les colonnes, la RPC privée, les refus anonymes
   et utilise un montant zéro pour la sonde de commission : aucune facture réelle.
4. Déployer seulement après validation propriétaire et checks CI, puis vérifier
   le listing, les derniers inscrits et une carte d'un compte explicitement activé.
   Cette évolution n'active aucun compte automatiquement et n'effectue aucun virement.

La migration n'a pas été exécutée en production pendant le développement.

## Vérifications

```text
npm run test:affiliates -w @okado/web-app
npx playwright test e2e/affiliate-accounts.spec.ts --workers=1
npm run lint:web
npm run build:web
npm run verify:source
npm run check:dependencies
```

Tests du vrai repository, route administrative et page Mon compte avec infrastructure
simulée ; SQL et rollback réels sous PGlite. Couverture : plus de 1 000 inscriptions,
comptes manquants, e-mail de connexion, alias, changement de site, refus d'accès/
origine étrangère, reprise d'abonnement, doublons, montants nuls, borne de fin,
mois civil, droits SQL, compatibilité de l'ancienne version et atomicité en cas
d'échec après insertion. Aucun vrai abonnement ni paiement n'est créé par ces tests.

La fixture navigateur utilise le même écran d'administration que la route privée,
le vrai formulaire Mon compte et la copie du lien, dans le cadre de navigation.
Contrôles 1280×720, 1280×600 et mobile 320/390 px, API et sorties HTTPS interceptées.
La route `/dev/affiliate-accounts` est interdite hors développement.
Captures locales : `apps/web-app/test-results/affiliate-677-final/`.
Les suites Node, tests mobiles et captures 1280 px sont intégrés à la CI.

Résultats locaux : 17 tests d'affiliation (dont SQL/rollback), six tests navigateur
et sept non-régressions de session/performance réussis. Lint sans erreur, avec
les quatre avertissements de navigation préexistants. Build et TypeScript réussis,
scan UTF-8 réussi et audit des dépendances de production sans vulnérabilité.
Le smoke compilé vérifie trois refus : fixture 404, administration redirigée
vers la connexion sans session, activation API refusée (403) sans authentification.

## Recette et retour arrière

- Dans Affiliation, retrouver les derniers comptes par leur e-mail de connexion.
- Activer un compte de recette et vérifier sa carte dans Mon compte / Utilisateur,
  puis changer d'établissement : le code, le lien et les totaux doivent rester identiques.
- Désactiver le programme : carte absente après rechargement et nouvelles
  attributions/commissions suspendues, sans suppression de l'historique.
- En mode Stripe de test uniquement, jouer deux paiements, une résiliation puis
  deux paiements de reprise dans la fenêtre initiale : quatre commissions, jamais
  cinq au rejeu d'une facture. Une reprise hors fenêtre ne crée aucune commission.

Le SQL de retour arrière est dans
`supabase/rollback/20261028110000_affiliate_merchant_accounts_677.sql` et a été testé.
Il retire les nouveaux champs/contraintes/fonctions sans supprimer les lignes
d'origine ni les commissions produites. Pour revenir à l'application précédente,
la migration peut d'abord rester en place grâce aux triggers de compatibilité ;
retirer le SQL seulement quand la version précédente sert tous les utilisateurs.
L'ancienne administration présentera alors de nouveau les fiches par établissement.
