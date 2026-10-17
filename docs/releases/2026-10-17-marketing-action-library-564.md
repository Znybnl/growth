# Bibliothèque d'actions du Wizard — #564

## Périmètre et décisions approuvées

Les actions restent avant le jeu, une par visite dans l'ordre enregistré. Les
liens proviennent des champs existants de Mon compte de l'établissement. Le
propriétaire a confirmé le 17 octobre 2026 la possibilité de publier sans action,
avec confirmation dans une popin. Pas de nouvelle action Google générique.

Les cartes compactes et la bibliothèque remplacent les blocs type/URL du Wizard.
Les anciennes actions conservent identifiant, libellé, URL et ordre jusqu'à une
modification explicite. Réservation, site et autre lien utilisent le type
historique custom ; les CTA standards distinguent les deux premières entrées.
Un ancien CTA personnalisé reste une action personnalisée.

La configuration d'un lien absent est annoncée comme une mise à jour de Mon
compte avant ajout au jeu. L'édition d'une action existante est locale au jeu.
Suppression annulable et réordonnancement par boutons ou glisser-déposer.
Le formulaire classique conserve son interface mais partage la confirmation
d'enregistrement actif sans action. Les brouillons ne demandent pas confirmation.

## Données et sécurité

- Aucune migration SQL, nouveau service ou changement de RLS.
- PATCH marchand : origine de mutation vérifiée, session et accès à
  l'établissement requis ; établissements archivés refusés.
- PATCH administrateur : rôle administrateur et association du compte cible
  à l'établissement vérifiés via le résolveur existant.
- Allowlist de huit clés ; une seule colonne merchants est mise à jour. Aucun
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

Résultats locaux du 17 octobre 2026 : 7 tests bibliothèque/API, 4 tests des
valeurs initiales et 37 tests d'assistance administrateur réussis ; 12 tests
navigateurs de cette évolution et 7 tests de non-régression #551/#553 réussis.
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
