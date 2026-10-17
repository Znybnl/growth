# Différenciation du site public — issue #520

## Analyse et décision

Le propriétaire valide le 16 octobre 2026 les recommandations de mise en valeur
des différenciants : les fonctions existent mais la page commerciale montre
surtout le jeu et les scans. La correction porte sur leur hiérarchie et des
exemples concrets, pas sur une refonte du produit ou de nouvelles promesses.

## Résultat

- Accueil : bénéfices sous le hero et démonstration du retrait côté commerce.
- Beauté : trois exemples complets Regard/Ongles/Spa remplacent les idées
  génériques et la galerie de seuls fonds ; les cinq fonds restent sur Ticket
  à gratter. Les compositions utilisent trois WebP existants optimisés par Image.
- Accueil/Beauté : aperçu de synthèse marchand, états de retrait et stocks,
  choix de fréquences et bénéfice de consultation sans tableau de bord.
- Relance d'expiration au gagnant dans un bloc distinct, avec délai, défaut
  désactivé et limites actuelles ; lien vers la section existante de l'aide.
- Indicateurs présentés comme aide à l'ajustement des lots. Un retrait n'est
  jamais assimilé automatiquement à une nouvelle visite ou à une vente.

## Frontières et sécurité

Le site marketing est la seule application modifiée. Le retrait ajouté est un
état React local, indépendant des indicateurs de démonstration ; le bouton
simule l'étape de PIN, il ne demande pas de vrai secret. Le retour depuis la
confirmation place le focus côté commerce ; le reset existant réinitialise
également le retrait. Les étapes et la mesure existantes ne sont pas déplacées.

Les chiffres, noms et dates sont des fixtures éditoriales explicitement
signalées. Pas de gain, publication d'avis, API métier, envoi d'e-mail ou
persistance. La préférence de consentement existante n'est pas modifiée.
Les nouveaux blocs statiques sont des composants serveur ; aucune bibliothèque,
police distante, image volumineuse ou dépendance supplémentaire.

Aucun cas pilote réel n'est publié, faute de chiffres vérifiés et d'autorisation.
Les conditions des lots sont des exemples modifiables, pas un catalogue réécrit.
Les données, calculs, moteurs, permissions et communications réels du SaaS,
les prix et le schéma Supabase sont inchangés. Aucune migration nécessaire.

## Vérifications et recette

`e2e/product-proof.spec.ts` couvre le parcours jusqu'à la validation simulée,
le blocage après validation, le reset, le focus clavier, l'absence d'envoi et
de persistance, les compteurs inchangés, les deux destinataires d'e-mail,
les exemples/conditions, les fonds chargés et le responsive.
Les suites existantes de démo, SEO, marque, consentement et conversion sont
rejouées avec le token de mesure synthétique intercepté, sans projet réel.

Résultats locaux : suite complète de 92 tests réussie à 320, 390, 768 et
1440 px ; lint landing sans erreur ni avertissement, build landing et
`verify:source` réussis. Le test de redémarrage pendant la rotation cible
désormais le statut de la roue, distinct du nouveau statut de retrait.
Après la finition éditoriale reliant la relance à Alex (gain non retiré),
la suite ciblée des 12 scénarios de preuves produit est réussie sur le build
final (recontrôle le 17 octobre 2026). Captures desktop et mobile inspectées ; la navigation sticky est masquée
uniquement pendant les captures de section, pour ne pas recouvrir leur contenu.

- [Exemples Beauté, desktop](../design/marketing-proof-520-beauty-desktop.png).
- [Synthèse et relance, mobile 320 px](../design/marketing-proof-520-followup-mobile.png).

Commandes : `npm run build:landing`, `npm run lint:landing`,
`npm run verify:source`, `npm run test:e2e -w @okado/landing-page -- --workers=3`,
puis `npm run test:e2e -w @okado/landing-page -- e2e/product-proof.spec.ts --workers=3`.

Recette propriétaire : accueil → Jouer → Jouer maintenant → Recevoir mon gain
→ Voir le retrait côté commerce → Simuler la validation par PIN. Vérifier le
statut puis Redémarrer la démo. Ouvrir la page Beauté : trois exemples métier,
conditions, jeux et affiches ; lire la synthèse et la relance client à 320/390 px
et sur desktop. Vérifier les liens vers les modèles et les réglages de relance.

## Livraison et retour arrière

PR dédiée liée à #520. Validation du propriétaire requise avant merge et
production. Retour arrière : revert du commit de présentation ou retour au
déploiement marketing précédent ; aucune donnée ni migration à restaurer.
