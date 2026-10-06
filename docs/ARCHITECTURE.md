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

## Notifications de gains (Issue #473)

Le prénom et le nom sont lus dans le lead lors de la préparation et copiés uniquement dans le job/payload privé ; les événements et logs restent non nominatifs. Les snapshots préparés demeurent stables pendant les reprises et suivent l’expurgation existante. Les anciens snapshots sans nom restent lisibles. Le lien de préférences contrôle la session et l’accès au site, sélectionne cet établissement via le cookie existant, puis ouvre Mon compte sans modifier la fréquence.

Le trigger d’insertion sur les **leads réels** enregistre un événement durable pour chaque préférence activée et autorisée. Aucune requête réseau dans ce trigger ; aucune modification de la table de prévisualisation. Les API de finalisation réelle appellent un worker dans `after()` (Next.js 16), sans nouvelle attente d’e-mail dans la réponse joueur. Le cron protégé récupère les interruptions et prépare les synthèses closes.

Les tables `merchant_gain_notification_preferences`, `merchant_gain_notification_events` et `merchant_gain_notification_jobs` ont RLS activée, sans accès anon/authenticated. Seules les routes serveur authentifiées utilisent la service role, avec contrôle multisite et origine des mutations ; les RPC privées revérifient les droits. Une lease transactionnelle et une clé Resend stable par job protègent les reprises. Le nom du site et le fuseau sont figés à la préparation, puis le HTML/texte/objet/expéditeur exacts avant l’envoi, pour conserver le payload même à travers les déploiements. Les parties contiennent au plus 40 gains, sans tronquer la période. Les détails, le payload et l’adresse sont effacés du job après acceptation ou annulation, et à l’effacement d’une participation concernée. Les événements sont supprimés par cascade avec le lead.

Le cron toutes les cinq minutes exige un forfait Vercel compatible et `CRON_SECRET`. Le dispatcher n’envoie que lorsque `VERCEL_ENV=production` et `MERCHANT_GAIN_NOTIFICATIONS_ENABLED=true`. Le drapeau est désactivé par défaut ; la migration SQL, la configuration et la validation des e-mails précèdent l’activation. Une acceptation fournisseur n’est pas une preuve de réception dans la boîte mail. Procédure et limites : [release #473](releases/issue-473-merchant-gain-notifications.md).

## À ne pas supposer

- Les règles RLS, les schémas Supabase et les API font foi dans le code et les migrations ; ils doivent être inspectés avant toute modification de données ou d'autorisation.
- Une nouvelle intégration externe, un nouveau sous-traitant ou un nouveau transfert de données exige une analyse avant implémentation.
