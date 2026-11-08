# Liste Campagnes mobile — #763

## Résultat utilisateur

Filtres rapides Toutes/Actives/En pause avec compteurs; dix campagnes par page;
liens de pagination qui conservent recherche et statut. Les cartes mobiles
montrent jeu, participations et gagnants. Le bureau garde les cinq indicateurs,
dont lots utilisés et taux de consommation.

## Non-régressions et retour arrière

- Aucun changement aux statuts, calculs, permissions ni actions des campagnes.
- La recherche/filtre GET ramène à la première page ; les liens de pagination
  maintiennent les filtres. Les résultats restent en lecture seule.
- Aucune migration SQL, modification de données, dépendance ou nouvel appel API.
- Retour arrière : revert de la PR liée à #763.

## Vérifications

- Playwright : 11 réussis, 1 scénario ignoré car il requiert une authentification réelle non disponible localement. Contrôles ciblés aux largeurs mobiles 320×568, 390×740 et 412×844, avec recherche, statuts, pagination, états vides et conservation des filtres.
- Contrôle visuel dans le shell marchand à 1280×600 et 1280×720 ; captures mobiles et bureau conservées sous `apps/web-app/test-results/issue-763-final/`.
- Lint : terminé sans erreur ; quatre avertissements préexistants de navigation dans `sign-up-form.tsx`, `account-location-panel.tsx` et `location-manager.tsx`.
- Build de production Next.js : réussi (`next build --webpack`, TypeScript inclus).
- `git -c core.whitespace=cr-at-eol diff --check` : réussi. Le `git diff --check` standard signale les CRLF déjà utilisés par `docs/TEST_STRATEGY.md` ; aucun espace de fin n'est présent quand les CRLF sont interprétés correctement.
