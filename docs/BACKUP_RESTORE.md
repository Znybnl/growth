# Backup et restauration Okado

## Principes

- Supabase est la source de vérité des données métier, de l'authentification et des migrations.
- Git est la source de vérité du code et de la configuration versionnée.
- Vercel conserve les déploiements immuables et permet un rollback applicatif.
- Un rollback Vercel ne restaure jamais la base Supabase : les changements de schéma doivent donc suivre une stratégie expand/contract.

## Supabase

### Sauvegarde managée

1. Activer les sauvegardes automatiques et, si le plan le permet, le Point-in-Time Recovery dans Supabase Dashboard > Project Settings > Database.
2. Vérifier la rétention disponible pour le plan utilisé.
3. Avant chaque migration sensible, noter le timestamp de sauvegarde et l'identifiant du déploiement Vercel associé.

### Export logique avant migration

Utiliser une URL PostgreSQL directe conservée dans un gestionnaire de secrets, jamais la clé `SUPABASE_SERVICE_ROLE_KEY` :

```bash
mkdir -p backups
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "backups/okado-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Le dump logique ne contient pas les fichiers Storage. Les buckets doivent être répliqués séparément vers un stockage durable ou couverts par la sauvegarde managée Supabase.

### Restauration contrôlée

Toujours restaurer d'abord dans un projet Supabase de rehearsal :

```bash
createdb okado_restore
pg_restore "$SUPABASE_DUMP" \
  --dbname "$SUPABASE_RESTORE_DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges
```

Après restauration :

```bash
npm run check:supabase
npm run smoke:security
```

Vérifier également manuellement les policies RLS avec [supabase/verify/phase0_security.sql](../supabase/verify/phase0_security.sql).

### Cadence recommandée

- sauvegarde managée quotidienne ;
- export logique avant chaque migration ;
- test de restauration mensuel ;
- test de restauration complet avant un changement majeur de facturation, retrait ou authentification.

## Vercel

### Prévention

- protéger la branche `main` et conserver chaque déploiement lié à un commit Git ;
- ne jamais stocker `.env.production` dans Git ;
- conserver les noms et la provenance des variables dans un gestionnaire de secrets ;
- conserver les URLs des webhooks Stripe/Resend et leur procédure de recréation.

### Rollback applicatif

Chaque déploiement Vercel possède une URL immuable. En cas de régression :

1. identifier le dernier déploiement sain ;
2. le promouvoir depuis Vercel Dashboard, ou utiliser le CLI Vercel avec le projet lié ;
3. vérifier `/connexion`, `/campaigns`, une campagne publique et `/redeem/[code]` ;
4. surveiller les logs et les erreurs pendant 15 minutes.

Le rollback ne doit pas annuler une migration déjà exécutée. Les migrations doivent donc être rétrocompatibles avec l'ancien et le nouveau code pendant la fenêtre de déploiement.

## Contrôle avant release

```bash
npm run check:dependencies
npm run check:gotomarket
npm run check:supabase
npm run lint
npm run build
npm run smoke:security
```
