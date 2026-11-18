# Alertes d’e-mail de gain — #828

La consultation de l’alerte de navigation masque les seuls événements observés de la campagne ouverte, pour l’établissement. La Supervision et l’acquittement administrateur restent indépendants. Une modification de statut ou un nouvel événement invalide la consultation ; l’historique de livraison reste intact. Le type structuré `Permanent` de Resend bloque le renvoi ; `Transient` et `Undetermined` ne sont pas assimilés à un rejet permanent. Les anciens événements sans type restent indéterminés.

## Migration et retour arrière

Appliquer `supabase/migrations/20261119010000_merchant_email_alerts_828.sql` avant le déploiement applicatif. Elle ajoute l’état de consultation et le type de rebond, reconstitue ce dernier lorsque l’événement courant archivé le permet, et remplace la RPC de lecture. Les deux RPC restent réservées au rôle de service ; les mutations sont bornées à l’établissement de la session. Aucun statut de livraison ou traitement administrateur n’est modifié.

En retour arrière, redéployer d’abord l’ancienne application, puis appliquer `supabase/rollback/20261119010000_merchant_email_alerts_828.sql` : la RPC précédente est restaurée et les colonnes ajoutées sont retirées. L’état de consultation est alors perdu ; les événements fournisseur et statuts restent conservés.

## Recette proposée

Avec des données de test uniquement : ouvrir une alerte avec deux campagnes, vérifier le compteur après le clic et après rechargement, puis simuler un nouvel événement. Vérifier Supervision et le statut inchangés. Dans Résultats, consulter une erreur longue à la souris, au clavier et sur mobile ; vérifier le renvoi désactivé pour un rebond permanent et disponible pour un rebond temporaire. Aucun e-mail réel n’est nécessaire pour cette recette.
