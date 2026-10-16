# Plan de tracking produit

PostHog sert à comprendre l’usage produit et les erreurs de parcours. Le
tracking ne doit jamais conditionner une opération métier ni transmettre de
contenu utilisateur.

## Projet et accès PostHog

Décision du propriétaire confirmée le **15 octobre 2026** :

- Projet **Okado : 212872**, région **EU** ; interface et API privée sur `https://eu.posthog.com`, ingestion sur `https://eu.i.posthog.com`.
- Dashboard existant : [Okado — Résultats campagnes, 935603](https://eu.posthog.com/project/212872/dashboard/935603).
- Projet **272039 : Mediatrak**, produit distinct sans lien avec Okado. Ne pas utiliser ses événements, dashboards ou tokens pour une analyse ou une modification Okado.

Le projet numérique et le token d'ingestion sont deux paramètres distincts.
Inscrire 212872 dans la documentation ne modifie pas la destination de
`posthog.init` : celle-ci est déterminée par le token et l'hôte configurés.

### Envoi et lecture des données

- `NEXT_PUBLIC_POSTHOG_KEY` est un **project token** (`phc_…`) utilisé par le navigateur et la capture serveur. Il permet notamment l'envoi d'événements, mais pas la lecture des événements, insights ou dashboards privés.
- `POSTHOG_OTEL_LOGS_TOKEN` est également un token de projet, réservé à l'export des logs serveur ; sa destination doit être contrôlée séparément.
- Pour lire les données ou administrer le projet, utiliser soit un connecteur OAuth autorisé sur **212872**, soit l'API privée avec une **clé API personnelle** (`phx_…`) autorisée sur ce projet et limitée aux droits nécessaires. Une session navigateur authentifiée est une autre voie pour consulter l'interface.
- Une clé personnelle d'audit peut être fournie dans l'environnement local non versionné sous un nom serveur explicite tel que `POSTHOG_PERSONAL_API_KEY`. Ce nom est une convention pour les outils d'audit, **pas une variable consommée actuellement par l'application**. Ne jamais la préfixer par `NEXT_PUBLIC_`, l'imprimer, l'ajouter au dépôt ou la transmettre dans le chat.

Avant toute analyse ou écriture, vérifier explicitement l'identité du projet
**212872**. Si une connexion ne le voit pas, signaler la limite d'autorisation
sans basculer sur 272039, recréer le dashboard ou modifier les clés Vercel.
L'autorisation d'accès à un outil est indépendante de la configuration
d'ingestion de l'application.

Référence : [API PostHog — endpoints publics et privés, authentification](https://posthog.com/docs/api).

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
| `marketing_cta_clicked` | clic sur un CTA du site public | `cta`, `location`, `destination`, `page`, UTM sans donnée personnelle |
| `marketing_demo_started` | clic Jouer ouvrant l'invitation, une fois par tentative ; reset seul non compté | `variant`, `page`, UTM sans donnée personnelle |
| `marketing_demo_completed` | confirmation de la démo publique | `variant`, `page`, UTM sans donnée personnelle |
| `signup_started` | soumission du formulaire d'inscription | `method` |
| `signup_failed` | inscription refusée ou échouée côté formulaire | `method` |

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

### Parcours acquisition → activation

Le site public et l'application utilisent le même projet PostHog et le même
project token. `posthog-js` conserve l'identifiant anonyme dans un cookie
partagé entre `www.okado.app` et `app.okado.app`; après la création du compte,
le navigateur est identifié avec les identifiants techniques du marchand et de
l'utilisateur. Aucun nom, e-mail, texte saisi, code ou contenu de démo n'est
envoyé dans ces événements.

Le funnel de référence est :

1. `marketing_cta_clicked` avec `cta = start_trial` ;
2. `signup_started` ;
3. `signup_completed` ;
4. `onboarding_completed` ;
5. `campaign_published`.

Les événements marketing sont explicites : l'autocapture n'est pas activée sur
le site public. Les événements `signup_completed` et suivants restent émis côté
serveur après confirmation de l'opération métier. Les résultats doivent être
filtrés sur `environment = production` et les propriétés `source`/`trackingVersion`.

### Consentement préalable — #508

Les deux applications utilisent le même protocole de préférence versionnée
(`okado_analytics_consent`, choix et date, version `2026-10-15`). Le cookie est
partagé sur `okado.app` uniquement sur ses domaines réels ; en local et sur une
preview, il reste limité à l'hôte. La portée est explicitée dans le bandeau.
La préférence est valable 180 jours sans prolongation aux visites ; refus,
absence, ancienne version et expiration bloquent la mesure. Les helpers sont
synchronisés volontairement entre les applications conformément à l'ADR 0001.

Avant accord, `posthog.init` n'est pas appelé ; aucun historique de clics n'est
mis en attente pour être rejoué après acceptation. Après accord, seuls les
événements explicites et pages vues sont activés : autocapture, replay,
enregistrement console, exceptions, enquêtes, tours et flags sont désactivés.
Les paramètres/fragment d'URL, titres et propriétés personnelles automatiques
sont retirés avant envoi. Les UTM explicites n'acceptent que des codes courts
alphanumériques, tirets et underscores ; ne jamais y encoder de donnée personnelle.
PostHog utilise la persistance cookie pour l'identification, avec une durée de
180 jours maximum ; le SDK peut aussi conserver son état de session technique.
La version et la date du choix accompagnent les captures autorisées ; le cookie
n'est pas une preuve d'identité ni une archive serveur immuable des consentements.

`captureProductEvent` vérifie aussi le cookie dans le contexte de requête Next.js.
Les webhooks et tâches sans choix explicite ne produisent plus d'événements
produit dans PostHog. Les notifications et indicateurs métier restent indépendants.
Les exports de logs opérationnels serveur ont leur configuration propre et ne
doivent pas être confondus avec cette capture produit.

Gérer les cookies permet le retrait ; il bloque immédiatement les captures de
la page et supprime les clés navigateur de ce projet. Les autres onglets/sous-domaines
relisent la préférence (au focus et chaque seconde) ; chaque nouvelle capture
revérifie le choix. Le retrait n'efface pas les événements historiques hébergés.
Vercel Analytics n'est monté qu'après accord, avec des URL de mesure nettoyées.
Sans configuration de mesure PostHog, ce dispositif ne monte pas Vercel Analytics.

Funnel créé : [Acquisition → premier jeu publié](https://eu.posthog.com/project/212872/insights/0gtandAv).
Il mesure les visiteurs consentants ; ne pas interpréter les absences comme
des abandons ni extrapoler ce taux à tous les visiteurs. La durée des cookies ne
garantit pas la rétention des événements/personnes dans le service PostHog :
elle doit être vérifiée dans les paramètres/contrats du seul projet 212872.
Les cinq étapes de ce funnel ont été filtrées sur
`consentVersion = 2026-10-15` et relues par API après mise à jour ; les anciens
événements sans ce marqueur n'y entrent pas. Avant déploiement du code de
consentement, l'absence de nouveaux résultats est attendue.

## Exploitation et fiabilisation — #507, 16 octobre 2026

Accord propriétaire : finaliser la mesure et son exploitation, sans nouvelle
collecte personnelle, nouveau fournisseur ou changement de consentement.
Les correctifs applicatifs restent soumis à PR et validation de publication.

### Qualité de capture

- Le début de démo est capturé au clic Jouer, pas au lancement de la rotation
  depuis un écran où la condition de capture était devenue impossible.
  Retours Google/e-mail et reset seul ne sont ni un nouveau début ni une fin.
- Les CTA vers l'application et `signup_started` utilisent l'envoi immédiat
  `sendBeacon` pour limiter les pertes à la navigation. Le parcours n'attend pas
  une réponse analytics. Le SDK est initialisé/synchronisé après vérification du
  consentement avant une capture ou identification, même si le composant de
  préférences n'a pas encore terminé son initialisation.
- Le rapprochement `$identify` garde l'API SDK et ses règles d'identité. Un
  adaptateur de la méthode publique capture, limité à l'appel synchrone identify,
  ajoute l'option SDK d'envoi immédiat sendBeacon à ce seul paquet ; la méthode
  habituelle est restaurée immédiatement en finally. Pas de fusion manuelle,
  duplication d'événement, attente réseau ou désactivation de compression.
- Les propriétés de profil automatiques `$set`/`$set_once`, également attachées
  à la racine du paquet d'identification, sont retirées ; l'identifiant anonyme
  et l'identifiant technique marchand restent disponibles pour le rapprochement.
- Les événements navigateur reçoivent une `page` issue d'une liste fermée de
  routes publiques et d'entrée produit ; tous les autres chemins deviennent
  `/other`. Aucun identifiant de jeu, code de retrait ou chemin libre n'est envoyé.
  La liste est volontairement identique dans les deux applications.
- Les trois UTM explicites déjà autorisés sont lus sur l'URL courante, avec la
  même validation de codes courts. Ils ne créent aucun stockage d'attribution
  supplémentaire. URL complète, paramètres libres, fragments, référents et
  propriétés personnelles automatiques restent exclus. Source absente ne
  signifie pas trafic direct.
- Un consentement donné au milieu du parcours ne rejoue pas les clics antérieurs ;
  son retrait peut laisser une séquence partielle. Ne pas classer ces cas comme
  des abandons certains. Un refus ne bloque aucune opération métier.

### Rapports privés dans 212872 EU

Tous les rapports exigent `environment=production`,
`consentVersion=2026-10-15`, `trackingVersion=v1`, avec exclusion des comptes
internes/tests selon la cohorte déjà configurée. Cette cohorte n'est pas une
preuve que tout le trafic interne a été identifié. Le fuseau du projet est UTC.

| Rapport | Dénominateur et fenêtre |
| --- | --- |
| [Acquisition complète](https://eu.posthog.com/project/212872/insights/0gtandAv) | Personnes uniques ayant cliqué start_trial, puis inscription commencée/terminée, onboarding, publication, en ordre avec événements intermédiaires autorisés ; 30 jours pour convertir. Ne couvre pas les inscriptions directes. |
| [Inscription → publication](https://eu.posthog.com/project/212872/insights/awBx9gfa) | Personnes uniques ayant signup_completed, puis campaign_published en 30 jours ; inscriptions directes incluses, onboarding non exigé. Première publication observée après cette inscription, pas historique reconstitué. |
| [Démo → confirmation](https://eu.posthog.com/project/212872/insights/kLONjXG3) | Personnes uniques ayant commencé puis confirmé en 30 minutes ; pas ratio de tentatives. Historique antérieur au correctif non exploitable. |
| [Pages vues](https://eu.posthog.com/project/212872/insights/qXHjKxpv) | Nombre de vues par page autorisée, pas personnes uniques. Valeurs historiques absentes non attribuables. |
| [CTA par source](https://eu.posthog.com/project/212872/insights/VeBB7gA1) | Nombre de clics start_trial par utmSource du clic, pas inscriptions ni attribution multi-touch. |

Fenêtre d'observation : 90 jours pour les deux funnels à conversion sous 30 jours,
28 jours pour démo, pages et sources. Cela permet de relire des cohortes matures
sans les limiter à une période plus courte que leur délai de conversion.
Cela ne signifie pas que cette profondeur de données consenties existe.
Les cohortes des 30 derniers jours n'ont pas
toutes terminé leur fenêtre de conversion. Zéro entrant donne un taux **N/D**,
pas 0 % ni 100 % d'abandon. Taux global = dernière étape / entrées ; conversion
intermédiaire = étape suivante / étape précédente ; ne pas les confondre.
Le catalogue de métriques était vide lors du contrôle : ces définitions de
travail sont documentées, pas des métriques certifiées du catalogue PostHog.

### Recette et lecture récurrente

`node scripts/audit-conversion.mjs` relit le projet, les requêtes et les comptes
agrégés en lecture seule. Il vérifie obligatoirement 212872/EU et ne publie
aucun identifiant personnel ou secret. Il lit les variables privées serveur
autorisées dans l'environnement ou le `.env.local` non suivi du SaaS.
`--configure-insights` modifie uniquement le funnel connu et les quatre insights
nommés, sans doublon ; ne pas l'utiliser pour une simple lecture. Aucun dashboard
historique ni cohorte, rétention, ingestion ou événement passé n'est modifié.

Lecture hebdomadaire proposée : vérifier d'abord les volumes et la qualité de
capture, puis les étapes et les sources ; revue mensuelle des cohortes matures.
C'est une procédure manuelle, pas une automation activée. GSC/Bing reste un
chantier SEO distinct. Le [bilan initial](releases/2026-10-16-conversion-507.md)
consigne les valeurs et les limites avant déploiement du correctif.

Références : [funnels](https://posthog.com/docs/product-analytics/funnels),
[envoi avant navigation](https://posthog.com/docs/libraries/js/usage),
[sous-domaines](https://posthog.com/tutorials/cross-domain-tracking).
