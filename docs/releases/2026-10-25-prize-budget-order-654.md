# Wizard : ordre du budget et coût de revient — #654

## Résultat

À l’étape Les lots, le bloc Budget estimé des gains apparaît après les
Règles de participation et de validité, comme élément frère : il reste affiché
quand les règles sont repliées. La liste des lots indique Coût de revient
dans son en-tête ordinateur et sur chaque carte mobile.

Un seul fichier applicatif touché : campaign-wizard.tsx. Le même composant
WizardPrizeBudget, les mêmes props et callbacks sont réutilisés. Aucun calcul,
état, champ de formulaire, coût unitaire, valeur de lot ou règle modifié.
Pas de migration, dépendance, nouvelle API ou écriture en base.

## Vérification / recette

- Nouveau test wizard-prize-order-654.spec.ts : roue/ticket dans MerchantShell,
  ordre DOM liste→règles→budget, règles repliées/ouvertes, montant inchangé,
  libellé desktop/mobile, alignement, absence de chevauchement et de débordement.
- Captures à1280×720,1280×600 et320/390px, API interceptées, aucun POST réel.
- Rejouer wizard-prize-budget.spec.ts et test:prize-budget pour les calculs,
  coûts manquants/zéro, édition et sauvegarde.
- Lint et build SaaS, contrôle des sources et diff avant publication de la PR.

Recette propriétaire : étape Les lots sur roue puis ticket ; vérifier Coût de
revient et le budget sous les règles. Ouvrir/replier les règles : le budget
reste indépendant et conserve son estimation. Renseigner un coût manquant via
son raccourci conserve le comportement habituel.

Frontend-design : présentation existante conservée, ordre réel du document
modifié plutôt qu’un ordre CSS divergent du clavier. Aucune logique React ajoutée.

## Livraison / retour arrière

## Résultats des contrôles

- Tests navigateur : 10/10 réussis (ordre responsive et non-régressions budget).
- Tests métier du budget : 5/5 réussis.
- Lint SaaS : aucune erreur, quatre avertissements préexistants hors périmètre.
- Lint du nouveau test : réussi.
- Build SaaS, vérification des sources et contrôle du diff : réussis.

## Publication

Issue et PR dédiées ; validation propriétaire avant merge/déploiement.
Retour arrière : revert applicatif uniquement, aucune donnée à restaurer.
