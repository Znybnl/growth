# Produit — Okado

## Fiche d'identité

- **Problème résolu** : permettre à un commerce local de concevoir, diffuser et piloter simplement un jeu en point de vente afin d'animer sa clientèle, collecter des contacts et encourager des actions marketing.
- **Utilisateurs cibles** : responsables de commerces de proximité et de restauration, leurs équipes en point de vente, et les clients qui participent aux jeux.
- **Promesse principale** : créer un jeu mobile prêt à diffuser par QR code, attribuer des lots et suivre les résultats sans complexité opérationnelle.
- **Hors périmètre actuel** : caisse/POS, gestion de paiement des clients du commerce, programme de fidélité généraliste et diffusion publicitaire.
- **Responsable produit et unique valideur des PR** : Pierre-Henri BRUNELLE.

## Parcours principaux

### P-01 — Créer et publier un jeu

- **Acteur** : marchand.
- **Déclencheur** : le marchand souhaite lancer une animation locale.
- **Résultat attendu** : un jeu brouillon ou actif est enregistré avec son type de jeu, ses lots, ses règles et ses actions marketing.
- **Mesure de réussite** : le jeu est prévisualisable avant diffusion et publiable uniquement lorsque les éléments obligatoires sont valides.

### P-02 — Participer à un jeu depuis un QR code

- **Acteur** : client.
- **Déclencheur** : le client scanne le QR code de diffusion du jeu.
- **Résultat attendu** : il effectue, lorsque prévue, l'action marketing de sa visite, participe au jeu et reçoit le résultat.
- **Mesure de réussite** : la participation est comptabilisée une seule fois et respecte le délai entre deux participations.

### P-03 — Collecter un contact

- **Acteur** : client puis marchand.
- **Déclencheur** : la collecte d'e-mail avant le jeu est activée, ou le client remporte un lot nécessitant l'envoi d'un e-mail.
- **Résultat attendu** : les coordonnées et le consentement applicable sont enregistrés puis visibles dans les résultats du marchand.
- **Mesure de réussite** : aucune collecte marketing n'est réalisée sans le consentement requis.

### P-04 — Attribuer et retirer un lot

- **Acteur** : client et personnel du commerce.
- **Déclencheur** : un client remporte un lot puis le présente au commerce.
- **Résultat attendu** : le personnel consulte le lot, vérifie ses conditions, saisit le PIN marchand et valide le retrait.
- **Mesure de réussite** : un retrait est journalisé, non rejouable et les exceptions de validité sont explicites.

### P-05 — Prévisualiser sans impact métier

- **Acteur** : marchand.
- **Déclencheur** : le marchand ouvre la prévisualisation ou son QR code de prévisualisation.
- **Résultat attendu** : il teste le parcours complet, y compris l'e-mail de gain, sans modifier les stocks ni les indicateurs de production.
- **Mesure de réussite** : les participations de prévisualisation restent isolées des données de production.

### P-06 — Piloter plusieurs établissements

- **Acteur** : marchand disposant de plusieurs établissements.
- **Déclencheur** : le marchand bascule de site ou déploie un jeu sur plusieurs sites.
- **Résultat attendu** : les données, réglages et accès restent correctement rattachés à chaque établissement.
- **Mesure de réussite** : aucun établissement ne peut modifier ou consulter les données d'un autre sans autorisation.

## Priorités produit actuelles

- **Maintenant** : fiabilité des parcours marchand, client et retrait ; cohérence du wizard de création ; sécurité et lisibilité des données.
- **Ensuite** : réduire progressivement l'écart entre le formulaire classique et le wizard afin de faire du wizard le parcours de référence.
- **Indicateurs suivis** : scans, participations, contacts collectés, actions marketing réalisées, retraits, taux de conversion et coût par lead.

## Décisions produit confirmées

- Le terme affiché à l'utilisateur est **jeu** ; *campagne* reste un terme technique ou historique lorsqu'il désigne le modèle de données.
- Les actions marketing sont proposées **avant** le jeu et sont séquencées par visite.
- La collecte d'e-mail est une option indépendante des actions marketing.
- L'objectif de création sert à initialiser les actions dans le wizard ; il ne doit pas écraser les actions d'un jeu existant.
- Un brouillon peut être sauvegardé incomplet ; la publication est bloquée tant que les éléments requis sont invalides.
- La prévisualisation est isolée : elle ne décrémente pas les lots et ne nourrit pas les indicateurs de production.
- Seul l'administrateur de la plateforme accède aux fonctionnalités qui lui sont dédiées. Les utilisateurs marchands pilotent leurs propres établissements et jeux.
- Le personnel du commerce n'a pas de compte dédié à la plateforme : il valide un retrait depuis le QR code du client avec le PIN marchand.
- Le formulaire classique ne peut être supprimé qu'après reprise fonctionnelle suffisante dans le wizard et validation des parcours de bout en bout, à la fois par le propriétaire et par les tests automatisés.

## Questions ouvertes

- [ ] Définir les critères de retrait forcé à afficher et à journaliser pour le personnel du commerce.
- [ ] Définir précisément le seuil de parité fonctionnelle du wizard qui déclenchera le retrait du formulaire classique.
- [ ] Valider les règles de conformité restantes dans `docs/DOMAIN_RULES.md` (consentement, conservation des données et preuves associées).
