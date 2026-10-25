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
| `campaign_qr_downloaded` | QR de diffusion demandé explicitement en téléchargement ; consultation `inline=1` et QR de test exclus (#596) | `campaignId`, `inline` |
| `poster_downloaded` | affiche générée côté serveur | `campaignId`, `preview` |
| `account_settings_saved` | compte enregistré avec succès | `hasGoogleReviewUrl`, `hasSocialLinks` |
| `account_settings_save_failed` | enregistrement du compte en erreur | `errorType` |
| `google_place_search_completed` | recherche Google terminée | `resultCount`, `hasResults` |
| `google_place_selected` | fiche Google sélectionnée | `hasRating`, `hasReviewCount` |
| `draw_started` | session de jeu créée | `campaignId`, `gameType` |
| `game_start_clicked` | clic sur le bouton « Jouer » avant la préparation de la session, aperçu exclu | `campaignId`, `gameType` |
| `marketing_action_clicked` | clic sur l’action marketing configurée avant le jeu, aperçu exclu | `campaignId`, `gameType`, `actionKind` |
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

Le `distinct_id` marchand conserve le format historique
`<user.merchantId>:<user.id>` : compte principal de l'utilisateur et identifiant
utilisateur, **jamais l'établissement actif** (#592). Décision propriétaire du
18 octobre 2026 : l'e-mail de connexion du compte est ajouté à son profil après
accord de mesure. C'est la seule exception personnelle autorisée à ce mécanisme.
La capture est désactivable sans modifier les parcours métier en supprimant la
clé PostHog de l’environnement.

### Identité stable entre établissements — #592

Un même utilisateur garde son identité de compte principal en changeant de site.
Les événements client et serveur portent le site actif dans `merchantId` et
l'utilisateur dans `merchantUserId`. Le navigateur conserve aussi
`accountMerchantId` dans son contexte technique. Les accès publics sans compte
(par exemple le retrait express par PIN) gardent leur identité technique propre.

La connexion par mot de passe identifie avant `login_completed` et sa redirection ;
Google et inscription utilisent aussi le compte principal renvoyé par le serveur.
Le shell vérifie l'identité au montage, au changement de route/site, au retour de
focus/visibilité et après un nouvel accord de mesure. Le SDK déduplique les
identifications inchangées ; l'e-mail du profil est actualisé à l'identification,
au chargement de session ou si l'adresse authentifiée change, pas à chaque
vérification de route/focus. Il n'y a pas de minuterie d'identification réseau.

Un identifiant anonyme peut être rattaché par `identify`. Un autre compte déjà
identifié, ou un ancien identifiant composé avec un autre site, est d'abord
réinitialisé pour éviter de demander une fusion entre comptes identifiés.
La déconnexion réinitialise l'identité. Ces vérifications restent conditionnées
au consentement, et une panne du SDK ne bloque pas la connexion/déconnexion.

Le changement réutilise l'identité principale existante et conserve ses propriétés
historiques (y compris un e-mail déjà présent). Il ne fusionne ni n'efface les
anciens profils par établissement : `identify`/`alias` répétés ne constituent pas
une réparation fiable de deux personnes déjà identifiées. Une reprise historique
éventuelle est une opération administrative distincte après contrôle des profils.
Le filtre partagé des deux applications autorise uniquement `email` dans le
`$set` de `$identify`/`$set` quand le contexte technique correspond à l'identité
du compte. Tous les autres champs de profil automatiques, `$set_once`, e-mails
ordinaires d'événements, noms et coordonnées de joueurs restent exclus. L'e-mail
vient du profil authentifié de l'application, jamais d'un input de jeu ou d'une
URL. La mention de mesure et la politique publique reflètent cette décision.

Références : [identité stable et transitions](https://posthog.com/docs/product-analytics/identity-resolution),
[identify et alias](https://posthog.com/docs/product-analytics/identify).
Diagnostic, preuves et recette : [livraison #592](releases/2026-10-18-posthog-identity-592.md).

Avant d’activer des usages non essentiels comme la session replay, vérifier la
base légale, le consentement et le masquage des champs avec le responsable
produit et le référent conformité.

### Parcours acquisition → activation

Le site public et l'application utilisent le même projet PostHog et le même
project token. `posthog-js` conserve l'identifiant anonyme dans un cookie
partagé entre `www.okado.app` et `app.okado.app`; après la création du compte,
le navigateur est identifié avec les identifiants techniques du marchand et de
l'utilisateur. L'e-mail de connexion autorisé par #592 est réservé aux mises à
jour de profil. Aucun nom, e-mail de joueur, texte saisi, code ou contenu de démo
n'est envoyé dans les événements de parcours.

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

Sur la vitrine, avant accord, le SDK PostHog n'est pas téléchargé et
`posthog.init` n'est pas appelé ; aucun historique de clics n'est mis en attente
pour être rejoué après acceptation. Le SDK est chargé à la demande à l'accord,
sans bloquer l'interface.
Après accord, seuls les
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

## Découverte des modèles et métiers — #601, 19 octobre 2026

### Complément multisectoriel — #607, 20 octobre 2026

Les clics `marketing_cta_clicked` ajoutent `cta=select_demo_sector` dans
`location=demo_selector` et `cta=select_gift_sector` dans
`location=gift_suggestions`. `variant` appartient à la liste fermée
`beauty`, `restaurant`, `retail`. Les liens vers les démos réutilisent
`sector_demo` ou `explore_sector` et leur contexte existant.
`marketing_demo_started`/`marketing_demo_completed` conservent `variant`
et ajoutent, pour un exemple Beauté choisi, `specialty` parmi
`nails`, `eyes`, `care`, `spa`, `hair`, `general`.
Un changement d’exemple annule le parcours local sans inventer de fin ni de
nouveau début. Le clic Jouer de l’exemple suivant démarre une nouvelle tentative.
Le ticket local compte la confirmation de réception comme fin, pas le grattage
ou l’ouverture de l’e-mail. Aucun changement au comptage SaaS réel.

Les fragments éditoriaux servent seulement à sélectionner le contenu dans le
navigateur. Ils ne sont pas envoyés en tant qu’URL. Les UTM restent dans la
query string existante ; aucune persistance d’attribution ajoutée. Le refus de
mesure n’empêche aucune démo et n’émet aucun de ces événements.

Après mise en production autorisée, comparer sur des périodes de durée égale :
vues de l’accueil → clic essai, démarrage → confirmation de démo par `variant`,
clic essai → inscription effective via le funnel existant. Distinguer volumes
et personnes uniques ; un clic de choix métier n’est pas une inscription.
Utiliser uniquement 212872/EU, production, version de consentement/tracking
valides, avec les exclusions internes existantes. Garder les cohortes matures
du funnel d’inscription et présenter N/D si le dénominateur est nul. Examiner
les volumes avant d’interpréter un taux ; une comparaison avant/après n’est pas
une preuve causale. La recette locale avec paquets interceptés ne constitue
pas une mesure d’amélioration commerciale. Aucun rapport privé ni automatisation
n’est créé ou modifié par ce changement.

Le site réutilise `marketing_cta_clicked` avec des valeurs éditoriales fixes :
`cta=view_demo` pour l’ancre de démo des pages sectorielles (retirée du hero
de l’accueil par #647, dont la démo suit directement l’introduction), `model_preview` pour l’ouverture
d’un modèle, `explore_sector` pour une carte métier, `select_specialty` pour le
choix d’un onglet Beauté et `sector_demo` pour sa destination de démo.
`location` identifie le bloc et `variant` le modèle ou le secteur sélectionné.
La destination est le chemin résolu depuis la page courante, y compris les
ancres : le CTA de la démo Beauté reste attribué à `/instituts-beaute`.
Le consentement préalable, les UTM validés et la minimisation existante
s’appliquent. Aucun événement n’est envoyé à l’affichage d’une carte ou au
simple défilement. Les débuts/fins de démo et l’inscription restent inchangés.
Les nouveaux clics sont des mesures de découverte, pas une activation.

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
  à la racine du paquet d'identification, sont retirées. Exception #592 : l'e-mail
  du compte authentifié est conservé seul dans son `$set` de profil après accord ;
  l'identifiant anonyme et l'identifiant stable restent disponibles pour le rapprochement.
- Les événements navigateur reçoivent une `page` issue d'une liste fermée de
  routes publiques et d'entrée produit ; tous les autres chemins deviennent
  `/other`. Aucun identifiant de jeu, code de retrait ou chemin libre n'est envoyé.
  La liste est volontairement identique dans les deux applications.
- Suite du bilan SEO du 21 octobre 2026 (#507) : `/blog` et les chemins
  exacts des 30 articles publiés sont ajoutés à cette liste. Aucun joker
  `/blog/*` : un slug inconnu, un segment supplémentaire ou un chemin
  personnel reste `/other`. Le test de consentement compare les chemins
  au registre éditorial : chaque nouvel article doit être explicitement
  ajouté aux deux helpers. Le registre et ses textes ne sont pas importés
  dans le bundle navigateur.
- Le CTA de fin d'article vers une page interne utilise
  `cta=explore_product`, `location=blog_article`. `start_trial` est
  réservé au véritable lien vers l'inscription de l'application. La
  destination et le libellé visibles ne changent pas.
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

### Exploitation du blog après le correctif du 21 octobre 2026

Noter l'heure du déploiement production effectivement vérifié avant de comparer
les articles dans le rapport Pages vues existant. Les anciens événements
`/other` ne peuvent pas être réattribués. Les anciens CTA éditoriaux pouvaient
être marqués `start_trial` malgré une destination interne : ne pas qualifier
rétroactivement tous ces clics de demandes d'essai. Pour une lecture fiable
de ce canal, utiliser une cohorte/période postérieure à cette livraison,
sans réécrire les événements ni changer les filtres des funnels historiques.

Le libellé d'article permet de mesurer sa lecture consentie et son clic
sortant ; il ne mémorise pas une première page d'atterrissage jusqu'au compte
créé. Une UTM absente n'est pas une source directe et GSC ne peut pas être
rapprochée individuellement d'un visiteur PostHog. Distinguer le rapport
Google (impressions/clics organiques) et le funnel consenti (acquisition et
activation) ; aucune nouvelle attribution persistante n'est introduite ici.
Procédure, dépendances et critères : [opérations SEO](SEO_OPERATIONS.md).

Références : [funnels](https://posthog.com/docs/product-analytics/funnels),
[envoi avant navigation](https://posthog.com/docs/libraries/js/usage),
[sous-domaines](https://posthog.com/tutorials/cross-domain-tracking).
