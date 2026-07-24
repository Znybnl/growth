# Audit produit et positionnement marché — Okado

Date : 16 juillet 2026
Périmètre : dépôt Okado (`apps/landing-page`, `apps/web-app`), écrans PNG présents dans le dépôt, documentation go-live/sécurité, et benchmark public des offres concurrentes.

## 1. Verdict exécutif

Okado est suffisamment abouti pour un lancement pilote payant et une mise sur le marché contrôlée auprès de restaurants/commerces mono-site. Le produit couvre déjà la chaîne de valeur essentielle : création d’une animation, diffusion par QR, jeu mobile, collecte d’un lead, attribution d’un lot, e-mail de gain, QR/code de retrait, validation vendeur, export et facturation Stripe.

En revanche, il n’est pas encore au niveau d’un produit “scale” ou d’une vente autonome à des franchises/agences. Les écarts les plus importants sont la profondeur CRM/lifecycle, le multi-établissements et les rôles d’équipe, la programmation des campagnes, la gestion de codes promotionnels importés, la segmentation/activation des leads, les intégrations et la robustesse perçue des analytics.

Recommandation : lancer maintenant un pilote instrumenté, avec une promesse plus étroite (“activation QR simple pour générer des visites, leads et retours”), puis investir en priorité dans la fiabilité, la conformité et le time-to-value avant d’ajouter de nouveaux jeux.

## 2. Ce que le produit fait déjà

### Back-office marchand

- Authentification e-mail et Google, onboarding en plusieurs étapes, données du commerce, liens Google/Instagram/Facebook/TikTok/Tripadvisor et compte de facturation.
- Dashboard avec campagnes actives, leads, lots retirés, conversion, campagnes prioritaires, meilleure campagne, derniers leads et alertes opérationnelles.
- Création/édition/duplication/suppression de campagnes.
- Deux mécaniques : roue de la fortune et ticket à gratter.
- Actions marketing ordonnées avant le jeu : Google, Instagram, Facebook, TikTok, Tripadvisor, CRM ou lien personnalisé.
- Personnalisation du logo, du texte, des couleurs, du fond, de la typographie, du bouton, des templates de page et d’une affiche A4.
- Lots avec probabilité, stock, coût unitaire, délai de disponibilité, durée de retrait, conditions et option “100 % gagnant”. Suggestions de lots contextualisées par secteur.
- Personnalisation de l’e-mail de gain : expéditeur, reply-to, objet, préheader, headline, corps, bouton, footer et couleur.
- Page Données avec KPI, évolution journalière, tunnel scans → leads → lots retirés, volumes par action, stocks, chronologie, recherche, pagination et export CSV.
- Retrait marchand avec code/QR unique, renvoi d’e-mail, reset de lot et alertes de stock/e-mails en échec.
- Stripe Checkout/Customer Portal, Resend, Google Places, Brevo, PostHog et Vercel Analytics.

### Parcours public

1. Scan du QR ou ouverture de la page publique.
2. Écran d’introduction/action marketing, ouverture du lien dans un nouvel onglet.
3. Préparation d’une session de jeu avec garde-fous de fréquence.
4. Roue ou ticket à gratter sur mobile, sans application.
5. Écran perdu ou formulaire gagnant (prénom, e-mail, consentement facultatif).
6. Confirmation du gain, conditions, période de retrait, code et QR.
7. E-mail de gain puis validation vendeur à usage unique.

### Maturité opérationnelle déjà documentée

La checklist go-live couvre les flux critiques (auth, campagnes, QR, affiche, jeu, e-mail, retrait, Stripe, RLS, webhooks, observabilité). C’est un bon signal de discipline produit. Le dépôt contient aussi une matrice de sécurité API/RLS et un playbook de lancement pilote.

## 3. Audit des écrans et de l’expérience

### Écrans solides

- **Landing page** : promesse claire, démo interactive, cas d’usage, parcours sécurisé et prix visible (20 € HT/mois en France, 29 $ CAD/mois au Canada, 30 jours d’essai sans carte).
- **Connexion/onboarding** : entrée rassurante, identité marchand, configuration des liens marketing et progression métier.
- **Dashboard** : bonne lecture opérationnelle ; les alertes de stock et d’e-mail donnent une prochaine action concrète.
- **Éditeur** : prévisualisation mobile simultanée, choix roue/ticket, actions ordonnées, templates et mode expert ; différenciation forte pour un petit commerçant.
- **Page publique** : expérience mobile immersive, zéro téléchargement, états gagnant/perdu/bloqué, QR conservable immédiatement.
- **Données** : le produit relie acquisition, lot et retrait, ce qui est plus utile qu’un simple compteur de participations.

### Frictions et risques d’interface

- L’éditeur reste très long et dense : identité, actions, mécanique, template, logo, texte, fond, bouton, dotations et options expertes sont exposés dans une seule page. Le mode expert est un bon mécanisme, mais il doit devenir un vrai wizard guidé avec résumé et validation par étape.
- Le CTA “Enregistrer” est global ; il manque une notion explicite de brouillon, test, prévisualisation publique et publication. Un marchand peut ne pas savoir si une campagne est réellement active et imprimable.
- Le dashboard affiche dans les visuels de démonstration des ratios incohérents (ex. conversion à 133 %). Même si cela vient de données de test, cela dégrade immédiatement la confiance dans la mesure.
- Le menu principal reste court (Dashboard, Campagnes, Données, Compte) et les écrans poster/e-mail ne sont accessibles qu’au niveau campagne ; il faut mieux faire apparaître le cycle “Créer → Publier → Diffuser → Mesurer → Récompenser”.
- Le retrait repose sur la page Données. Pour un équipier en caisse, un écran “Scanner un gain” dédié, rapide et tolérant aux erreurs serait plus sûr.
- L’expérience perdue est correcte mais peu activante : pas de relance, de nouveau jeu programmé, de partage, ni d’offre de retour.
- Le formulaire gagnant demande prénom/e-mail, mais la collecte de consentement, la preuve d’information et la suppression sont peu visibles côté produit ; le marchand reste dépendant du support pour certaines demandes RGPD.

## 4. Benchmark concurrentiel

| Offre | Positionnement et parcours observé | Fonctionnalités/pricing public | Lecture pour Okado |
|---|---|---|---|
| **Roue Gagnante** | Niche restaurant, promesse “prêt en 5 minutes” : créer → QR → fidéliser/collecter. Dashboard et anti-fraude mis en avant. | 5 jeux (roue, scratch, slot, boîte mystère, dés), multi-restaurants et QR personnalisés. Starter 29 €/mois (1 restaurant, 1 000 parties, 2 campagnes), Pro 59 € (3 restaurants, 5 000 parties), Enterprise 129 € (illimité, API/webhooks, marque blanche). [Source officielle](https://rouefidelite.com/) | Concurrent direct le plus comparable. Okado est moins cher et plus riche sur l’e-mail, les affiches et le retrait ; il est en retard sur le nombre de jeux, multi-sites et preuve sociale. |
| **SpinWinGo** | Restaurant + avis Google, roue personnalisable, QR, dashboard, coupons. | Starter 29 CHF (1 établissement), Pro 49 CHF (3 établissements, jeux illimités, centralisation des avis, assistant IA), Business 99 CHF (illimité, API/webhooks, account manager). [CGV officielles](https://spinwingo.app/en/terms) | Valide le pricing par paliers et la valeur multi-établissements. Okado doit clarifier son différenciateur au-delà du prix. |
| **Connectable** | Programme de fidélité gamifié avec activation très courte et garde-fous légaux explicites. | Gratuit jusqu’à 100 membres ; Pro 49 €/mois avec e-mail/SMS illimités, points, niveaux, missions, segmentation, analytics ROI et invitation avis conforme. [Source officielle](https://connectable.fr/) | Menace sur le lifecycle et la rétention, pas seulement sur le jeu. Okado doit ajouter une boucle de retour (segments, rappels, campagnes récurrentes). |
| **QronoPlay** | Plateforme française self-service, 14 jours d’essai, mise en avant du RGPD et de 5 langues. | 14 jeux annoncés ; 9,90 € Starter, 29,90 € Pro (8 jeux), 99 € Business (14 jeux). [FAQ et tarifs publics](https://qronoplay.com/en/faq) | Pression prix/largeur fonctionnelle. Okado doit vendre la qualité d’exécution locale et le retrait sécurisé, pas le catalogue de jeux. |
| **Socialshaker** | Suite de campagnes gamifiées plus généraliste : création, e-mail editor, partage social, export, CRM et workspaces. | Gratuit ; Basic 79 €/mois annuel (3 campagnes, 500 participants) ; Pro 149 € (5, 10 000) ; Advanced 239 € (10, 15 000). Mensuel 99/199/299 €. [Pricing officiel](https://www.socialshaker.com/en/pricing/) | Référence pour la collaboration, les quotas, l’emailing et le support SLA ; beaucoup plus complexe pour un restaurant. |
| **Drimify** | Plateforme de création d’expériences ; nombreuses intégrations, analytics/data export, API, workspaces et collaborateurs. | Free 100 participations/mois ; Starter 1 000 ; Growth 25 000 ; Enterprise sur devis. Toutes les fonctionnalités sont incluses, marque blanche en option. [Pricing officiel](https://help.drimify.com/en/article/drimify-pricing-plans-28sh6x/) | Référence de packaging par volume et d’ouverture API. Okado peut garder un prix simple mais devra ajouter des limites/tiers cohérents à mesure que le volume augmente. |
| **Easypromos** | Catalogue très large et plutôt “promotion/campagne” : instant win, roue, scratch, codes, validations et stats. | Basic 29 $/mois, Basic PRO 49 $, Premium 199 $ (52 apps, instant prizes, coupons), White Label 399 $. Instant Win Premium : 10 000 participants/promotion, e-mail, formulaires, intégrations, stats avancées et redemption POS. [Pricing officiel](https://www.easypromosapp.com/pricing/) | Référence de profondeur promotionnelle et de couponing. Okado doit prioriser les codes uniques, l’import de lots et la réconciliation de stock. |
| **Woobox** | Plateforme de contenu interactif avec dashboard lead capture et personnalisation avancée. | Free 100 submits/mois ; Basic 29 $/1 000 ; Pro 79 $/10 000 ; Ultra 199 $/100 000 ; Max 499 $/500 000. [Pricing officiel](https://woobox.com/pricing) | Référence de tarification usage-based et de montée en gamme ; Okado peut conserver l’illimité au départ puis introduire un palier volume. |

### Synthèse concurrentielle

- **Avantage Okado** : prix d’entrée bas, essai 30 jours, parcours local de bout en bout, affiches et QR prêts à imprimer, e-mail de gain brandé, contrôle de stock et retrait unique.
- **Parité** : roue/scratch, QR sans app, collecte de contacts, avis/réseaux sociaux, dashboard, exports, abonnement sans engagement.
- **Retard critique** : nombre de jeux, multi-sites, rôles/collaboration, CRM/SMS natif, segmentation, campagnes planifiées, codes promotionnels, API/webhooks marchands, preuve sociale/cas clients.

## 5. Évaluation de maturité go-to-market

| Dimension | Niveau | Diagnostic |
|---|---:|---|
| Proposition de valeur | 4/5 | Compréhensible et adaptée au terrain ; à resserrer sur 1 ICP prioritaire. |
| Time-to-value | 3/5 | Le parcours est faisable, mais l’éditeur monolithique et l’onboarding peuvent ralentir le premier lancement. |
| Expérience participant | 4/5 | Mobile-first, sans app, états clés couverts ; manque de relance après perte et de personnalisation contextuelle. |
| Opérations terrain | 3/5 | Retrait sécurisé et alertes présents ; écran caisse/scanner et gestion d’équipe manquants. |
| Analytics | 3/5 | Funnel et exports utiles ; cohérence des ratios, filtres temporels, cohortes et ROI à renforcer. |
| CRM/lifecycle | 2/5 | Brevo existe, mais pas de segmentation, scénarios, SMS, consentement opérationnel ni sync bidirectionnelle visible. |
| Multi-sites/collaboration | 1/5 | Modèle centré sur un marchand et un compte ; pas de rôles, workspaces, franchises ou équipes terrain. |
| Fiabilité/sécurité | 4/5 | RLS, rate limits, webhooks signés, idempotence métier et checklist go-live documentés ; à valider en pilote réel. |
| Conformité | 3/5 | Consentement et règlement existent ; la mécanique avis/gain exige une revue juridique et un découplage strict. |
| Packaging/pricing | 3/5 | 20 € HT est très compétitif ; absence de paliers peut limiter l’ARPA et la gestion des gros volumes. |

**Score global indicatif : 3,1/5 — “pilot-ready”, pas encore “scale-ready”.**

## 6. Priorités produit

### P0 — avant ou pendant les premiers clients payants (0–30 jours)

1. **Conformité avis** : wording et UX garantissant que le gain ne dépend jamais de la publication, de la note ou du caractère positif d’un avis ; lien vers une demande d’avis neutre ; documentation et kill-switch. Google interdit explicitement les avantages en échange d’un avis et peut restreindre une fiche en cas de violation ([Google](https://support.google.com/business/answer/3474122?hl=en), [restrictions](https://support.google.com/business/answer/14114287?hl=en)).
2. **Qualité des métriques** : dénominateurs cohérents, conversion bornée, événements dédupliqués, définition écrite de scan/participation/lead/retrait et zéro KPI impossible.
3. **Publication guidée** : brouillon/test/publication, statut et URL/QR clairement affichés, checklist “prêt à imprimer”, confirmation de scan depuis un mobile.
4. **Mode caisse** : écran de scan dédié, recherche par code/e-mail en secours, succès/échec lisibles, journal et permissions minimales.
5. **Observabilité client** : statut e-mail en langage simple, action de renvoi, notification de campagne inactive/stock épuisé et support contextualisé.
6. **Activation pilote** : 3 templates de campagnes préconfigurées (avis neutre, collecte e-mail, retour en boutique), données d’exemple réalistes et mesure du temps jusqu’au premier QR imprimé.

### P1 — 30–90 jours

1. Wizard de création en 4 étapes : objectif → jeu/template → lots/règles → diffusion/publication, avec résumé final.
2. Programmation date/heure, fuseau, pause automatique, plafond quotidien et calendrier de disponibilité.
3. Codes promotionnels : import CSV de codes uniques/génériques, réservation, consommé/expiré, export et audit.
4. Segments et lifecycle : nouveaux leads, gagnants non retirés, clients inactifs ; export ciblé ; intégration Brevo bidirectionnelle et au moins un connecteur Zapier/Make ou webhook.
5. Équipe et lieux : invitations, rôles propriétaire/manager/caisse, plusieurs établissements et campagnes groupées.
6. Analytics : filtres période/source/emplacement, taux étape par étape, coût par lead, taux de retrait, valeur du lot et cohortes de retour.
7. Mobile terrain : PWA légère ou écran optimisé pour opérateur, fonctionnement dégradé et aide de résolution.

### P2 — 3–6 mois

1. 2–3 mécaniques à forte valeur locale (instant win simple, quiz court, tampon/fidélité) plutôt qu’un catalogue généraliste.
2. SMS et scénarios de relance, avec opt-in explicite et centre de préférences.
3. API/webhooks marchands, SSO/SCIM seulement si la demande franchise est confirmée.
4. Bibliothèque de templates par secteur, duplication multi-sites et localisation multilingue.
5. Tests de variantes, attribution UTM/QR par emplacement, benchmarks anonymisés et rapport ROI partageable.
6. Packaging : Starter 19–29 €, Pro 49–69 €, Multi-site/Agency sur devis, avec quotas transparents (participations, établissements, sièges, intégrations).

## 7. Positionnement recommandé

Ne pas se présenter comme une “plateforme de gamification” généraliste : les acteurs spécialisés ont déjà 5 à 14 jeux et les suites enterprise en proposent beaucoup plus. Positionner Okado comme **le système d’activation QR opérationnel des commerces locaux** : “un QR imprimé aujourd’hui, une animation jouable sans app, un lot traçable, un lead exploitable et un retrait sécurisé”.

ICP de départ : restaurant indépendant ou petit réseau (1–3 établissements), 20–200 couverts/jour, objectif mesurable (retour en boutique, collecte opt-in, avis neutre), équipe sans compétence marketing dédiée.

Preuves à construire : temps médian jusqu’au premier QR imprimé, taux scan→jeu, jeu→lead, lead→retrait, coût par lead, taux d’e-mail délivré, taux de retour à 30 jours, incidents de fraude et avis générés sans conditionnement.

## 8. Décision de lancement

**Go pour un pilote payant encadré**, sous quatre conditions :

- 5–10 établissements maximum au départ, avec support humain et test réel du retrait ;
- conformité avis validée avant diffusion ;
- instrumentation des métriques et revue hebdomadaire des funnels ;
- aucun engagement commercial de type “plus d’avis garantis” tant que la boucle conformité/mesure n’est pas prouvée.

**No-go pour une vente self-service à grande échelle ou franchise** tant que les rôles, multi-sites, planification, codes et lifecycle CRM ne sont pas traités.
