# Pilotage : comptes marchands et établissements — #688

## Résultat et origine

La carte « Comptes » comptait les lignes de `merchants`, qui représentent des
établissements. La seconde carte comptait uniquement les établissements avec
accès actif. Les deux valeurs ne mesuraient donc pas la même population.

Les cartes deviennent « Comptes » (comptes marchands inscrits) et
« Établissements » (total des sites). Les onboarding terminés et les accès actifs
restent visibles sous le total des établissements. Les valeurs sont calculées,
jamais fixées dans le code.

Vérification en lecture seule de la base le 28 octobre 2026 : **15 comptes**,
**31 établissements**, **28 onboarding terminés**. Les 17 workspaces techniques
ne sont pas tous des comptes inscrits : la résolution des propriétaires actifs
de l'annuaire existant donne bien 15 comptes. Le nombre d'accès actifs conserve
son calcul existant (15 lors de l'analyse) et évolue avec les essais/abonnements.

## Implémentation et limites

- Réutilisation de `buildAffiliateAccountDirectory`, sans lecture des programmes
  d'affiliation ni changement de leur activation.
- Réutilisation des établissements/utilisateurs déjà lus ; deux lectures
  paginées supplémentaires, en parallèle, pour les workspaces et adhésions.
- Aucun changement de droits : le calcul reste côté serveur, accessible depuis
  le Pilotage réservé à l'administration.
- Aucune modification de données, de facturation ou de statut des sites.
  Aucune migration SQL.
- Les établissements archivés restent inclus dans le total historique.
  Un échec de lecture du compte n'est pas converti en zéro.

## Vérification

La suite `test:admin-account-counts` couvre les comptes multisites, plusieurs
propriétaires, les adhésions inactives ou sans utilisateur, les workspaces sans
site, les conteneurs techniques, le site principal situé dans un autre compte,
la pagination au-delà de 1 000 lignes, les recherches et les erreurs de lecture.
Elle est exécutée dans la CI.

Résultat local : **66 tests métier/API/SQL réussis**, **4 tests navigateur
réussis**, lint sans erreur (4 avertissements préexistants hors périmètre),
build et `verify:source` réussis. Captures des KPI contrôlées visuellement aux
trois dimensions ci-dessous ; aucun débordement constaté. Le workflow YAML et
le diff sont également vérifiés.

Le scénario visuel `e2e/admin-last-sign-in.spec.ts` vérifie les deux cartes dans
une fixture avec un compte et trois établissements, à 1280 × 720, 1280 × 600 et
390 × 844, ainsi que l'absence de débordement et la présence des actions.

Commandes :

```text
npm run test:admin-account-counts -w @okado/web-app
npm run test:admin-last-sign-in -w @okado/web-app
npm run test:metrics -w @okado/web-app
npm run test:affiliates -w @okado/web-app
npm run test:support-incidents -w @okado/web-app
npm run lint:web
npm run build:web
npm run verify:source
```

Pour la recette après déploiement : ouvrir Pilotage en administrateur, vérifier
les totaux par rapport à la base du moment, puis filtrer l'annuaire et contrôler
que les totaux ne changent pas. Les autres indicateurs et actions restent
disponibles.

## Livraison et retour arrière

PR dédiée, validation propriétaire avant fusion/déploiement. Un revert du commit
suffit pour revenir à l'affichage précédent ; aucune opération SQL nécessaire.
