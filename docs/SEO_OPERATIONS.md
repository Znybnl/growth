# Suivi opérationnel SEO — Okado

## Périmètre autorisé — 21 octobre 2026

Suite à l'audit #506 et au bilan du 21 octobre, le propriétaire demande de
traiter les recommandations : mesure éditoriale, contrôle d'indexation,
baseline mobile et préparation des preuves clients. Aucun changement
d'offre, de finalité de collecte, de consentement ou de conservation.
Une PR applicative attend une validation de merge/déploiement distincte.

## Tableau de décision

| Chantier | Action et validation | Suivi |
| --- | --- | --- |
| Mesure du blog | Routes publiques exactes, découverte produit ≠ essai, SDK testé sans émission réelle ; constater la réception des prochains événements consentis après déploiement autorisé. | #507 |
| Indexation et demande | Vérifier découverte, indexation effective et visibilité séparément ; analyser les exclusions disponibles avant toute correction ou soumission supplémentaire. | #507 |
| Mobile | Baseline répétée sur quatre pages ; mesures laboratoire distinctes du terrain. Optimisations justifiées par les traces, pas un score isolé. | #519 |
| Preuves marchands | Deux études vérifiables et autorisées ; aucune publication sans données suffisantes. | #509 |
| Éditorial | Exploiter les 30 articles existants et les demandes observées avant d'ajouter des sujets ; aucune suppression ou réorientation automatique. | #509 |

## Lecture des données

### Google

Propriété `sc-domain:okado.app`, recherche Web. Isoler les URL contenant
`https://www.okado.app/` pour le site vitrine et
`https://www.okado.app/blog/` pour les articles. Le total domaine inclut
l'application ; un filtre de page change aussi l'agrégation des impressions.
Ne pas comparer directement les impressions de ces deux périmètres.

Conserver date de lecture, date limite réellement disponible, filtre et
granularité. Une fenêtre « 28 jours » ne prouve pas 28 jours de données.
Comparer deux périodes closes de même longueur et même périmètre seulement
si elles sont disponibles, en séparant marque/hors marque et pages utiles.
CTR et position sont N/D sans impression, même si l'interface affiche zéro.
Pas de conclusion de hausse de trafic ou d'effet de la refonte sur quelques
jours et quelques clics.

Le sitemap actuel comporte 53 URL, dont 30 articles. Google confirme sa
lecture le 21 octobre : 53 découvertes, pas 53 indexées. Le rapport global
d'indexation reste en traitement à cette date. L'échantillon contrôlé donne :

| Article | Indexation affichée | Dernière exploration affichée |
| --- | --- | --- |
| animation-commerciale-institut-beaute | Indexé, canonical Google = URL inspectée www | 19/10/2026, 01:48:35 |
| attirer-clients-fleuriste | Indexé, canonical Google = URL inspectée www | 19/10/2026, 02:03:50 |
| idees-jeux-concours-restaurant | Indexé, canonical Google = URL inspectée www | 21/10/2026, 04:20:30 |
| animation-magasin-velos-journee-decouverte | Indexé, canonical Google = URL inspectée www | 20/10/2026, 23:19:50 |

Dates reproduites telles qu'affichées, sans supposer le fuseau. Pour les
quatre : Googlebot smartphone, récupération réussie, exploration/indexation
autorisées. Les deux premiers contrôles proviennent du bilan initial du
même jour. Cet échantillon ne vaut pas inventaire des 30 articles.

Sur Fleuriste et Restaurant, la rubrique individuelle Sitemaps signale une
erreur temporaire de traitement ; le sitemap global est réussi et les URL
sont indexées. Ne pas transformer ce libellé en blocage général.

Le rapport de performance consulté le 21 octobre s'arrête au 18 :
site vitrine 4 clics / 141 impressions, CTR 2,8 %, position 7,1 ; tous les clics
sur « okado ». Blog : zéro clic/impression enregistré dans cette fenêtre,
antérieure aux explorations constatées. Cette baseline ne permet pas de
conclure à l'échec des articles ou à l'effet de la refonte du 20 octobre.

### Bing

Propriété existante `https://okado.app/`, sitemap
`https://www.okado.app/sitemap.xml`. La lecture du 21 octobre affiche
Success, dernière exploration le 16 octobre et 22 URL découvertes. Une
tentative unique Re-submit a renvoyé « Failed to submit » après une
indisponibilité temporaire du service. Aucune réussite ni relecture de
53 URL n'est revendiquée ; aucun nouvel hôte/propriété/droit Google ajouté.
Contrôler une prochaine disponibilité et ne pas multiplier les variantes
ou soumissions individuelles. Ce point reste ouvert dans #507.

Search Performance, 21 septembre–20 octobre : zéro clic/impression sur la
propriété configurée. AI Performance : tableau en erreur temporaire, données
non exploitables ; aucun bilan d'absence de citation déduit de ses compteurs.

### Conversion

Exclusivement PostHog **212872 EU**, rapports et filtres de
[ANALYTICS_TRACKING.md](ANALYTICS_TRACKING.md). Déployer puis dater la coupure
du correctif avant analyse des articles. Les données historiques ne sont
ni rejouées ni réattribuées. Consentement et bloqueurs impliquent un
échantillon partiel ; un événement absent ne prouve pas un abandon.

## Fiche de collecte d'un cas marchand — à compléter hors données joueurs

1. Activité, contexte, objectif concret et période avec fuseau.
2. Identité de publication souhaitée : nom réel autorisé ou anonymisation ;
   accord explicite conservé en privé sur les textes, chiffres, logo et
   captures réellement autorisés. Pas d'autorisation présumée.
3. Supports utilisés, dates de diffusion, jeux et conditions présentables
   sans QR actif, code de gain, PIN ou personne identifiable.
4. Volumes agrégés sourcés et périmètre : scans, parties, contacts, opt-ins,
   gains et retraits séparés ; pertes/abandons inclus selon les définitions.
5. Coûts documentés : outil, supports, temps et dotations ; distinguer
   valeurs catalogue, coûts réels et hypothèses.
6. Retour terrain attribuable et relu par le marchand ; distinguer observation,
   intention et causalité. Ni vente ni revenu incrémental déduit d'un retrait.
7. Limites, saisonnalité, données manquantes, choix de l'exemple et date de
   validation finale avant publication.

Sans accord et données suffisantes, conserver le cas en attente. Ne pas
contacter un marchand, extraire des données personnelles ou publier un
témoignage à partir de cette seule fiche. Dépendance #509.

## Grille éditoriale pour le prochain arbitrage

- Conserver les 30 URL et leurs dates ; pas de production ou suppression
  automatique à partir de ce plan.
- Priorité proposée : beauté/restauration et intentions proches du choix
  d'un outil (jeux QR, lots, coût, roue/ticket), à confirmer avec les requêtes.
- Impressions sans clic : relire intention, titre et réponse visible.
  Évaluer le faible volume avant de modifier pour un CTR isolé.
- Clics sans progression consentie : vérifier d'abord la qualité de mesure,
  puis le maillage, la destination et la pertinence de l'offre.
- Plusieurs pages sur la même requête : examiner intentions et données avant
  d'annoncer une cannibalisation ou de fusionner des contenus.
- Un nouveau sujet doit répondre à une demande ou objection observée,
  apporter une information utile et ne pas doubler une page propriétaire.

Lecture manuelle hebdomadaire proposée, revue éditoriale mensuelle lorsque
les données sont suffisantes. Ce document n'active aucune automation.
