# Exceptions de sécurité temporaires

Dernière revue : 2026-07-23

## npm audit — dépendances transitives Next.js

Exception acceptée temporairement pour les vulnérabilités transitives suivantes :

| Package | Sévérité | Version concernée | Référence | Motif |
| --- | --- | --- | --- | --- |
| `sharp` embarqué par Next.js | haute | `< 0.35.0` | GHSA-f88m-g3jw-g9cj | Next.js `16.2.11`, dernière version disponible, installe encore cette dépendance optionnelle. |
| `postcss` embarqué par Next.js | élevée (agrégée) | `<= 8.5.11` | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q | Même contrainte de résolution que ci-dessus ; npm agrège désormais l'avis de lecture de fichier au niveau élevé. |

La dépendance directe `next` est déjà en `16.2.11`. La commande `npm audit fix --force` propose une régression majeure vers une version ancienne de Next.js ; elle est donc explicitement interdite.

Mesures compensatoires :

- aucune dépendance `shadcn`/MCP n’est embarquée en production ;
- les routes publiques utilisent une validation d’entrée, un contrôle de campagne et un rate limit persistant ;
- le build et les smoke tests doivent rester verts ;
- l’exception doit être revue dès qu’une version Next.js corrigeant `sharp` et `postcss` est publiée.

Échéance de revue : 2026-08-06, ou immédiatement à la sortie d’un correctif Next.js.

