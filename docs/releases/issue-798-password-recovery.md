# Récupération du mot de passe — issue #798

## Résultat

Ajout du parcours d’oubli et de réinitialisation du mot de passe dans l’application
marchande, sans migration SQL ni dépendance supplémentaire.

- Lien « Mot de passe oublié ? » sous le champ mot de passe ; l’option « Se souvenir
  de moi » et la connexion Google restent inchangées.
- Formulaire de demande avec retour générique, préremplissage d’adresse éphémère en
  sessionStorage et renvoi contrôlé par un compte à rebours.
- Formulaire de nouveau mot de passe, confirmation, affichage/masquage des champs,
  erreurs lisibles et retour explicite à la connexion.
- Les routes serveur réutilisent les cookies Supabase SSR et le rate limiter existant.
  La clé par adresse ne contient que son empreinte SHA-256 ; un plafond par IP complète
  le contrôle. La limitation Supabase par utilisateur reste active.
- Le flux e-mail vérifie le type recovery de Supabase avant la mise à jour du même UID.
  La preuve est portée par le fragment, retirée de l’historique et envoyée au serveur
  uniquement après action explicite. Aucun fournisseur Google ni abonnement n’est
  interrogé.
- Après changement, l’application tente de révoquer globalement les sessions ; en cas
  d’échec, elle ferme au minimum la session locale et affiche une information sur les
  sessions distantes qui peuvent rester actives.
- Le jeton et le mot de passe sont exclus des logs applicatifs et analytics. Seule la
  demande générique est mesurée, après consentement ; la page de nouveau mot de passe
  est exclue des pages analytics.

## Routes

- /mot-de-passe-oublie : demande et confirmation générique.
- /reinitialiser-mot-de-passe : définition du nouveau mot de passe.
- POST /api/auth/recovery/request : validation, rate limiting et demande Supabase.
- POST /api/auth/recovery/complete : vérification OTP, modification puis déconnexion.

Les routes de page et API appliquent no-store et no-referrer. La redirection de
production est fixée au domaine https://app.okado.app et au chemin de réinitialisation.

## Configuration Supabase à effectuer avant la mise en service

Cette branche ne modifie pas le tableau de bord Supabase.

1. Auth → URL Configuration : vérifier Site URL et autoriser les redirections exactes
   de production et de développement local, dont
   https://app.okado.app/reinitialiser-mot-de-passe.
2. Auth → Email Templates → Recovery : copier le modèle
   apps/web-app/emails/password-recovery.html. Vérifier que le template conserve
   TokenHash dans le fragment et ne remplace pas le lien par ConfirmationURL.
3. Vérifier l’expéditeur SMTP, la validité et l’usage unique des liens, les limites
   effectives, la notification de changement de mot de passe et le suivi de clics.
   Désactiver le suivi qui réécrit les liens d’authentification.
4. Tester d’abord avec un compte et une boîte de réception autorisés. Vérifier un
   compte Google uniquement et un compte e-mail, sans révéler leur méthode de connexion.
5. Capturer le rendu reçu avec ce destinataire de test. Une prévisualisation HTML locale
   ne constitue pas une preuve de réception ou de délivrabilité.

Il n’existe pas de préproduction Okado autonome. La configuration de production,
l’envoi d’un test réel et la publication restent soumis à l’autorisation et à la
validation du propriétaire.

## Vérifications

- `npm run test:password-recovery --workspace @okado/web-app` : 8/8 tests unitaires
  réussis (clés de limitation, vérification, identité, erreurs et modèle d’e-mail).
- `npm run test:e2e --workspace @okado/web-app -- e2e/password-recovery.spec.ts` :
  8/8 tests Chromium réussis avec API interceptées ; aucun appel Supabase ou e-mail réel.
- `npm run lint --workspace @okado/web-app` : réussi, 0 erreur et 4 avertissements
  préexistants sur `sign-up-form.tsx`, `account-location-panel.tsx` et
  `location-manager.tsx`.
- `npx tsc --noEmit -p apps/web-app/tsconfig.json` : réussi.
- `npm run build --workspace @okado/web-app` : réussi, Next.js 16.4.6.

Les captures mobile et ordinateur sont générées localement dans
`apps/web-app/test-results/` (répertoire ignoré par Git). Elles valident le rendu de
l’interface simulée, pas celui d’un e-mail reçu. Les tests simulés ne valident ni le
SMTP ni la configuration du projet Supabase de production.

## Recette manuelle

- Depuis Connexion, ouvrir « Mot de passe oublié ? » après avoir saisi une adresse ;
  vérifier le préremplissage et l’absence d’adresse dans l’URL.
- Tester adresse inconnue, limite, erreur réseau et retour à Connexion ; les textes
  ne doivent pas indiquer si le compte ou la méthode de connexion existe.
- Avec le destinataire de test, ouvrir le lien dans le même puis un autre navigateur ;
  vérifier l’absence d’action au simple chargement, la suppression du fragment,
  l’expiration, l’usage unique et le nouveau mot de passe.
- Vérifier les anciens/nouveaux identifiants et les connexions Google après le test ;
  contrôler UID, établissements, rôles, campagnes et abonnement inchangés.
- Refaire les parcours au clavier et à 360/390/768/1280/1440 px.

## Retour arrière

Le rollback applicatif consiste à rétablir la version précédente via la PR, sans
migration à annuler. Si le modèle Supabase a été modifié après validation, restaurer
au préalable sa copie précédente dans le tableau de bord. Aucun déploiement ni merge
n’est inclus dans cette branche.
