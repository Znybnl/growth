export type ContentSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};
export type PublicContent = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: ContentSection[];
  related: string[];
  source?: { label: string; href: string }[];
  reviewedAt?: string;
};

export const publicContent: PublicContent[] = [
  {
    path: "/comment-ca-marche",
    title: "Comment fonctionne un jeu QR code avec Okado ?",
    eyebrow: "Le parcours complet",
    description:
      "De la création du jeu à la validation du retrait : découvrez le parcours du marchand, du joueur et de votre équipe avec Okado.",
    intro:
      "Un QR code ouvre votre jeu dans le navigateur du client. Vous choisissez l’apparence, les lots et les conditions ; votre équipe valide ensuite les gains présentés en établissement.",
    sections: [
      {
        title: "1. Configurez votre jeu",
        paragraphs: [
          "Choisissez une roue de la fortune ou un ticket à gratter, puis ajoutez votre logo et vos textes. Définissez chaque lot, sa probabilité, son stock limité ou illimité et ses conditions d’utilisation. Une réduction et une prestation offerte n’ont pas le même coût : adaptez-les à votre activité.",
          "Vous pouvez enregistrer un brouillon incomplet. La prévisualisation permet de tester le parcours, y compris l’e-mail de gain, sans consommer les stocks ni modifier les résultats réels.",
        ],
      },
      {
        title: "2. Placez le QR code là où vos clients le voient",
        paragraphs: [
          "Personnalisez une affiche dans Okado ou téléchargez uniquement le QR code pour l’intégrer à votre propre support. À l’accueil, sur une table ou en caisse, testez sa lecture avec plusieurs smartphones avant diffusion. Publiez votre jeu avant de distribuer son QR de participation.",
        ],
      },
      {
        title: "3. Le client participe sur son téléphone",
        paragraphs: [
          "Aucune application ni compte joueur à créer. Selon votre configuration, des liens marketing peuvent être proposés avant le jeu. Une invitation à laisser un avis reste facultative : ni l’accès au jeu ni le gain ne dépendent d’un avis ou de sa note.",
          "La collecte d’e-mail avant le jeu est un réglage indépendant. Sinon, les coordonnées nécessaires à l’envoi du gain sont demandées aux gagnants. L’accord pour recevoir de la prospection reste distinct et facultatif.",
        ],
      },
      {
        title: "4. Votre équipe valide le retrait",
        paragraphs: [
          "Le gagnant conserve son QR code et son code de secours. Le personnel ouvre la page du gain, vérifie les dates et les conditions, puis saisit le PIN de l’établissement pour confirmer la remise. Il n’a pas besoin d’un compte personnel Okado. Un gain déjà retiré ne peut pas être remis une deuxième fois.",
        ],
      },
      {
        title: "5. Suivez ce qui s’est réellement passé",
        paragraphs: [
          "Les scans, les parties commencées, les contacts collectés, les gains et les retraits sont des événements différents. Une partie perdue sans coordonnées compte comme participation. Un clic vers Google ou Instagram ne prouve ni un avis publié ni un abonnement. Les résultats aident à ajuster vos lots et vos supports, sans attribuer automatiquement un chiffre d’affaires à chaque retour.",
        ],
      },
    ],
    related: [
      "/roue-de-la-fortune",
      "/ticket-a-gratter",
      "/affiches-qr-code",
      "/guides/mesurer-jeu-qr-code",
      "/tarifs",
    ],
  },
  {
    path: "/roue-de-la-fortune",
    title: "Roue de la fortune pour commerce : créez votre jeu QR code",
    eyebrow: "Roue de la fortune",
    description:
      "Personnalisez une roue mobile avec vos lots, probabilités et couleurs. Diffusez votre jeu par QR code et suivez les gains et retraits dans Okado.",
    intro:
      "Une roue sur le téléphone du client, une affiche dans votre commerce et des lots que vous gardez sous contrôle. Okado relie l’animation au suivi des gains et à leur retrait.",
    sections: [
      {
        title: "Une roue à votre image",
        paragraphs: [
          "Le logo et le texte principal restent personnalisables. Choisissez un modèle adapté à votre univers, puis ajustez les réglages proposés : polices, espacements et couleurs selon le modèle. Certaines palettes et certains décors sont fixes pour conserver la cohérence du design.",
          "La roue peut servir en institut, restaurant, boutique ou lors d’un événement. Un même mécanisme ne signifie pas un même message : privilégiez une promesse courte et un lot compréhensible pour vos clients.",
        ],
      },
      {
        title: "Des probabilités et des stocks explicites",
        paragraphs: [
          "Vous définissez les probabilités des lots et leurs stocks. Si vous activez le mode 100 % gagnant, les probabilités doivent totaliser 100 % pour publier le jeu. Le stock reste à surveiller pendant l’opération ; une probabilité n’est pas une garantie de nombre de retraits.",
          "Un lot peut être disponible plus tard et avoir une date d’expiration. Indiquez clairement toute condition d’achat applicable à son utilisation, sans conditionner l’accès au jeu à un avis Google.",
        ],
      },
      {
        title: "Testez avant d’imprimer",
        paragraphs: [
          "La prévisualisation sert à vérifier le texte, le tirage, le formulaire et l’e-mail de gain sans modifier les stocks ou les indicateurs réels. Elle utilise un lien différent de celui que vous diffusez aux clients. Vérifiez aussi le QR code public après publication.",
        ],
      },
      {
        title: "Après le tour de roue",
        paragraphs: [
          "Un gagnant reçoit les informations du lot et un QR de retrait. Votre équipe contrôle les conditions et confirme la remise avec le PIN du commerce. Vous suivez les participations, les gains et les retraits séparément. Une perte reste une participation, même sans contact enregistré.",
        ],
      },
      {
        title: "Roue ou ticket à gratter ?",
        paragraphs: [
          "La roue rend les différents lots visibles et met le tirage en scène. Le ticket privilégie la découverte tactile d’une surprise. Les deux formats utilisent les mêmes principes de dotation et de retrait : choisissez selon votre univers et la place disponible sur le téléphone, pas selon une promesse de conversion universelle.",
        ],
      },
    ],
    related: [
      "/ticket-a-gratter",
      "/instituts-beaute",
      "/restaurants",
      "/guides/cout-jeu-marketing",
      "/tarifs",
    ],
  },
  {
    path: "/ticket-a-gratter",
    title: "Ticket à gratter numérique personnalisé pour votre commerce",
    eyebrow: "Ticket à gratter",
    description:
      "Créez un ticket à gratter sur smartphone avec votre logo et vos lots. Découvrez les modèles Beauté et Nude, la personnalisation et le retrait des gains.",
    intro:
      "Le client gratte une zone sur son écran pour découvrir le résultat. Vous choisissez les lots et un modèle adapté à votre commerce, sans support à gratter physique à distribuer.",
    sections: [
      {
        title: "Une expérience tactile dans le navigateur",
        paragraphs: [
          "Le QR code ouvre le jeu sur le smartphone du client. Le résultat apparaît après le grattage ; les règles de participation et le formulaire dépendent de votre configuration. Il n’y a ni application ni compte joueur à installer.",
          "Le ticket s’adapte aussi bien à un accueil d’institut qu’à un comptoir ou une opération en boutique. Testez les textes sur un petit écran : une phrase courte laisse davantage de place à la zone à gratter.",
        ],
      },
      {
        title: "Des modèles et une personnalisation encadrée",
        paragraphs: [
          "Nude, Nude Élégance, Botanique Premium, Noir & Or Signature, Lilas Soin Doux et Corail Lumière couvrent plusieurs univers. Le titre, le sous-titre et le logo peuvent être adaptés. Les paramètres avancés permettent d’ajuster les espacements entre les éléments.",
          "Les possibilités varient selon le modèle. Certaines couleurs restent fixes ; le modèle Nude permet de remplacer son fond par une image importée ou choisie dans la bibliothèque. La couleur du ticket n’est pas libre sur tous les modèles.",
        ],
      },
      {
        title: "Préparez les lots et leurs conditions",
        paragraphs: [
          "Pour chaque lot, définissez son libellé, sa probabilité, son stock et ses conditions de retrait. Une prestation complémentaire ou une remise peut être valable lors d’une prochaine visite. Le coût et la condition d’achat doivent être compréhensibles avant la remise du gain.",
          "La collecte d’e-mail peut être activée avant le jeu ou intervenir pour recevoir un gain. Le consentement marketing ne doit pas conditionner la participation ou la remise d’un lot.",
        ],
      },
      {
        title: "Du résultat au retrait unique",
        paragraphs: [
          "Le gagnant conserve le QR et le code de secours. Au retrait, le personnel consulte les dates et conditions, puis confirme la remise avec le PIN de l’établissement. Un gain retiré ne peut pas être consommé une deuxième fois. Les résultats distinguent les participations, les contacts et les retraits.",
        ],
      },
    ],
    related: [
      "/roue-de-la-fortune",
      "/instituts-beaute",
      "/comment-ca-marche",
      "/affiches-qr-code",
      "/tarifs",
    ],
  },
  {
    path: "/affiches-qr-code",
    title: "Affiche QR code de jeu : formats A4/A5 et utilisation dans Canva",
    eyebrow: "Supports prêts à diffuser",
    description:
      "Personnalisez votre affiche de jeu avec logo, textes et QR code dans Okado, ou téléchargez le QR seul pour votre création Canva.",
    intro:
      "L’affiche relie votre point de vente au jeu sur smartphone. Okado propose des modèles pour présenter votre message et le bon QR code, avec votre logo et vos textes.",
    sections: [
      {
        title: "Composez votre support depuis le jeu",
        paragraphs: [
          "Choisissez un modèle d’affiche, adaptez le logo texte ou image et les textes, puis ajustez leur taille et leurs espacements. La prévisualisation A4/A5 permet de contrôler la composition avant de télécharger le PNG. Le fond et certaines couleurs dépendent du modèle choisi.",
          "Présentez une promesse simple et lisible à distance. Les conditions détaillées appartiennent au parcours de jeu ; l’affiche doit donner envie de scanner sans promettre un gain qui n’existe pas.",
        ],
      },
      {
        title: "Vous utilisez déjà Canva ?",
        paragraphs: [
          "Téléchargez uniquement le QR de participation et ajoutez-le à votre création : affiche, chevalet ou flyer. Il ouvre le jeu associé. Une modification de vos textes dans Okado ne met pas à jour un fichier déjà téléchargé ou une création externe : contrôlez votre support après toute évolution importante.",
        ],
      },
      {
        title: "Ne confondez pas les trois QR codes",
        paragraphs: [
          "Le QR de diffusion ouvre votre jeu pour les clients. Le QR de prévisualisation sert aux tests et peut expirer. Le QR de retrait appartient à un gain précis et sert au personnel. Pour vos affiches, utilisez le QR de diffusion d’un jeu publié.",
        ],
      },
      {
        title: "Vérifiez la lecture avant l’impression",
        paragraphs: [
          "Conservez le contraste et la marge blanche du QR ; évitez de le déformer ou de le masquer par un logo. Testez un exemplaire imprimé à la distance réelle et sous l’éclairage du lieu. Un support lisible à l’écran ne garantit pas la lecture d’une impression réduite.",
          "Après publication, ouvrez le QR depuis un autre téléphone et vérifiez le nom de l’établissement, le message et les dates. Placez l’affiche là où le client a le temps de participer : accueil, attente, table ou caisse selon votre activité.",
        ],
      },
    ],
    related: [
      "/comment-ca-marche",
      "/guides/placer-qr-code-jeu",
      "/restaurants",
      "/instituts-beaute",
    ],
  },
  {
    path: "/guides/lots-institut-beaute",
    title: "Quels lots faire gagner dans un institut de beauté ?",
    eyebrow: "Guide · Beauté",
    description:
      "Choisissez des lots adaptés aux soins, aux ongles, au regard ou au spa : coût, attrait pour la cliente et conditions d’utilisation compréhensibles.",
    intro:
      "Le bon lot n’est pas forcément une prestation complète offerte. Il doit être désirable pour la cliente, simple à délivrer et cohérent avec votre marge et votre planning.",
    sections: [
      {
        title: "Commencez par l’objectif",
        paragraphs: [
          "Faire découvrir une gamme, encourager une prochaine prestation et remercier une cliente ne demandent pas les mêmes dotations. Choisissez un objectif principal, puis quelques lots faciles à expliquer. Une multiplication d’offres complexes complique la lecture et le retrait.",
        ],
      },
      {
        title: "Des idées selon votre activité",
        paragraphs: [
          "Ces exemples sont des pistes à adapter à vos prestations et coûts, pas des recommandations de marge universelles.",
        ],
        items: [
          "Regard : réduction sur une prochaine prestation ou avantage complémentaire, avec conditions explicites.",
          "Ongles : décoration ou supplément sur une nouvelle pose, si votre catalogue le permet.",
          "Visage et corps : mini-produit ou option découverte compatible avec la prestation réservée.",
          "Massage et spa : complément de soin ou remise valable sur une prochaine visite.",
          "Beauté généraliste : produit découverte, bon de réduction ou prestation signature à faible probabilité.",
        ],
      },
      {
        title: "Écrivez la condition au moment de choisir le lot",
        paragraphs: [
          "« Offert avec une prestation X » est différent de « prestation offerte sans achat ». Renseignez la condition d’utilisation et activez le réglage d’achat requis lorsqu’elle l’impose. Vérifiez les dates : un avantage destiné à la prochaine visite doit laisser un délai réaliste pour prendre rendez-vous.",
        ],
      },
      {
        title: "Vérifiez le coût attendu et la capacité",
        paragraphs: [
          "Pour une hypothèse de 100 participations, un lot à 20 % représente 20 gains attendus, pas 20 retraits garantis. Multipliez par son coût estimé pour comparer des scénarios ; surveillez aussi le stock et le temps de prestation disponible. Les résultats réels fluctuent autour des probabilités.",
          "Okado propose un catalogue de suggestions par sous-secteur, mais vous restez responsable du choix des dotations, de leurs coûts et de leurs conditions. Testez le rendu et le coupon de chaque lot avant de diffuser le jeu.",
        ],
      },
    ],
    related: [
      "/instituts-beaute",
      "/guides/cout-jeu-marketing",
      "/ticket-a-gratter",
      "/tarifs",
    ],
  },
  {
    path: "/guides/lots-restaurant",
    title: "Idées de lots pour un jeu en restaurant : coût et conditions",
    eyebrow: "Guide · Restauration",
    description:
      "Café, dessert, supplément ou remise : choisissez des lots compréhensibles et contrôlez coût matière, stocks et conditions de retrait.",
    intro:
      "Un lot efficace en restaurant doit être simple à comprendre et à remettre pendant le service. Comparez son coût réel à l’objectif de votre animation, sans confondre un gain attribué avec une vente additionnelle.",
    sections: [
      {
        title: "Privilégiez les lots faciles à servir",
        paragraphs: [
          "Un café, une boisson sans alcool, un dessert ou un supplément peuvent être des points de départ si votre carte et votre marge le permettent. Un lot plus important peut compléter le jeu avec une probabilité et un stock adaptés. Les suggestions ne remplacent pas vos coûts matière.",
        ],
      },
      {
        title: "Décidez quand et comment le client peut en profiter",
        paragraphs: [
          "Un gain utilisable au prochain passage n’a pas le même rôle qu’un cadeau immédiat. Indiquez son délai de disponibilité, sa durée de validité et les éventuelles conditions d’achat. Évitez une formulation courte sur la roue qui contredirait les conditions détaillées du coupon.",
          "Le jeu reste indépendant d’un éventuel avis Google : ni l’accès ni le gain ne doivent être échangés contre un avis ou une note.",
        ],
      },
      {
        title: "Prévoyez le retrait en situation réelle",
        paragraphs: [
          "L’équipe ouvre le QR de gain du client, vérifie le lot et ses conditions, puis valide avec le PIN de l’établissement. Prévoyez qui connaît ce code et comment un remplaçant est informé. Le retrait unique est utile seulement si la validation accompagne la remise effective.",
        ],
      },
      {
        title: "Ajustez sur vos résultats",
        paragraphs: [
          "Comparez scans, participations, gains et retraits sur des périodes comparables. Un faible nombre de retraits peut tenir à la validité, à la compréhension du lot ou au moment de sa disponibilité. Il ne prouve pas à lui seul que le lot est peu attractif.",
          "Pour budgéter, additionnez l’abonnement et les coûts des lots effectivement remis ; utilisez un scénario de gains attendus pour anticiper. Un panier associé à une visite ne constitue pas automatiquement du chiffre d’affaires causé par le jeu.",
        ],
      },
    ],
    related: [
      "/restaurants",
      "/guides/cout-jeu-marketing",
      "/guides/mesurer-jeu-qr-code",
      "/affiches-qr-code",
    ],
  },
  {
    path: "/guides/avis-google-jeu-concours",
    title: "Avis Google et jeu concours : ce qu’il faut distinguer",
    eyebrow: "Guide · Avis clients",
    description:
      "Distinguez l’invitation à partager une expérience et la participation au jeu. Un cadeau ne doit pas être offert en échange d’un avis, même neutre.",
    intro:
      "Inviter un client à parler de son expérience et lui proposer un jeu sont deux démarches distinctes. L’avis, sa note et son absence ne doivent pas déterminer l’accès au jeu ou l’obtention d’un gain.",
    sections: [
      {
        title: "Une récompense contre un avis reste une contrepartie",
        paragraphs: [
          "Les règles Google sur les contenus incités couvrent notamment les paiements, remises et biens ou services gratuits offerts en échange d’avis. Dire seulement « pas d’avis positif obligatoire » ne suffit pas : un avis neutre récompensé reste un avis incité.",
          "Consultez les règles officielles liées ci-dessous pour leur version à jour. Ce guide explique la distinction à préserver dans le parcours ; il ne constitue pas une garantie de conformité d’une opération particulière.",
        ],
      },
      {
        title: "Gardez une invitation facultative",
        paragraphs: [
          "Le client doit pouvoir participer et recevoir son gain indépendamment du dépôt d’un avis ou de sa note. Présentez la demande de retour de façon transparente, sans promettre un cadeau en échange et sans sélectionner uniquement les clients satisfaits.",
        ],
      },
      {
        title: "Un clic ne prouve pas un avis publié",
        paragraphs: [
          "Okado peut compter les clics vers votre fiche Google. Ces événements ne prouvent pas que le client a publié un avis. De même, une redirection Instagram ne prouve pas un abonnement. N’additionnez pas ces clics à vos avis réels dans un bilan commercial.",
        ],
      },
      {
        title: "Relisez vos supports et votre configuration",
        paragraphs: [
          "Contrôlez l’affiche, les boutons, les explications données par l’équipe et les conditions de retrait. Une formulation correcte dans le règlement ne compense pas une promesse contradictoire au comptoir. Les lots, les règles du jeu et le consentement marketing doivent aussi rester distincts.",
        ],
      },
    ],
    related: [
      "/comment-ca-marche",
      "/guides/collecte-email-jeu",
      "/restaurants",
      "/instituts-beaute",
    ],
    source: [
      {
        label: "Google — Avis incités ou biaisés",
        href: "https://support.google.com/contributionpolicy/answer/16597558?hl=fr",
      },
    ],
  },
  {
    path: "/guides/collecte-email-jeu",
    title: "Jeu QR code et collecte d’e-mails : options et consentements",
    eyebrow: "Guide · Données clients",
    description:
      "Comprenez les deux positions du formulaire dans Okado et la différence entre e-mail de gain, participation et consentement marketing facultatif.",
    intro:
      "Une adresse nécessaire à l’envoi d’un gain n’est pas automatiquement un contact autorisé pour de la prospection. Le paramétrage du jeu doit rendre cette différence compréhensible pour le joueur.",
    sections: [
      {
        title: "Avant le jeu ou au moment du gain",
        paragraphs: [
          "Okado permet d’activer la collecte d’e-mail avant la participation. Ce réglage est indépendant des liens marketing proposés par visite. Sinon, les coordonnées nécessaires à l’envoi d’un gain sont demandées aux gagnants. Une partie perdue sans coordonnées reste comptée dans les participations.",
        ],
      },
      {
        title: "Séparez le service et la prospection",
        paragraphs: [
          "L’e-mail de gain sert à transmettre le lot, ses conditions et le code de retrait. Le consentement à recevoir des offres marketing a une autre finalité. La case correspondante est distincte, décochée par défaut et facultative : elle ne conditionne ni le jeu ni le gain.",
          "Expliquez les finalités, les destinataires et les droits à partir de votre situation réelle. Consultez les recommandations CNIL : les règles varient notamment entre prospection de particuliers et de professionnels.",
        ],
      },
      {
        title: "Utilisez les exports selon les préférences recueillies",
        paragraphs: [
          "Les contacts et leurs consentements sont consultables dans vos résultats et exportables. Vérifiez ces préférences avant d’importer une liste dans un outil de prospection. Un fichier de gagnants n’est pas une liste d’abonnés à votre newsletter.",
        ],
      },
      {
        title: "Répondez aux demandes de vos clients",
        paragraphs: [
          "Le marchand organise le jeu et détermine l’usage de ses contacts ; Okado fournit l’outil technique. Renseignez les informations utiles à vos clients et leur moyen de vous contacter. Une demande sur un gain, une opposition marketing et une demande de suppression n’ont pas la même finalité.",
          "La politique de confidentialité et le DPA décrivent le cadre du service. Ne déduisez pas d’une fonction de collecte une conformité globale ou une durée de conservation personnalisable non confirmée.",
        ],
      },
    ],
    related: [
      "/confidentialite",
      "/cgv",
      "/guides/mesurer-jeu-qr-code",
      "/comment-ca-marche",
    ],
    source: [
      {
        label: "CNIL — Prospection commerciale électronique",
        href: "https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique",
      },
    ],
  },
  {
    path: "/guides/mesurer-jeu-qr-code",
    title: "Scans, participations, gains et retraits : les bons indicateurs",
    eyebrow: "Guide · Mesure",
    description:
      "Retrouvez les définitions des indicateurs Okado, les formules de conversion et de consommation, et les limites des clics marketing.",
    intro:
      "Ouvrir le jeu, commencer une partie, gagner et récupérer le lot sont des événements différents. Les confondre donne une lecture trompeuse des résultats, même lorsque les chiffres sont exacts.",
    sections: [
      {
        title: "Du scan à la participation",
        paragraphs: [
          "Le scan correspond à l’ouverture du jeu depuis son QR de diffusion. La participation est une partie effectivement commencée, comptée une fois par session. Pour une roue, le tirage démarre au clic Jouer ; pour un ticket, la première action de grattage déclenche ce comptage.",
          "Les perdants et les joueurs sans coordonnées sont inclus. Une session de ticket simplement préparée ne prouve pas une partie commencée. Les prévisualisations sont exclues des résultats réels.",
        ],
      },
      {
        title: "Conversion : participations divisées par scans",
        paragraphs: [
          "Avec 320 scans et 224 participations, la conversion est de 70 %. Les totaux du périmètre choisi doivent être divisés une seule fois : la moyenne des taux de plusieurs jeux peut donner un résultat différent et trompeur. Un taux de contacts par scan peut être utile, mais il doit porter un autre nom.",
        ],
      },
      {
        title: "Un gain attribué n’est pas encore un retrait",
        paragraphs: [
          "Un gain désigne le lot remporté ; un retrait correspond à sa remise effectivement validée. Le taux de consommation est le nombre de lots retirés divisé par le nombre de lots gagnés, multiplié par 100. Un stock illimité n’exclut pas un lot de ce calcul.",
          "Pour un bilan périodique, précisez si vous comptez les gains de la période ou les retraits survenus pendant celle-ci. Un client peut retirer aujourd’hui un lot gagné le mois précédent.",
        ],
      },
      {
        title: "Contacts et clics : les limites à connaître",
        paragraphs: [
          "Un contact collecté, un opt-in et une personne unique ne sont pas interchangeables. Les résultats ne créent pas de coordonnées pour une participation anonyme. Le clic vers une action marketing est une interaction mesurée, pas une preuve d’avis publié ou d’abonnement social.",
          "Choisissez la même période et les mêmes jeux pour comparer les écrans. Les notifications récapitulatives utilisent leurs périodes locales closes ; les graphiques peuvent utiliser des journées UTC. Vérifiez le périmètre avant de comparer deux totaux.",
        ],
      },
    ],
    related: [
      "/guides/cout-jeu-marketing",
      "/aide/notifications-et-relances",
      "/comment-ca-marche",
      "/tarifs",
    ],
  },
  {
    path: "/guides/cout-jeu-marketing",
    title:
      "Calculer le coût d’un jeu sans confondre chiffre d’affaires et marge",
    eyebrow: "Guide · Budget",
    description:
      "Construisez un budget de jeu marketing avec abonnement, probabilités et coût des lots. Distinguez gains attendus, retraits et chiffre d’affaires associé.",
    intro:
      "Le prix du logiciel n’est qu’une partie du budget. La valeur des lots, leur coût pour votre établissement et leur retrait réel doivent être distingués avant de parler de rentabilité.",
    sections: [
      {
        title: "Construisez un scénario, pas une promesse",
        paragraphs: [
          "Pour anticiper, multipliez le nombre de participations envisagé par la probabilité de chaque lot puis par son coût estimé. Additionnez les résultats et l’abonnement. Le nombre de gains observé fluctue ; un stock fini peut aussi limiter l’attribution.",
          "Exemple fictif : sur 100 participations, un lot à 20 % et coût estimé 2 € représente 40 € de coût attendu des gains. Ajoutez les autres lots et l’abonnement. Cela ne signifie pas que 20 lots seront retirés ou que la valeur commerciale du cadeau est de 2 €.",
        ],
      },
      {
        title: "Suivez ensuite les remises effectives",
        paragraphs: [
          "Les coûts engagés pour un produit déjà acheté et ceux d’une prestation réalisée ne se matérialisent pas forcément au même moment. Suivez les retraits, mais gardez votre méthode comptable propre : le coût estimé du logiciel n’est pas une comptabilité matière ou de personnel.",
        ],
      },
      {
        title: "Une visite associée n’est pas nécessairement additionnelle",
        paragraphs: [
          "24 retraits avec un panier hypothétique de 22 € correspondent à 528 € de chiffre d’affaires associé à ces visites. Cela ne prouve pas que ces ventes n’auraient pas eu lieu sans jeu. Retirez aussi les coûts et les remises pour raisonner sur la marge, pas uniquement sur le chiffre d’affaires.",
          "Un essai pilote doit préciser sa période, ses lots, ses emplacements et ses limites. Ne comparez pas une semaine de forte activité à une semaine creuse sans tenir compte du contexte.",
        ],
      },
      {
        title: "Commencez avec des hypothèses que vous connaissez",
        paragraphs: [
          "Choisissez un lot simple, un coût estimé documenté et une validité compréhensible. Ne fixez pas une valeur arbitraire à un avis ou à un contact pour annoncer une rentabilité garantie. Ajustez votre dispositif sur les participations, les gains et les retraits réellement constatés.",
        ],
      },
    ],
    related: [
      "/tarifs",
      "/guides/lots-institut-beaute",
      "/guides/lots-restaurant",
      "/guides/mesurer-jeu-qr-code",
    ],
  },
  {
    path: "/guides/placer-qr-code-jeu",
    title: "Où placer le QR code d’un jeu en boutique ou restaurant ?",
    eyebrow: "Guide · Terrain",
    description:
      "Choisissez un emplacement lisible et un moment où vos clients peuvent jouer. Testez votre affiche, sa lecture et les résultats sur des périodes comparables.",
    intro:
      "Un QR code visible n’est pas toujours un QR code utilisé. Le client doit comprendre ce qu’il ouvre et disposer de quelques instants pour participer.",
    sections: [
      {
        title: "Choisissez un moment disponible",
        paragraphs: [
          "En institut, l’accueil ou l’attente peuvent convenir ; en restaurant, une table ou un comptoir selon le service. Ne gênez ni le paiement ni le passage. Un support posé loin du regard ou dans une zone sans réseau réduit les chances de participation.",
        ],
      },
      {
        title: "Rendez la promesse et le QR lisibles",
        paragraphs: [
          "Privilégiez un message court, un QR contrasté et une marge suffisante autour du code. Évitez les surfaces brillantes, les plis ou les petites impressions illisibles à la distance réelle. Testez le support imprimé, pas seulement le fichier affiché sur votre ordinateur.",
        ],
      },
      {
        title: "Comparez sans inventer une attribution par support",
        paragraphs: [
          "Le même QR affiché à plusieurs endroits ouvre le même jeu. Il ne suffit pas à attribuer chaque scan à une table ou une affiche. Pour comparer, testez des emplacements sur des périodes documentées et comparables ; consignez le contexte et les changements de support.",
        ],
      },
      {
        title: "Informez votre équipe",
        paragraphs: [
          "L’équipe doit savoir expliquer la mécanique en une phrase et valider un retrait avec le PIN. Le jeu ne remplace pas l’accueil : il offre un support d’animation que le client peut utiliser à son rythme. Contrôlez les scans, les parties commencées et les retraits avant de conclure sur l’efficacité d’un emplacement.",
        ],
      },
    ],
    related: [
      "/affiches-qr-code",
      "/restaurants",
      "/instituts-beaute",
      "/guides/mesurer-jeu-qr-code",
    ],
  },
  {
    path: "/aide/notifications-et-relances",
    title: "Notifications de gains et rappels d’expiration dans Okado",
    eyebrow: "Aide · Mon compte",
    description:
      "Distinguez les alertes envoyées au marchand, les synthèses de gains et la relance au gagnant avant l’expiration d’un lot.",
    intro:
      "Les notifications vous informent même lorsque vous ne consultez pas le tableau de bord. Les rappels d’expiration s’adressent aux gagnants : ce sont deux réglages et deux destinataires différents.",
    sections: [
      {
        title: "Recevoir les gains de votre établissement",
        paragraphs: [
          "Dans Mon compte, choisissez une alerte à chaque gain et/ou des synthèses quotidienne, hebdomadaire et mensuelle. Les fréquences peuvent se cumuler : un même gain peut apparaître dans plusieurs synthèses. Elles sont désactivées par défaut et le réglage est personnel à l’utilisateur et à l’établissement.",
        ],
      },
      {
        title: "Lire une synthèse",
        paragraphs: [
          "Le détail présente les gains avec le prénom et le nom du participant, le jeu et le lot. Une colonne indique la date d’expiration ou le statut Récupéré lorsque le gain a été retiré. Le nombre de lots récupérés pendant la période peut concerner des gains plus anciens ; il n’est donc pas présenté comme une fraction des seuls gains de la période.",
          "Le bloc des stocks distingue les quantités limitées, les lots épuisés et les stocks illimités. Aucun e-mail vide n’est envoyé. Les synthèses sont préparées sur des périodes locales closes lors du passage quotidien, avec une heure indicative et non une garantie de réception à 9 h.",
        ],
      },
      {
        title: "Rappeler au gagnant qu’un lot expire",
        paragraphs: [
          "La relance d’expiration est un réglage commun au compte marchand et à ses établissements, désactivé par défaut. Vous pouvez personnaliser le nombre de jours avant expiration, avec 7 jours proposés initialement. Le rappel vise un gain réel non retiré et respecte les règles d’éligibilité, dont une validité initiale d’au moins 20 jours.",
          "Il n’y a pas de rattrapage d’une journée passée. Le passage est quotidien à heure approximative, et une relance déjà tentée ou transmise n’est pas rejouée par un changement de délai. Ce rappel ne modifie ni les conditions ni la date d’expiration du lot.",
        ],
      },
      {
        title: "Modifier vos préférences",
        paragraphs: [
          "Le lien Mon compte présent dans les notifications permet de revoir vos réglages après connexion. Une désactivation stoppe les envois encore annulables ; un e-mail déjà transmis au fournisseur ne peut pas être rappelé. Vérifiez aussi les spams si une notification attendue ne vous parvient pas.",
        ],
      },
    ],
    related: [
      "/guides/mesurer-jeu-qr-code",
      "/comment-ca-marche",
      "/securite-et-donnees",
    ],
  },
  {
    path: "/a-propos",
    title: "À propos d’Okado et contact",
    eyebrow: "L’outil et son éditeur",
    description:
      "Okado aide les commerces locaux à créer des jeux mobiles par QR code. Retrouvez l’éditeur du service et les moyens de nous contacter.",
    intro:
      "Okado est un logiciel de création et de pilotage de jeux en point de vente. Il associe une roue ou un ticket à gratter, des supports QR et un suivi des gains et des retraits.",
    sections: [
      {
        title: "Pour les équipes de terrain",
        paragraphs: [
          "Le service s’adresse notamment aux commerces, restaurants et établissements beauté/bien-être. L’objectif est de mettre en place une animation mobile sans développement spécifique, avec des lots et des conditions définis par le marchand.",
          "Okado n’est ni une caisse, ni un logiciel de prise de rendez-vous, ni un programme généraliste de points de fidélité. Les liens vers Google et les réseaux sociaux redirigent le client sans connexion à vos comptes tiers.",
        ],
      },
      {
        title: "Éditeur",
        paragraphs: [
          "BRUNELLE PEROLS INVESTISSEMENT — SAS au capital de 40 000 €. SIRET : 99177964600017. RCS Versailles 991 779 646. Siège social : Dammartin-en-Serve, France.",
        ],
      },
      {
        title: "Nous contacter",
        paragraphs: [
          "Pour une question sur l’offre ou une difficulté avec le service : contact@okado.app. Pour un gain remporté dans un établissement, contactez d’abord le marchand organisateur : il définit les conditions et assure la remise des lots.",
        ],
      },
    ],
    related: ["/comment-ca-marche", "/tarifs", "/cgv", "/securite-et-donnees"],
  },
  {
    path: "/securite-et-donnees",
    title: "Sécurité et données : le périmètre du service Okado",
    eyebrow: "Informations sur le service",
    description:
      "Comprenez les rôles du marchand et d’Okado, les accès aux données, le retrait par PIN, la prévisualisation et les fournisseurs techniques du service.",
    intro:
      "La sécurité du service se comprend à partir de fonctions concrètes et de leur périmètre. Cette page décrit le fonctionnement et les fournisseurs ; elle ne constitue pas une certification ni un engagement de disponibilité chiffré.",
    sections: [
      {
        title: "Les rôles et les accès",
        paragraphs: [
          "Le marchand organise son jeu et décide de l’usage de ses contacts. Okado fournit la plateforme technique. Les accès aux jeux et résultats sont rattachés aux établissements autorisés ; le parcours public du joueur n’ouvre pas l’espace marchand. L’administration de la plateforme dispose de fonctions d’assistance contrôlées.",
        ],
      },
      {
        title: "Retrait et prévisualisation",
        paragraphs: [
          "Un gain possède un QR code et un code de retrait individuels. Le personnel consulte le statut et les conditions avant de confirmer avec le PIN de l’établissement. Le code de secours d’un gain ne remplace pas le PIN marchand. Une seconde remise d’un gain déjà retiré est bloquée.",
          "La prévisualisation utilise des liens distincts et reste isolée des stocks et indicateurs de production. Ne diffusez pas un QR de prévisualisation à la place du QR public de votre jeu.",
        ],
      },
      {
        title: "Les principaux fournisseurs techniques",
        paragraphs: [
          "Vercel assure l’hébergement des applications ; Supabase fournit l’authentification, la base et le stockage ; Resend sert à l’envoi des e-mails transactionnels et notifications ; Stripe prend en charge l’abonnement. Le suivi produit et la relation marchand peuvent également utiliser PostHog et Brevo selon leur configuration.",
          "La présence d’une base en Europe ne prouve pas que tous les traitements de tous les fournisseurs restent dans une même région. Les garanties et traitements applicables doivent être appréciés avec les conditions et accords correspondants. Contactez-nous pour une demande précise sur le périmètre technique.",
        ],
      },
      {
        title: "Restez précis sur vos données clients",
        paragraphs: [
          "Le consentement à la prospection est distinct de la gestion d’un gain. Un contact collecté n’est pas automatiquement un abonné marketing. Les exports doivent être utilisés selon les finalités et préférences recueillies. Les détails contractuels figurent dans les CGV et le DPA.",
        ],
      },
    ],
    related: [
      "/confidentialite",
      "/cgv",
      "/guides/collecte-email-jeu",
      "/a-propos",
    ],
  },
  {
    path: "/confidentialite",
    reviewedAt: "2026-10-15",
    title: "Confidentialité et données personnelles dans Okado",
    eyebrow: "Informations sur les données",
    description:
      "Découvrez les finalités des données de compte et de jeu, les rôles du marchand et d’Okado et les contacts pour exercer vos droits.",
    intro:
      "Les données du compte marchand, les données d’un jeu et les mesures de visite n’ont pas les mêmes finalités. Voici comment identifier le bon interlocuteur et les documents applicables.",
    sections: [
      {
        title: "Pour les comptes marchands",
        paragraphs: [
          "BRUNELLE PEROLS INVESTISSEMENT, éditeur d’Okado, est responsable des traitements liés aux comptes professionnels, à la facturation, à la sécurité du service et à la mesure d’usage. Pour toute question ou demande : contact@okado.app. L’identité et les coordonnées de l’éditeur figurent aussi sur la page À propos.",
          "Les coordonnées professionnelles, identifiants de compte et informations d’établissement servent à créer l’accès, gérer l’abonnement et fournir l’assistance. La base est l’exécution du contrat lorsque vous êtes personnellement partie au contrat ; pour les utilisateurs d’une société cliente, l’intérêt légitime à administrer la relation professionnelle. Les traitements de facturation répondent aux obligations légales applicables. Les données nécessaires à la sécurité servent à prévenir les abus et protéger les accès, au titre de l’intérêt légitime du service.",
          "Les champs indispensables sont signalés lors de la collecte : sans les informations requises pour le compte ou le paiement, la fonction correspondante ne peut pas être fournie. Le refus de la prospection ou de la mesure d’audience ne bloque pas l’accès au service.",
        ],
      },
      {
        title: "Pour les joueurs",
        paragraphs: [
          "Le marchand organisateur définit le jeu, les lots et l’usage des contacts collectés. Okado agit comme fournisseur technique pour ces traitements. Les coordonnées peuvent être demandées selon le paramétrage de collecte ou pour transmettre un gain et son code de retrait. Une partie sans coordonnées n’est pas transformée en contact fictif.",
          "Le consentement marketing est distinct, facultatif et décoché par défaut. Il ne conditionne ni le jeu ni le gain. Pour une demande concernant votre participation ou votre lot, adressez-vous à l’établissement organisateur, dont les informations doivent accompagner le jeu.",
        ],
      },
      {
        title: "Destinataires, fournisseurs et transferts",
        paragraphs: [
          "Les données sont accessibles aux utilisateurs autorisés de l’établissement et aux personnes habilitées pour l’assistance et l’exploitation. Supabase fournit l’authentification, la base et les fichiers ; Vercel héberge les applications ; Resend transmet les e-mails de service et notifications ; Stripe traite les données nécessaires au paiement et à l’abonnement. Les coordonnées des joueurs ne sont pas transmises à Stripe pour la seule gestion d’un jeu.",
          "Brevo peut recevoir les coordonnées professionnelles des utilisateurs marchands pour la gestion de la relation. Cette synchronisation ne prouve aucun consentement commercial et ne concerne pas automatiquement les joueurs. Les messages nécessaires au service et les sollicitations commerciales ont des finalités distinctes ; la prospection reste soumise à sa base légale et aux possibilités d’opposition ou de retrait applicables.",
          "Le projet PostHog utilisé pour Okado est en région EU. Une région d’hébergement ne suffit pas à exclure les accès ou traitements hors de l’Espace économique européen chez l’ensemble des fournisseurs. Les destinataires et mécanismes de transfert applicables à votre traitement, notamment les décisions d’adéquation ou clauses contractuelles types lorsqu’elles sont utilisées, peuvent être demandés à contact@okado.app. Le DPA précise les obligations de sous-traitance ; aucune localisation exclusivement européenne de tous les traitements n’est annoncée.",
        ],
      },
      {
        title: "Mesure d’audience et choix des cookies",
        paragraphs: [
          "Avec votre consentement préalable, PostHog mesure les visites et les étapes d’acquisition, d’inscription et de publication d’un jeu ; Vercel Analytics mesure la fréquentation. Après création du compte, des identifiants techniques peuvent relier ces étapes à votre compte marchand. Les textes saisis, e-mails, mots de passe, codes de retrait et paramètres d’URL ne sont pas des données prévues pour cette mesure. L’autocapture des interactions et la relecture des sessions ne sont pas activées par ce dispositif.",
          "Le bouton Gérer les cookies permet d’accepter, de refuser ou de retirer l’accord à tout moment, avec des choix de même visibilité. Le choix concerne okado.app, www.okado.app et app.okado.app et est mémorisé dans un cookie de préférence pendant 180 jours au maximum ; une nouvelle visite ne renouvelle pas ce délai. Sans accord valide, la collecte de mesure concernée n’est pas déclenchée, y compris pour les événements produit envoyés par le serveur.",
          "Après acceptation, PostHog peut utiliser un cookie d’identification partagé entre ces sous-domaines. Lors du retrait, ses identifiants stockés par ce dispositif sont supprimés du navigateur et les nouvelles captures sont arrêtées. Le retrait n’efface pas rétroactivement les données déjà collectées ; une demande d’effacement peut être adressée à contact@okado.app. Les cookies nécessaires à la connexion, à la sécurité ou à l’exécution du jeu répondent à leurs propres finalités et restent distincts de ce choix.",
        ],
      },
      {
        title: "Demandes et conservation",
        paragraphs: [
          "Selon le traitement, vous pouvez exercer les droits d’accès, de rectification, d’effacement, de limitation, d’opposition et, lorsque ses conditions sont réunies, de portabilité. Vous pouvez retirer un consentement sans remettre en cause les traitements antérieurs licites. Contactez l’établissement pour les données de son jeu et contact@okado.app pour le compte marchand ou la mesure du service. Nous vérifions uniquement les éléments nécessaires pour traiter la demande. Vous pouvez saisir la CNIL en France ou l’autorité compétente pour votre situation.",
          "Les données de compte sont utilisées pendant la relation contractuelle et le traitement des demandes liées au service. Après sa fin, seules les données dont la conservation est justifiée pour une obligation légale ou une réclamation peuvent être conservées avec un accès restreint. Les pièces comptables françaises, dont les factures, relèvent d’une conservation de dix ans à compter de la clôture de l’exercice concerné ; cette obligation ne s’étend pas automatiquement aux données des joueurs ni à l’ensemble du compte.",
          "Pour un jeu, l’organisateur précise les durées ou critères nécessaires à la participation, à la validité et au retrait des gains, puis à la gestion justifiée des réclamations. Pour la prospection, le retrait ou l’opposition met fin à cet usage ; les éléments strictement nécessaires au respect de cette opposition sont distincts du fichier utilisé pour prospecter. Aucun délai uniforme de trois ou cinq ans ni mécanisme de suppression automatique de toutes les données n’est promis. Contactez le responsable concerné pour les modalités applicables à votre situation.",
        ],
      },
    ],
    related: [
      "/cgv",
      "/securite-et-donnees",
      "/guides/collecte-email-jeu",
      "/a-propos",
    ],
    source: [
      {
        label: "CNIL — Vos droits",
        href: "https://www.cnil.fr/fr/les-droits-pour-maitriser-vos-donnees-personnelles",
      },
    ],
  },
];

export function contentByPath(path: string) {
  return publicContent.find((page) => page.path === path);
}
