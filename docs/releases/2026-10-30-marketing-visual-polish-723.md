# Site vitrine — qualité visuelle et découverte #723

Le propriétaire a validé l’application des recommandations de l’audit visuel.
Hero conservé, navigation mobile repliable avec fermeture clavier et liens
accessibles, bandeau d’essai masqué uniquement sur petit écran (conditions
toujours sous le CTA). Les trois activités de démo tiennent sur une ligne mobile,
avec noms accessibles complets et mêmes ancres/événements.

Le panneau cookies du site passe à un résumé et des détails natifs dépliables,
à droite avec le lanceur sur ordinateur. Sur mobile, le lanceur suit le pied de
page pour ne pas recouvrir les sélecteurs ou les commandes. Les textes détaillés existants et les actions restent
disponibles ; aucune règle de consentement/collecte n’a changé. À 390 px le
panneau fermé mesure environ 354 px de haut, contre près de 490 px auparavant.
L’application SaaS conserve son composant de consentement existant.

Les cartes sectorielles reprennent les téléphones de la démo, identifiés comme
extraits fictifs. Le catalogue de six modèles reste réel et distinct : typologie
plus lisible et libellé Agrandir. Une mise en situation d’affiche réutilise le
visuel illustratif `restaurant-a5-counter.webp` existant, explicitement légendé
comme tel ; ce n’est ni une photo client ni une capture du générateur d’affiche.
La section de suivi prune montre un extrait des vrais composants marchands,
avec 3 jeux synthétiques (1260 scans / 882 participations). Les chiffres ne sont
pas des résultats clients. La capture complète peut s’ouvrir sans authentification,
elle ne contient ni personne réelle, e-mail, PIN ou identifiant de production.

## Provenance et reproduction des captures

- Console : `apps/web-app/e2e/marketing-product-captures.spec.ts`, mode local
  `dashboard-responsive-marketing`, dans MerchantShell, API simulées et requêtes
  HTTPS bloquées. Seule la fixture E2E est modifiée côté SaaS.
- Téléphones : `scripts/capture-marketing-previews.cjs`, vrais composants de la
  démo du site ; attend les polices et le décodage du fond CSS Rose poudré.
- Le premier jeu de captures a été pris sur la version publique 9cfbdbc, puis
  recapturé sur la branche locale après attente explicite du fond CSS.
- Exécuter le test de capture contre le serveur SaaS local, puis le script depuis
  la racine avec `MARKETING_CAPTURE_URL` pointant vers le site local (3258 par
  défaut). Conversion Sharp WebP ; aucune reconstruction de l’interface.

## Validation

- Lint et build landing : succès, 66 pages ; build de vérification avec les
  variables publiques fictives `NEXT_PUBLIC_POSTHOG_KEY=phc_consent_fixture` et
  `NEXT_PUBLIC_POSTHOG_ENABLED=true`, comme la CI.
- Lint SaaS : succès, quatre avertissements de navigation préexistants dans
  d’autres fichiers ; build SaaS : succès, 87 routes/pages.
- Capture produit native : 1 test réussi, 16,7 s.
- Régression landing : 23 tests réussis, 5 ignorés selon le projet, 4 min. Fichiers
  `analytics-consent`, `multisector-demo`, `site-refresh`, `visual-polish`, projets
  desktop/mobile. Refus/accord/retrait, ancres, grattage, six modèles, hero et
  menus vérifiés. La matrice dédiée couvre 1280×720, 1280×600, 390×844 et 320×740.
- Inspection des captures : panneau fermé, menu ouvert, hero, cartes, galerie,
  suivi desktop/mobile, absence de débordement. Les sections longues ont aussi
  des captures intégrales ; elles ne prétendent pas tenir dans une seule fenêtre.
- Après recapture du fond Rose poudré et placement du lanceur dans le pied de
  page mobile : lint/build landing réussis ; 7 contrôles consentement/visuels
  réussis en 25,4 s, 1 matrice ignorée sur mobile car déjà exécutée sur desktop.
  Les quatre nouveaux WebP totalisent 200 950 octets, chargés paresseusement.

Preuves dans `apps/landing-page/test-results/visual-polish-découverte-c-ba007-ntation-produit-visual-1280-desktop/`.

## Limites et livraison

Les témoignages, logos clients et cas réels restent à collecter et à autoriser ;
aucune preuve commerciale n’est inventée. Les captures statiques devront être
actualisées si les interfaces changent. Aucun nouveau prestataire, dépendance,
migration ou traitement de données. Retour arrière par revert de la PR.
PR soumise pour validation propriétaire, sans merge ni déploiement autorisé par
cette demande d’implémentation.
