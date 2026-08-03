export type PrizeValidationInput = {
  label: string;
  totalQuantity: number | null;
  probability: number;
};

/** Issues shown while a merchant edits a prize table. */
export function getPrizeValidationMessages(
  prizes: ReadonlyArray<PrizeValidationInput>,
  isWinningEveryTime: boolean,
) {
  const messages: string[] = [];

  if (!prizes.length) {
    return ["Ajoutez au moins un lot dans la section Dotation."];
  }

  let totalProbability = 0;
  let hasUnlimitedPrize = false;

  prizes.forEach((prize, index) => {
    const position = index + 1;
    const name = prize.label.trim() || `lot ${position}`;

    if (!prize.label.trim()) {
      messages.push(`Le nom du lot ${position} est requis.`);
    }

    if (prize.totalQuantity === null) {
      hasUnlimitedPrize = true;
    } else if (!Number.isFinite(prize.totalQuantity) || prize.totalQuantity <= 0) {
      messages.push(
        `Le stock du lot \u00ab ${name} \u00bb doit \u00eatre sup\u00e9rieur \u00e0 0 ou laiss\u00e9 vide pour un stock illimit\u00e9.`,
      );
    }

    const probability = Number(prize.probability);
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      messages.push(
        `La probabilit\u00e9 du lot \u00ab ${name} \u00bb doit \u00eatre comprise entre 0 et 100 %.`,
      );
    } else {
      totalProbability += probability;
    }
  });

  if (totalProbability > 100.0001) {
    messages.push("Le total des probabilit\u00e9s ne peut pas d\u00e9passer 100 %.");
  }

  if (isWinningEveryTime && Math.abs(totalProbability - 100) > 0.0001) {
    messages.push(
      "Jeu 100 % gagnant : le total des probabilit\u00e9s doit \u00eatre \u00e9gal \u00e0 100 %.",
    );
  }

  if (isWinningEveryTime && !hasUnlimitedPrize) {
    messages.push(
      "Jeu 100 % gagnant : au moins un lot doit avoir un stock illimit\u00e9.",
    );
  }

  return Array.from(new Set(messages));
}
