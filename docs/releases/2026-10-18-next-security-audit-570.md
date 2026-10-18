# Sécurité des dépendances Next.js — #570

## Résultat et périmètre

Corriger l'audit signalé dans #564 / PR #568, sans accepter d'exception.
Next.js et eslint-config-next passent de 16.3.6 à 16.3.8 sur le SaaS et la
landing ; les versions sont exactes et le lockfile est livré. Pas de passage
à 16.4, migration SQL, changement métier, de données ou de fournisseur.
Cette PR est indépendante de #568 et part de main.

## Analyse d'exposition — 18 octobre 2026

L'audit npm de production initial signale un paquet, Next.js, associé à six avis
(niveau maximal high). C'est une alerte sur une version, pas une preuve
d'exploitation ou de fuite. Aucun test offensif sur la production ni
investigation des journaux réels n'a été réalisé dans cette correction.

| Avis mainteneur | Impact et applicabilité observée |
| --- | --- |
| [GHSA-cjq9-62q9-8jv4](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) | SSRF de l'optimiseur d'images. Le SaaS limite les URL distantes à l'hôte Supabase configuré et au chemin merchant-images : surface réduite, pas une preuve d'impossibilité d'exploitation. Aucune remotePattern sur la landing. |
| [GHSA-mcj8-r9mp-w47p](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p) | Empoisonnement du cache SSG/ISR avec catch-all racine. La landing possède une route [...slug] et des pages statiques : combinaison potentiellement pertinente. |
| [GHSA-39w2-rjm5-chcv](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv) | Lecture de données du MCP next dev depuis un site malveillant ; concerne le développement, pas l'endpoint de production. |
| [GHSA-3w37-wq28-93x7](https://github.com/vercel/next.js/security/advisories/GHSA-3w37-wq28-93x7) | Fuite avec Draft Mode et use cache ; combinaison non observée dans les sources/configurations inspectées. La prévisualisation produit Okado n'est pas le Draft Mode de Next. |
| [GHSA-4jqv-mc3x-m676](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676) | Pages Router SSG/ISR auto-hébergé ; ne correspond pas à nos applications App Router sur Vercel selon l'avis. |
| [GHSA-f87g-xv8r-7p7x](https://github.com/vercel/next.js/security/advisories/GHSA-f87g-xv8r-7p7x) | Routes metadata images dynamiques sous webpack ; builds Turbopack et aucune route de cette combinaison observée. |

Les détails des avis mainteneur peuvent évoluer. La version corrective minimale
16.3.8 a été confirmée par les plages de l'audit npm et l'existence des paquets
dans le registre ; le contrôle post-installation détermine si le candidat est
effectivement exempt d'avis npm de production au moment de la recette.

## Garde-fous

- Même Next et eslint-config-next corrigés dans les deux manifestes.
- Liste d'exceptions de vulnérabilités toujours vide.
- Rapport npm absent/incomplet, JSON invalide, registre en erreur ou incohérence
  de version : refus, jamais de « faux vert ».
- Test du contrôle et audit de production ajoutés dans la CI avant build.
- L'audit de production ne couvre pas automatiquement les dépendances de
  développement ; l'absence d'avis connus n'est pas une garantie de sécurité
  absolue ni une certification.

## Recette et livraison

Lancer les huit tests du garde-fou, npm audit de production, verify:source,
lint/build des deux applications, suites images/e-mails/notifications, puis
contrôles navigateur publics et marketing. Les tests utilisent des données
synthétiques et n'envoient pas d'e-mails réels. Les résultats et limites sont
consignés dans la PR.

### Résultats locaux

- Audit de production : **0 vulnérabilité**, contrôle des deux manifestes réussi.
- 8 tests du garde-fou, 5 tests images, 16 tests e-mail et 40 tests
  notifications/RLS : réussis ; aucun e-mail réel envoyé.
- verify:source, lint et builds des deux apps : réussis (4 avertissements
  lint préexistants côté SaaS). Un ancien fichier généré de validation de
  types .next/dev, provenant de #568, référençait des routes absentes de main ;
  seul cet artefact a été supprimé puis le build a réussi. Aucun fichier
  applicatif n'a été supprimé pour faire passer la compilation.
- Landing construite : 24 tests navigateur sur quatre tailles, incluant
  toutes les routes statiques/blog, les 404, OG/robots/sitemap et images.
- SaaS construit : 6 tests publics réussis (connexion/inscription, prévisualisation
  invalide, QR et refus de destinations d'images non autorisées).
- Un test de code de retrait inconnu échoue sur le serveur construit sans
  Supabase : le fallback mémoire y est volontairement interdit. Ce test passe
  avec les données synthétiques de développement. La recette retrait sur une
  base de test réelle reste à faire ; ne pas annoncer ce point validé en production.
- L'audit complet conserve 20 paquets de développement signalés, dont un de
  niveau critical. Ce résultat est distinct des dépendances de production ;
  il est suivi dans [#571](https://github.com/Znybnl/growth/issues/571) et n'est
  ni corrigé ni ignoré par cette PR.

Avant livraison, le propriétaire doit valider. Aucun déploiement de production
n'est déclenché par cette demande. Après merge de cette PR, #568 devra intégrer
le correctif avant sa propre recette finale et sa livraison.

## Retour arrière

Le lockfile et les manifestes livrent le candidat reproductible. Si le patch
crée un incident, rétablir un déploiement connu comme fonctionnel sur décision
du propriétaire, en signalant que cela peut réintroduire les risques, puis
préparer un correctif rapidement. Ne pas changer les exceptions pour masquer
les vulnérabilités.
