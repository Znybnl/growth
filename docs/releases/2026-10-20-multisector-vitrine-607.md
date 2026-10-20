# Une découverte cohérente par activité — #607

## Résultat et limites

Suite à l’évaluation de #601 et à l’accord du propriétaire du 20 octobre 2026,
la vitrine couvre plus équitablement Beauté, restauration et boutiques, sans
reconstruire le site. Ce complément rejoint la PR #606 de finition #605.

- Les trois premières cartes de la galerie d’accueil montrent respectivement
  un ticket Beauté, une roue restaurant et un ticket boutique. Six modèles
  réels au total ; galerie spécialisée de la page Ticket conservée.
- La démo d’accueil permet de choisir les trois activités. Boutique présente
  un ticket à gratter local, au pointeur, au toucher ou avec le bouton clavier
  Révéler le ticket. Le lot reste cohérent dans le formulaire, la confirmation
  et l’e-mail illustré. Les avis restent facultatifs et indépendants du résultat.
- Le bloc de lots propose trois activités. Seule Beauté affiche les coûts et
  probabilités indicatifs issus de la bibliothèque existante ; restaurant et
  boutique proposent des idées à saisir, sans prétendre à un catalogue nouveau.
- Les six spécialités Beauté adaptent les libellés de roue et le lot illustré
  dans le parcours commun, pas six campagnes persistantes. La galerie montre
  les vrais rendus ; la démo reste une simulation simplifiée du parcours.
- Le téléphone du hero ne masque plus les trois repères, aux cinq largeurs
  contrôlées. Le style, les captures et les espacements approuvés sont conservés.

Les fragments `#demo-beauty`, `#demo-restaurant`, `#demo-retail` et les six
identifiants de spécialité permettent des liens directs sans rendre les pages
dynamiques. Les ancres utilisent des liens natifs ; les navigations de page
conservent Next Link. L’abonnement au fragment est nettoyé au démontage et
compatible avec le rendu statique/hydratation. Un changement d’exemple démonte
le parcours précédent : annulation du timer, effacement des saisies et de la
note, pas de résultat différé ni de fin analytique inventée. Le retour navigateur
et le rechargement rétablissent le choix, pas les saisies.

Aucune dépendance, route/API métier, campagne, compte, migration, droit,
personnalisation enregistrée, offre ou envoi réel n’est ajouté/modifié. Les
pages SEO, articles, canonical, sitemap et attribution sont conservés.

## Mesure

Les événements existants sont réutilisés avec des identifiants éditoriaux fixes.
Les nouveaux choix d’activité et le contexte de spécialité permettent la lecture
ultérieure par secteur ; aucune coordonnée, note ou URL libre n’est envoyée.
Les paquets SDK sont interceptés en recette : aucun événement de test envoyé
à PostHog. Aucun rapport privé, token ou paramètre d’ingestion n’est modifié.
Voir le [protocole après livraison](../ANALYTICS_TRACKING.md#complément-multisectoriel--607-20-octobre-2026).
Une amélioration de conversion ne peut être déclarée avant des observations
réelles après déploiement et avec des volumes suffisants.

## Vérification

Commandes locales depuis le dépôt :

```powershell
npm run lint:landing
npm run build:landing
npm run verify:source
$env:PLAYWRIGHT_BASE_URL='http://localhost:3211'
npm run test:e2e -w @okado/landing-page -- --workers=3
```

Le build de recette utilise une clé d’ingestion synthétique et non un secret
réel. Les pages restent statiques (58 entrées). Les suites couvrent le parcours
de démo, l’indépendance des avis, les modèles, les spécialités, le ticket, les
UTM, le consentement, les métadonnées et les articles.

Résultats : lint, build et vérification source réussis. Suite complète :
**136 réussis, 8 ignorés volontairement**. Après les ultimes ajustements
d’ordre de galerie et de libellés de lots, nouveau lint/build et relecture des
cinq suites touchées (`multisector-demo`, `site-refresh`, `product-proof`,
`landing-conversion`, `landing-demo`) sur le build final : **80 réussis,
8 ignorés** avec 4 workers. Les sauts évitent de répéter la matrice visuelle
sur chaque projet et les tests tactiles sur desktop/tablette sans toucher.
Le premier passage ciblé avait révélé un sélecteur de test trop strict pour
le repère Joue (texte préfixé du numéro) ; sélecteur corrigé puis tests rejoués.

Les captures reproductibles sont dans `apps/landing-page/test-results/` :
`multisector-demo--visual-1-*/home-{320,390,768,1280,1440}.png`,
`demo-*.png` avec navigation réelle, et les dossiers du scénario trois secteurs
pour les états ticket/e-mail et les idées de lots. Inspection visuelle réalisée
sur le hero 1280×720, le sélecteur, le ticket, l’e-mail et les lots, ainsi que
le mobile. Aucun chevauchement introduit ; le repère Joue est dégagé.
Les longs contenus défilent normalement : les captures ne prétendent pas faire
tenir toute la page dans la hauteur du viewport. Pas de certification WCAG ou
de mesure des Core Web Vitals terrain par ces tests locaux.

## Recette propriétaire et retour arrière

1. Sur l’accueil, comparer les trois activités et ouvrir les modèles.
2. Depuis Boutique, essayer le ticket, recevoir le gain et ouvrir son e-mail.
3. Sur Beauté, choisir une spécialité et Essayer cet exemple : vérifier le lot.
4. Changer d’activité en cours de partie et revenir en arrière : aucune saisie
   conservée, aucune confirmation tardive.
5. Vérifier les repères du hero et le confort sur téléphone.

Risques : ancres/focus, saisies réutilisées, timer et attribution de secteur.
Tests dédiés et revue React : abonnement nettoyé, état isolé par clé, contrôles
clavier/toucher, pas de stockage ou d’effet réseau métier. Retour arrière par
revert du commit de ce complément ; aucun changement de données à annuler.
La fusion et la production restent soumises à validation explicite du propriétaire.
