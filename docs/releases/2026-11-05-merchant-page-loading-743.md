# Chargement des écrans marchands — #743

## Constat et périmètre

Les audits #390, #500 et #708 sont clôturés. L’issue ouverte #519 porte sur le
site public ; elle ne couvre pas cette navigation marchande. Cette livraison
corrige les lectures communes aux pages et la liste campagnes/lots, sans
modifier les calculs métier, les pages publiques ou l’interface.

## Mesures de production avant correction

Lecture du 5 novembre 2026 vers 19:43 UTC, projet PostHog **212872 / EU**,
service `okado-web`, environnement `production`, fenêtre glissante de 7 jours.
Les premières mesures opérationnelles présentes remontent au 31 octobre à
21:14 UTC ; dernière observation dans l’extraction : 5 novembre à 19:38 UTC.
La fenêtre ne constitue donc pas sept jours complets de couverture.

| Étape de page réussie | n | Moyenne | Médiane | p95 |
|---|---:|---:|---:|---:|
| Accueil | 13 | 1 875,2 ms | 1 676,2 ms | 3 229,5 ms |
| Campagnes | 14 | 1 490,1 ms | 1 389,3 ms | 2 115,9 ms |
| Résultats | 27 | 2 432,2 ms | 2 433,7 ms | 3 273,5 ms |
| Mon compte | 7 | 2 104,5 ms | 2 054,7 ms | 2 801,9 ms |

Il s’agit de `page.*`, depuis l’entrée dans la fonction de page jusqu’à son
résultat serveur. Ce ne sont ni le LCP, ni l’hydratation, ni le temps total de
navigation. Les redirections sont exclues (notamment 63 sur Accueil).
Les faibles effectifs et les versions mélangées limitent la représentativité
et rendent les p95 indicatifs.

Les étapes communes donnent `auth.context` : 506 succès, moyenne 970,7 ms,
médiane 998,2 ms, p95 1 301 ms ; `auth.validate` : 680 succès, moyenne 275,6 ms.
Ces effectifs incluent les autres routes authentifiées : ce ne sont pas des
mesures appariées aux seules quatre pages. `auth.workspace` est inclus dans
`auth.context`, lui-même inclus dans la page : ne pas additionner ces moyennes.
Les mesures opérationnelles récentes portent la région d’exécution `iad1`.
La région effective de la base n’a pas été vérifiée : aucune relocalisation
n’est décidée sur cette seule observation.

Les durées HTTP confirment aussi l’attente, mais mélangent d’autres parcours :
Accueil document200 : 2 722,6 ms (n4), RSC200 : 1 561,2 ms (n9) ;
Campagnes RSC200 : 1 522,3 ms (n14) ; Mon compte document200 : 2 393,3 ms (n5),
RSC200 : 1 694,4 ms (n2) ; Résultats document200 : 2 871 ms (n15),
RSC200 : 1 160,6 ms (n21). Ces échantillons HTTP ne correspondent pas un pour un
aux fonctions de page ; ne pas les comparer comme des chargements identiques.

Requête d’extraction (agrégat de diagnostic, sans définition métier canonique) :

```sql
SELECT attributes['stage'], attributes['outcome'], count(),
       round(avg(toFloat64OrNull(attributes['durationMs'])), 1),
       round(quantile(0.5)(toFloat64OrNull(attributes['durationMs'])), 1),
       round(quantile(0.95)(toFloat64OrNull(attributes['durationMs'])), 1)
FROM logs
WHERE service_name = 'okado-web'
  AND timestamp >= now() - INTERVAL 7 DAY
  AND body = 'server_stage_completed'
  AND attributes['environment'] = 'production'
GROUP BY attributes['stage'], attributes['outcome']
ORDER BY 1, 2
```

## Correctif

- Le profil du compte est joint à la lecture de l’utilisateur authentifié.
  Son adhésion active est lue simultanément lorsque l’identifiant Auth existe.
- Les profils des établissements sont joints aux associations de cette adhésion,
  avec pagination ordonnée. Les archives restent exclues et le rôle conservé.
  Un identifiant de site étranger reste ignoré. Le rapprochement historique par
  e-mail conserve la réparation Auth et relit les droits du bon utilisateur.
- La lecture des lots filtre directement `campaign.merchant_id` par une jointure
  interne ; elle démarre en parallèle des agrégats, au lieu d’attendre leur liste
  d’identifiants. Champs, pagination et calculs restent identiques.
- Aucun cache partagé de droits ou de profils ; Auth.getUser et ses contrôles
  restent inchangés. Les données sont relues à chaque requête.

Le chemin courant multi-sites passe de six à quatre requêtes de contexte et de
quatre à deux vagues réseau. Pour un seul site, cinq à quatre requêtes et trois
à deux vagues. Le rapprochement historique et les pages de pagination ajoutent
toujours leurs lectures nécessaires.

## Vérification comparative

Depuis le poste local, mêmes données Supabase, diagnostic protégé contre toute
mutation, alternance ancien/nouveau, un échauffement puis six paires pour le
contexte. Exécution des vraies fonctions du dépôt (`origin/main` comparé à la
branche). Contexte de huit sites : moyenne **276 → 148 ms**, médiane 275 → 147 ms.
Une première passe de six paires donnait 244 → 146 ms ; la direction est stable.
Cela exclut Auth.getUser, le réseau navigateur/Vercel et le rendu des pages.

Plan de lecture agrégats/lots : six paires, moyenne **144 → 75 ms**, médiane 126 → 70 ms.
La liste complète des 55 lots de ce périmètre est identique après suppression de
l’objet technique de jointure. Les requêtes GET de jointure ont été vérifiées
sur les relations déployées ; la seule RPC POST autorisée au diagnostic est la
lecture `get_merchant_page_overview`. Aucun identifiant ni contenu de profil
n’est conservé dans ce rapport. Pas d’écriture, e-mail ou participation réelle.
Ces baisses locales ne sont pas une promesse de gain proportionnel sur les
pages en production.

## Tests et livraison

- `npm run test:page-performance -w @okado/web-app` : 11 tests réussis.
  Droits, site actif étranger, archivage, pagination de 405 sites sous un plafond
  de 73 lignes, erreur de lecture, ancien identifiant Auth, fraîcheur après changement,
  lectures concurrentes, périmètre des lots et indicateurs Résultats sont couverts.
- `npm run lint -w @okado/web-app` : zéro erreur, quatre avertissements préexistants
  de navigation dans des composants non modifiés.
- `npm run build -w @okado/web-app` : réussi, Next 16.4.2.
- Aucun changement d’interface : pas de nouvelle capture 1280 nécessaire.
- Pas de migration SQL, variable d’environnement ou changement de forfait.

Après validation et déploiement, vérifier les quatre pages, changer de site,
modifier un compte puis le relire et contrôler les métriques sur la nouvelle
version. Comparer les succès de même route/type de requête en gardant les
effectifs et les démarrages à froid distincts. La comparaison réelle après
production reste à effectuer ; l’export serveur ne mesure toujours pas le
rendu visible navigateur. Retour arrière : revert de la PR et redéploiement,
sans restauration de données.
