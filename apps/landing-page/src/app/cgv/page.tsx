import { LegalPage } from "@/components/legal/legal-page";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "/cgv",
  "CGV et abonnement | Okado",
  "Conditions générales de vente, d’abonnement et accord de traitement des données de la plateforme Okado.",
);

const sections = [
  {
    title: "Article 1 - Définitions et objet",
    paragraphs: [
      "Les présentes Conditions Générales de Vente et d’Abonnement régissent l’accès et l’utilisation de la plateforme logicielle Okado, distribuée en mode SaaS par la société BRUNELLE PEROLS INVESTISSEMENT, ci-après l’Éditeur.",
      "Toute personne physique ou morale souscrivant aux services de la plateforme dans le cadre de son activité professionnelle est dénommée le Client.",
    ],
  },
  {
    title: "Article 2 - Offre d’abonnement et période d’essai",
    paragraphs: [
      "Lors de sa première inscription, le Client bénéficie d’une période d’essai gratuite de trente jours, active dès la validation du compte.",
      "À l’issue de cette période d’essai, l’accès aux fonctionnalités d’exportation de données et aux fonctionnalités avancées peut être suspendu, sauf si le Client souscrit à l’Abonnement Pro.",
    ],
  },
  {
    title: "Article 3 - Tarification et modalités de paiement",
    paragraphs: [
      "L’Abonnement Pro est facturé selon les tarifs en vigueur au jour de la souscription, tels qu’indiqués sur le site officiel okado.app. L’Éditeur se réserve le droit de modifier ses tarifs à tout moment.",
      "En cas d’augmentation, le nouveau tarif sera notifié au Client moyennant un préavis de trente jours avant sa prise d’effet. Si le Client refuse cette modification, il lui appartient de résilier son abonnement avant l’application du nouveau tarif. À défaut, le Client est réputé avoir accepté la nouvelle tarification.",
      "Les prix sont affichés en euros pour la France et l’Europe, et en dollars canadiens pour le marché nord-américain, sauf indication contraire affichée lors de la souscription.",
      "Les tarifs s’entendent hors taxes. Pour la France, la TVA standard au taux légal en vigueur s’ajoute au moment de la facturation. Pour le Canada, les taxes fédérales et provinciales applicables s’ajoutent selon la province de résidence du Client.",
      "Les transactions sont opérées exclusivement de manière sécurisée via l’infrastructure Stripe par prélèvement mensuel automatique.",
      "Tout défaut ou retard de paiement à l’échéance entraînera de plein droit l’application de pénalités de retard égales à trois fois le taux d’intérêt légal en vigueur en France, le paiement d’une indemnité forfaitaire pour frais de recouvrement d’un montant de quarante euros hors taxes ou équivalent en devise, ainsi que la suspension immédiate de l’accès à la plateforme jusqu’au complet paiement des sommes dues.",
    ],
  },
  {
    title: "Article 4 - Durée et résiliation",
    paragraphs: [
      "L’Abonnement Pro Okado est conclu pour une durée d’un mois, renouvelable tacitement par périodes successives de même durée.",
      "L’abonnement est sans engagement. Le Client peut résilier son abonnement à tout moment via le portail client de paiement.",
      "La résiliation prend effet à la fin de la période de facturation mensuelle en cours. Tout mois entamé reste dû dans son intégralité et ne donne lieu à aucun remboursement prorata temporis.",
    ],
  },
  {
    title: "Article 5 - Disponibilité de la plateforme et maintenance",
    paragraphs: [
      "L’Éditeur s’efforce d’assurer l’accès à la plateforme 24 heures sur 24 et 7 jours sur 7. Toutefois, l’Éditeur n’est tenu qu’à une obligation de moyens concernant la disponibilité technique du service.",
      "Aucun niveau de service minimal n’est garanti. L’Éditeur se réserve le droit d’interrompre temporairement et sans préavis l’accès à la plateforme pour mener des opérations de maintenance, de mise à jour ou d’amélioration technique.",
      "La responsabilité de l’Éditeur ne pourra être engagée en cas d’indisponibilité, de ralentissements, de bogues ou de pertes d’exploitation subies par le Client à ce titre.",
    ],
  },
  {
    title: "Article 6 - Responsabilité de l’Éditeur",
    paragraphs: [
      "La responsabilité de l’Éditeur est strictement limitée aux obligations de moyens stipulées aux présentes.",
      "En aucun cas l’Éditeur ne pourra être tenu responsable des dommages indirects, pertes de chance, pertes de bénéfices, pertes de données ou pertes de chiffre d’affaires subis par le Client.",
      "Si la responsabilité financière de l’Éditeur envers le Client venait à être engagée, toutes causes confondues, elle serait expressément et globalement plafonnée aux sommes effectivement perçues par l’Éditeur au titre de l’abonnement au cours des trois derniers mois précédant le fait générateur du litige.",
      "Ce plafond ne s’applique pas en cas de dommage corporel, de fraude, de dol ou de faute lourde de l’Éditeur.",
    ],
  },
  {
    title: "Article 7 - Propriété intellectuelle et licence",
    paragraphs: [
      "La marque Okado, les codes sources, l’architecture logicielle, les algorithmes et les designs d’interfaces sont et demeurent la propriété exclusive de BRUNELLE PEROLS INVESTISSEMENT.",
      "L’Éditeur concède au Client, pour la durée de son abonnement, un droit d’utilisation personnel, non exclusif, non transférable et non cessible de la plateforme, pour ses seuls besoins professionnels.",
      "Le Client demeure propriétaire exclusif de l’intégralité des données importées, collectées ou traitées par lui sur la plateforme. Il concède à l’Éditeur une licence gratuite et limitée d’hébergement et de traitement de ces données pour les stricts besoins du bon fonctionnement et de l’exécution des services.",
    ],
  },
  {
    title: "Article 8 - Force majeure",
    paragraphs: [
      "Aucune des parties ne pourra être tenue responsable d’un manquement à ses obligations contractuelles si ce manquement est dû à un cas de force majeure au sens de l’article 1218 du Code civil français.",
      "Sont notamment assimilés à des cas de force majeure les incendies ou pannes de centres de données, les cyberattaques massives, les interruptions prolongées des réseaux de télécommunication ou de fourniture d’énergie échappant au contrôle de l’Éditeur.",
    ],
  },
  {
    title: "Article 9 - Loi applicable et tribunaux compétents",
    paragraphs: [
      "Les présentes conditions sont régies exclusivement par le droit français.",
      "Les dispositions impératives applicables ne sont pas écartées par ce choix de loi. Une disponibilité technique ou un affichage en dollars canadiens ne vaut pas validation des règles locales : avant un déploiement au Canada, le Client et l’Éditeur vérifient le périmètre géographique, la protection des renseignements personnels et les règles applicables au jeu concerné.",
      "Tout litige relatif à leur interprétation, leur exécution, leur résiliation ou leur validité entre l’Éditeur et un Client professionnel sera soumis à la compétence exclusive du Tribunal de Commerce de Versailles, nonobstant pluralité de défendeurs ou appel en garantie.",
    ],
  },
  {
    title: "Annexe - Accord sur le traitement des données (DPA)",
    paragraphs: [
      "1. Objet et rôles. Pour les données des joueurs traitées sur instructions du Client, celui-ci est responsable de traitement et l’Éditeur est sous-traitant au sens de l’article 28 du RGPD. L’Éditeur est responsable de ses propres traitements de gestion du compte professionnel, de facturation, de sécurité et de mesure d’usage ; ces traitements sont décrits dans la politique de confidentialité et ne deviennent pas des instructions du Client par la seule présente annexe.",
      "2. Opérations et personnes concernées. La sous-traitance couvre la collecte, l’enregistrement, l’hébergement, la consultation autorisée, l’export, la transmission des e-mails de gain, l’assistance, la restitution et l’effacement nécessaires à l’organisation des jeux du Client. Elle concerne ses joueurs et contacts. Selon le parcours, les données comprennent les coordonnées fournies, les identifiants techniques de participation, le résultat, les dates et conditions du gain, la preuve du retrait et le choix de prospection avec ses éléments de preuve. Le Client ne doit pas introduire de données sensibles non nécessaires dans les champs libres.",
      "3. Instructions et durée. Le contrat, le paramétrage du jeu et les demandes écrites du Client constituent les instructions documentées. L’Éditeur ne réutilise pas les données des joueurs pour sa propre prospection. Il informe immédiatement le Client si une instruction lui paraît contraire aux règles de protection des données ; si une obligation légale impose un autre traitement, il l’en informe préalablement sauf interdiction légale. La sous-traitance dure pendant la fourniture du service puis le temps nécessaire à la restitution ou à l’effacement demandé, sous réserve des obligations légales applicables.",
      "4. Confidentialité et sécurité. L’Éditeur limite l’accès aux personnes habilitées, tenues à la confidentialité, et met en œuvre des mesures appropriées au risque conformément à l’article 32 du RGPD. Ces mesures comprennent le contrôle serveur des accès, le cloisonnement par établissement, la protection des secrets et des transmissions, ainsi que des procédures de gestion des incidents et de restauration. Les mesures et limites opérationnelles sont décrites sur la page Sécurité et données ; aucune certification ou disponibilité chiffrée n’est déduite de cette annexe.",
      "5. Sous-traitants ultérieurs. Pour les données des jeux, le Client autorise le recours à Vercel (hébergement), Supabase (base, fichiers et services techniques) et Resend (e-mails et notifications). L’Éditeur impose par écrit à ces prestataires les obligations de protection applicables aux traitements confiés et reste responsable envers le Client de leurs obligations de sous-traitance. Il informe le Client par écrit de tout ajout ou remplacement envisagé afin de lui permettre d’exprimer des objections motivées avant la mise en œuvre ; les parties recherchent une solution compatible avec la protection des données avant la poursuite du traitement concerné.",
      "6. Fournisseurs des traitements propres à Okado. Stripe intervient pour les paiements et l’abonnement, Brevo pour la relation avec les utilisateurs marchands, et PostHog ainsi que Vercel Analytics pour la mesure du service selon le choix du visiteur. La synchronisation d’un compte marchand vers Brevo ne constitue pas un consentement à la prospection. Les rôles et obligations de chaque fournisseur dépendent de la prestation concernée ; Stripe ne reçoit pas par ce seul contrat les données des joueurs.",
      "7. Transferts. Un hébergement principal en Europe ne garantit pas l’absence de traitement ou d’accès depuis un autre pays. Tout transfert hors de l’Espace économique européen réalisé dans le cadre de la sous-traitance doit suivre les instructions documentées et être couvert par un mécanisme applicable du chapitre V du RGPD, avec les évaluations et mesures complémentaires nécessaires. Le Client peut demander à contact@okado.app les prestataires, localisations et garanties applicables à son traitement ; la région EU de PostHog ne constitue pas à elle seule une garantie pour les autres prestataires.",
      "8. Droits et assistance. L’Éditeur transmet au Client les demandes des joueurs qui lui sont adressées et l’assiste, compte tenu de la nature du traitement, pour l’accès, la rectification, la limitation, l’opposition, la portabilité et l’effacement applicables. Il fournit les informations et l’assistance nécessaires aux obligations des articles 32 à 36 du RGPD, notamment aux analyses d’impact et à la consultation de l’autorité lorsque celles-ci sont requises. Le contact est contact@okado.app ; une demande du joueur ne donne aucun accès à l’espace marchand.",
      "9. Violations. L’Éditeur notifie au Client toute violation des données sous-traitées sans délai indu après en avoir pris connaissance. Il communique les éléments disponibles sur la nature de la violation, les personnes et enregistrements concernés, les conséquences probables, le point de contact et les mesures prises ou proposées, puis complète ces informations au fur et à mesure. Le Client apprécie ses obligations de notification à l’autorité et aux personnes, avec l’assistance de l’Éditeur.",
      "10. Fin du service et conservation. Au choix documenté du Client, l’Éditeur restitue ou supprime les données sous-traitées à la fin de la prestation et détruit les copies existantes, sauf obligation légale de conservation. Une conservation résiduelle doit être justifiée, limitée et inaccessible aux usages courants. Les sauvegardes suivent leur cycle documenté ; elles ne sont pas réutilisées pour l’activité courante et les effacements sont réappliqués après une restauration. Les demandes sont traitées avec vérification du périmètre, des gains encore valables et des éventuelles obligations de preuve. Aucun délai générique de trois ou cinq ans ni aucune purge automatique n’est garanti par cette annexe pour l’ensemble des finalités.",
      "11. Informations et audits. L’Éditeur met à disposition du Client les informations nécessaires pour démontrer le respect de cette annexe et permet les audits, y compris les inspections, réalisés par le Client ou l’auditeur mandaté, et y contribue. Les modalités pratiques sont convenues selon le risque, dans le respect de la confidentialité, de la sécurité et des données des autres clients, sans supprimer les droits d’audit prévus par l’article 28 du RGPD.",
      "12. Obligations du Client et priorité. Le Client détermine les finalités, la base légale, les données nécessaires, les durées et les mentions adaptées à chaque jeu. Il distingue l’exécution du jeu de la prospection et documente les instructions correspondantes. Ces responsabilités ne dispensent pas l’Éditeur de ses propres obligations légales. En cas de contradiction portant sur la protection des données sous-traitées, la présente annexe prévaut sur les autres clauses contractuelles, sans écarter une disposition impérative applicable.",
    ],
  },
];

export default function TermsOfSalePage() {
  return (
    <LegalPage
      title="Conditions générales de vente et d’abonnement"
      subtitle="Conditions applicables à la souscription et à l’utilisation professionnelle de la plateforme SaaS Okado."
      sections={sections}
      updatedAt="15 octobre 2026"
    />
  );
}
