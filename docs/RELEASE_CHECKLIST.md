# Checklist de livraison — Okado

Cette checklist tient en une minute. Elle s'applique à chaque changement applicatif avant merge ou déploiement.

## Avant merge

- [ ] L'Issue est liée si le sujet est non trivial.
- [ ] Le résultat utilisateur et les non-régressions sont décrits.
- [ ] Le lint et le build de l'application touchée sont verts.
- [ ] Le parcours touché a été testé ; un E2E ou smoke est ajouté si le risque le justifie.
- [ ] Pour chaque écran créé/modifié : test et capture **1280×720**, vrai cadre de navigation, inspection des états touchés, pas de débordement ni d'action masquée ; **1280×600** pour les écrans denses et contrôle mobile pertinent. Test `@visual-1280` ajouté/adapté, captures jointes au rapport de PR. Une capture générée n'est pas une validation visuelle automatique.
- [ ] Les migrations, données sensibles, e-mails, authentification, retrait, prévisualisation, paiement ou autorisations ont été explicitement analysés lorsqu'ils sont concernés.
- [ ] Pour une migration Supabase, le [runbook de release](MIGRATION_RELEASE_RUNBOOK.md) a été suivi et la cible est contrôlée depuis le commit candidat.
- [ ] Pour une migration de cycle de vie des données, la cible Supabase confirme les tables/RPC attendues et la preuve de contrôle est conservée sans donnée personnelle.
- [ ] Pour le tracking PostHog, le projet cible est vérifié (**212872 / EU**) et la base légale, le consentement et les durées de conservation sont validés avant activation d'un usage non essentiel.
- [ ] La PR ou le compte rendu indique les tests réalisés, les limites et les étapes de validation fonctionnelle.

## Avant production

- [ ] Pierre-Henri BRUNELLE a validé le comportement attendu.
- [ ] Les checks GitHub requis sont verts.
- [ ] Aucun changement hors périmètre n'est inclus.
- [ ] En cas de migration ou de donnée sensible, un plan de retour arrière est connu.
- [ ] La purge de données personnelles n'est activée qu'après validation explicite du propriétaire et vérification de `MAINTENANCE_ENABLED` dans l'environnement de production.
- [ ] Le SHA testé, le SHA déployé, l'état du schéma et la preuve de sauvegarde sont consignés sans secret.

## Après production

- [ ] Ouvrir la page ou le parcours modifié en production.
- [ ] Si la maintenance est activée, exécuter ou observer un passage authentifié et conserver uniquement le résultat agrégé (`archived*`, `deleted*`, erreurs), sans export de données personnelles.
- [ ] Vérifier l'absence d'erreur visible ou de régression immédiate.
- [ ] Si le parcours est critique et échoue, appliquer le [runbook incident](INCIDENT_RUNBOOK.md) : rollback avant analyse longue.

## Exceptions

Une urgence suit le même objectif : rétablir le service d'abord, puis créer l'Issue et la correction documentée. Toute exception doit être explicitement autorisée par Pierre-Henri BRUNELLE.
