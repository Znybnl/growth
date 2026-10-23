import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { builtInBackgroundAssets } from "../src/lib/background-library";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({json:{campaign:{actions:[]},suggestions:[],items:[],assets:{},emailCount:0}}));
});

test("fond et miniature réels, légers, référencés et inclus dans le déploiement",async({request})=>{
  const asset=builtInBackgroundAssets.find(item=>item.id==="builtin-wheel-beauty-pop-ribbons")!;
  expect(asset.width).toBe(941);expect(asset.height).toBe(1672);
  for(const [path,limit] of [[asset.imageUrl,120000],[asset.thumbnailUrl,15000]] as const){
    const response=await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/webp");
    expect((await response.body()).length).toBeLessThan(limit);
  }
  const packaging=readFileSync(resolve(__dirname,"../../../.vercelignore"),"utf8");
  expect(packaging).toContain("!apps/web-app/public/images/wheel-templates/beauty-pop-ribbons*.webp");
});

for(const mode of ["public","preview"]) for(const width of [320,390]) {
  test(`Beauty Pop ${mode} ${width}px : référence, images et textes lisibles`,async({page},info)=>{
    const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(/hydrated|hydration|beauty-pop-ribbons.*invalid.*position/i.test(message.text()))errors.push(message.text());});
    await page.setViewportSize({width,height:740});
    await page.goto(`/dev/beauty-wheel-backgrounds?template=beauty-pop&mode=${mode}`);
    const surface=page.locator('[data-template-id="beauty-pop"]');
    await expect(surface.locator('img[data-template-art="beauty-pop"]')).toHaveJSProperty("complete",true);
    expect(await surface.locator('img[data-template-art="beauty-pop"]').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
    await expect(surface.locator(".okado-beauty-heading")).toHaveText("Jouez & gagnez");
    await expect(surface.locator(".okado-beauty-heading")).toHaveCSS("color","rgb(230, 0, 98)");
    await expect(surface.getByTestId("beauty-pop-stationary-rim").locator(".okado-beauty-pop-bulb")).toHaveCount(24);
    const button=surface.getByRole("button",{name:"Jouer à la roue"});
    await expect(button).toBeInViewport();await expect(button.locator("svg")).toHaveCount(0);
    const heading=(await surface.locator(".okado-beauty-heading").boundingBox())!;
    const wheel=(await surface.getByTestId("game-wheel-frame").boundingBox())!;
    expect(wheel.y).toBeGreaterThan(heading.y+heading.height);
    const secondary=(await surface.locator(".okado-wheel-subtitle").boundingBox())!;
    const pointer=(await surface.getByTestId("beauty-wheel-pointer").boundingBox())!;
    expect(pointer.y).toBeGreaterThanOrEqual(secondary.y+secondary.height);
    await assertNoPageOverflow(page);await page.evaluate(()=>document.fonts.ready);
    await surface.screenshot({path:info.outputPath(`beauty-pop-${mode}-${width}.png`)});
    expect(errors).toEqual([]);
  });
}

test("contour fixe pendant la rotation et un seul résultat",async({page})=>{
  await page.goto("/dev/beauty-wheel-backgrounds?template=beauty-pop&mode=interaction");
  const trim=page.getByTestId("beauty-pop-stationary-rim"),rotor=page.getByTestId("beauty-pop-rotor");
  const button=page.getByRole("button",{name:"Jouer à la roue"});
  await button.click();await expect(page.getByTestId("action-count")).toHaveText("1");
  await button.click();await expect(rotor).not.toHaveCSS("transform","none");
  expect(await trim.evaluate(node=>node.closest('[data-testid="beauty-pop-rotor"]'))).toBeNull();
  await expect(trim).toHaveCSS("transform","none");
  await expect(button).toBeDisabled();
  await expect(page.getByTestId("result-count")).toHaveText("1",{timeout:7000});
  await expect(page.getByTestId("action-count")).toHaveText("1");
});

test("titre, logo et fond restent personnalisables sans propager le fond natif",async({page})=>{
  await page.goto("/dev/beauty-wheel-backgrounds?template=beauty-pop");
  await page.getByLabel("Titre de test").fill("Une surprise pour vous");
  await page.getByLabel("Nom de test").fill("Maison Camille");
  await expect(page.locator(".okado-beauty-heading")).toHaveText("Une surprise pour vous");
  await expect(page.locator('[data-template-id="beauty-pop"]')).toContainText("Maison Camille");
  await page.getByLabel("Fond de test").selectOption("image");
  await expect(page.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Template de test").selectOption("beauty-nude");
  await expect(page.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Fond de test").selectOption("native");
  await expect(page.locator('img[data-template-art="beauty-nude"]')).toHaveCount(1);
});

test("@visual-1280 Beauty Pop dans le vrai wizard, 1280×720 et 1280×600",async({page},info)=>{
  const warnings:string[]=[];
  page.on("console",message=>{if(/hydrated|hydration|beauty-pop-ribbons.*invalid.*position/i.test(message.text()))warnings.push(message.text());});
  for(const height of [720,600]){
    await page.setViewportSize({width:1280,height});
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic&business=beauty");
    await selectWizardStep(page,2);
    const card=page.getByRole("button",{name:/Beauty Pop/});
    await card.scrollIntoViewIfNeeded();await card.click();
    await expect(page.locator('img[data-template-art="beauty-pop"]').first()).toHaveJSProperty("complete",true);
    await captureVisualAt1280(page,info,"beauty-pop-apparence",height);
    await expect(page.getByTestId("wizard-footer").getByRole("button",{name:/Enregistrer/})).toBeEnabled();
    await page.getByRole("button",{name:"Voir l’aperçu",exact:true}).click();
    const dialog=page.getByRole("dialog",{name:"Aperçu du jeu"});
    const phone=dialog.frameLocator("iframe");
    await expect(phone.getByRole("button",{name:"Jouer à la roue"})).toBeInViewport();
    await expect(phone.locator('img[data-template-art="beauty-pop"]')).toHaveJSProperty("complete",true);
    await captureVisualAt1280(page,info,"beauty-pop-apercu",height);
    await page.keyboard.press("Escape");
  }
  expect(warnings).toEqual([]);
});
