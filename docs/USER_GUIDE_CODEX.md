# Guide propriétaire — travailler avec Codex sur Okado

Ce guide permet de piloter les évolutions d'Okado sans devoir relire le code. Pierre-Henri BRUNELLE valide le besoin, les choix importants et le résultat visible ; Codex analyse, implémente, teste et prépare la PR.

## Le cycle simple

```text
Besoin → Issue → analyse Codex → accord sur le plan → implémentation → tests → PR → validation propriétaire → merge → déploiement
```

Une correction petite, évidente et sans impact métier peut être traitée directement. Dès qu'un sujet touche un parcours, des données, une règle métier, la sécurité ou l'architecture, une Issue et une analyse sont requises.

## Où trouver la règle de référence

Avant une décision ou une demande importante, consulter :

1. les [règles métier](DOMAIN_RULES.md) et les [ADR](adr/README.md) ;
2. l'Issue concernée et ses critères d'acceptation ;
3. le [produit](PRODUCT.md), le [glossaire](GLOSSARY.md), la [matrice de test](TEST_MATRIX.md) et la [stratégie de test](TEST_STRATEGY.md).

Le vocabulaire à privilégier est celui du glossaire : notamment **jeu**, **établissement**, **retrait** et **prévisualisation**.

## Créer une demande claire

Pour une évolution ou une anomalie non triviale, créer une Issue avec le modèle GitHub puis transmettre :

> Travaille sur l'Issue #NUMÉRO. Consulte `AGENTS.md` et les documents concernés. Commence par analyser l'existant et reformuler le résultat utilisateur, les impacts, risques et tests à prévoir. Attends mon accord avant toute modification si une décision produit, données, sécurité, conformité ou architecture est nécessaire. Implémente ensuite le plus petit changement conforme aux critères d'acceptation, mets à jour la documentation, exécute les tests prévus et prépare la PR.

Une demande utile contient toujours :

- qui utilise le parcours : marchand, joueur, personnel du commerce ou administrateur ;
- ce que la personne fait et ce qu'elle doit constater ;
- les écrans, données ou jeux concernés ;
- ce qui ne doit pas régresser ;
- les captures, erreurs ou exemples utiles.

Pour une correction directement autorisée, ajouter :

> Tu peux implémenter directement, puis me donner les vérifications réalisées.

## Lire et valider une analyse

Avant de donner l'accord, vérifier quatre points :

- le résultat utilisateur est exprimé avec les bons termes métier ;
- les critères d'acceptation permettent de constater objectivement que cela fonctionne ;
- les données, autorisations, e-mails, retraits, paiement ou prévisualisation sont identifiés s'ils sont concernés ;
- les tests prévus citent les parcours `TM-XXX` concernés dans la [matrice](TEST_MATRIX.md).

Si Codex pose une question, la réponse doit inclure une **Recommandation**. Vous pouvez répondre simplement : « OK avec ta recommandation » ou indiquer le choix retenu.

## Valider une PR sans revue de code

La validation porte sur le comportement, pas sur une lecture ligne par ligne du code. Avant de valider une PR, contrôler :

- [ ] le résultat utilisateur correspond à l'Issue ;
- [ ] les critères d'acceptation possèdent une preuve : test, démonstration ou procédure manuelle ;
- [ ] les checks GitHub requis sont verts, ou une exception est explicitement expliquée ;
- [ ] les documents métier, la matrice de test ou les ADR sont mis à jour lorsque nécessaire ;
- [ ] les risques résiduels et le retour arrière sont compréhensibles ;
- [ ] le test fonctionnel proposé a été réalisé pour tout changement visible ou sensible.

Lorsque la PR est prête, donner une autorisation explicite :

> Je valide la PR #NUMÉRO et autorise le merge.

Le merge et le déploiement en production ne sont pas effectués sans cette autorisation, sauf urgence explicitement déclarée.

## Demander une mise en production

Après le merge, vous pouvez écrire :

> Je valide le déploiement en production de la PR #NUMÉRO. Vérifie les checks, puis déploie et contrôle le parcours concerné en production.

Le compte rendu doit indiquer le résultat livré, les tests exécutés, les contrôles manuels à faire et toute limite connue. La [checklist de livraison](RELEASE_CHECKLIST.md) sert de repère avant mise en production.

## Réagir à une urgence

Si un parcours public, la connexion, la création de jeu ou le retrait est indisponible, écrire :

> Incident de production : [symptôme observé]. Suis le runbook, limite l'impact et explique-moi l'action de rétablissement proposée avant toute modification de données.

Le [runbook incident](INCIDENT_RUNBOOK.md) privilégie le retour au dernier déploiement sain ou la désactivation du jeu concerné. Les restaurations et suppressions massives de données nécessitent toujours votre accord explicite.

## À ne jamais transmettre dans une demande

- mot de passe, clé API, secret Supabase, Vercel, Stripe ou Resend ;
- contenu d'un fichier `.env*` ;
- données personnelles d'un joueur ou d'un marchand si elles ne sont pas indispensables au diagnostic.

Les informations sensibles doivent rester dans les variables d'environnement ou les tableaux de bord des services concernés.

## Rythme conseillé

- **Après chaque PR** : valider le comportement visible et autoriser explicitement le merge ou demander des ajustements.
- **Chaque mois** : demander un état des lieux des tests manquants, incidents, dépendances et documentation obsolète.
- **Après un incident sérieux** : vérifier que la [matrice](TEST_MATRIX.md) et les protections associées ont été mises à jour.
