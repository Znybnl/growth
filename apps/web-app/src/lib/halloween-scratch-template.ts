export const HALLOWEEN_SCRATCH_TEMPLATE = {
  id: "scratch-halloween-gold", name: "Halloween doré",
  description: "Roses noires, bougies et dorures pour une surprise d’Halloween.",
  sampleHeadline: "GRATTEZ & GAGNEZ", sampleSubline: "Une surprise vous attend pour Halloween",
  background: "/images/templates/halloween-gold/background.webp", backgroundColor: "#050403",
  text: "#f2b45e", logo: "#ffffff", font: "bodoni", fontClass: "font-bodoni",
  scratch: { base: "#b98536", highlight: "#ffe2a0", edge: "#ffe8ae",
    texture: "/images/templates/halloween-gold/foil.webp", textureOpacity: 0.5 },
} as const;

export function halloweenScratchTemplate(id?: string | null) {
  return id === HALLOWEEN_SCRATCH_TEMPLATE.id ? HALLOWEEN_SCRATCH_TEMPLATE : undefined;
}

export function isHalloweenFixedPalette(id?: string | null) {
  return id === "halloween-gold" || Boolean(halloweenScratchTemplate(id));
}
