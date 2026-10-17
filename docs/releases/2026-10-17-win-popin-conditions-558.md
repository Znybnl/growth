# Première popin de gain sans conditions — #558

## Demande et périmètre

Le propriétaire demande de masquer le bloc Conditions d'utilisation de l'écran
« Félicitations ! Vous avez remporté… ». Le lot cité est un exemple, pas un filtre.
Le JSX sous Recevoir mon gain est retiré du composant partagé CampaignExperience,
pour toutes les roues et tous les tickets, public et prévisualisation.

Le formulaire, le CTA et le parcours restent identiques. La phase d'annonce après
collecte avant jeu n'avait pas de conditions : elle reste inchangée. Les conditions
ne sont ni effacées ni modifiées dans les lots ; elles restent présentes dans la
confirmation détaillée, le retrait et l'e-mail. Le repli sur les conditions du
résultat préparé est conservé si la réponse de finalisation ne les contient pas.

## Risques et contrôles

Modification d'affichage uniquement : pas de changement d'API, droit, consentement,
tirage, stock, envoi, QR ou donnée persistante ; aucune migration/dépendance.
Les tests de parcours existants sont adaptés pour vérifier l'absence initiale puis
la présence des conditions dans la confirmation. Ils couvrent aussi les erreurs
d'enregistrement et la reprise, sans rendre un gain confirmé avant une réussite.

Serveur de développement dédié, sans configuration Supabase/Resend, fixture mémoire
Maison Sora et API de participation interceptées. Les sorties HTTPS sont bloquées,
le choix analytics refusé et les autres mutations locales interceptées. Le QR est
généré localement avec des données fictives. Pas de test sur une campagne cliente.

Commandes :

- `npm run lint:web`
- `npm run build:web`
- `npm run verify:source`
- `npm run test:reward-email -w @okado/web-app`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3333 npm run test:e2e -w @okado/web-app -- e2e/gain-popins.spec.ts --workers=1`

## Résultats du 17 octobre 2026

- Lint : 0 erreur, 4 avertissements préexistants de navigation hors périmètre.
- Vérification de source : réussie.
- E-mail de gain : 16 tests réussis, y compris conditions, personnalisation et QR,
  sans envoi réel.
- Popins : 24 scénarios validés. Au premier passage, 22 réussites et 2 timeouts
  pendant la compilation à froid du jeu/QR. Les délais de test ont été adaptés
  (90 s par parcours et 15 s pour le QR), puis les deux cas ont repassé sans erreur
  via `--grep 'wheel, public, with conditions'` (2/2, 22 s). Le code applicatif n'a
  pas été modifié pour contourner ces timeouts.
- Un premier build simultané au serveur de développement a rencontré un fichier
  de validation Next généré invalide. Le serveur a été arrêté et ce seul fichier
  de cache ignoré par Git supprimé pour régénération ; aucun fichier source ou
  donnée utilisateur n'a été supprimé. Le build final, sans serveur dev, réussit
  (compilation, TypeScript et génération des 77 pages).

Captures synthétiques inspectées : [première popin mobile](../design/gain-popin-558/receive-mobile.png),
[desktop](../design/gain-popin-558/receive-desktop.png),
[confirmation avec conditions](../design/gain-popin-558/confirmation-mobile.png).
Le premier formulaire se termine au CTA, sans vide ajouté. Les conditions restent
lisibles dans la confirmation suivante. Aucun débordement horizontal du dialogue
à 320 px dans les tests ; les API d'enregistrement réelles ne sont pas exercées.

## Recette propriétaire et retour arrière

1. Gagner un lot avec conditions : première popin avec formulaire et Recevoir mon
   gain, sans bloc de conditions ni espace vide sous le bouton.
2. Soumettre les coordonnées : confirmation détaillée avec dates, conditions et QR.
3. Répéter sur ticket et prévisualisation ; les coordonnées saisies avant jeu
   conservent l'annonce Suivant puis la confirmation détaillée.

PR dédiée, validation propriétaire avant merge/production. Revert du commit ou
précédent déploiement pour annuler, sans donnée ni schéma à restaurer.
