# Plan de tracking produit

PostHog sert à comprendre l’usage produit et les erreurs de parcours. Le
tracking ne doit jamais conditionner une opération métier ni transmettre de
contenu utilisateur.

## Conventions

- Les événements sont en minuscules et `snake_case`.
- Un événement de succès est envoyé après confirmation de l’opération.
- Les échecs utilisent un événement distinct et un code stable, jamais le
  message libre affiché à l’utilisateur.
- Chaque événement comporte `source` (`client` ou `server`),
  `trackingVersion` et `environment`.
- Les identifiants de campagne, établissement et marchand sont des identifiants
  techniques. Les textes saisis, e-mails, adresses, codes PIN, tokens,
  commentaires, noms de lots et données bancaires sont exclus.
- Les anciens événements sont conservés pour compatibilité. Tout remplacement
  doit être documenté et ne doit pas casser les insights existants.

## Événements suivis

| Événement | Déclenchement | Propriétés utiles |
| --- | --- | --- |
| `signup_completed` | compte créé côté serveur | `source`, `environment` |
| `onboarding_completed` | onboarding enregistré côté serveur | `source`, `environment` |
| `campaign_creation_started` | ouverture d’une création dans le wizard | `wizardMode` |
| `campaign_created` | première sauvegarde d’une campagne | `gameType`, `creationMode` |
| `campaign_saved` | sauvegarde d’une campagne existante | `gameType`, `creationMode` |
| `campaign_template_selected` | sélection d’un template dans un éditeur | `campaignType`, `templateKey`, `wizardMode` |
| `campaign_preview_opened` | ouverture de la prévisualisation | `campaignType`, `templateKey` |
| `campaign_published` | campagne active après sauvegarde | `gameType` |
| `campaign_qr_downloaded` | QR généré côté serveur | `campaignId`, `preview` |
| `poster_downloaded` | affiche générée côté serveur | `campaignId`, `preview` |
| `account_settings_saved` | compte enregistré avec succès | `hasGoogleReviewUrl`, `hasSocialLinks` |
| `account_settings_save_failed` | enregistrement du compte en erreur | `errorType` |
| `google_place_search_completed` | recherche Google terminée | `resultCount`, `hasResults` |
| `google_place_selected` | fiche Google sélectionnée | `hasRating`, `hasReviewCount` |
| `draw_started` | session de jeu créée | `campaignId`, `gameType` |
| `draw_finalized` | participation finalisée | `campaignId`, `gameType` |
| `prize_redeemed` | lot validé par un marchand | `campaignId`, `leadId` |

La liste typée de référence se trouve dans
`apps/web-app/src/lib/product-analytics-events.ts`. Toute nouvelle capture
doit passer par `captureClientProductEvent` ou `captureProductEvent`.

## Identification et confidentialité

Le `distinct_id` marchand repose sur l’identifiant technique du marchand et de
l’utilisateur. Les propriétés personnelles ne sont pas ajoutées par défaut.
La capture est désactivable sans modifier les parcours métier en supprimant la
clé PostHog de l’environnement.

Avant d’activer des usages non essentiels comme la session replay, vérifier la
base légale, le consentement et le masquage des champs avec le responsable
produit et le référent conformité.
