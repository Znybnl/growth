# Fond de l’aperçu temps réel — #702

La correction #682 portait sur la page publique, pas sur le document interne du
brouillon. Ce document disposait d’un body à min-height:100% mais sans chaîne de
hauteur explicite jusqu’à la racine React. Un aperçu à height:100% pouvait alors
se caler sur son contenu, au lieu de couvrir le viewport de 390×740. Reproduction
sur le ticket Noël rose après chargement des polices : fond de 712,19 px pour
740 px disponibles, laissant le fond clair de l’iframe apparaître en bas.

La hauteur 100% est maintenant explicite sur html, body et draft-preview-root,
dans le document statique créé pour l’iframe. Le viewport, le téléphone, le
sandbox et l’attribut inert restent identiques. Aucun décor de secours ni
modification des images, textes, lots, tirages ou données.

Les fixtures Noël proposent un mode live utilisant le véritable
DraftPreviewViewport avec CampaignLivePreview mobileViewport, comme le wizard.
L’iframe y est montée après hydratation, comme dans le wizard responsive, pour
que son onLoad ne précède pas les gestionnaires React du test. Les modes compact
et public existants restent disponibles.

Le test christmas-live-background.spec.ts vérifie les trois thèmes en roue et
ticket, à 1280×720, 1280×600 et 390×844 : fond chargé, hauteur de racine/surface
et couverture du bord inférieur après stabilisation des polices. Les captures
du téléphone sont inspectées. Une autre vérification conserve la priorité des
images et couleurs manuelles. Le tag @visual-1280 inclut ces tests dans la CI.

Les scénarios publics de #681 et la recette wizard-polish-600 contrôlent aussi
les autres templates, la typographie et les aperçus partagés. 27 scénarios
navigateur distincts validés : 7 aperçu iframe (18 rendus natifs et 4 fonds
manuels), 14 pages publiques, 6 wizard. Une assertion du nouveau test des couleurs
manuelles ciblait initialement l’enveloppe transparente de la roue ; corrigée
pour contrôler la scène qui porte effectivement le fond, puis reprise avec
succès. Captures des six templates inspectées, dont le ticket naturel à 1280×600
et la roue rose sur mobile. Lint : aucune erreur, quatre avertissements de
navigation préexistants ; source, diffcheck et build SaaS final réussis.
Pas de migration SQL ni dépendance. Retour arrière
par revert de la hauteur du document iframe ; le défaut d’origine réapparaîtrait.
