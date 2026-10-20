# Atelier de composition des lots — phase 1, #609 / PR #610

## Correspondance à la SFD

La phase 1 couvre les six points du chapitre 21 : tableau compact, panneau
d’édition, création/modification/duplication/suppression, jauge des probabilités,
part perdante calculée et conservation du parcours d’enregistrement existant.
Le nom d’un lot ouvre son éditeur ; les chances se modifient aussi directement
dans le tableau, avec recalcul immédiat de la jauge et de la part perdante.

Retour propriétaire du 20 octobre 2026 : une somme provisoire dépassant 100 %
ne bloque pas l’ajout ou la modification locale d’un lot. Une alerte unique
apparaît dès la saisie, dans le pied fixe du panneau, au-dessus de son bouton
de validation. Après fermeture, l’alerte de composition prend le relais.
Le passage à l’étape suivante et l’enregistrement du jeu restent bloqués
jusqu’à correction ; aucune répartition invalide n’est envoyée au serveur.
Les contrôles individuels des champs sont conservés.

La case d’achat requis précède les conditions d’utilisation. Les colonnes
Chance/Stock/Coût sont alignées à gauche sur leurs données. Le titre de
l’étape est « Composez vos lots », sans deuxième titre identique.

Le regroupement des paramètres globaux, prévu en phase 5, est anticipé pour
leur présentation uniquement : accordéon fermé « Règles de participation et
de validité » après le tableau, avec résumé des réglages courants. La
disponibilité le lendemain, les durées et les valeurs des campagnes existantes
conservent leurs règles et leur stockage.

## Phases suivantes

La nouvelle bibliothèque et les ajouts multiples (phase 2), les anciens lots
(phase 3), les compositions prédéfinies (phase 4), ainsi que le budget et ses
coûts manquants (phase 5) restent à réaliser après validation de la phase 1.
L’issue #609 reste ouverte pour le suivi de ces phases.

## Vérification et recette

`wizard-prize-composition.spec.ts` vérifie les opérations sur les lots,
l’édition directe des chances, le dépassement temporaire lors d’un ajout et
d’une modification, l’unicité et la visibilité de l’alerte avant validation,
le blocage de l’enregistrement du jeu invalide, puis le contenu exact envoyé
à l’API après correction. La part perdante ne figure jamais dans les lots
envoyés. Les réglages globaux sont conservés dans ce même enregistrement.
API interceptées, sans écriture métier réelle.

Les captures 1280 × 720, 1280 × 600 et mobile 390 px couvrent le tableau,
les règles regroupées et le panneau. Le test responsive existant conserve
également le contrôle de fermeture avec abandon des modifications.

Pour la validation propriétaire : dupliquer un lot pour dépasser 100 %, fermer
le panneau par sa validation puis corriger une chance directement dans la
liste. Vérifier la jauge, la ligne PERDU et le résumé des règles sous la liste.

Aucune migration SQL. Retour arrière : revert de la PR ; les données
enregistrées conservent leur structure actuelle.
