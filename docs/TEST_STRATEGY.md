# Stratégie de test — Okado

L'objectif est de détecter les régressions importantes sans transformer le projet en processus lourd. Une livraison est validée sur le comportement, pas sur une revue de code manuelle par le propriétaire.

## Règle simple

1. L'agent exécute les contrôles adaptés au changement.
2. L'agent explique en langage clair ce qui a changé, les risques et les résultats.
3. Pierre-Henri BRUNELLE réalise seulement le test fonctionnel indiqué lorsque le changement est visible ou sensible.
4. Le merge et la production attendent son accord explicite.

## Contrôles automatisés existants

| Contrôle | Usage |
|---|---|
| `npm run verify:source` | Vérifie les fichiers critiques et l'encodage. |
| `npm run lint:web` / `npm run lint:landing` | Vérifie la qualité statique de l'application touchée. |
| `npm run build:web` / `npm run build:landing` | Vérifie que l'application touchée se construit. |
| `npm run smoke:critical` | Exerce les flux critiques avec un compte et un environnement explicitement configurés. À lancer uniquement avec l'autorisation adaptée, car il crée puis nettoie des données de test. |
| `npm run smoke:security` | Vérifie les garde-fous de sécurité prévus par le projet. |
| `npm run test:e2e` | Lance les tests navigateur Playwright du SaaS. Le serveur local démarre automatiquement, sauf si `PLAYWRIGHT_BASE_URL` désigne une URL de test explicite. |

La CI GitHub exécute la vérification de source, le lint et le build de l'application web, ainsi que le lint et le build du site marketing, pour les PR et `main`.

## E2E : mise en place progressive

Le socle Playwright est suivi dans l'Issue [#2](https://github.com/Znybnl/growth/issues/2). Les premiers tests non destructifs couvrent les pages de connexion et d'inscription, l'explication d'un QR de prévisualisation invalide et l'absence de donnée révélée par un code de retrait inconnu. Un test d'accès au Wizard existe aussi, mais ne s'exécute qu'avec un compte de test fourni explicitement par `OKADO_E2E_EMAIL` et `OKADO_E2E_PASSWORD`.

### Compte de test de référence

- **Adresse** : `e2e@okado.app`.
- **Usage** : seul compte autorisé pour les E2E qui s'authentifient ou créent des données métier.
- **Secret** : les variables `OKADO_E2E_EMAIL` et `OKADO_E2E_PASSWORD` restent uniquement dans `apps/web-app/.env.local` et, lorsque les E2E seront exécutés en CI, dans les secrets GitHub Actions. Elles ne sont jamais versionnées ni nécessaires au runtime Vercel de production.
- **Cloisonnement** : le compte possède son établissement et son workspace dédiés. Tous les jeux et données créés par les tests commencent par `E2E —` et sont nettoyés à la fin du scénario lorsque cela est possible.
- **Nettoyage** : chaque nouvelle session supprime les jeux, participations et données de test créés lors de son exécution ; aucun jeu E2E ne doit rester utilisable après un test réussi.
- **E-mails de gain** : leur envoi vers `e2e@okado.app` est explicitement autorisé afin de vérifier le parcours de bout en bout. Les e-mails créés par le smoke portent l'objet `[TEST]` et le test vérifie leur prise en charge par le système d'envoi. Aucun autre destinataire ne doit être utilisé par défaut.
- **Interdiction** : ne jamais diffuser ses QR codes, l'utiliser pour un commerce réel ou mélanger ses données à celles d'un marchand existant.

Les tests E2E ne deviennent des checks CI obligatoires qu'après stabilisation d'un parcours. Cette progression évite qu'un test instable bloque les livraisons.

## Parcours bloquants

Un changement qui touche l'un de ces parcours doit avoir une preuve de test automatisée ou manuelle avant production. Si le parcours échoue, la livraison est bloquée.

| Parcours | Vérification minimale |
|---|---|
| Inscription, connexion et session | Créer ou connecter un compte, arriver au bon espace et conserver la session. |
| Onboarding et Wizard | Accéder au Wizard, enregistrer un brouillon, compléter puis publier un jeu valide. |
| Jeu public | Ouvrir le QR de diffusion et jouer sur roue et ticket à gratter. |
| Actions et collecte e-mail | Vérifier l'ordre des actions par visite, la collecte indépendante et le consentement marketing facultatif. |
| Gain et e-mail | Vérifier le résultat, le code/QR de retrait et l'e-mail correspondant. |
| Retrait | Vérifier le PIN, le retrait normal, le retrait forcé avec motif et le blocage d'un second retrait. |
| Prévisualisation | Vérifier l'isolation des stocks et indicateurs. |
| Résultats, export et stocks | Vérifier les indicateurs, les contacts et la cohérence du stock disponible. |
| Multi-sites | Vérifier la séparation des établissements et le changement de site. |
| Paiement | Vérifier le parcours uniquement lorsqu'il est modifié. |

## Choisir le bon niveau de test

- **Changement visuel localisé** : lint, build et vérification visuelle de la page touchée.
- **Changement métier ou API** : lint, build, test du parcours concerné et non-régression des autorisations/données.
- **Changement auth, jeu, gain, retrait, e-mail, paiement, prévisualisation ou multi-sites** : contrôles précédents + smoke ou E2E adapté + validation fonctionnelle du propriétaire.
- **Évolution majeure** : régression complète de tous les parcours du tableau avant production.

## Compte rendu attendu

Chaque demande de merge ou de production doit indiquer, en quelques lignes :

- le résultat utilisateur livré ;
- les parcours testés ;
- les commandes exécutées et leur résultat ;
- les tests manuels à effectuer par le propriétaire ;
- les risques connus ou limites restantes.
