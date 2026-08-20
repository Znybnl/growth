# Architecture — Okado

Ce document décrit l'architecture utile à la maintenance du produit. Il privilégie une compréhension simple plutôt qu'une description exhaustive du code.

## Vue d'ensemble

```text
okado.app / www.okado.app  →  site marketing
app.okado.app              →  SaaS marchand et parcours publics de jeu
                                  ↓
                         Supabase (auth, données, fichiers)
                                  ↓
                    Resend (e-mails) · Stripe (paiement)
                                  ↓
                              Vercel (déploiement)
```

## Applications et domaines

| Élément | Rôle | Déploiement |
|---|---|---|
| `apps/landing-page` | Site marketing public | `okado.app` et `www.okado.app` |
| `apps/web-app` | SaaS marchand, pages de jeu, retrait et API | `app.okado.app` |
| Supabase | Authentification, base de données, stockage | Service géré externe |
| Vercel | Hébergement et déploiement des deux applications | Production |

## Environnements

- **Local** : développement et vérification avant livraison.
- **Production** : environnement accessible aux marchands et joueurs.
- Il n'y a pas de préproduction séparée. La prévisualisation d'un jeu est un parcours produit de test, isolé des données de production ; elle ne remplace pas une préproduction technique.

## Données et accès

- Le marchand est responsable de traitement pour les données de ses contacts. Okado est sous-traitant technique pour la plateforme.
- Les données d'un établissement ne doivent jamais être accessibles par un autre marchand sans autorisation explicite.
- Seul Pierre-Henri BRUNELLE détient les accès aux sauvegardes Supabase/Vercel et aux secrets de production.
- Les secrets restent exclusivement dans les variables d'environnement ; ils ne sont jamais inscrits dans le dépôt, les Issues, les PR ou les logs.

## Frontières fonctionnelles à préserver

- Les parcours publics (jeu, QR de retrait, prévisualisation) ne donnent pas accès à l'espace marchand.
- Un QR de diffusion, un QR de retrait et un QR de prévisualisation ont des usages distincts.
- La prévisualisation est explicitement identifiée et n'affecte ni stock ni indicateurs de production.
- Le retrait exige le PIN marchand ; un retrait forcé exige en plus un motif journalisé.

## Déploiement et retour arrière

- Les changements sont vérifiés localement puis publiés depuis `main` après validation explicite du propriétaire.
- Vercel déploie la production. En cas de régression, le rollback Vercel vers le dernier déploiement sain est prioritaire ; le correctif est analysé ensuite.
- Toute migration Supabase doit suivre les règles de `AGENTS.md` et posséder un plan de retour arrière.

## À ne pas supposer

- Les règles RLS, les schémas Supabase et les API font foi dans le code et les migrations ; ils doivent être inspectés avant toute modification de données ou d'autorisation.
- Une nouvelle intégration externe, un nouveau sous-traitant ou un nouveau transfert de données exige une analyse avant implémentation.
