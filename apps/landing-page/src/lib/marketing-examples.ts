// These images are captures of the real Okado preview renderer with synthetic data.
// Template IDs/names match the product; examples are not customer campaigns.
export const gameModels = [
  { id: "beauty-scratch-nude", name: "Nude Élégance", type: "Ticket à gratter", image: "game-nude-elegance" },
  { id: "beauty-scratch-botanical", name: "Botanique Premium", type: "Ticket à gratter", image: "game-botanique" },
  { id: "beauty-scratch-noir-or", name: "Noir & Or Signature", type: "Ticket à gratter", image: "game-noir-or-ticket" },
  { id: "beauty-scratch-lilas", name: "Lilas Soin Doux", type: "Ticket à gratter", image: "game-lilas" },
  { id: "beauty-pop", name: "Beauty Pop", type: "Roue de la fortune", image: "game-beauty-pop" },
  { id: "beauty-editorial", name: "Noir & Or", type: "Roue de la fortune", image: "game-noir-or-wheel" },
] as const;

export type GameModel = { id: string; name: string; type: string; image: string };
export const heroModel: GameModel = { id: "beauty-nude", name: "Nude & Or", type: "Roue de la fortune", image: "game-nude-wheel" };
export const restaurantModel: GameModel = { id: "classic", name: "Classique", type: "Roue de la fortune", image: "game-restaurant" };
export const commerceModel: GameModel = { id: "scratch-confetti", name: "Confetti", type: "Ticket à gratter", image: "game-commerce" };

export const beautySpecialties = [
  { id: "nails", label: "Ongles", model: gameModels[3], title: "Une petite attention en plus de la pose.",
    rewards: ["French offerte", "Nail art sur 2 ongles offert", "Pose semi-permanente offerte"], condition: "Exemple : French offerte avec une pose payante." },
  { id: "eyes", label: "Regard · cils & sourcils", model: gameModels[2], title: "Des cadeaux pour souligner votre savoir-faire.",
    rewards: ["Teinture offerte", "Soin kératine", "Brow Lift offert"], condition: "Exemple : teinture offerte avec un Brow Lift ou Lash Lift payant." },
  { id: "care", label: "Soins visage & corps", model: gameModels[0], title: "Prolongez le plaisir d’un soin.",
    rewards: ["Masque offert", "Gommage offert", "Soin découverte de 30 minutes"], condition: "Exemple : masque offert avec un soin visage payant." },
  { id: "spa", label: "Massage & Spa", model: gameModels[1], title: "Une raison de reprendre une parenthèse.",
    rewards: ["10 minutes de massage offertes", "Produit découverte offert", "Remise sur un prochain massage"], condition: "Exemple : produit sélectionné par l’établissement, dans la limite des stocks disponibles." },
  { id: "hair", label: "Coiffure", model: gameModels[4], title: "Un rendez-vous qui réserve une surprise.",
    rewards: ["Soin offert", "Brushing offert", "Remise sur une prochaine couleur"], condition: "Exemple : soin offert avec une prestation coiffure payante." },
  { id: "general", label: "Institut généraliste", model: heroModel, title: "Des attentions à l’image de votre institut.",
    rewards: ["Complément de prestation offert", "Produit sélectionné par l’institut", "Remise sur une prochaine prestation"], condition: "Exemple : complément offert avec une prestation payante, selon vos conditions." },
] as const;
