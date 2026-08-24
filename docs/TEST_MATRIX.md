# Matrice des parcours critiques — Okado

Cette matrice est la référence courte des comportements à ne pas casser. Elle complète la [stratégie de test](TEST_STRATEGY.md) : chaque ligne indique une preuve observable, son niveau de couverture actuel et le prochain contrôle à ajouter.

Les identifiants `TM-XXX` sont à reprendre dans les Issues, les PR et les comptes rendus de livraison. Un statut **partiel** signifie qu'une partie du comportement est testée, mais qu'il reste un cas métier ou une interface importante à couvrir.

| ID | Parcours / règle | Préconditions | Action | Résultat observable attendu | Preuve actuelle | Statut |
|---|---|---|---|---|---|---|
| TM-001 | Inscription avec acceptation des conditions | Visiteur non connecté | Tenter de créer un compte sans cocher les conditions | L'inscription est bloquée et un message lisible est affiché | `apps/web-app/e2e/auth-public.spec.ts` | Automatisé |
| TM-002 | Connexion marchand et session | Compte `e2e@okado.app` configuré | Se connecter par e-mail puis ouvrir l'assistant de création | Le marchand quitte la connexion, n'est pas redirigé vers l'onboarding et voit le Wizard | `apps/web-app/e2e/authenticated-wizard.spec.ts` | Automatisé |
| TM-003 | Onboarding marchand | Nouveau compte marchand | Compléter les trois étapes et terminer | Les informations du marchand sont enregistrées et le tableau de bord s'ouvre | Vérification manuelle propriétaire | À automatiser |
| TM-004 | Enregistrement d'un brouillon dans le Wizard | Marchand connecté | Saisir un jeu incomplet puis enregistrer le brouillon | Le brouillon est enregistré, l'écran de confirmation propose prévisualisation, QR code et affiche, puis le jeu apparaît immédiatement dans Mes jeux | `apps/web-app/e2e/campaign-deletion.spec.ts` | Partiel : confirmation et suppression automatisées ; contrôle métier du brouillon à compléter |
| TM-005 | Publication depuis le Wizard | Marchand connecté, jeu complet et lots valides | Publier le jeu | Le jeu devient actif et son QR de diffusion est disponible | `apps/web-app/scripts/smoke-critical-flows.mjs` (API) | Partiel : interface Wizard à couvrir |
| TM-006 | Validation des dotations à la publication | Jeu avec lot invalide ou jeu 100 % gagnant incohérent | Tenter de publier | La publication est bloquée et l'anomalie est affichée dans la section Lots | Vérification manuelle propriétaire | À automatiser |
| TM-007 | Jeu public : roue | Jeu actif avec lot gagnant | Ouvrir le jeu, participer et terminer la roue | Une participation, un gain ou une perte sont enregistrés selon les règles du jeu | `apps/web-app/scripts/smoke-critical-flows.mjs` | Partiel : interaction visuelle à couvrir |
| TM-008 | Jeu public : ticket à gratter | Jeu ticket actif avec lot gagnant | Commencer à gratter la carte | La participation est enregistrée au premier grattage ; le lot apparaît seulement sous la zone révélée | Vérification manuelle propriétaire | À automatiser |
| TM-009 | Actions par visite | Joueur déjà identifié par e-mail, jeu avec plusieurs actions | Revenir lors d'une visite ultérieure | L'action proposée correspond au rang de visite ; elle précède le jeu | Vérification manuelle propriétaire | À automatiser |
| TM-010 | Collecte d'e-mail et consentement marketing | Jeu avec collecte activée | Saisir les coordonnées avant le jeu, avec ou sans consentement marketing | La collecte nécessaire au jeu est distincte du consentement marketing ; celui-ci ne conditionne jamais le jeu ni le gain | Vérification manuelle propriétaire | À automatiser |
| TM-011 | Gain et e-mail de gain | Jeu 100 % gagnant, boîte `e2e@okado.app` | Finaliser une participation | Le gain possède un code de retrait ; l'e-mail `[TEST]` est pris en charge par l'envoi pour la boîte dédiée | `apps/web-app/scripts/smoke-critical-flows.mjs` | Automatisé pour la prise en charge ; réception boîte à vérifier manuellement |
| TM-012 | Retrait normal et unicité | Gain disponible, marchand connecté | Rechercher le code et valider le retrait | Le retrait est journalisé ; une seconde validation est refusée | `apps/web-app/scripts/smoke-critical-flows.mjs` | Automatisé |
| TM-013 | Retrait forcé hors période | Gain hors période, PIN marchand et motif valide | Forcer le retrait depuis la page de validation | Le PIN et le motif sont exigés ; le retrait forcé est journalisé | Vérification manuelle propriétaire | À automatiser |
| TM-014 | QR de retrait | Code de retrait connu ou de test | Générer / ouvrir le QR de retrait | Un SVG est généré ; un code inconnu n'expose aucune donnée | `apps/web-app/e2e/public-safety.spec.ts` | Automatisé |
| TM-015 | Prévisualisation isolée | Jeton de prévisualisation valide | Tester le parcours jusqu'au gain | Les tests n'affectent ni les stocks ni les indicateurs de production | Écran de jeton invalide : `apps/web-app/e2e/public-safety.spec.ts` | Partiel : isolation métier à automatiser |
| TM-016 | Résultats, contacts et stock disponible | Jeu avec participations et ajustement de stock | Consulter Mes résultats puis modifier le stock | Contacts, indicateurs et stock disponible restent cohérents avec le jeu | Vérification manuelle propriétaire | À automatiser |
| TM-017 | Multi-sites et séparation des données | Marchand avec au moins deux établissements | Changer d'établissement ou déployer un jeu | Les données restent rattachées au bon établissement ; aucun périmètre non autorisé n'est accessible | Vérification manuelle propriétaire | À automatiser |
| TM-018 | Paiement | Parcours Stripe modifié | Ouvrir Checkout ou le portail client | Le statut d'abonnement est correctement répercuté dans l'espace marchand | Vérification manuelle uniquement lors d'un changement paiement | Hors exécution récurrente |
| TM-019 | Sécurité des parcours publics | Aucun accès marchand | Utiliser un QR de prévisualisation invalide ou un code de retrait inconnu | Un écran compréhensible est affiché sans fuite de donnée métier | `apps/web-app/e2e/public-safety.spec.ts` | Automatisé |
| TM-020 | Suppression d’un jeu marchand | Compte `e2e@okado.app`, brouillon de test | Ouvrir les actions du jeu, confirmer sa suppression | La pop-in est explicite et fermable ; après confirmation, le jeu disparaît immédiatement de Mes jeux | `apps/web-app/e2e/campaign-deletion.spec.ts` | Automatisé |
| TM-021 | Navigation du Wizard en modification | Compte `e2e@okado.app`, jeu brouillon existant | Ouvrir le Wizard en modification et sélectionner chaque étape dans Progression | Les cinq étapes restent accessibles sans perdre les données non enregistrées | `apps/web-app/e2e/wizard-edit-navigation.spec.ts` | Automatisé |

## Ordre de couverture à compléter

1. **TM-003 à TM-006** : onboarding, brouillon, publication et validation du Wizard ; ils conditionnent le basculement futur depuis le formulaire classique.
2. **TM-008 à TM-010** : ticket à gratter, actions par visite, collecte d'e-mail et consentement.
3. **TM-013 et TM-015 à TM-017** : retrait forcé, prévisualisation isolée, résultats/stocks et multi-sites.
4. **TM-018** : uniquement lorsqu'une évolution touche Stripe ou la facturation.

## Règles d'utilisation

- Une Issue non triviale concernée par un de ces parcours cite le ou les identifiants `TM-XXX` applicables.
- Une PR indique la preuve associée : chemin du test, commande exécutée ou procédure manuelle courte.
- Après un incident sérieux, ajouter ou renforcer la ligne correspondante avant la prochaine livraison importante.
- Le passage d'un statut à **Automatisé** exige un test stable exécuté localement au moins une fois ; il ne devient un check CI obligatoire qu'après validation du propriétaire.
