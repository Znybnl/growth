# Okado — Référence visuelle Slack

La référence visuelle principale du SaaS est désormais `C:\Users\PBRUNELLE\Downloads\DESIGN_Slack.md`. Ce document traduit cette direction en règles applicables au dépôt. Il remplace les anciennes règles Relate/bleu pour les surfaces SaaS, administration, authentification et onboarding.

## Périmètre

Cette direction concerne le back-office Okado : workspace marchand, administration plateforme, authentification, onboarding et éditeurs. Les pages publiques de jeu, de gain, de retrait et les prévisualisations conservent l'identité graphique expressive de leurs templates ; seul leur chrome de configuration peut utiliser les primitives SaaS.

Les routes, APIs, données, permissions et règles métier ne sont pas modifiées par la direction visuelle.

## Principes d'expérience

- Une hiérarchie stable : sidebar workspace, topbar de contexte, en-tête de page, contenu, actions.
- Une action principale clairement identifiable par écran ; les actions secondaires sont regroupées.
- Des cartes sobres et peu imbriquées ; les titres et descriptions expliquent la structure.
- Des états loading, empty, error, success et disabled explicites et cohérents.
- Des focus visibles, une navigation clavier complète et aucun débordement horizontal involontaire.
- Une densité opérationnelle compacte sur desktop et une transformation en cartes lisibles sur mobile.

## Tokens

| Rôle | Valeur | Usage |
| --- | --- | --- |
| Aubergine | `#611f69` | action principale, focus, navigation active |
| Prune profond | `#481a54` | surfaces de contraste et états actifs forts |
| Lavande | `#f9f0ff` | fond d'accent, sélection, skeleton |
| Bordure lavande | `#eac8fe` | cartes, menus et séparateurs SaaS |
| Carbone | `#1d1c1d` | titres et texte principal |
| Graphite | `#454245` | texte secondaire fort |
| Gris moyen | `#696969` | aide, métadonnées et placeholders |
| Fond doux | `#fefbff` | canvas de l'application |
| Blanc | `#ffffff` | surfaces de cartes et champs |

Les couleurs sémantiques sont réservées aux statuts : succès, avertissement, erreur et information. Le bleu historique ne doit plus être utilisé comme CTA dans le SaaS. Les couleurs de templates restent autorisées dans les aperçus et les jeux publics.

## Formes et densité

- Cartes SaaS : rayon `16px` ; cartes compactes ou éléments de liste : `8px`.
- Champs : rayon `12px`, hauteur commune `44px`.
- Boutons : rayon `4px`, hauteur principale `44px`, secondaire `40px`, compacte `36px`.
- Badges : rayon `4px`, hauteur compacte et padding réduit.
- Modales : rayon `32px` ; ombre réservée aux éléments flottants.
- Icônes Lucide : `16px` en navigation/tableaux, `18–20px` dans les titres de section.
- Espacements : grille de `8px`, sections espacées de `24–32px` dans le back-office.

## Primitives obligatoires

Les écrans doivent réutiliser les primitives de `src/components/ui/workspace.tsx` et les composants UI associés :

- `WorkspaceShell` pour la structure et la navigation ;
- `PageHeader` pour label, titre, description et action principale ;
- `SectionCard` et `FormSection` pour les sections ;
- `ActionBar` pour les actions contextuelles et sticky ;
- `MetricCard` pour les indicateurs chiffrés ;
- `StatusBadge` pour les statuts ;
- `EmptyState` et `LoadingSkeleton` pour les états transverses ;
- `ConfirmDialog` pour les confirmations sensibles ;
- `ResponsiveTable` et `RowActionsMenu` pour les listes et tableaux.

Une implémentation locale n'est acceptable que lorsqu'elle porte une interaction propre à un produit public ou à un éditeur de jeu. Elle doit alors conserver les mêmes états clavier, focus et responsive.

## Structure des pages authentifiées

```text
Workspace shell
  Sidebar workspace
  Topbar et établissement sélectionné
  PageHeader
  Sections / cartes / tableau
  Actions secondaires et état de sauvegarde
```

La sidebar sépare Navigation, Outils marchand, Actions rapides et Administration plateforme. La Bibliothèque reste invisible et inaccessible aux marchands non administrateurs.

## Tableaux et responsive

Les tableaux desktop utilisent un en-tête discret lavande, une densité constante, des nombres alignés, un hover léger et un menu d'actions de ligne commun. À moins de `768px`, ils deviennent des cartes avec les informations essentielles et leurs libellés ; le scroll horizontal est réservé aux cas réellement exceptionnels.

## Accessibilité et validation

Chaque écran doit être vérifié à `390px`, `768px`, `1024px` et `1440px`, avec clavier, focus visible, fermeture Échap des menus/modales et messages d'erreur associés aux champs. Toute évolution visuelle doit préserver les contrats API, les routes, les données, les permissions et les comportements métier.
