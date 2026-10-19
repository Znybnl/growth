# Consentement de mesure et informations sur les données — #508

## Résultat attendu et accord

À la demande du propriétaire du 15 octobre 2026, préparer les corrections
recommandées après l'audit #506 : consentement préalable pour la mesure,
confidentialité et DPA complétés, conservation distinguée par finalité.
Refs #507 et #508. L'accord porte sur la préparation du code et des textes ;
les contrats fournisseurs, la relecture juridique et la publication restent
à valider sur ce résultat concret. Aucun changement de purge n'est livré.

## Comportement livré

- Deux applications : choix Accepter / Refuser de même visibilité, possibilité
  de continuer sans décider et bouton permanent Gérer les cookies.
- Préférence versionnée, horodatée, valable 180 jours sans prolongation à chaque
  visite, partagée uniquement sur les domaines Okado explicitement nommés.
- Pas d'initialisation PostHog, capture produit ni identification sans accord.
  Le serveur vérifie aussi le choix : webhooks et tâches sans préférence explicite
  ne produisent plus d'événements produit. Les logs opérationnels serveur gardent
  leur configuration séparée ; les erreurs navigateur suivent le consentement.
- Retrait : arrêt des nouvelles captures, remise à zéro de l'identité et
  suppression des clés navigateur du seul projet ; nouvelle acceptation possible.
  Les événements déjà hébergés relèvent d'une demande d'effacement distincte.
- Autocapture, replay, console automatique, exceptions automatiques, flags,
  enquêtes et tours désactivés. Propriétés URL/paramètres/titres personnelles
  retirées avant capture produit ; Vercel Analytics attend le même accord.
- Le tracking d'acquisition préparé précédemment (#507) est inclus : CTA,
  démonstration, début/échec d'inscription, identification après création et
  événement serveur de première inscription Google. Aucun texte saisi dans la
  démo n'est envoyé.

Le [funnel existant](https://eu.posthog.com/project/212872/insights/0gtandAv)
reste dans le projet 212872 EU et décrit les personnes consentantes, pas la
totalité des visites. Sa description et ses cinq étapes ont été mises à jour
par API avec le filtre `consentVersion = 2026-10-15`, puis relues pour vérifier
les cinq filtres. Les anciens événements sans ce marqueur sont exclus ; la
vue peut rester vide avant déploiement de l'instrumentation consentie.

## Textes et données

Confidentialité : rôles, bases selon le compte, destinataires, finalités de la
mesure, choix et retrait, droits et critères de conservation. DPA : périmètre,
instructions, sécurité, sous-traitants, transferts, assistance, violations,
restitution/effacement et audits. Règlement : participations sans coordonnées
selon le parcours, droits applicables et distinction jeu/prospection/mesure.
Les clauses locales Canada ne sont pas présentées comme automatiquement validées.

Le [registre de travail](../DATA_PROCESSING_REGISTER.md) réunit la matrice par
finalité, les sources officielles, les pièces fournisseurs manquantes et une
procédure de demande de droits/fin de contrat. Il distingue le SQL historique
3/5 ans depuis création de la politique à établir par finalité. Les durées de
cookies, de replay et d'événements hébergés ne sont pas confondues.

Contrôles en lecture seule sur la cible configurée : les trois tables d'archive
répondent avec la service role et refusent la lecture anonyme (GET `limit=0`,
aucune ligne personnelle retournée). Le projet PostHog 212872 EU est confirmé ;
la métadonnée replay indique 30 jours, sans preuve de rétention des événements
produit. Aucun appel de purge ni changement de configuration de production.

## Vérifications et limites

- Lint et build des deux applications ; avertissements de navigation déjà
  présents à distinguer de nouvelles erreurs.
- `test:analytics-consent` : protocole identique dans les deux apps, choix
  invalide/expiré, nettoyage ciblé, refus/retrait/nouvel accord, propriétés
  minimisées et serveur sans requête ou sans consentement ; tous appels simulés.
- `test:data-lifecycle` : vrai SQL historique sous PGlite sur données fictives,
  seuils actuels, dépendances, droits/RLS et absence de doublons d'archive. Ne
  constitue pas une validation juridique des durées ni une preuve d'activation.
- Playwright : vrai bandeau/SDK dans les deux apps, réseau analytics intercepté
  et token fictif. Tests du site public aux largeurs 1440/768/390/320 px.
  Les indices headless sont neutralisés seulement dans le navigateur de test,
  car le SDK filtre les bots ; le code livré conserve ce filtre.
- Source/encodage et diff contrôlés. Les deux nouveaux tests isolés sont ajoutés
  à la CI. Aucun compte, e-mail, contact ni événement PostHog réel créé pour la recette.

Résultats locaux : lint/build des deux apps réussis (4 avertissements de
navigation existants côté SaaS), 4 tests consentement et 1 test SQL réussis,
6 scénarios navigateur SaaS réussis, 37 tests de permissions administrateur
réussis. La suite landing couvre 48 scénarios ; la démo est vérifiée avec un
refus de mesure explicite afin de tester l'absence de transmission après ce
choix, tandis que la suite de consentement vérifie séparément le premier affichage.

Le build local de la landing utilisé pour la recette contient exclusivement le
token fictif `phc_consent_fixture`. Ne pas déployer cet artefact de test : la CI
et Vercel reconstruisent depuis le commit avec les variables de leur environnement.

## Recette propriétaire et publication

1. En navigation privée, constater les deux choix et continuer à utiliser le
   site et l'inscription après refus.
2. Accepter puis retirer via Gérer les cookies ; vérifier que le choix subsiste
   entre `www.okado.app` et `app.okado.app` sur le candidat autorisé. Les previews
   de domaines Vercel distincts ne partagent pas le cookie de production.
3. Relire confidentialité, CGV/DPA et règlement, notamment les obligations
   nouvelles et les limites France/Canada. Faire relire DPA/responsabilité/périmètre
   Canada par un avocat ; confirmer les faits métier et les contrats fournisseurs.
4. Vérifier la couverture du DPA Vercel pour l'offre réellement souscrite et
   conserver les accords fournisseurs applicables dans l'espace privé.
5. Autoriser le merge et le déploiement des deux applications après les checks.
   Aucun changement de `MAINTENANCE_ENABLED` n'est inclus.

## Risques et retour arrière

La mesure produit diminue après refus, expiration ou absence de contexte serveur ;
c'est le comportement attendu. Les dashboards basés sur des webhooks peuvent
présenter une rupture de série. Les notifications, gains, stocks, paiements,
indicateurs en base et consentements de prospection ne sont pas modifiés.
La PR ajoute des engagements au DPA : leur validation précède toute publication.

Pas de migration. Pour arrêter la collecte, définir
`NEXT_PUBLIC_POSTHOG_ENABLED=false` et reconstruire/redéployer les deux apps.
Un retour de code vers l'ancienne instrumentation réactiverait la collecte
sans ce garde : conserver le drapeau désactivé pendant un éventuel rollback.
Les textes peuvent être rétablis au dernier état approuvé sans toucher aux
données. Une purge future exige son propre plan de sauvegarde et de retour arrière.
