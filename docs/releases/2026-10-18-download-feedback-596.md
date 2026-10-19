# Téléchargements explicites — #596

## Analyse et périmètre

Les liens QR/CSV lançaient une navigation ou un fetch sans retour central ;
l’affiche n’indiquait son résultat que dans un message sur la page. Nouveau
socle DownloadFeedbackDialog/useDownloadTask et téléchargement de Blob local.
Couverture : menu QR Wizard/éditeur, Jeu prêt, liste/éditeur administrateur,
menu des campagnes (consultation QR et téléchargement PNG), atelier affiche
marchand/administrateur, contacts CSV et commissions CSV. Le lien « Affiche »
ouvre toujours son atelier ; « Télécharger l’affiche » prépare le PNG dans une popin.
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
6. Liste Campagnes : menu → QR Code, puis menu → Télécharger l’affiche ;
   consultation sans navigation et retour de préparation immédiat.

## Preuves et limites

Tests navigateur dans e2e/admin-campaign-qr.spec.ts avec vrais composants et API
interceptées ; fichiers SVG QR réellement générés et signature PNG contrôlée.
Vérification visuelle à 1280 × 600/720, 320 et 390 px avec le vrai MerchantShell.
Les tests `@visual-1280` intègrent la CI des écrans, y compris les erreurs CSV et
la préparation d’affiche. Le mode affiche de la fixture
template-rendering-proof demeure inaccessible hors développement, comme la
fixture admin-qr-proof. Aucun compte, participation, e-mail ou donnée de
production n’est modifié. Tests réels des handlers et ACL dans
test:admin-campaigns, lint/build/source requis avant livraison.

Validation du 19 octobre 2026 : 16 scénarios navigateur réussis ; les 8 cas
touchés par l’en-tête QR compact ont été rejoués avec succès. Les captures
1280×600/720 et 320/390 ont été inspectées : QR et commandes accessibles,
erreur CSV lisible, préparation PNG annoncée. Le titre et la fermeture du QR
sont aussi vérifiés dans le viewport. 40 tests administratifs, lint (0 erreur,
4 avertissements de navigation préexistants), build Next 16.3.8/TypeScript,
UTF-8 et diff-check réussis. Serveur compilé : fixtures HTTP 404, QR marchand
sans session HTTP 307 et QR administratif HTTP 401. Les tests utilisent les
vrais composants et handlers, avec infrastructure simulée ; aucun téléchargement
de données marchandes réelles n’a été effectué pour cette validation.

## Retour arrière

Revert de la PR puis redéploiement autorisé ; aucune migration ni reprise de
données. La consultation historique inline a pu être comptabilisée auparavant :
aucune suppression ou réécriture des événements historiques n’est effectuée.
