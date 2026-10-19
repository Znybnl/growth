# Contrôle de dépendances — issue #478

Prérequis de livraison de la PR #474 : corriger le contrôle npm sans exception. Next.js et eslint-config-next passent de 16.3.3 à 16.3.6 sur les deux applications ; Sharp passe de 0.35.1 à 0.35.5. Mises à jour transitives compatibles avec les ranges existants : baseline-browser-mapping 2.11.27, DOMPurify 3.4.16, fflate 0.4.9 et source-map-js 1.2.2. Aucun changement de règle métier, de service payant ou de schéma.

Avis mainteneurs : [Next.js](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). Il s'agit de versions correctives, pas d'une migration vers Next.js 16.4. Le verrouillage de version du contrôle est actualisé ; sa liste d'exceptions reste vide.

Vérification : check:dependencies / npm audit --omit=dev ne signalent aucune vulnérabilité de production. Ce résultat ne couvre pas tout l'outillage de développement : l'audit complet conserve des avis, à traiter séparément, sans prétendre qu'ils ont disparu. Lint et build des deux applications, tests de traitement des images et non-régression des e-mails/notifications requis pour la livraison. Les versions des binaires Sharp et plateformes optionnelles sont conservées dans le lockfile.

Retour arrière : rétablir le déploiement sain précédent en cas d'incident runtime, puis corriger le patch ; ne pas modifier la liste d'exceptions pour rendre le contrôle vert. Le lockfile et les manifestes permettent d'identifier exactement le candidat livré.
