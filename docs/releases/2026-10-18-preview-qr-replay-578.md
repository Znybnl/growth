# QR de prévisualisation et replay — #578

## Signalement et preuve ciblée

Le propriétaire signale une image cassée dans la popin QR du Wizard, dans un
replay historique. L'analyse du 18 octobre 2026 porte uniquement sur le projet
**212872 / EU** et la séquence indiquée autour de **1:09:42**, pas sur toute la
session. Le connecteur n'ayant pas accès à Okado, l'API privée locale autorisée
a été utilisée après vérification explicite de l'identité du projet. Aucune
donnée du projet Mediatrak n'a été consultée.

La trace `rrweb/network@1` du 13 octobre, à **14:02:06.490 UTC**, rapporte pour
l'image `/api/campaigns/[id]/qr?preview=1&inline=1` :

| Donnée | Valeur observée |
| --- | --- |
| Initiateur | `img` |
| Statut de réponse | **200** |
| Type | `image/svg+xml` |
| Durée | **1 809,3 ms** |
| Corps décompressé | **7 003 octets** |
| Corps compressé | **1 666 octets** |

Ces éléments confirment que le serveur a fourni le SVG au navigateur lors de
cette action. Ils ne constituent pas une capture des pixels effectivement
affichés et ne prouvent pas à eux seuls le décodage de l'image historique.
Aucun échec HTTP de cette requête n'est observé. Le compteur d'erreurs console
du replay est nul, ce qui n'est pas une garantie d'absence d'échec d'image.

Le endpoint exige la session du marchand ; son appel **sans cookies en
production** a donné **307 `/connexion`**. Le composant utilise correctement
`next/image unoptimized` : pas d'optimiseur intermédiaire susceptible de perdre
l'authentification. La cause la plus probable de l'image cassée dans le replay
est donc le rechargement de cette ressource privée sans session appropriée,
plutôt qu'une indisponibilité du générateur à cet instant. Ce n'est pas une
preuve d'un masquage volontaire de PostHog. Le comportement exact du lecteur
PostHog n'a pas été instrumenté et aucun réglage du projet n'a été modifié.

Références : [dépannage replay](https://posthog.com/docs/session-replay/troubleshooting),
[confidentialité](https://posthog.com/docs/session-replay/privacy),
[images Next.js et authentification](https://nextjs.org/docs/app/api-reference/components/image#src).

## Correction limitée à l'application

Le composant partagé n'avait aucun feedback en cas d'échec réel. Ajout :

- état accessible « Chargement du QR code… », sans afficher une image cassée ;
- affichage de l'image après son chargement/décodage par le navigateur ;
- message d'erreur et bouton **Réessayer** ;
- nouvelle requête vers le même endpoint de test, avec ses paramètres et son
  authentification inchangés ;
- réinitialisation des états lorsque le jeu ou le endpoint change ;
- prise en compte d'une image déjà décodée lors d'une réouverture.

Pas de nouvelle capture analytics, de journal contenant un jeton ou de QR
public pour faciliter le replay. Pas de contournement du masquage, de changement
de consentement ou d'activation de session replay. Aucune modification de
stock, participation, e-mail, publication, durée du jeton ou autorisation.
La refonte de la confirmation « Jeu prêt » reste séparée dans #577.

## Vérification et livraison

Depuis la racine :

```powershell
npm run test:preview-qr -w @okado/web-app
npm run test:admin-campaigns -w @okado/web-app
npm run lint:web
npm run build:web
npm run verify:source
```

Depuis `apps/web-app`, avec un serveur local dédié :

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3340'
npx playwright test e2e/preview-qr.spec.ts --project=chromium
```

Tests de route : vrai handler marchand, vrai SVG et jeton signé, dépendances
auth/base/analytics simulées seulement dans le processus de test ; refus sans
session ou hors établissement, jeton limité au bon jeu et à 30 minutes,
brouillon non publié et aucune capture de téléchargement sur les reprises.
La suite administrative existante contrôle les permissions et le QR de test.

Tests navigateur : composant réel, réponses API synthétiques à 320/390/1280 px,
chargement retardé, SVG décodable, réouverture, erreurs 403/500, réponse HTML
de connexion, échec réseau, SVG invalide et reprise marchand/admin. Inspection
visuelle des captures ; la fixture est interdite hors développement. Ces
preuves locales ne valent pas test authentifié de bout en bout en production.

Résultats locaux du 18 octobre : **14 tests navigateur + 5 tests du handler +
37 tests administratifs réussis**. Build/TypeScript, vérification UTF-8 et
`git diff --check` réussis ; lint sans erreur, avec quatre avertissements de
navigation préexistants hors périmètre. Le serveur compilé confirme HTTP 404
pour la fixture et HTTP 307 `/connexion` pour le QR sans session. La revue React
conserve un état local borné au contexte, sans effet réseau supplémentaire,
persistance navigateur ou changement de configuration analytique.

Pas de migration. Merge et déploiement après validation du propriétaire. Retour
arrière : revert du commit de la PR ; aucun changement de données à annuler.
Recette : ouvrir un QR de test dans le Wizard marchand puis en administration,
vérifier le chargement, l'image et sa bonne destination de prévisualisation ;
ne pas effectuer de participation ou envoyer d'e-mail réel pour ce contrôle.
