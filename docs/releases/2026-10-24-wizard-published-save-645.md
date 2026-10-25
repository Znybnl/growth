# Enregistrer les modifications d’un jeu publié — #645

## Résultat utilisateur

Pour un jeu publié, le Wizard affiche « Enregistrer les modifications » comme
action principale dans la barre de commandes et au pied du formulaire.
Les boutons Publier et Publier la campagne disparaissent dans cet état.
Une indication précise que les modifications enregistrées sont immédiatement
visibles sur le jeu en ligne. Retour, Continuer, Prévisualiser, QR et Affiche
gardent leur rôle et leur emplacement.

Un brouillon conserve ses deux intentions : sauvegarder sans activer, ou publier
après validation complète. Dès la première publication, les commandes basculent
sur le comportement publié sans recharger la page.

## Implémentation et risques

`saveCampaign` résout le statut cible à partir du statut courant du formulaire,
pas de la seule présence d’une campagne initiale. Cela évite qu’une sauvegarde
après première publication dans le même écran repasse le jeu en brouillon.
Les validations complètes sont appliquées à toute sauvegarde dont la cible est
active, y compris avant prévisualisation et avant de quitter. Une erreur de
validation dans la confirmation de prévisualisation y reste visible.

Les mêmes endpoints et contrôles serveur sont conservés. Aucune migration,
modification d’accès, duplication de jeu ou version de travail supplémentaire.
Les données de lots, stocks, probabilités, actions et e-mails ne sont pas
recalculées par ce changement. La confirmation après sauvegarde reste celle
existante ; sa refonte est suivie séparément dans #577.

## Vérification

- `npx playwright test e2e/wizard-published-save.spec.ts --project=chromium`
  depuis `apps/web-app` : rendu publié à 1280×720/600 et 390×844 ; marchand/admin,
  roue/ticket ; erreur et reprise ; brouillon et première publication ;
  validations avant sauvegarde, prévisualisation et navigation.
- Suites de non-régression : `wizard-prize-budget.spec.ts` (sélecteur du nouveau
  libellé adapté), `wizard-responsive.spec.ts`, `wizard-polish-600.spec.ts`,
  `google-click-required.spec.ts` et `marketing-action-library.spec.ts`.
- `npm run lint:web`, `npm run build:web` et `npm run verify:source`.
- Captures en contexte MerchantShell inspectées, pas de nouvelle référence
  visuelle approuvée automatiquement. Tests avec données fictives/API interceptées.

La vérification élargie a révélé deux problèmes des anciens tests : les captures
de bibliothèque montaient le Wizard sans son cadre marchand (d’où les marges
négatives de la barre de commandes et un faux débordement de 12/24 px), et le
sélecteur mobile pouvait être actionné avant hydratation. Les captures utilisent
désormais la fixture MerchantShell existante ; le helper attend la variable CSS
écrite par l’effet de mise en page existant avant d’actionner la navigation.
Les assertions de débordement, focus et clavier sont conservées.

Résultats locaux : lint et build réussis (quatre avertissements lint préexistants,
hors périmètre), contrôle TypeScript `npx tsc --noEmit`, ESLint ciblé des quatre
fichiers de tests et vérification UTF-8 réussis. La suite élargie de 63 scénarios
a donné 58 succès initiaux ; les cinq échecs liés aux conditions de test décrites
ci-dessus ont tous réussi après correction et relance ciblée. Les 11 nouveaux
scénarios sont réussis. Aucun test n’envoie d’e-mail ni ne modifie la production.
Dernière relance après les corrections du helper : 22/22 succès pour
`wizard-published-save.spec.ts` et `wizard-responsive.spec.ts` (1 min 48 s).

## Recette propriétaire et livraison

Ouvrir un jeu publié : vérifier le bouton unique, modifier le texte puis
enregistrer ; le jeu reste en ligne et la modification est conservée à la
réouverture. Pour un brouillon, vérifier les deux choix, publier puis enregistrer
une seconde modification dans le même écran : le jeu doit rester publié.
Une saisie obligatoire invalide bloque l’enregistrement avec une indication.

Merge et déploiement après validation du propriétaire. Aucun SQL à appliquer.
Retour arrière : rétablir le déploiement applicatif précédent ; aucune donnée
ni migration à restaurer.
