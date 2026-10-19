# 0003 — Relances quotidiennes via le planificateur Vercel existant

**Statut :** accepté — accord écrit du propriétaire le 12 octobre 2026 :
9 h est approximatif, puis « Ok adapte tes développements ». Remplace ADR 0002.

## Décision

Utiliser Vercel Hobby pour le passage quotidien des relances, avec le
`CRON_SECRET`, la configuration Resend et l’origine des notifications déjà
présents. La route des relances dispose de son propre cron `0 8 * * *` et de
son budget : elle ne réduit pas le temps disponible des synthèses et ne change
ni leurs horaires ni leurs reprises. Aucun fournisseur ou forfait supplémentaire.

L’éligibilité est le jour civil J−N dans le fuseau de l’établissement, pas une
fenêtre de cinq minutes. 08:00 UTC est indicatif : en France métropolitaine,
09:00–09:59 l’hiver et 10:00–10:59 l’été avec Hobby. Pas de promesse d’une heure
locale identique dans les autres fuseaux. Aucun rattrapage d’un jour passé.

## Sécurité / exploitation

La case du compte est le seul opt-in obligatoire, désactivée par défaut.
Le worker refuse local/preview et un ancien schéma SQL. Arrêt serveur facultatif
`REWARD_REMINDERS_ENABLED=false`. Clé d’idempotence et payload immuable,
reprises courtes dans le même passage/budget, garde-fou fournisseur 23 h.
L’e-mail initial, les gains/conditions/consentements/stocks et les notifications
marchands restent inchangés. Aucun envoi réel pendant les tests.

Une migration corrective remplace uniquement l’éligibilité et arrête le job
Supabase obsolète de #304 s’il avait été installé. Aucun autre job, secret Vault
ou donnée n’est supprimé. L’ancien script d’installation est retiré du dépôt.
La migration initiale déjà jouée reste valide ; migration corrective et
validation précèdent le prochain merge/déploiement.

## Limites

Un incident, une interruption ou un volume dépassant le budget peut faire
manquer des rappels. Ces limites sont journalisées, sans report au lendemain.
Supabase serait à reconsidérer si une cadence supérieure ou un horaire local
précis était demandé. [Procédure](../releases/reward-expiry-reminders-304.md).
