# Pilotage — dernière connexion (#411)

## Résultat et règle de lecture

Pilotage affiche **Dernière connexion** pour chaque utilisateur de sa liste.
Une ligne représentant un utilisateur, aucune agrégation par établissement n'est
effectuée. La source est `Supabase Auth.last_sign_in_at`, reliée exclusivement
par le `app_metadata.merchant_user_id` contrôlé côté serveur. Ce n'est ni une
dernière consultation de page ni une mesure d'activité continue.

- Date valide : date et heure françaises, dans le fuseau du navigateur, indiqué
  dans l'infobulle et avec son décalage dans l'heure affichée.
- Valeur explicitement nulle sur l'identité reliée : **Jamais connecté**.
- Identité absente/ambiguë, champ absent/invalide, erreur ou lecture incomplète :
  **Indisponible**. Aucune date d'inscription utilisée comme repli.

L'HTML initial utilise UTC explicitement puis l'hydratation affiche le fuseau du
navigateur. Exemple testé : 24 octobre 2026 à 23:30 UTC devient le 25 à 01:30 en
Europe/Paris, avant le changement d'heure. Une identité historique non reliée
reste indisponible plutôt que d'inférer une identité depuis un e-mail.

## Architecture et sécurité

Le contrôle de session et d'administration précède la lecture du repository.
Lecture groupée Auth Admin paginée par 200, sans appel individuel par compte ni
modification d'authentification, session, métadonnées ou permission. Pagination
par longueur de page (pas par `nextPage` du SDK), avec plafond défensif de
100 000 identités ; au-delà, toutes les dates sont indisponibles, jamais partielles.
Coût : une lecture supplémentaire pour moins de 200 identités, puis une par
page. Pas de cache persistant de données d'authentification.
La lecture Auth démarre dès réception des utilisateurs, en parallèle des autres
lectures de Pilotage. Sur cinq lectures réelles locales du 25 octobre :
65/120/50/52/109 ms, médiane 65 ms pour cette lecture supplémentaire (19 comptes,
une page). Ce n'est pas une mesure du temps complet de la page en production ;
le coût augmente avec le nombre de pages Auth.

Seuls l'état et la date normalisée sont ajoutés au DTO existant. Aucun identifiant
Auth, objet Auth ou nouvelle métadonnée personnelle n'est envoyé au navigateur,
dans les journaux ou dans les événements analytics. Les erreurs fournisseur ne
sont pas journalisées. Aucun nouveau endpoint public ni migration SQL.

Le contenu existant de la page est extrait dans `AdminDashboard` pour tester le
vrai tableau dans `MerchantShell`, sans duplication d'interface. Les données de
recette sont synthétiques ; la route `/dev/admin-last-sign-in` est interdite en
production. Les fiches et actions existantes restent inchangées.

## Vérifications

- `npm run test:admin-last-sign-in -w @okado/web-app` : 9 tests, dont refus avant
  lecture pour anonyme/marchand, liaison fiable, absence de fuite, états, erreurs,
  doublons, limite et pagination au-delà de dix pages.
- `npm run test:metrics -w @okado/web-app` : 21 tests, vrais agrégats et projection de la
  date Auth dans le repository, sans modification des totaux.
- `npm run test:admin-profiles -w @okado/web-app` : 17 tests des fiches et droits.
- `npm run test:support-incidents -w @okado/web-app` : 15 tests des alertes.
- `npx playwright test e2e/admin-last-sign-in.spec.ts --project=chromium` depuis
  `apps/web-app` : 4 tests, captures inspectées à 1280×720, 1280×600 et 390×844,
  absence de débordement, actions conservées, dates UTC/Paris et libellés mobile.
- Lint : aucune erreur ; quatre avertissements préexistants hors périmètre.
- Build de production : réussi.
- Contrôle réel en lecture seule le 25 octobre 2026 : 19 comptes, 19 dates
  disponibles, aucun changement ni détail nominatif exporté.

Les tests unitaires sont ajoutés au Quality gate ; les trois contrôles visuels
portent le tag `@visual-1280` déjà exécuté en CI.

## Recette propriétaire et retour arrière

Ouvrir Pilotage en administrateur, rechercher un compte, comparer la date à une
connexion connue ; vérifier avec un autre fuseau navigateur, puis sur mobile.
Une connexion persistante ne constitue pas une nouvelle connexion réussie.
Après validation : merge puis déploiement SaaS, sans opération SQL. En cas de
régression, revenir au déploiement précédent ou annuler le commit ; aucune donnée
ni structure à restaurer. L'issue reste ouverte jusqu'à livraison validée.
