<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Références produit et métier

Avant de modifier le produit, consulter dans cet ordre les sources applicables :

1. règles métier approuvées et décisions ADR ;
2. Issue et critères d'acceptation validés ;
3. [Produit](docs/PRODUCT.md), [glossaire](docs/GLOSSARY.md), [règles métier](docs/DOMAIN_RULES.md), [architecture](docs/ARCHITECTURE.md), [stratégie de test](docs/TEST_STRATEGY.md), [checklist de livraison](docs/RELEASE_CHECKLIST.md), [socle sécurité](docs/SECURITY_BASELINE.md) et [runbook incident](docs/INCIDENT_RUNBOOK.md) ;
4. code et tests existants.

Un message de chat ou une demande orale ne devient pas une règle durable tant qu'elle n'est pas inscrite dans le document approprié. Ne pas inventer de règle métier, d'architecture ou de conformité lorsqu'elle n'est pas confirmée.

## Workflow de développement

Pour toute évolution, bug ou changement qui dépasse une correction évidente et localisée, suivre ce cycle :

```text
Issue → analyse → accord sur le plan → implémentation → tests → PR → validation propriétaire → merge → déploiement
```

- **Issue** : préciser le résultat utilisateur, le périmètre, les critères d'acceptation, les données concernées et les non-régressions attendues.
- **Analyse** : reformuler le besoin, inspecter l'existant, identifier les impacts, risques et tests. Demander l'accord avant de modifier si une décision produit, données, sécurité, conformité ou architecture est nécessaire.
- **Implémentation** : limiter le changement au besoin approuvé ; réutiliser le vocabulaire du glossaire ; mettre à jour la documentation concernée.
- **Tests** : exécuter les contrôles proportionnés au risque. Pour le SaaS, lancer au minimum le lint et le build de l'application touchée ; compléter par les scripts métier, sécurité ou smoke tests concernés.
- **PR** : relier l'Issue, résumer l'impact utilisateur, les risques, les preuves de test et le plan de retour arrière. Ne pas inclure de changements hors périmètre.
- **Validation et merge** : Pierre-Henri BRUNELLE est l'unique valideur des PR et l'unique personne habilitée à autoriser un merge ou un déploiement en production, sauf instruction écrite explicite contraire pour une intervention urgente.

Pour une petite correction déjà parfaitement définie, l'implémentation directe est autorisée, mais les vérifications réalisées doivent être rapportées.

## Branches, PR et validation simple

- Pour tout changement applicatif, utiliser par défaut une branche dédiée et une PR, même si Pierre-Henri BRUNELLE ne réalise pas de revue de code ligne à ligne.
- L'agent fournit dans la PR ou dans son compte rendu : résultat utilisateur, fichiers touchés, risques, commandes de vérification, résultat des tests et étapes de test manuel proposées.
- La validation du propriétaire porte sur le comportement et les preuves de test ; aucune compétence de revue de code n'est requise.
- Un push direct sur `main` est réservé à une correction documentaire évidente ou à une instruction explicite du propriétaire. En urgence, rétablir d'abord le service puis créer l'Issue et la PR de suivi.
- Quand une question est posée au propriétaire, ajouter immédiatement une section **Recommandation** proposant le choix le plus adapté et ses conséquences.
- Réglage GitHub recommandé : protéger `main`, exiger une PR et les checks CI, interdire le force-push et la suppression de branche. Ne pas exiger de seconde approbation GitHub tant qu'il n'existe qu'un seul valideur humain.

## Environnements

- **Local** : environnement de développement et de vérification avant soumission ; il peut contenir des données de test et ne constitue jamais une preuve de déploiement.
- **Production** : environnement accessible aux marchands et joueurs ; tout changement y est précédé des vérifications locales adaptées et de la validation explicite du propriétaire.

Il n'existe pas à ce jour d'environnement de préproduction autonome. La prévisualisation d'un jeu est une fonctionnalité produit isolée, et non un environnement de déploiement.

## Changements sensibles

- Toute migration Supabase doit être ajoutée dans `supabase/migrations/`, réversible ou accompagnée d'un plan de retour arrière, et validée contre les règles RLS concernées.
- Toute modification d'authentification, permissions, retrait de lot, e-mail transactionnel, prévisualisation, paiement ou données personnelles requiert une analyse des impacts et des tests dédiés.
- Ne jamais exposer de clé, secret, données personnelles ou contenu de `.env*` dans le code, les logs, les Issues ou les PR.

## Publication Git

Ce dépôt se publie directement avec Git via SSH. GitHub CLI (`gh`) n'est pas requis.

- Remote : `ssh://git@ssh.github.com:443/Znybnl/growth.git`
- Clé SSH : `C:\Users\PBRUNELLE\.ssh\key_git`
- Pour les commandes réseau Git, utiliser :
  `git -c core.sshCommand="ssh -i 'C:\\Users\\PBRUNELLE\\.ssh\\key_git' -o IdentitiesOnly=yes" <commande>`

Avant un push vers `main`, toujours récupérer et intégrer l'état distant (`fetch origin main`, puis rebase sur `origin/main` si nécessaire), vérifier lint/build, puis pousser. Ne jamais bloquer une publication parce que `gh` est absent.
