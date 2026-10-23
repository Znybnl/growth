export const NO_GUARANTEED_PRIZE_MESSAGE = "Aucun lot disponible pour ce jeu 100 % gagnant.";

type WeightedPrize = { probability: number; remainingQuantity: number | null };

/** Server fallback only. Exact positive weights; never reads visual segments. */
export function selectGuaranteedPrize<T extends WeightedPrize>(prizes: T[], random = Math.random): T {
  const eligible = prizes.filter(prize => Number.isFinite(prize.probability) && prize.probability > 0
    && (prize.remainingQuantity === null || prize.remainingQuantity > 0));
  const total = eligible.reduce((sum, prize) => sum + prize.probability, 0);
  if (!(total > 0) || !Number.isFinite(total)) throw new Error(NO_GUARANTEED_PRIZE_MESSAGE);
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Tirage indisponible. Veuillez réessayer.");
  let cursor = 0;
  for (const prize of eligible) {
    cursor += prize.probability;
    if (roll < cursor / total) return prize;
  }
  throw new Error("Tirage indisponible. Veuillez réessayer.");
}
