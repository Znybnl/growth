# Déblocage des dépendances de production — PR #627 / suivi #570

Autorisation du propriétaire le 23 octobre 2026. L'audit de production signale
Next.js 16.3.8 et DOMPurify 3.4.16 via PostHog. Les nouvelles plages d'avis
exigent de réviser la version précédemment validée, sans dégrader le garde-fou.

- Next et eslint-config-next exacts 16.4.2 sur les deux applications.
- DOMPurify 3.4.17 dans le lockfile ; PostHog reste dans sa plage déclarée.
- `npm audit fix` sans `--force`, mises à jour transitives compatibles seulement.
- Exceptions vides, rapport absent/incomplet et sortie non nulle toujours refusés.
- Audit production : zéro vulnérabilité ; huit tests du garde-fou réussis.
- Audit complet : neuf alertes high de développement restent dues à braces et
  sa chaîne fast-glob/micromatch (ESLint/shadcn). Pas de version braces corrigée
  publiée au contrôle ; ni downgrade Next/ESLint/shadcn ni override incompatible.
  Ce suivi ne doit pas être confondu avec une production sans alertes connues.
  Voir #571 pour l'outillage ; aucune exception n'est ajoutée à l'audit production.

Sources mainteneurs :
[Next Image](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[DOMPurify](https://github.com/advisories/GHSA-cg2g-xh64-v4q7).
Une alerte de version n'est pas une preuve d'exploitation. Aucun test offensif,
écriture de base ou e-mail réel. Retour arrière par revert des manifestes et
lockfile uniquement sur décision propriétaire, en signalant le risque réintroduit.
