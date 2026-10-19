# Données et conservation — dossier de validation #508

État au 18 octobre 2026. Ce document distingue les traitements observés, les
critères proposés et les preuves encore nécessaires. Il ne certifie ni les
contrats fournisseurs ni la conformité de l'offre dans un pays.

Le propriétaire a autorisé la préparation des corrections de consentement et
des textes contractuels. Leur publication, la signature des contrats et toute
activation de suppression en production restent des opérations distinctes.

## Traitements et conservation par finalité

| Finalité / données | Responsable et base à documenter | Durée ou critère à retenir | État et action concrète |
| --- | --- | --- | --- |
| Compte marchand : coordonnées professionnelles, accès et établissements | Okado ; contrat pour le cocontractant personne physique, intérêt légitime pour les utilisateurs de la société cliente | Relation contractuelle et assistance ; isoler ensuite les seules preuves nécessaires aux obligations et réclamations | Pas de purge générale de compte démontrée. Préparer chaque fin de contrat selon la procédure ci-dessous. |
| Factures et pièces comptables françaises | Okado ; obligation légale | 10 ans à compter de la clôture de l'exercice concerné | Concerne les pièces comptables, pas tous les profils ni les joueurs. Vérifier l'archivage comptable hors du seul portail Stripe. |
| Participation : identifiants, coordonnées si nécessaires, événements | Marchand ; base déterminée pour son jeu et information préalable | Durée nécessaire au jeu, puis conservation restreinte des seules preuves justifiées | L'ancien SQL applique 3 ans / 5 ans depuis `created_at`, sans distinction de finalité. Ce mécanisme n'est pas une politique validée pour tous les jeux. |
| Gain et retrait : dates, conditions, coordonnées, preuves | Marchand ; gestion du jeu/gain et défense des droits selon la situation | Jusqu'au traitement des gains encore valables ; conserver ensuite uniquement les preuves nécessaires aux réclamations pendant une durée justifiée | Définir le point de départ par événement pertinent et le sort des gains sans expiration avant toute évolution SQL. Ne pas les effacer par simple ancienneté. |
| Prospection du marchand auprès des joueurs | Marchand ; consentement distinct selon le parcours applicable | Fin de cet usage au retrait/opposition ; repère CNIL de 3 ans depuis la collecte ou le dernier contact venant du prospect, à adapter au contexte | Une participation n'est pas un consentement. La table `leads` ne prouve pas une synchronisation des effacements vers tous les exports/fournisseurs. |
| Relation Okado avec les utilisateurs marchands dans Brevo | Okado ; distinguer service, information professionnelle et prospection | Besoin de relation ; pour les prospects, examiner le repère CNIL de 3 ans et le dernier contact venant de la personne ; conserver séparément les oppositions nécessaires | `brevo.ts` synchronise les utilisateurs marchands lors de signup/Google/onboarding/compte ou reprise administrative, sans préférence commerciale. La présence dans une liste n'autorise pas une campagne. Vérifier les automations et désinscriptions dans Brevo avant toute campagne. |
| Mesure d'acquisition et d'usage PostHog : événements, identifiants techniques et e-mail de connexion du profil marchand (#592, accord propriétaire du 18 octobre) | Okado ; consentement préalable pour ce dispositif | Choix valable 180 jours sans renouvellement à la visite ; cookie d'identification au plus 180 jours ; durée des événements/personnes à vérifier dans le projet | Projet 212872 EU confirmé. L'e-mail vient du compte authentifié et accompagne uniquement ses mises à jour de profil, jamais les joueurs ou propriétés libres. Information publique actualisée ; le choix de mesure est contrôlé côté navigateur et serveur. La durée du cookie ne prouve pas la durée des événements hébergés. Pas de modification de rétention du fournisseur sans preuve et analyse des données existantes. |
| Mesure Vercel Analytics | Okado ; même choix préalable que la mesure PostHog dans cette livraison | Collecte après accord ; rétention du service à contrôler dans le contrat et l'offre souscrite | Composant chargé seulement après accord lorsque la mesure est configurée. Paramètres d'URL et identifiants des parcours publics sensibles exclus des URL de mesure. |
| Sécurité, limites de débit et anti-abus | Okado pour la sécurité du service ; besoins propres du marchand à qualifier | Durée limitée au besoin de protection | Le SQL opérationnel prévoit 8 jours pour les verrous quotidiens, 2 jours après échéance pour les limites de débit et l'expiration des identités joueur. Le cron de maintenance dépend de son activation : ces délais SQL ne prouvent pas une purge effectivement opérée. |
| E-mails Resend et sauvegardes | Rôle selon données de compte / jeu | Durées propres aux copies, traces, outbox et sauvegardes à confirmer | L'effacement d'une ligne en base n'efface pas à lui seul les messages fournisseur, exports, archives ou sauvegardes. Recenser les copies avant toute promesse d'effacement complet. |

La proposition historique « 3 ans actifs puis jusqu'à 5 ans » reste un plafond
opérationnel proposé pour certains enregistrements, pas une autorisation de
conserver toutes les données pendant cinq ans. Le code actuel utilise
`created_at` ; aucun dernier contact ni clôture de jeu n'est déduit artificiellement.

## Fournisseurs : preuves à réunir

Ne pas mettre de contrats signés, identifiants de compte, factures, données
personnelles ou secrets dans Git. Conserver les pièces dans l'espace privé du
propriétaire et reporter seulement leur date, version et résultat de contrôle.

| Fournisseur | Flux observé | Source officielle / vérification restante |
| --- | --- | --- |
| Supabase | Authentification, données et fichiers | [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [localisations/transferts](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq). Vérifier contrat applicable, région réelle, sous-traitants et cycle de sauvegarde. |
| Vercel | Hébergement, requêtes et mesure de fréquentation | [DPA](https://vercel.com/legal/dpa). Le texte public consulté le 15 octobre vise Pro/Enterprise ; les documents internes mentionnent Hobby. Vérifier l'offre et la couverture contractuelle effective avec Vercel avant d'affirmer qu'un DPA couvre ce compte. Aucun achat ou changement de forfait autorisé par ce dossier. |
| Resend | Coordonnées et contenu des e-mails de service | [DPA](https://resend.com/legal/dpa), [sous-traitants](https://resend.com/legal/subprocessors). Vérifier applicabilité, rétention du contenu/journaux, transferts et effacement. |
| Stripe | Compte professionnel, paiements et abonnement | [DPA](https://stripe.com/legal/dpa). Distinguer les traitements sous-traités des traitements propres du prestataire de paiement et confirmer la conservation comptable d'Okado. |
| Brevo | Utilisateurs marchands et attributs configurés | [Accès au DPA](https://help.brevo.com/hc/fr/articles/15403782599570-O%C3%B9-trouver-l-accord-de-traitement-des-donn%C3%A9es-DPA). Contrôler les listes et automations réelles ; aucune preuve d'opt-in n'est créée par la synchronisation. |
| PostHog | Événements d'usage et profil avec identifiants techniques et e-mail de connexion du compte après accord (#592) | [DPA](https://posthog.com/dpa), [confidentialité](https://posthog.com/docs/privacy). Faire signer/conserver l'accord correspondant à la région EU ; contrôler rétention des événements/personnes, sous-traitants et demandes d'effacement du seul projet 212872. |

Un hébergement EU n'exclut pas les accès de support ou sous-traitants hors EEE.
La garantie d'un transfert doit être établie pour le flux réel : décision
d'adéquation applicable, clauses contractuelles types et mesures complémentaires
si nécessaires. Aucune garantie uniforme n'est déduite de la seule région.

Contrôle API privé du 15 octobre 2026, en lecture seule : l'identité du projet
212872 est confirmée sur `eu.posthog.com`. La réponse projet expose
`session_recording_retention_period = 30d`, mais pas la rétention des événements
produit/personnes. Cette valeur de replay n'est donc pas utilisée comme durée
de conservation des événements ; le replay du dispositif livré reste désactivé.

## Demande de droits et fin de contrat

1. Recevoir la demande à `contact@okado.app` ou via le marchand organisateur ;
   vérifier l'identité et les droits de l'interlocuteur avec le minimum de données.
2. Distinguer les traitements propres d'Okado des données joueur pour lesquelles
   le marchand donne l'instruction. Consigner finalité, périmètre et échéance de
   réponse dans un suivi privé ; prendre en compte les délais réglementaires.
3. Vérifier jeux/gains encore valables, obligations comptables et éventuel
   contentieux. Préparer la restitution demandée et limiter toute conservation
   résiduelle à son motif documenté et à un accès restreint.
4. Recenser base active, archives, fichiers, notifications/outbox, identités de
   joueur, outils de mesure, messagerie et copies exportées. Une suppression de
   `leads` seule n'est pas une preuve d'effacement de l'ensemble.
5. Soumettre le périmètre exact de suppression et la preuve de sauvegarde au
   propriétaire avant exécution. Aucun appel de purge ne fait partie de l'audit.
6. Demander l'effacement aux fournisseurs concernés, documenter les exceptions
   légales et le sort des sauvegardes ; après restauration, réappliquer les
   demandes d'effacement avant remise en service des données restaurées.
7. Vérifier le résultat et répondre à la personne/au marchand ; conserver une
   preuve minimale du traitement de la demande dans le suivi privé.

## Contrôle du cycle de vie existant

- `npm run check:supabase` confirme les colonnes d'archives et le refus anonyme ;
  ce contrôle ne prouve pas l'exécution de la purge.
- [SQL de contrôle sans mutation](../supabase/verify/personal_data_lifecycle_508.sql)
  vérifie tables, RLS, droits et définition de la fonction depuis le catalogue.
  Ne jamais appeler `purge_personal_data()` pour vérifier son existence.
- Le test isolé `test:data-lifecycle` exécute le SQL historique sur données fictives
  et vérifie ses seuils actuels ; il ne valide pas la pertinence juridique de ces
  seuils pour toutes les finalités.
- `MAINTENANCE_ENABLED` reste désactivé selon la décision opérationnelle existante.
  Une activation nécessite d'abord un plan séparé portant sur les finalités,
  dates de départ, copies, gains encore valables, sauvegarde et retour arrière.

## Validation avant publication

La PR fournit les textes proposés et la recette du choix de cookies. Le
propriétaire valide les faits métier, les contrats applicables et le déploiement.
Faire relire les clauses de responsabilité, le DPA et l'offre France/Canada par
un avocat ; au Canada, la seule référence à la LPRPDE ne couvre pas nécessairement
les lois provinciales, notamment celles du Québec. Ne pas marquer #508 comme
entièrement validée tant que ces pièces restent manquantes.

## Références

- [CNIL — conservation par finalité](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
- [Service Public — conservation des pièces comptables](https://entreprendre.service-public.gouv.fr/vosdroits/F37169?lang=fr).
- [CNIL — gestion commerciale et prospects](https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des).
- [CNIL — contrats de sous-traitance](https://www.cnil.fr/fr/responsable-de-traitement-et-sous-traitant-6-bonnes-pratiques-pour-respecter-les-donnees).
- [CNIL — règles cookies](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies).
- [PostHog — consentement Next.js](https://posthog.com/tutorials/nextjs-cookie-banner).
- [Canada — lois fédérales et provinciales](https://www.priv.gc.ca/fr/sujets-lies-a-la-protection-de-la-vie-privee/lois-sur-la-protection-des-renseignements-personnels-au-canada/02_05_d_15/).
