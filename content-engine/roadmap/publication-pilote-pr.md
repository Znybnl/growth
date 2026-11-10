# Proposition de PR — Content Engine et publication du pilote

## Résultat

Le blog propose « Comment choisir les lots d’un jeu QR code pour son commerce ? », relu et validé éditorialement par Pierre-Henri BRUNELLE le 10 novembre 2026. L’article fournit des exemples fictifs par métier, un budget et un CTA vers Okado. Trois articles existants renvoient vers le pilote. Le Content Engine et ses contrôles sont intégrés ; trois autres articles restent des brouillons exclus des routes publiques, du catalogue et du sitemap.

## Validation et limites

La date de publication proposée est le 10 novembre 2026, si la mise en ligne est autorisée et effectuée ce jour-là. Si elle intervient plus tard, ajuster la date réelle et relancer le build et les contrôles avant livraison. Cette PR n'autorise ni le merge ni le déploiement. Aucune issue dédiée n'est documentée pour cette livraison ; ne pas en inventer une.

## Risques et retour arrière

Le changement touche la sélection des articles et les liens du blog ; les pages existantes doivent rester accessibles et conserver leurs dates. Les brouillons doivent répondre 404 dans le build de production. En cas de problème, annuler le commit de livraison ou remettre le pilote en brouillon et reconstruire ; vérifier les trois liens entrants et le sitemap. Aucune migration ni modification des fonctionnalités métier.

## Recette propriétaire

Ouvrir le pilote depuis `/blog`, vérifier titre, exemples, tableau sur téléphone, sources, CTA d'essai et trois lectures associées ; ouvrir les trois guides entrants et vérifier leurs liens. Confirmer que les trois autres brouillons ne sont pas accessibles en production. Valider explicitement le merge puis, séparément, la mise en ligne.

## Vérifications locales — 10 novembre 2026

- `npm run lint:landing` : réussi.
- `npm run build:landing` : réussi ; pilote généré, trois brouillons exclus.
- `npm run content:briefs`, `npm run content:audit`, `npm run content:test` : réussis (cinq briefs, 43 entrées auditées, quatre tests).
- `python -m unittest discover -s content-engine/scripts -p 'test_google_import.py'` : cinq tests réussis.
- Playwright `blog-drafts-production.spec.ts` et `seo-public-pages.spec.ts`, projets desktop et mobile : 18 tests réussis sur le build de production local. Tests ciblés du canonical, title, description, JSON-LD, sitemap, CTA, liens entrants et tableau mobile.
- Comparaison structurée des 39 articles existants avec origin/main : seuls trois liens associés vers le pilote sont ajoutés ; aucune autre différence de contenu ou de date.
- npm audit lors de l'installation a signalé trois vulnérabilités faibles liées à shadcn ; aucune correction majeure non demandée n'a été appliquée.
