# Nouveau fond pour Ivoire & champagne — #731

Le fond fourni par le propriétaire remplace le décor par défaut du ticket à
gratter **Ivoire & champagne**. Le fichier est servi en WebP à 941 × 1 672 px ;
le fichier optimisé pèse 123 434 octets contre 1 965 978 octets pour le PNG
source. Le modèle et l’entrée correspondante de la bibliothèque **Fête** pointent
vers cette nouvelle image.

L’ancienne image v3 est conservée pour les jeux qui avaient enregistré son URL.
Les jeux utilisant le fond natif du modèle voient le nouveau décor. Un fond
importé ou sélectionné par le marchand reste prioritaire. Aucun autre modèle,
réglage de jeu, gain, probabilité ou stock n’est modifié ; aucune migration SQL.

Les contrôles couvrent la référence du thème et de la bibliothèque, le chargement
dans la page de jeu et le rendu de la prévisualisation intégrée. Les captures
mobile sont inspectées visuellement ; lint et build web sont exécutés avant la PR.
