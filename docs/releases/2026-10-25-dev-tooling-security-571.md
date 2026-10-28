# Sécurité de l'outillage de développement — #571

## Analyse actualisée et décision

L'audit complet du 25 octobre 2026 sur `origin/main` signale **un paquet high**,
`zod@4.4.3`. L'audit de production signale zéro vulnérabilité. Les 20 paquets
initiaux, puis les neuf alertes de propagation sur braces observées le 23 octobre,
ne constituent pas le résultat actuel du registre.

`braces` reste en version 3.0.3 et n'est plus signalé par cet audit. Nous ne
présentons donc pas cette disparition comme une correction de code réalisée ici,
ni comme une preuve d'absence de risque. Les résultats sont datés ; ils dépendent
du catalogue d'avis du registre. Aucun avis n'est filtré ou accepté en exception.

Correction limitée : `npm update zod --package-lock-only --ignore-scripts` met à
jour **uniquement zod 4.4.3 → 4.6.7** et son intégrité dans le lockfile. Toutes
les contraintes parentes autorisent cette version 4.x ; aucun override, downgrade,
suppression de CLI ou `npm audit fix --force`. Next et eslint-config-next restent
exacts à **16.4.2** dans les deux applications.

## Chaînes et conditions d'exposition

Source de l'avis actuel : [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
Les versions antérieures à 4.6.6 sont affectées par une consommation mémoire
excessive lors de validations de collections malveillantes. Ce n'est pas une
preuve d'exploitation d'Okado.

`npm explain zod` et `npm ls --all` identifient ces chemins de développement :

- les deux apps → eslint-config-next 16.4.2 → eslint-plugin-react-hooks 7.1.1
  → zod (direct et via zod-validation-error 4.0.2) ;
- les deux apps → shadcn 4.22.1 → zod, @shadcn/registry 0.2.0 → zod,
  @modelcontextprotocol/sdk 1.32.1 → zod / zod-to-json-schema 3.25.2 → zod.

ESLint est réellement exécuté en local et en CI ; shadcn est disponible comme CLI
et fournit aussi `shadcn/tailwind.css`, importé par les deux apps. Il ne peut pas
être supprimé comme un paquet entièrement inutilisé. Aucun serveur MCP de ce
paquet n'est lancé par les scripts du dépôt. Les usages observés sont l'analyse
des fichiers/configurations et, pour un CLI exécuté manuellement, de registres
externes : des entrées non fiables peuvent affecter le processus développeur/CI.
Le dépôt n'importe pas Zod dans les routes de jeu ou de données client.

Inventaire des dépendances historiques encore présentes, non signalées par
l'audit actuel (versions lues dans le lockfile) :

| Chaîne | Versions observées |
|---|---|
| Next ESLint / shadcn → fast-glob → micromatch → braces | fast-glob 3.3.1 et 3.3.3 ; micromatch 4.0.8 ; braces 3.0.3 |
| shadcn / MCP / transformations | shadcn 4.22.1 ; MCP SDK 1.32.1 ; Hono 4.13.13 ; ts-morph 26.0.0 |
| Autres transitives de développement citées dans l'issue | proxy-addr 2.0.8 ; brace-expansion 1.1.21 / 5.0.12 ; browserslist 4.29.4 ; fast-uri 3.1.9 ; ip-address 10.7.4 ; js-yaml 4.3.2 ; postcss-selector-parser 7.1.7 ; qs 6.16.1 ; undici 7.30.1 |

## Prévention

Le garde-fou existant reste inchangé par défaut : `npm run check:dependencies`
contrôle la production et l'alignement Next/ESLint des deux apps.
`npm run check:dependencies:all` réutilise le même contrôle en ajoutant les
dépendances de développement ; la CI exécute les deux. Une réponse absente,
incomplète, malformée ou une sortie non nulle échoue toujours. Aucune exception.
La CI peut désormais bloquer sur un nouvel avis d'outillage : le corriger ou
demander une décision propriétaire documentée, pas masquer l'alerte.

## Vérifications et livraison

- `npm ci` : réussi, lockfile reproductible, zéro avis au réinstall.
- `npm run check:dependencies` et `npm run check:dependencies:all` : réussis,
  zéro avis dans les deux périmètres.
- `npm run test:dependency-audit -w @okado/web-app` : 9 tests réussis, dont les
  commandes Windows/Linux, avis de développement, pannes et alignement.
- `npm run lint` : les deux apps réussissent ; quatre avertissements SaaS
  préexistants hors périmètre, aucun avertissement landing.
- `npm run build:web` et `npm run build:landing` : réussis. Un premier build
  SaaS avait rencontré des types générés d'une autre branche ; déplacer le cache
  local `.next/dev` périmé a permis de régénérer les types, sans changement source.
- `npm run test:metrics -w @okado/web-app` : 21 tests réussis.
- `npm run test:wheel-segments -w @okado/web-app` : 4 tests réussis.
- `npx --no-install shadcn --version` : 4.22.1, CLI démarré avec Zod 4.6.7.
- `npm run verify:source`, syntaxe Node des scripts, YAML CI et `git diff --check` :
  réussis. Aucun écran modifié, donc pas de nouvelle validation visuelle requise.

Total : **34 tests automatisés réussis**, sans tests ni mutation en production.

Aucun changement d'écran, métier, authentification, permission, schéma SQL,
donnée personnelle ou secret. Aucun test offensif ni envoi d'e-mail réel.
La PR reste soumise à validation propriétaire avant merge/déploiement. Retour
arrière par revert du lockfile et du garde-fou ; cela réintroduirait l'avis Zod
et nécessite une décision explicite, pas un rollback silencieux de sécurité.
