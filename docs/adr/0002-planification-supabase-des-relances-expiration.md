# 0002 — Planifier les relances d’expiration dans Supabase

**Statut :** accepté — accord écrit du propriétaire le 12 octobre 2026, issue #304.

## Contexte

Les relances des gains doivent être prévues à 09:00 locale, avec gestion des
changements d’heure, sans rattrapage et sans imposer un forfait Vercel supérieur.
Le cron Vercel Hobby existant n’offre pas la précision nécessaire. Les autres
notifications ont une planification indicative approuvée et ne sont pas déplacées.

## Décision

Utiliser pg_cron/pg_net dans le Supabase existant pour appeler la route privée
de relance. Secret dédié conservé dans Vault, clé Resend sur le serveur
applicatif uniquement. Envoi via Resend et outbox privée distincte de l’e-mail
initial ; aucun autre fournisseur ni changement d’authentification.

La migration fonctionnelle n’active ni cron ni compte. La maquette, la migration
et les vérifications précèdent l’activation opérationnelle explicite. La
configuration utilisateur reste désactivée par défaut pour tous les comptes.

## Conséquences

Les fuseaux IANA permettent une heure locale constante. Le déclenchement vise
09:00, mais le temps de traitement et la réception fournisseur ne sont pas
garantis à la seconde. Fenêtre courte et arrêt sans rattrapage en cas d’incident.
Gestion séparée du planificateur, des secrets et du rollback ; aucune purge
ni modification des crons Vercel existants.

## Alternatives écartées

- Forfait Vercel supérieur : non autorisé par le propriétaire.
- Cron Vercel indicatif seul : ne satisfait pas l’heure demandée.
- Pré-envoi planifié chez Resend : compliquerait la révocation au changement
  du réglage et nécessiterait des droits plus larges sur la clé pour annuler.

Procédure et limites : [livraison #304](../releases/reward-expiry-reminders-304.md).
