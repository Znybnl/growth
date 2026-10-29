# Audit du tracking de l'application — #691

## Conclusion et preuves

L'instrumentation existante couvrait plusieurs succès métier mais était
insuffisante pour analyser les parcours : la majorité des routes étaient
regroupées sous `/other`, les étapes du wizard et les onglets du compte n'étaient
pas distingués, et imports/préparations de fichiers ne permettaient pas de
comparer début et échec. Plusieurs noms déclarés dans le type TypeScript
n'étaient jamais émis : une déclaration n'est pas une preuve de couverture.

La correction recense les **29 familles de pages** hors fixtures, garde les
événements historiques et ajoute les signaux explicites nécessaires aux étapes
et opérations principales. Le détail de chaque nouveau signal est dans
[le plan de tracking](../ANALYTICS_TRACKING.md#complément-de-couverture-applicative--691).

Contrôle en lecture seule le 29 octobre 2026 : l'API privée EU confirme le
**projet 212872** (nom renvoyé : « Default project ») et la correspondance de son
token d'ingestion avec la configuration locale. Son catalogue contient **39 noms
d'événements**, sans pagination restante. Cela ne mesure ni des volumes récents,
ni la couverture des non-consentants, ni la configuration Vercel de production.
Les anciennes définitions automatiques ne prouvent pas qu'autocapture, exceptions
ou replay sont actuellement actifs. Aucun paramètre PostHog n'a été modifié.
Le connecteur ne voyait pas 212872 dans son organisation active : l'accès direct
explicitement configuré a été utilisé, sans lecture de données de 272039.

## Matrice de couverture des pages

Toutes les lignes utilisent le `$pageview` natif, après accord, avec une route
fermée dans `page`. Une « vue » n'est pas une garantie d'affichage complet ni
une mesure de performance. Les crochets sont des placeholders, jamais la valeur
du code ou de l'identifiant de l'URL.

| Route(s) | Parcours / couverture utile |
| --- | --- |
| `/` | Accueil : page distinguée, navigation vers jeux/résultats/compte |
| `/connexion` | connexion mot de passe, succès/erreur existants ; erreur de retour Google à code fixe |
| `/inscription` | `signup_started`, `signup_failed`, `signup_completed` existants |
| `/connexion/google/callback` | retour technique historique, sans code OAuth ni motif libre ; succès serveur Google |
| `/onboarding` | début, trois étapes vues/validées, échec et succès ; complément #687 |
| `/merchant` | redirection technique : classifiée mais pas une conversion supplémentaire |
| `/campaigns` | liste des jeux ; succès de création/sauvegarde/publication déjà instrumentés |
| `/campaigns/new`, `/campaigns/new/guided` | début de création et cinq étapes du wizard, validations, bibliothèque, erreurs de sauvegarde |
| `/campaigns/[id]/edit`, `/campaigns/[id]/edit/guided` | édition classique/guidée, modèle, aperçu, étapes et échecs sans contenu de formulaire |
| `/campaigns/[id]/poster` | affiche, import logo, sauvegarde, préparation/téléchargement ; erreurs explicites |
| `/campaigns/[id]/email` | e-mail de gain : succès/échec de sauvegarde sans objet, corps ou adresse |
| `/data` | Résultats, sélection de jeu et préparation CSV ; aucune recherche client envoyée |
| `/account` | trois onglets et enregistrement existant ; notifications et relance après réponse |
| `/locations` | consultation multisite ; le contexte du site actif reste porté par l'identité existante |
| `/backgrounds` | bibliothèque d'images : mesure de fréquentation de page, sans URL/titre libre |
| `/affiliates` | gestion affiliation : fréquentation ; écritures financières suivies par les journaux métier existants |
| `/caisse` | fréquentation et succès `cashier_redemption_completed` existant, aucun PIN ou code |
| `/support` | Supervision : fréquentation, événements et incidents opérationnels gardés dans leur journal métier |
| `/admin` | Pilotage : page distincte, sans chaîne de recherche ou détail de fiche dans PostHog |
| `/admin/campaigns` | catalogue des jeux marchands, page distincte de celle du marchand |
| `/admin/campaigns/new` | création pour un marchand, étapes avec `actor=admin` |
| `/admin/campaigns/[id]/edit` | assistance à l'édition, étapes/erreurs avec contexte admin |
| `/admin/campaigns/[id]/poster` | assistance affiche, imports/sauvegardes avec les mécanismes partagés |
| `/admin/prize-suggestions` | gestion du catalogue : fréquentation ; données du catalogue non copiées dans les propriétés |
| `/campaign/[id]` | étapes réelles, clics Jouer/action existants, préparation/finalisation serveur ; pageMode public/preview |
| `/campaign/[id]/preview-embed` | aperçu intégré identifié comme aperçu ; aucune étape de jeu réel ajoutée |
| `/redeem/[code]` | fréquentation du retrait et succès serveur existants, jamais le code ni le PIN |

Le registre des routes est comparé automatiquement aux fichiers `page.tsx` :
une nouvelle page oubliée fait échouer la CI. Le test SDK parcourt ces familles
avec `history.pushState` dans une fixture, sans ouvrir les comptes réels ; il ne
prétend pas faire la recette fonctionnelle de 29 écrans authentifiés différents.
Les écrans et parcours critiques sont exercés séparément dans les tests ci-dessous.

## Étapes et source de vérité

- Wizard : `game → identity → appearance → prizes → action` ; `identity` est le
  code existant de « La promesse ». Continuer n'est terminé qu'après validation.
- Bibliothèque de lots : suggestions, Mes lots, compositions, détail,
  remplacement et ajustement. Les recherches et textes de lot sont exclus.
- Onboarding : identité stable avant les événements, étapes profil/liens/PIN,
  codes d'erreur et succès après sauvegarde, fournis par #687.
- Mon compte : onglet réellement rendu après hydratation, puis réponses de
  sauvegarde. Un lien direct vers Utilisateur n'invente pas une vue Établissement.
- Jeu : `idle`, `collect`, `intro`, `ready`, `won`, `success`, `lost`, `blocked`
  selon le parcours. La collecte avant jeu et l'annonce `won` restent
  conditionnelles ; leur absence n'est pas forcément un abandon.
- Imports : début avant validation/upload, réussite après réponse acceptée,
  sinon erreur stable ; seuls type, poids et dimensions sont mesurés.
- QR/affiche/CSV : consultation, téléchargement et résultat de préparation sont
  distingués. Une annulation explicite pendant le travail n'émet pas de succès
  tardif. L'enregistrement du fichier par le système reste non observable.
- Les événements de retrait et tirage conservent leur émetteur serveur ; la
  présentation du gain n'invente ni `draw_finalized` ni `prize_redeemed` côté client.

## Protection et limites d'interprétation

Le consentement et les réglages replay ne changent pas. Aucune nouvelle donnée
personnelle : pas de saisie, nom de fichier, URL importée, motif libre, coordonnées
joueur, code/PIN, contenu d'e-mail ou paramètres/fragment d'URL. L'exception
existante pour l'e-mail du profil marchand authentifié reste inchangée.

Une vue d'étape est dédupliquée au rerender et au focus. Un retour réel peut
produire une nouvelle vue. Après accord tardif, seule l'étape en cours est
mesurée, sans rejouer l'historique refusé. Les exceptions du SDK sont contenues
dans le helper ; le refus ou une panne de mesure ne change pas le résultat métier.

PostHog est un échantillon consenti, pas le décompte canonique de participations,
de gains, de paiements ou d'envois d'e-mails. Les tâches/webhooks sans préférence
de requête ne produisent pas de capture produit. La facturation et les actions
administratives restent contrôlées dans leurs journaux/données métier ; on ne
déduit pas un abonnement payé d'une vue de l'onglet Abonnement.

Sur le jeu public, les événements serveur historiques utilisent un `distinct_id`
agrégé `public:<campagne>`, différent de celui du navigateur. Ne pas construire
un funnel individuel en assemblant naïvement clic client et tirage serveur.
Les nouvelles étapes client permettent de lire le parcours consenti du même
navigateur sans introduire de rapprochement personnel supplémentaire. L'état
`success` décrit la confirmation affichée, pas la livraison effective de l'e-mail.
Un échec de requête ou de lecture de réponse ne prouve pas non plus qu'aucune
écriture n'a eu lieu ; la base reste l'autorité pour le résultat métier.

Ne pas utiliser des noms déclarés mais non émis (`checkout_completed`, certaines
anciennes variantes de sauvegarde/retrait, etc.) comme si leur volume nul prouvait
une absence d'usage. Les événements historiques et dashboards ne sont pas supprimés
ou réécrits. Les anciennes pages `/other` ne peuvent pas être réattribuées.

Le niveau retenu couvre les pages, étapes et opérations principales. Il ne
mesure volontairement pas chaque frappe, tri, ouverture d'accordéon ou réglage
visuel ; des questions produit précises pourront justifier ces détails ensuite.

## Vérifications et livraison

Les suites dédiées utilisent le vrai SDK avec paquets interceptés et identités
fictives : navigation de chaque famille, consentement tardif/refus/retrait,
déduplication/hydratation, cinq étapes du vrai wizard et erreurs, onglets et
préférences réels, import/fichiers, étapes complètes perte/gain du jeu, aperçu
exclu et erreur de retour Google. Les tests d'identité, onboarding et confidentialité
existants sont conservés. Les API, paiements, e-mails et stockage sont simulés.

Résultat local final : **23 tests unitaires/API et 21 tests navigateur réussis**.
Les captures du wizard et de l'éditeur d'e-mail ont été inspectées à 1280×720
et 1280×600, ainsi que le parcours d'onboarding à 390 px. Aucun changement de
mise en page n'est introduit. Lint sans erreur (4 avertissements préexistants),
build web, vérification des sources, YAML et diff réussis. Les premiers essais
ont servi à aligner les assertions sur les vrais libellés/codes d'étape et à
attendre l'hydratation de la fixture avant la navigation synthétique. La suite
complète a ensuite été rejouée sans échec.

Commandes :

```text
npm run test:analytics-routes -w @okado/web-app
npm run test:analytics-consent -w @okado/web-app
npm run test:onboarding-tracking -w @okado/web-app
npx playwright test e2e/analytics-coverage.spec.ts e2e/analytics-identity.spec.ts e2e/analytics-consent.spec.ts e2e/onboarding-tracking.spec.ts --project=chromium
npm run lint:web
npm run build:web
npm run verify:source
```

La PR est un complément basé sur la branche de #687 : fusionner/déployer #687
avant ce lot, puis vérifier les nouveaux signaux sur 212872, production et
consentVersion actuelle. Aucune migration SQL, aucun changement de fournisseur,
token ou dashboard. Retour arrière : revert du lot de couverture ; les événements
déjà reçus restent historiques. Aucune publication autorisée dans cette mission.

Références primaires consultées : [pages vues SPA](https://posthog.com/tutorials/single-page-app-pageviews),
[tracking explicite](https://posthog.com/tutorials/event-tracking-guide),
[funnel Next.js/Supabase](https://posthog.com/tutorials/nextjs-supabase-signup-funnel).
