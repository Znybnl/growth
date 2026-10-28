# Mes lots : dernière réutilisation enregistrée — #609

Décision propriétaire du 25 octobre : la dernière utilisation désigne la
réutilisation du lot enregistrée dans un jeu, pas le gain d'un joueur.
Les autres écarts résiduels de #609 sont acceptés en l'état (stock illimité,
erreurs sous les champs et ouverture de l'édition par toute la ligne).

Une copie issue de Mes lots transmet seulement l'identifiant de sa source.
Le serveur vérifie que cette source appartient au même établissement et à
un autre jeu, puis ajoute `reusedFromPrizeId` et `reusedAt` dans les réglages
privés du nouveau lot. L'horodatage serveur accompagne les lots dans le RPC
atomique existant : annulation ou échec de sauvegarde ne crée pas de preuve.
Une sauvegarde suivante conserve cette date, même si le navigateur ne renvoie
plus la source. Aucun horodatage fourni par le navigateur n'est accepté.

La bibliothèque lit aussi les preuves du jeu courant, puis exclut ses lots
des choix proposés. La source et la copie sont classées selon la dernière
réutilisation connue, avant dédoublonnage des configurations identiques.
Les variantes restent distinctes. Les dates sont comparées comme des instants,
y compris si les fuseaux de représentation diffèrent.

Historique : les anciennes dates de réutilisation n'étant pas enregistrées,
aucun rattrapage n'est inventé. En l'absence de preuve, la date de création
connue reste le repli. Une copie supprimée ou un jeu supprimé ne contribue
plus au classement ; aucun journal historique séparé n'est créé.

Pas de migration SQL : champs facultatifs dans `campaign_local_settings`
déjà privé. Aucun changement de RLS, tirage, chances, stock, retrait, e-mail
ou données de joueur. Lecture supplémentaire des occurrences du jeu courant
dans la requête privée paginée ; une vérification ciblée des sources s'ajoute
uniquement lors de la première sauvegarde d'une nouvelle réutilisation.

Recette : réutiliser un ancien lot dans un jeu, sauvegarder puis rouvrir
Mes lots : sa source remonte. Sauvegarder à nouveau sans nouvel ajout ne
change pas sa date. Annuler un ajout ne change pas le classement. Tester
une copie personnalisée, des doublons, le jeu courant et un autre établissement.

Retour arrière : revert applicatif sans SQL. Les anciennes versions ignorent
les métadonnées ; une sauvegarde par un ancien code peut les effacer. Les lots
déjà copiés restent des lots ordinaires indépendants.

Validation : tests DAL/API/copieurs et sauvegarde atomique, lint et build,
régression navigateur Mes lots à 1280 × 720/600 et mobile. Résultats consignés
dans la PR. Aucun accès métier ni envoi de production pendant les tests.

Résultats locaux : 8 tests réutilisation et 6 tests budget/sauvegarde réussis ;
6 E2E Mes lots réussis. Captures de la bibliothèque à 1280 × 720, de la
confirmation à 1280 × 600 et du parcours mobile 320 px inspectées : actions
accessibles, défilement interne du contenu dense, aucun débordement horizontal.
Les captures sont générées sous `apps/web-app/test-results/wizard-reusable-prizes-*`.
Lint : aucune erreur, 4 avertissements préexistants. Build Next 16.4.2 réussi.
La validation navigateur utilise des API simulées ; les tests DAL exercent la
logique serveur et le parseur avec une base simulée, sans écriture réelle.
