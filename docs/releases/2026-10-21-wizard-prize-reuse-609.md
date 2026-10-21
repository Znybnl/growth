# Mes lots — #609, phase 3

## Résultat et limites

La bibliothèque présente Suggestions par défaut et Mes lots. Les onglets
fonctionnent sans rechargement, au clavier et sur mobile. Pas d'onglet
Compositions factice : cette fonction reste en phase 4, le budget en phase 5.
Cette livraison est basée sur la PR #612 ; ne pas fusionner sa branche de base
ou déployer sans l'autorisation du propriétaire.

Les lots des autres jeux du même établissement sont triés par date de création
de l'occurrence du lot, décroissante (repli sur la date du jeu). Le schéma ne
possède pas de date de dernière réutilisation dédiée : il ne s'agit pas de la
date du dernier gain ou retrait. Une configuration identique (nom/conditions
normalisés, chance, coût, stock initial, achat requis) n'est affichée qu'une
fois, depuis son occurrence la plus récente. Les variantes restent distinctes.

Une copie conserve exactement les conditions et l'achat requis enregistrés,
sans appliquer l'inférence du catalogue Beauté. Le stock initial limité est
confirmé/modifiable avant ajout ; Illimité est possible. Le nouveau stock
disponible est initialisé à cette valeur, pas au stock consommé de l'original.
Les identifiants aléatoires sont courts, indépendants entre jeux et ne
concatènent jamais des identifiants historiques successifs. La mémoire locale
des sources empêche le réajout accidentel après personnalisation ; un lot
supprimé peut être réajouté. Après rechargement complet, les configurations
encore identiques sont reconnues ; une copie personnalisée est une variante.

La chance antérieure est conservée. Si elle dépasse le restant, l'ajustement
explicite des phases 1–2 est réutilisé, sans réduire les chances des autres lots.
Les ajouts sont dans le brouillon local ; les sauvegardes serveur habituelles
revérifient les règles de composition et les droits sur le jeu.

## Accès, données et performances

GET `/api/merchant/prize-library` utilise exclusivement le site de la session,
pas un identifiant de marchand envoyé par le navigateur. L'API administrative
vérifie d'abord le rôle plateforme, puis l'association compte/site actif via
le repository existant. Aucun contournement de permission dans les fixtures.

La DAL filtre la relation `prizes → campaigns` par `merchant_id` avant la
pagination et revérifie le périmètre dans la projection. Le jeu courant est
exclu. Seuls les champs de lot et `campaign_local_settings->prizeSettings`
sont sélectionnés, avec le nom/date du jeu : pas de configuration complète,
image, participant, e-mail, QR, PIN ou stock restant. Les données historiques
invalides et la ligne informative PERDU ne deviennent pas des lots à copier.
Toutes les pages de 500 lignes sont lues avec compte explicite, puis
dédoublonnées, sans troncature silencieuse liée au plafond PostgREST.

La lecture n'est déclenchée qu'à l'ouverture de Mes lots et ne bloque pas le
wizard. Le résultat est privé/no-store, sans stockage persistant navigateur.
Les requêtes sont annulées à la fermeture/changement de périmètre ; chargement,
panne/réessai et état vide sont explicites. Aucune nouvelle table, migration,
politique RLS ou écriture d'une ancienne campagne.

## Recette propriétaire

Vérifications locales : 22 E2E réussis (phases 1–3), 6 tests serveur/DAL/copie
réussis, build Next.js réussi et 8 contrôles de CSS compilés réussis. Les six
E2E phase 3 ont été rejoués après la dernière mise en colonnes du formulaire
de stock : champ de quantité entièrement visible à 1280×600. Lint sans erreur,
quatre avertissements préexistants hors périmètre. `git diff --check` réussi.
Captures du catalogue et de la confirmation inspectées à 1280×720/600 et
320/390 px. Contrôle React : lecture différée, scope de requête et AbortController,
onglets clavier, focus et états dérivés, pas de nouveau cache partagé serveur.

1. Sur un établissement de test ayant d'anciens jeux : ouvrir Mes lots.
2. Copier un lot limité, modifier la quantité proposée puis confirmer ; vérifier
   chance, achat requis et conditions dans le panneau d'édition.
3. Ajouter un lot illimité, changer d'onglet et rouvrir la bibliothèque : les
   ajouts restent présents. Personnaliser la copie sans altérer l'ancien jeu.
4. Essayer une chance dépassant le restant, annuler puis ajuster explicitement.
5. Rejouer à 1280×600 et sur mobile, ainsi que depuis Pilotage pour un site cible.
6. Sur un site sans autre jeu : vérifier l'état vide et Explorer les suggestions.

## Retour arrière

Revert de la PR phase 3, sans migration. Les copies déjà enregistrées sont des
lots ordinaires et restent utilisables dans l'éditeur précédent. Ne pas supprimer
les campagnes ou stocks existants lors d'un rollback.
