# Runbook incident — Okado

Cette procédure vise le rétablissement rapide, sans exiger de connaissances techniques approfondies du propriétaire.

## Objectif interne de rétablissement

- **Perte de données maximale visée (RPO)** : 24 heures.
- **Délai de rétablissement maximal visé (RTO)** : 8 heures.

Ces objectifs internes ne constituent pas un engagement contractuel. Ils servent à dimensionner les sauvegardes, les tests de restauration et la priorité donnée à un incident.

## Quand l'utiliser

- une page de jeu, l'inscription, la connexion ou le retrait est indisponible ;
- une régression empêche les marchands ou joueurs d'utiliser un parcours critique ;
- une erreur peut affecter des données, des lots, des e-mails ou des autorisations ;
- un incident de sécurité ou une exposition de données est suspecté.

## Procédure courte

1. **Constater** : noter l'heure, l'URL ou le jeu concerné, une capture et le comportement observé.
2. **Qualifier** :
   - **P0** : indisponibilité, incident de sécurité, données erronées ou retrait incorrect à grande échelle ;
   - **P1** : défaut important mais contournable ou limité à un parcours secondaire.
3. **Rétablir** : pour un P0 lié à un déploiement, rollback Vercel vers le dernier déploiement sain avant toute analyse longue. Désactiver temporairement un jeu si le problème est isolé à ce jeu.
4. **Vérifier** : rejouer le parcours affecté, contrôler les erreurs et confirmer que la production est redevenue utilisable.
5. **Corriger** : créer une Issue, analyser la cause, préparer une branche et une PR avec les tests adaptés.
6. **Documenter** : ajouter à l'Issue la cause, l'impact, le correctif et une action de prévention. Aucun blâme ; l'objectif est d'éviter la répétition.

## Règles de sécurité

- Ne jamais supprimer, modifier ou restaurer massivement des données de production dans l'urgence sans analyse et accord explicite de Pierre-Henri BRUNELLE.
- Si une fuite de données est suspectée, limiter immédiatement l'accès concerné, préserver les éléments utiles à l'analyse et ne pas publier de détail sensible dans une Issue publique.
- Les sauvegardes et secrets sont accessibles uniquement par Pierre-Henri BRUNELLE.

## Décision simple

| Situation | Première action recommandée |
|---|---|
| Dernier déploiement a cassé un parcours public | Rollback Vercel immédiat. |
| Un seul jeu présente un comportement dangereux | Désactiver le jeu, puis analyser. |
| Données, autorisations ou sécurité sont en cause | Stopper le périmètre concerné et analyser avant toute modification. |
| Défaut visuel ou contournable | Créer une Issue et corriger par le cycle normal. |

## Après rétablissement

Un incident P0 doit produire une Issue de suivi avant le prochain déploiement important. Si un même type d'incident revient, ajouter un test automatisé ou un garde-fou au processus.
