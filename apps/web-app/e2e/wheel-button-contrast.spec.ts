import { expect, test } from "@playwright/test";
import { beautyWheelButtonTextColor, beautyWheelTheme } from "../src/lib/beauty-wheel-themes";
import { wheelButtonBackgroundForWhiteText, whiteWheelButtonContrast } from "../src/lib/wheel-button-contrast";

test("Nude & Or, Beauty Pop et Botanical assombrissent le centre sous un texte blanc", () => {
  for (const template of ["beauty-nude", "beauty-pop", "beauty-botanical"] as const) {
    const theme = beautyWheelTheme(template)!;
    const text = beautyWheelButtonTextColor(template, theme.primary, theme.text);
    const renderedBackground = wheelButtonBackgroundForWhiteText(theme.primary, text);
    expect(text).toBe("#ffffff");
    expect(whiteWheelButtonContrast(renderedBackground), template).toBeGreaterThanOrEqual(4.5);
    expect(theme.primary).toBe(beautyWheelTheme(template)?.primary);
  }
});

test("les couleurs personnalisées lisibles restent inchangées", () => {
  expect(wheelButtonBackgroundForWhiteText("#0b4ea2", "#ffffff")).toBe("#0b4ea2");
  expect(wheelButtonBackgroundForWhiteText("#b99052", "#171614")).toBe("#b99052");
  expect(wheelButtonBackgroundForWhiteText("#fff", "#000000")).toBe("#fff");
});

test("une couleur claire personnalisée et le fond désactivé gardent un texte blanc lisible", () => {
  for (const background of ["#ffffff", "#f8f3ea", "#ff4f87", "#8da480", "#94a3b8", "#64748b"]) {
    const rendered = wheelButtonBackgroundForWhiteText(background, "#ffffff");
    expect(whiteWheelButtonContrast(rendered), background).toBeGreaterThanOrEqual(4.5);
  }
});
