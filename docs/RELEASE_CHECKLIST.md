# Checklist de livraison — Okado

Cette checklist tient en une minute. Elle s'applique à chaque changement applicatif avant merge ou déploiement.

## Avant merge

- [ ] L'Issue est liée si le sujet est non trivial.
- [ ] Le résultat utilisateur et les non-régressions sont décrits.
- [ ] Le lint et le build de l'application touchée sont verts.
- [ ] Le parcours touché a été testé ; un E2E ou smoke est ajouté si le risque le justifie.
- [ ] Les migrations, données sensibles, e-mails, authentification, retrait, prévisualisation, paiement ou autorisations ont été explicitement analysés lorsqu'ils sont concernés.
- [ ] La PR ou le compte rendu indique les tests réalisés, les limites et les étapes de validation fonctionnelle.

## Avant production

- [ ] Pierre-Henri BRUNELLE a validé le comportement attendu.
- [ ] Les checks GitHub requis sont verts.
- [ ] Aucun changement hors périmètre n'est inclus.
- [ ] En cas de migration ou de donnée sensible, un plan de retour arrière est connu.

## Après production

- [ ] Ouvrir la page ou le parcours modifié en production.
- [ ] Vérifier l'absence d'erreur visible ou de régression immédiate.
- [ ] Si le parcours est critique et échoue, appliquer le [runbook incident](INCIDENT_RUNBOOK.md) : rollback avant analyse longue.

## Exceptions

Une urgence suit le même objectif : rétablir le service d'abord, puis créer l'Issue et la correction documentée. Toute exception doit être explicitement autorisée par Pierre-Henri BRUNELLE.
