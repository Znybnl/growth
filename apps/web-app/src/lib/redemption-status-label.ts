export function redeemedStatusLabel(redeemedAt?: string) {
  if (!redeemedAt) return "Lot déjà retiré";

  const timestamp = new Date(redeemedAt);
  if (Number.isNaN(timestamp.getTime())) return "Lot déjà retiré";

  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(timestamp);
  const time = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(timestamp);
  return `Lot déjà retiré le ${date} à ${time}`;
}
