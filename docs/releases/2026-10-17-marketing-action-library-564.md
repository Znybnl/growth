# Bibliothèque d'actions du Wizard — #564

## Périmètre et décisions approuvées

Les actions restent avant le jeu, une par visite dans l'ordre enregistré. Les
liens proviennent des champs existants de Mon compte de l'établissement. Le
propriétaire a confirmé le 17 octobre 2026 la possibilité de publier sans action,
avec confirmation dans une popin. Pas de nouvelle action Google générique.

Les cartes compactes et la bibliothèque remplacent les blocs type/URL du Wizard.
Les anciennes actions conservent identifiant, libellé, URL et ordre jusqu'à une
modification explicite. Réservation a été retirée du catalogue et des valeurs
initiales administrateur sur retour propriétaire ; aucune ancienne action ni
destination de Mon compte n'est effacée. Site et lien personnalisé utilisent le
type historique custom ; le CTA « Visiter le site » identifie la première entrée.
Un ancien CTA personnalisé reste une action personnalisée.

Le catalogue propose sept entrées. Lien personnalisé reste sélectionnable même
si une action personnalisée existe déjà. Quand le lien réutilisable du profil
est valide, une nouvelle destination est ajoutée au jeu sans écriture de profil.
En son absence, le premier lien est enregistré dans Mon compte avec information
explicite avant validation. La limite technique existante de 12 actions demeure.

La configuration d'un lien absent est annoncée comme une mise à jour de Mon
compte avant ajout au jeu. L'édition d'une action existante est locale au jeu.
Suppression annulable et réordonnancement par boutons ou glisser-déposer.
Le formulaire classique conserve son interface mais partage la confirmation
d'enregistrement actif sans action. Les brouillons ne demandent pas confirmation.

## Ajustement visuel propriétaire — 18 octobre 2026

L'étape porte uniquement le titre « Les actions », sans « Facultatif » ; la
possibilité de publier sans action et sa confirmation restent inchangées.
Mon compte → Liens marketing reprend les icônes partagées de la bibliothèque
(marques Simple Icons, pictogrammes génériques Lucide), les cartes de 12 px,
le fond violet discret des icônes et les badges de présence « Renseigné » / « Optionnel ».
Un badge indique seulement qu'un champ est rempli, pas qu'un compte social est connecté.
Les champs, valeurs, sauvegarde et fiche Google restent ceux du formulaire existant.
Le site web conserve sa place dans les coordonnées ; le rendez-vous reste disponible
dans Mon compte mais absent de la bibliothèque d'actions.

Les tests de `marketing-action-library.spec.ts` ajoutent le formulaire réel avec
données fictives à 320/390/768/1440 px : icônes identiques, cartes sans débordement,
libellé d'étape exact, saisie sans enregistrement implicite, enregistrement explicite
pour le bon établissement et conservation des autres liens. Les requêtes sont
interceptées ; aucun profil de production n'est modifié. Le sélecteur Google
reçoit une icône/description de présentation ; ses autres usages gardent leur rendu.

Vérification de cet ajustement : 27 tests navigateur réussis (20 bibliothèque/
Mon compte et 7 options du Wizard), 12 tests unitaires/API réussis (7 bibliothèque,
5 valeurs initiales). Captures à 320/390/768/1440 px inspectées, saisie et sauvegarde
du formulaire réel vérifiées avec API simulées. Les captures de viewport mobile
confirment aussi le défilement dans le cadre `main` de la fixture, sur le modèle
du cadre marchand existant. Aucune donnée ni clé réelle utilisée.

Lint final : zéro erreur, quatre avertissements préexistants. Build et TypeScript
réussis avec les dépendances verrouillées de cette branche (Next 16.3.6), contrôle
source et `git diff --check` réussis. Le prérequis sécurité #572 reste inchangé :
intégrer son correctif Next 16.3.8 et retester avant production. Cet ajustement
visuel n'intègre pas silencieusement cette PR de sécurité indépendante.

## Données et sécurité

- Aucune migration SQL, nouveau service ou changement de RLS.
- PATCH marchand : origine de mutation vérifiée, session et accès à
  l'établissement requis ; établissements archivés refusés.
- PATCH administrateur : rôle administrateur et association du compte cible
  à l'établissement vérifiés via le résolveur existant.
- Allowlist de sept clés (appointment refusé) ; une seule colonne merchants est mise à jour. Aucun
  changement de PIN, logo, utilisateur, abonnement ou campagne existante.
- Validation HTTPS des destinations et domaine officiel pour les plateformes
  connues. Pas de récupération serveur de la destination.
- Réponses privées non mises en cache ; diagnostics sans URL ni e-mail.
- Les limites et contrôles existants des lots et de l'indépendance des avis
  Google restent en place. La confirmation sans action est une règle d'interface,
  pas une nouvelle permission serveur.
- Icônes de marques via les exports nommés de simple-icons (version figée),
  pictogrammes génériques via Lucide ; aucun appel réseau pour ces icônes.

## Vérification

Tests automatisés et résultats consignés dans la PR : catalogue et validation,
routes réellement appelées avec authentification/stockage simulés, isolement
multi-sites et administration, configuration échouée/annulée, édition locale,
réordonnancement, absence d'action, focus clavier, mobile et absence de
débordement horizontal. Tests sur données synthétiques uniquement, aucun lien
client modifié pendant la recette.

Résultats locaux du 17 octobre 2026 (après retour propriétaire) : 7 tests bibliothèque/API, 5 tests des
valeurs initiales et 37 tests d'assistance administrateur réussis ; 16 tests
navigateurs de cette évolution et 7 tests de non-régression #551/#553 réussis.
Les nouveaux scénarios couvrent plusieurs liens personnalisés à 320/1440 px,
le profil déjà configuré sans réécriture, et une ancienne réservation conservée.
La navigation authentifiée historique utilise le nouvel intitulé d'étape ; cette
suite nécessitant un compte de test dédié n'a pas été exécutée ici.
Captures desktop/mobile inspectées et ajustées (largeur réelle 740 px, cartes
12 px, panneau pleine largeur sur mobile). Lint : zéro erreur, quatre
avertissements préexistants dans sign-up-form, account-location-panel et
location-manager. Build et vérification TypeScript réussis.

Commandes :

```powershell
npm run test:marketing-action-library --workspace @okado/web-app
npm run test:wizard-marketing-actions --workspace @okado/web-app
npm run test:admin-campaigns --workspace @okado/web-app
npx playwright test e2e/marketing-action-library.spec.ts e2e/wizard-options-551-553.spec.ts
npm run lint --workspace @okado/web-app
npm run build --workspace @okado/web-app
npm run check:dependencies --workspace @okado/web-app
```

Les tests navigateur utilisent le serveur de développement et des API simulées ;
ils ne constituent pas une vérification en production ni un test de stockage
Supabase réel. Le contrôle des dépendances signale un avis de niveau high sur
Next.js 16.3.6, version déjà présente sur main (les six avis concernent des
versions antérieures à 16.3.8). Ne pas présenter ce contrôle comme réussi ni
déployer sans traiter ce point dans une correction de dépendances dédiée.

Recette propriétaire :

1. Actions : ajouter une destination déjà configurée, constater son état
   « Déjà ajoutée » dans la bibliothèque.
2. Configurer un réseau absent, vérifier sa reprise dans Mon compte du bon site.
3. Modifier ce lien dans le jeu : Mon compte et les autres jeux restent inchangés.
4. Changer l'ordre puis supprimer/annuler une action ; enregistrer et rouvrir.
5. Publier sans action : Annuler ne publie pas ; confirmer publie. Un brouillon
   sans action s'enregistre directement.
6. En assistance administrateur, utiliser un compte/site cible différent du sien.
7. Contrôler un ticket et une roue, sur mobile et ordinateur.

## Risques et retour arrière

Les configurations absentes créent une écriture explicite sur les liens de Mon
compte ; les modifications de jeux restent séparées. Les services sociaux
refusent les destinations non officielles et les pages d'accueil génériques :
les liens historiques invalides doivent être corrigés avant publication.

Revenir sur le commit de cette PR restaure l'ancienne interface et le contrôle
de publication antérieur. Les liens enregistrés restent des champs ordinaires
de Mon compte, sans migration inverse. Ne pas écraser les campagnes existantes.
Merge et production soumis à validation du propriétaire.
