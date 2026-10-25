import { expect, test, type Page } from "@playwright/test";
import catalog from "../src/lib/beauty-catalog-466.fixture.json";
import { BEAUTY_SUBSECTOR_OPTIONS, GENERAL_BEAUTY_SUBSECTOR } from "../src/lib/merchant-options";
import { suggestionRequiresPurchase } from "../src/lib/prize-suggestion-fields";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({page,context,baseURL}) => {
  await rejectAnalyticsForVisualTests(context,baseURL!);
  await page.route(/https:\/\//,route => route.abort());
  await page.route("**/api/**",route => {
    if (route.request().method() !== "GET") return route.fulfill({status:403,json:{error:"Test sans écriture"}});
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/prize-suggestions") return route.fulfill({json:{items:[],assets:{}}});
    const sub = url.searchParams.get("subsector");
    return route.fulfill({json:{suggestions:catalog.filter(s => sub === GENERAL_BEAUTY_SUBSECTOR || s.industrySubsector === sub).map(s => ({...s,isActive:true}))}});
  });
});

async function openLibrary(page:Page,mode:string) {
  if (mode === "wizard") await selectWizardStep(page,3);
  await page.getByRole("button",{name:mode === "wizard" ? "Trouver des idées de lots" : "Suggérer des lots",exact:true}).click();
  return page.getByRole("dialog");
}

for (const mode of ["wizard","classic"]) for (const gameType of ["wheel","scratch"]) {
  test(`${mode}/${gameType} : union des six bibliothèques, copie fidèle et lot existant conservé`,async ({page}) => {
    await page.setViewportSize({width:1280,height:720});
    const writes:string[]=[];
    page.on("request",r => {if (r.method() !== "GET" && new URL(r.url()).pathname.startsWith("/api/")) writes.push(r.url());});
    await page.goto("/dev/beauty-catalog-proof");
    await page.getByLabel("Type de jeu de test").selectOption(gameType);
    await page.getByLabel("Interface",{exact:true}).selectOption(mode);
    const dialog = await openLibrary(page,mode);
    await expect(dialog.locator("article")).toHaveCount(catalog.length);
    for (const sub of BEAUTY_SUBSECTOR_OPTIONS) {
      const first=catalog.find(s => s.industrySubsector === sub)!;
      await expect(dialog.getByRole("heading",{name:first.label,exact:true}).first()).toBeAttached();
    }
    const added=catalog.find(s => s.industrySubsector === "Coiffure" && suggestionRequiresPurchase(s.description) && catalog.filter(c => c.label === s.label).length === 1)!;
    const card=dialog.locator("article").filter({has:page.getByRole("heading",{name:added.label,exact:true})});
    await card.getByRole("button",{name:mode === "wizard" ? `Ajouter : ${added.label}` : "Ajouter",exact:true}).click();
    if (mode === "wizard") {
      await dialog.getByRole("button",{name:"Terminer",exact:true}).click();
      const existing=page.getByTestId("wizard-prize-row").filter({has:page.getByRole("button",{name:"LOT EXISTANT À PRÉSERVER",exact:true})});
      await expect(existing.getByRole("spinbutton")).toHaveValue("10");
      await expect(existing).toContainText("Condition existante inchangée");
      await page.getByRole("button",{name:`Modifier ${added.label}`,exact:true}).click();
      const editor=page.getByRole("dialog",{name:"Modifier le lot",exact:true});
      await expect(editor.getByRole("textbox",{name:"Conditions d’utilisation",exact:true})).toHaveValue(added.description);
      await expect(editor.getByLabel(/Chance de gain/)).toHaveValue(String(added.probability));
      await expect(editor.getByLabel(/Coût unitaire estimé/)).toHaveValue(String(added.estimatedUnitCost));
      await expect(editor.getByRole("checkbox",{name:/Un achat est nécessaire/})).toBeChecked();
    } else {
      await dialog.getByRole("button",{name:"Fermer",exact:true}).click();
      await expect(page.locator('input[value="LOT EXISTANT À PRÉSERVER"]')).toHaveCount(1);
      await expect(page.locator(`input[value="${added.label}"]`)).toHaveCount(1);
      await page.getByRole("button",{name:"Conditions",exact:true}).last().click();
      await expect(page.getByLabel("Texte affiché au client")).toHaveValue(added.description);
      await expect(page.getByRole("checkbox",{name:/Achat requis pour le retrait/})).toBeChecked();
    }
    expect(writes).toEqual([]);
    await expect(page.getByLabel("Activité de test")).toHaveValue(GENERAL_BEAUTY_SUBSECTOR);
  });
}

for (const [width,height] of [[1280,600],[390,844]]) {
  test(`@visual-1280 union et changement de contexte à ${width}×${height}`,async ({page},info) => {
    await page.setViewportSize({width,height});
    await page.goto("/dev/beauty-catalog-proof");
    const dialog=await openLibrary(page,"wizard");
    await expect(dialog.locator("article")).toHaveCount(61);
    const bounds=await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.width+bounds!.x).toBeLessThanOrEqual(width+1);
    expect(bounds!.height+bounds!.y).toBeLessThanOrEqual(height+1);
    await expect(dialog.getByRole("button",{name:"Terminer",exact:true})).toBeInViewport();
    await page.screenshot({path:info.outputPath(`catalogue-generaliste-${width}x${height}.png`),animations:"disabled"});
    await dialog.getByRole("button",{name:"Terminer",exact:true}).click();
    await page.getByLabel("Activité de test").selectOption("Ongles");
    const narrowed=await openLibrary(page,"wizard");
    await expect(narrowed.locator("article")).toHaveCount(12);
    await expect(narrowed.getByRole("heading",{name:"BRUSHING OFFERT",exact:true})).toHaveCount(0);
  });
}
