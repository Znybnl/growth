# Téléchargements explicites — #596

## Analyse et périmètre

Les liens QR/CSV lançaient une navigation ou un fetch sans retour central ;
l’affiche n’indiquait son résultat que dans un message sur la page. Nouveau
socle DownloadFeedbackDialog/useDownloadTask et téléchargement de Blob local.
Couverture : menu QR Wizard/éditeur, Jeu prêt, liste/éditeur administrateur,
affiche marchand/administrateur, contacts CSV et commissions CSV. Les liens
Affiche des listes restent des accès à son atelier, pas de nouveaux exports.
Le QR de test et le QR de retrait restent des parcours distincts inchangés.
Cette évolution n’implémente pas toute la refonte de Jeu prêt proposée en #577.

## Sécurité et comportement

- GET privés existants et contrôles d’appartenance/admin inchangés ; aucun
  nouveau endpoint, token, stockage persistant ou service externe.
- Vérification statut, MIME et fichier non vide avant téléchargement : une
  réponse JSON d’erreur ou HTML de connexion n’est pas enregistrée comme QR/CSV.
- Consultation QR `inline=1` : Content-Disposition inline ; ni événement
  campaign_qr_downloaded ni journal admin_campaign_qr_downloaded. Le clic
  explicite refait un GET attachment pour conserver le comptage serveur.
  Enregistrer par clic droit reste une action du navigateur non observable.
- QR en image SVG réelle, URL Blob révoquée à la fermeture/remplacement.
  Les URL des fichiers téléchargés sont révoquées après remise au navigateur.
- Garde synchrone contre double clic, AbortController, résultats tardifs ignorés,
  erreur et réessai sans prétendre qu’un fichier est enregistré sur le poste.
- Affiche sale : confirmation conservée, enregistrement avant PNG ; l’échec
  interdit le téléchargement. Fermer n’annule pas une écriture serveur déjà reçue.
- Une seule fenêtre depuis Jeu prêt ; confinement/restauration du focus,
  Escape, statut annoncé et fermeture disponibles pendant la préparation.

## Recette propriétaire

1. Wizard ou éditeur : QR code → Télécharger le QR code. Voir l’image, la
   scanner/clic droit, puis télécharger le SVG ; ouvrir le bon jeu public.
2. Après enregistrement du jeu, faire de même depuis Jeu prêt, puis fermer :
   la confirmation initiale revient sans superposition.
3. Atelier affiche : modifier le logo, télécharger, confirmer l’enregistrement,
   puis vérifier le PNG. Annuler la confirmation ne doit rien sauvegarder.
4. Résultats et Affiliation : Export CSV, retour explicite puis fichier normal.
5. Tester une connexion coupée : erreur visible et Réessayer, jamais fichier JSON.

## Preuves et limites

Tests navigateur dans e2e/admin-campaign-qr.spec.ts avec vrais composants et API
interceptées ; fichiers SVG QR réellement générés et signature PNG contrôlée.
Vérification visuelle à 1280 × 720, 320 et 390 px. Le mode affiche de la fixture
template-rendering-proof demeure inaccessible hors développement, comme la
fixture admin-qr-proof. Aucun compte, participation, e-mail ou donnée de
production n’est modifié. Tests réels des handlers et ACL dans
test:admin-campaigns, lint/build/source requis avant livraison.

## Retour arrière

Revert de la PR puis redéploiement autorisé ; aucune migration ni reprise de
données. La consultation historique inline a pu être comptabilisée auparavant :
aucune suppression ou réécriture des événements historiques n’est effectuée.
