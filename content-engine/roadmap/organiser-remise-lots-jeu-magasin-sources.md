# Dossier de sources — remise des lots d’un jeu en magasin

Statut : READY_FOR_HUMAN_REVIEW, sans approbation de publication. Le brouillon existant est repris et enrichi d’une fiche, d’exceptions et d’un rapprochement. Sources consultées le 27 novembre 2026 :

- [DGCCRF, loteries publicitaires](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/loterie-des-pratiques-commerciales-reglementees) : cadre général français et interdiction des pratiques déloyales. Les engagements et solutions en cas d’indisponibilité doivent être vérifiés pour chaque opération.
- [CNIL, prospection électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel) : règles relatives aux communications commerciales ; la gestion d’un gain ne vaut pas automatiquement accord pour la prospection.
- [Okado, fonctionnement](https://www.okado.app/comment-ca-marche), `docs/DOMAIN_RULES.md` et `docs/PRODUCT.md` : QR de gain et PIN marchand pour le retrait standard ; le code de secours est documenté pour le modèle recommandé d’e-mail, sous réserve du parcours effectivement configuré. Les prévisualisations sont distinctes des résultats réels.

Contrôle : 10 gains attribués − 7 retraits confirmés = 3 gains à examiner ; hypothèse fictive, aucune vente déduite. Lien entrant futur candidat : guide des lots, uniquement après approbation et publication. Liens sortants : guide des lots, fonctionnement, mesure. Relecture humaine : modalités d’exception, conditions exactes et revue juridique selon l’opération.

- Vérification produit du 28 novembre 2026 : `apps/web-app/src/components/merchant/cashier-screen.tsx` et `apps/web-app/src/app/api/merchant/cashier/lookup/route.ts` montrent la recherche par code dans un espace marchand authentifié ; le parcours QR public et PIN est décrit dans `docs/DOMAIN_RULES.md`. Les deux parcours ne doivent pas être confondus.
