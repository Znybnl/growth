# 0001 — Séparer le site marketing et le SaaS sur des sous-domaines

**Statut :** accepté

## Contexte

Okado expose à la fois un site marketing public et un SaaS marchand avec des parcours publics de jeu. Ces usages ont des cycles de contenu, des domaines et des déploiements distincts.

## Décision

Le dépôt conserve deux applications Next.js :

- `apps/landing-page`, déployée sur `okado.app` et `www.okado.app` ;
- `apps/web-app`, déployée sur `app.okado.app`.

Chaque application est configurée comme un projet Vercel avec son répertoire racine propre.

## Conséquences

- Les déploiements et régressions du site marketing et du SaaS sont isolables.
- Les variables d'environnement et domaines sont gérés séparément.
- Les changements partagés doivent être volontairement synchronisés entre les deux applications.

## Alternatives écartées

- Une application unique avec site marketing et SaaS mêlés : écartée pour conserver une séparation claire des domaines et des cycles de déploiement.
