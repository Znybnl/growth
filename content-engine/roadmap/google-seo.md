# Utiliser les données Google pour choisir les sujets

## Mots-clés et récupération

Le fichier `content-engine/roadmap/keyword-candidates.csv` contient 54 expressions candidates, sans volume observé. Dans Google Ads, ouvrir Outils → Planification → Outil de planification des mots clés, choisir « Obtenir le volume de recherche et les prévisions » et importer la colonne ou coller les expressions. Choisir France, français, réseau Google uniquement et historique des 12 derniers mois complets ; exporter les statistiques historiques en CSV et noter le jour d'export et tous les filtres. L'accès peut nécessiter de terminer la configuration du compte et de saisir des informations de facturation ; ne pas lancer de campagne ni engager de dépense sans décision du propriétaire. Les fourchettes et le niveau de détail dépendent du compte. Les moyennes peuvent inclure des variantes proches. La concurrence et les enchères concernent les annonces, pas la difficulté de référencement naturel.

Dans Search Console, ouvrir le rapport Performances → Résultats de recherche, choisir et noter dates, pays, appareil et type de recherche, puis exporter séparément les tableaux Requêtes et Pages en CSV. L'export standard séparé ne permet pas d'associer chaque requête à chaque page : ne jamais fabriquer cette correspondance. Un CSV effectivement associé (par exemple un export filtré documenté ou fourni séparément) peut être importé s'il contient les deux colonnes. Les valeurs peuvent être agrégées et des requêtes omises.

## Importer localement

Placer les exports privés dans `content-engine/private-data/` (ignoré par Git). Depuis la racine, exemples :

```powershell
python content-engine/scripts/google_import.py ads content-engine/private-data/ads.csv --country France --language fr --period 2025-11-01:2026-10-31 --export-date 2026-11-10 --filters "Google, 12 mois" --output content-engine/private-data/ads.json
python content-engine/scripts/google_import.py gsc content-engine/private-data/requetes.csv --country France --language fr --period 2025-11-01:2026-10-31 --export-date 2026-11-10 --filters "Web, tous appareils, requêtes" --output content-engine/private-data/requetes.json
python content-engine/scripts/google_import.py gsc content-engine/private-data/pages.csv --country France --language fr --period 2025-11-01:2026-10-31 --export-date 2026-11-10 --filters "Web, tous appareils, pages" --output content-engine/private-data/pages.json
python content-engine/scripts/prioritize.py --ads content-engine/private-data/ads.json --gsc content-engine/private-data/requetes.json --gsc content-engine/private-data/pages.json
```

Adapter les dates et filtres aux exports réels. Les formats CSV UTF-8 ou UTF-16, séparés par virgule, point-virgule ou tabulation sont reconnus avec en-têtes courants français/anglais. Les colonnes originales sont conservées pour audit ; en cas d'en-tête inhabituel, ne pas deviner : fournir un extrait anonymisé et adapter l'importeur. Les montants d'enchères restent des chaînes avec leur devise. Une fourchette reste une fourchette ; une donnée absente reste absente. L'historique mensuel identifié est conservé. Vérifier l'unité et les nombres du fichier avant toute décision.

## Lire le classement

Sans fichiers : `python content-engine/scripts/prioritize.py` signale explicitement l'absence des données. La liste `opportunities.json` regroupe des variantes par intention et conserve les quatre brouillons, leur intention, pages proches, valeur proposée et décision provisoire. Le tri ordonne des hypothèses de pertinence commerciale et de proximité produit, puis signale la présence d'une mesure de demande, des impressions pour une page à améliorer et une concurrence organique faible si documentée manuellement. Ce n'est ni une estimation de trafic ni une difficulté SEO : aucun chiffre Ads n'est utilisé comme concurrence organique, et une absence de correspondance n'est pas un zéro. Relire les résultats, la période, les SERP et les contenus avant de décider créer, enrichir, optimiser la page commerciale ou ne rien faire. Saisir les résultats d'analyse organique et leur preuve seulement après observation réelle ; sinon conserver « non observée ».

Pour actualiser les quatre analyses, importer les données puis demander à Codex : « Réévalue les quatre brouillons avec les exports Google importés, en citant les périodes et les limites ». Les sources restent privées. Aucune API ni automatisation payante n'est configurée.

Sources Google consultées le 10 novembre 2026 : [Outil de planification](https://support.google.com/google-ads/answer/6325025), [statistiques historiques](https://support.google.com/google-ads/answer/3022575), [rapport Search Console](https://support.google.com/webmasters/answer/7576553?hl=fr).

Le rapprochement indicatif des 54 expressions avec le catalogue est dans `keyword-catalog-crosscheck.csv` : il s’agit d’une recherche lexicale, pas d’une analyse sémantique exhaustive. Les quatre fiches se trouvent dans `drafts-seo-review.md`.
