# Cahier de tests Go-to-Market — Okado

Version : 1.0  
Date de préparation : 24/07/2026  
Périmètre : `okado.app` / `www.okado.app` et `app.okado.app`  
Décision visée : ouverture d’un pilote payant, puis mise en production contrôlée

## 1. Règles de décision

Un test est **OK** uniquement si la preuve est conservée : URL, horodatage, compte utilisé, identifiant de campagne/lead, capture ou export de résultat.

- **GO** : tous les tests bloquants sont OK, aucun risque critique ouvert et le rollback est prêt.
- **GO pilote encadré** : les tests non bloquants sont documentés, avec support humain et plafond de 5 à 10 établissements.
- **NO-GO** : échec d’authentification, création/publication de campagne, tirage, envoi du gain, retrait unique, séparation entre marchands, paiement ou sauvegarde/restauration.
- **À rejouer après chaque release** : tout test touchant une route API, une migration Supabase, l’authentification, le paiement, les emails, le retrait ou les composants modifiés.

Le candidat de release doit être figé sur le commit réellement déployé. Au 24/07/2026, le worktree contient des modifications non committées sur l’authentification, les campagnes, la caisse, les lieux, l’affiche, le parcours public et le shell marchand : les tests finaux doivent être rejoués après intégration de ces changements.

## 2. Résultats déjà vérifiés depuis cet environnement

| ID | Contrôle | Résultat observé | Limite de la preuve |
|---|---|---|---|
| LOC-01 | `npm run check:gotomarket` | OK | Vérifie la cohérence des variables et conventions ; ne prouve pas le fonctionnement de chaque fournisseur. |
| LOC-02 | `npm run check:gotomarket -- --live` | OK | Les endpoints de production contrôlés répondent ; ne couvre pas les parcours authentifiés. La version de npm utilisée émet un avertissement sur `--live`. |
| LOC-03 | `npm run check:dependencies` | OK | Exception `sharp/postcss` acceptée jusqu’au 06/08/2026 ; ce n’est pas une absence de vulnérabilité. |
| LOC-04 | `npm run check:supabase` | OK | Tables attendues, RLS testée par refus anonyme et RPC présentes sur `aeespnvqrfgzuuhchnnp.supabase.co`. L’état complet des policies reste à confirmer côté SQL Editor / `supabase db lint`. |
| LOC-05 | `npm run smoke:critical` | BLOQUÉ | Échec `fetch failed` : aucun serveur disponible sur `http://localhost:3000`. |
| LOC-06 | `npm run smoke:security` | BLOQUÉ | Même blocage réseau local ; aucune conclusion fonctionnelle ou sécurité ne doit être tirée. |
| LOC-07 | `npm run lint`, `npm run build:web`, `npm run build:landing` | OK | Lint web + landing OK ; build web OK avec 51 routes générées ; build landing OK avec 7 routes générées. |

## 3. Préparation du test

### Comptes et données de test

Préparer des comptes distincts et traçables :

1. marchand A standard, avec un établissement et une campagne de test ;
2. marchand B standard, avec une campagne différente ;
3. compte administrateur SaaS ;
4. compte Google existant et compte Google nouveau ;
5. adresse email de test réellement accessible, idéalement sur deux fournisseurs ;
6. moyen de paiement Stripe de test si l’environnement est en mode test.

Ne jamais utiliser une vraie donnée client pour les essais. Les campagnes, leads et dotations de test doivent être identifiables par un préfixe, par exemple `GTM-20260724-*`, puis supprimés ou archivés.

### Commandes techniques

À exécuter depuis la racine du dépôt, avec le `.env.local` de l’environnement concerné :

```powershell
npm run lint
npm run build:web
npm run build:landing
npm run check:gotomarket
npm run check:gotomarket -- --live
npm run check:dependencies
npm run check:supabase
```

Après démarrage d’un serveur sur le même environnement :

```powershell
$env:OKADO_SMOKE_BASE_URL = "https://app.okado.app"
$env:OKADO_SMOKE_EMAIL = "compte-de-test"
$env:OKADO_SMOKE_PASSWORD = "mot-de-passe-de-test"
npm run smoke:critical
npm run smoke:security
```

Les identifiants ne doivent jamais être commités ni copiés dans le cahier de preuve.

## 4. Cahier de tests fonctionnels

### A. Déploiement, domaines et accès

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-001 | Ouvrir `https://okado.app`, `https://www.okado.app` et `https://app.okado.app` depuis un réseau externe | HTTPS valide, domaine attendu, redirections sans boucle, aucune erreur navigateur | À vérifier hors environnement : DNS, Vercel et certificat |
| GTM-002 | Vérifier les redirections apex/www et les URLs canoniques | Une seule URL canonique par surface, liens landing vers `app.okado.app` | À vérifier manuellement |
| GTM-003 | Tester une page inconnue et le rafraîchissement direct d’une route App Router | Page 404 correcte, pas de 500, pas de perte de session | À vérifier dans navigateur |
| GTM-004 | Tester Chrome, Safari, Firefox et Edge sur desktop | Aucun blocage fonctionnel, console sans erreur critique | À vérifier manuellement |
| GTM-005 | Tester iOS Safari et Android Chrome en 4G puis Wi-Fi | QR, jeu, formulaire, email et retrait utilisables sans zoom horizontal | À vérifier sur appareils réels |
| GTM-006 | Vérifier le déploiement Vercel, le commit, les variables Production et les logs | Le commit testé est celui en production ; aucune variable de test ou TLS permissif | À vérifier dans Vercel |

### B. Authentification et onboarding marchand

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-010 | Créer un compte email avec données valides | Compte créé, session ouverte ou confirmation attendue clairement affichée | À vérifier sur cible |
| GTM-011 | Tester email déjà utilisé, mot de passe trop court, email invalide et champs vides | Message utile, aucune création partielle, pas de fuite d’information sensible | À vérifier sur cible |
| GTM-012 | Se connecter, se déconnecter, revenir en arrière et rouvrir une route privée | Session cohérente, accès protégé après déconnexion | Smoke à exécuter sur cible |
| GTM-013 | Connexion Google avec compte existant | Retour sur la bonne session marchand, sans création de doublon | À vérifier dans Supabase Auth + navigateur |
| GTM-014 | Connexion Google avec nouveau compte | Création du marchand et passage onboarding sans boucle de redirection | À vérifier avec Google OAuth réel |
| GTM-015 | Interrompre l’onboarding, recharger, reprendre et valider des champs incomplets | Reprise sûre, validation claire, aucune fiche marchand orpheline | À vérifier sur cible |
| GTM-016 | Vérifier les rôles standard/admin sur `/support` et `/backgrounds` | Standard refusé ; admin autorisé ; aucune donnée admin dans le HTML/API standard | Smoke sécurité + vérification manuelle |

### C. Compte, établissements et campagnes

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-020 | Modifier les informations du marchand puis recharger | Données persistées et affichées partout où attendues | À vérifier sur cible |
| GTM-021 | Créer, sélectionner, archiver un deuxième établissement | Le périmètre actif change réellement ; les campagnes et données restent isolées par lieu | À vérifier sur cible |
| GTM-022 | Créer une campagne roue avec lot illimité | Enregistrement, édition, activation et page publique fonctionnels | Smoke critique + preuve de campagne |
| GTM-023 | Créer une campagne ticket à gratter | Rendu, interaction, résultat et sauvegarde cohérents | À vérifier manuellement sur mobile |
| GTM-024 | Vérifier les validations : aucun lot, quantité invalide, probabilités non égales à 100 %, URLs invalides | Enregistrement refusé avec message explicite ; aucune campagne partiellement créée | À vérifier sur cible |
| GTM-025 | Modifier une campagne existante puis annuler/recharger | Annulation sans écraser les données ; sauvegarde persistante après rechargement | À vérifier sur cible |
| GTM-026 | Publier, mettre en pause, réactiver puis supprimer/archiver une campagne | Page publique disponible uniquement selon le statut attendu | Smoke critique |
| GTM-027 | Dupliquer une campagne dans le même lieu puis vers un autre lieu | Nouvelle campagne indépendante, aucun mélange de lots/leads/URLs | À vérifier avec deux lieux |
| GTM-028 | Générer QR et affiche PNG pour une campagne standard | QR pointe vers la bonne URL ; PNG lisible et fidèle au template | À vérifier par téléchargement et scan réel |
| GTM-029 | Tester logo, fond, police, couleurs, tailles de bouton et texte long | Pas de débordement, contraste lisible, rendu stable dans jeu et affiche | À vérifier visuellement sur desktop/mobile |

### D. Parcours client public et jeu

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-030 | Ouvrir l’URL publique depuis QR, lien direct et navigation privée | Campagne active visible sans compte marchand ; aucune donnée interne exposée | Smoke critique + navigateur |
| GTM-031 | Démarrer une session puis abandonner/recharger | Session cohérente ; aucun gain créé sans finalisation | À vérifier sur cible |
| GTM-032 | Participer avec prénom, email valide et consentement | Résultat déterministe selon la configuration, lead créé une seule fois, événement journalisé | Smoke critique + Supabase |
| GTM-033 | Soumettre email invalide, prénom vide, double clic et requêtes répétées | Validation propre, pas de double lead/gain, rate limit effectif | Smoke sécurité + test manuel |
| GTM-034 | Tester résultat gagnant | Lot correct, conditions, délai de disponibilité et expiration affichés | Smoke critique + email réel |
| GTM-035 | Tester résultat perdant | Message conforme, aucune dotation ni email de gain créé | À vérifier avec campagne perdante |
| GTM-036 | Cliquer l’action Google/social/custom | Bonne URL, nouvel onglet si prévu, aucun blocage popup non expliqué | À vérifier avec liens réels |
| GTM-037 | Tester campagne expirée, inactive et abonnement expiré | Jeu et export bloqués selon la règle ; compte/facturation restent accessibles | À vérifier sur cible avec états contrôlés |
| GTM-038 | Tester réseau lent/intermittent et double soumission | État de chargement, message de reprise, aucune création incohérente | À vérifier sur réseau mobile |

### E. Gain, email et retrait

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-040 | Vérifier l’email de gain reçu | Expéditeur `okado.app`, sujet/contenu corrects, QR lisible, conditions et expiration exactes | À vérifier dans les boîtes réelles |
| GTM-041 | Ouvrir le lien de retrait depuis l’email sur mobile | Page accessible, informations minimales, pas de secret exposé | À vérifier manuellement |
| GTM-042 | Scanner le QR vendeur / saisir le code avec un gain disponible | Lot et identité minimale concordants ; retrait validable par le bon marchand | Smoke critique + appareil réel |
| GTM-043 | Valider le retrait une première fois | Statut `redeemed`, audit créé, compteur/stock mis à jour une seule fois | Smoke critique + Supabase |
| GTM-044 | Rejouer le même QR, code ou clic de validation | Deuxième retrait refusé, message compréhensible, aucun double débit de stock | Smoke critique obligatoire |
| GTM-045 | Tester code invalide, gain expiré, lot indisponible et mauvais établissement | Refus explicite, aucune mutation partielle | À vérifier sur cible |
| GTM-046 | Tester renvoi d’email, cooldown et échec d’envoi | Renvoi limité, statut visible, pas de spam, reprise support possible | À vérifier dans Resend + UI |

### F. Back-office, caisse, données et support

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-050 | Ouvrir dashboard, campagnes, données, compte, caisse et support | Navigation correcte, chargements et états vides lisibles | À vérifier sur cible |
| GTM-051 | Rechercher un lead par email/code puis exporter | Résultat exact, export limité au marchand/lieu autorisé, format exploitable | À vérifier avec données de test |
| GTM-052 | Vérifier les métriques après participation, email et retrait | Compteurs et statuts cohérents avec Supabase | À vérifier dans UI + base |
| GTM-053 | Tester le mode caisse sur un smartphone opérateur | Lecture et validation rapides, boutons utilisables à une main, erreur récupérable | Test terrain obligatoire |
| GTM-054 | Vérifier supervision des emails, webhooks, gains non retirés et erreurs métier | Événements récents visibles, horodatage et statut corrects | À vérifier avec événements réels |

### G. Paiement et intégrations externes

| ID | Action | Résultat attendu | Statut / preuve à fournir |
|---|---|---|---|
| GTM-060 | Démarrer Checkout Stripe en test puis revenir annuler | Prix, devise, marchand et redirection corrects ; aucun abonnement actif après annulation | À vérifier dans Stripe test |
| GTM-061 | Réaliser un paiement Stripe de test | Webhook reçu, abonnement synchronisé dans Supabase, accès produit conforme | À vérifier dans Stripe, logs et base |
| GTM-062 | Rejouer un webhook Stripe et envoyer une signature invalide | Idempotence ; signature invalide refusée ; pas de double mutation | À vérifier dans Stripe CLI/dashboard |
| GTM-063 | Ouvrir le portail client Stripe | Bon client et bon abonnement, retour vers l’application | À vérifier avec compte test |
| GTM-064 | Vérifier webhook Resend signé et non signé | Événement valide enregistré ; événement falsifié refusé | À vérifier dans Resend |
| GTM-065 | Rechercher un établissement Google puis générer un lien d’avis | Résultat correct, clé non exposée, fallback manuel fonctionnel | À vérifier avec clé et quota réels |
| GTM-066 | Vérifier les événements PostHog attendus | `signup_completed`, `campaign_created`, `campaign_published`, `draw_started`, `draw_finalized`, `reward_email_sent/failed`, `prize_redeemed`, `stripe_checkout_started`, `subscription_active` reçus avec propriétés utiles | À vérifier dans PostHog EU |
| GTM-067 | Vérifier Brevo si activé | Sync opt-in, liste et attributs corrects ; désactivation propre si non configuré | À vérifier uniquement si commercialisé |

## 5. Tests sécurité, confidentialité et abus

| ID | Contrôle | Résultat attendu | Ce qui ne peut pas être conclu localement |
|---|---|---|---|
| SEC-001 | Exécuter le smoke sécurité authentifié et non authentifié | Endpoints privés refusés sans session ; origines cross-site refusées | Nécessite une URL déployée et un compte de test |
| SEC-002 | Avec marchand A, appeler les URLs/API de marchand B par ID | 401/403/404 selon le contrat, jamais de données B | Le script de dépôt ne remplace pas un test cross-tenant complet |
| SEC-003 | Vérifier RLS, policies, fonctions `security definer` et `search_path` | Aucune lecture anonyme/cross-tenant ; RPC bornées au marchand/campagne | À confirmer par SQL Editor / `supabase db lint` sur la base cible |
| SEC-004 | Fuzzer les IDs, emails, codes, payloads JSON et tailles de fichiers | Validation et limites sans 500 ni fuite de données | Requiert campagne de sécurité dédiée |
| SEC-005 | Tester rate limit depuis plusieurs IP, appareils et régions | Abus de tirage, renvoi email et retrait limité de façon persistante | Non vérifiable avec un seul poste et sans métrique de production |
| SEC-006 | Vérifier cookies, headers HTTPS, CSP, CORS, logs et secrets | Cookies sécurisés, aucun secret dans navigateur/logs, headers cohérents | Requiert inspection navigateur, Vercel et proxy externe |
| SEC-007 | Tester suppression/export d’un lead et demande RGPD | Exécution, traçabilité et propagation aux prestataires conformes à la politique | Validation juridique et processus réel hors dépôt |
| SEC-008 | Vérifier conformité des mécaniques d’avis Google et du consentement marketing | Aucun gain conditionné à un avis positif ; consentement distinct et prouvable | Nécessite validation juridique/compliance humaine |

## 6. Exploitation, résilience et go-live réel

Ces points ne sont pas prouvés par le code ni par un build local :

1. effectuer un backup Supabase avant ouverture, restaurer sur un projet de secours et vérifier campagnes, leads, dotations, sessions, retraits et événements ;
2. documenter la procédure de rollback Vercel et de retour à la migration précédente ;
3. vérifier les alertes Vercel/Supabase/Stripe/Resend/PostHog et le destinataire de l’astreinte ;
4. tester quota, timeout et panne de chaque fournisseur avec un plan de dégradation ;
5. exécuter un test de charge représentatif sur les routes publiques, sans lancer de charge contre la production sans accord ;
6. mesurer temps jusqu’au premier QR imprimé, scan→jeu, jeu→lead, lead→retrait, délivrabilité, coût par lead et incidents de fraude ;
7. faire réaliser le parcours complet par un restaurateur et un équipier non technique, sans aide de l’équipe produit ;
8. confirmer prix, factures, CGV, politique de confidentialité, mentions légales, support et SLA avant toute vente self-service.

## 7. Fiche de preuve par test

Pour chaque test, enregistrer :

```text
ID :
Date/heure et fuseau :
Environnement / URL :
Commit déployé :
Compte / rôle (sans mot de passe) :
Données créées (campagne, lead, paiement, retrait) :
Résultat : OK / KO / BLOQUÉ / NON APPLICABLE
Preuve : capture, URL, identifiant, log ou export
Anomalie / ticket :
Testeur et approbateur :
``` 

## 8. Décision recommandée pour l’ouverture

À ce stade, la configuration technique et le schéma Supabase donnent un signal favorable, mais l’ouverture n’est pas encore validée : les smoke tests critiques et sécurité n’ont pas pu s’exécuter faute de serveur local, et les parcours réels Stripe, Resend, OAuth, mobile, QR, conformité, backup/restore et cross-tenant restent à prouver sur la cible.

Le minimum avant un pilote est donc :

- exécuter `smoke:critical` et `smoke:security` contre l’URL cible avec les comptes de test ;
- réaliser GTM-010 à GTM-046 de bout en bout, notamment le retrait unique ;
- réaliser GTM-060 à GTM-066 avec les dashboards fournisseurs ;
- valider SEC-002, SEC-003 et SEC-008 ;
- faire le backup, le rollback et la validation terrain ;
- conserver les preuves et obtenir un GO explicite du responsable produit et du responsable exploitation.
