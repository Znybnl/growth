# Socle sécurité — Okado

Ce socle couvre les règles minimales adaptées à un produit opéré par une seule personne. Il ne prétend pas constituer une certification ou un audit de sécurité complet.

## Accès et secrets

- Pierre-Henri BRUNELLE est le seul détenteur des accès de production, sauvegardes et secrets Vercel/Supabase.
- Les secrets sont stockés dans les variables d'environnement, jamais dans Git, les tickets, les PR, les captures ou les logs.
- Toute nouvelle personne ou intégration reçoit le minimum d'accès nécessaire ; les accès temporaires sont retirés dès la fin du besoin.

## Application et données

- L'authentification et les autorisations doivent être vérifiées côté serveur ; l'interface ne constitue jamais la seule barrière d'accès.
- Les politiques RLS Supabase sont vérifiées pour toute modification de données, de rôle, de multi-sites ou d'API publique.
- Les données d'un marchand ou établissement ne sont jamais accessibles à un autre périmètre non autorisé.
- Les QR de prévisualisation sont temporaires et isolés des stocks et indicateurs de production.
- Les codes de retrait et PIN marchand ne doivent jamais être exposés dans des journaux ou messages d'erreur publics.

## Fournisseurs et sous-traitance

- Les dépendances externes pertinentes incluent Supabase, Vercel, Resend et Stripe.
- Toute nouvelle intégration qui reçoit des données personnelles ou agit sur les parcours de jeu fait l'objet d'une analyse de sécurité et de conformité avant mise en service.
- Les rôles responsable de traitement / sous-traitant et les obligations contractuelles sont précisés dans `DOMAIN_RULES.md` ; la politique de conservation est suivie dans l'Issue [#1](https://github.com/Znybnl/growth/issues/1).

## Sauvegardes et restauration

- Objectif interne : perte de données maximale de 24 h et remise en service sous 8 h.
- La configuration effective des sauvegardes Supabase/Vercel, leur fréquence et une preuve de test de restauration doivent être documentées avant de revendiquer ces objectifs comme atteints.
- Une restauration de production ne se réalise jamais sans l'accord explicite de Pierre-Henri BRUNELLE et un plan pour préserver les données récentes.

## Contrôles avant livraison

- Lint et build de l'application touchée sont requis.
- Les changements d'authentification, autorisation, e-mail, retrait, paiement, données personnelles ou prévisualisation exigent une analyse et des tests dédiés.
- Les dépendances sont vérifiées régulièrement et toute exception de vulnérabilité est documentée avec sa justification et sa date de révision.

## Incident de sécurité

- Utiliser immédiatement le [runbook incident](INCIDENT_RUNBOOK.md).
- Limiter le périmètre exposé, préserver les éléments d'analyse et éviter toute donnée sensible dans une Issue publique.
- Toute communication externe ou notification réglementaire fait l'objet d'une décision du propriétaire avec conseil juridique adapté.
