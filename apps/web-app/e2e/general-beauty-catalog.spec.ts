import { expect, test, type Page } from "@playwright/test";
import catalog from "../src/lib/beauty-catalog-466.fixture.json";
import { BEAUTY_SUBSECTOR_OPTIONS, GENERAL_BEAUTY_SUBSECTOR } from "../src/lib/merchant-options";
import { suggestionRequiresPurchase } from "../src/lib/prize-suggestion-fields";
import { rejectAnalyticsForVisualTests, captureVisualAt1280, assertNoPageOverflow } from "./helpers/visual-1280";
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
  if (mode === "wizard") {
    await expect.poll(() => page.locator(".okado-wizard").evaluate(el => getComputedStyle(el).getPropertyValue("--wizard-toolbar-height").trim())).not.toBe("");
    await selectWizardStep(page,3);
  }
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
    const filter=dialog.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true});
    await expect(filter).toHaveValue("");
    for (const sub of BEAUTY_SUBSECTOR_OPTIONS) {
      const first=catalog.find(s => s.industrySubsector === sub)!;
      await expect(dialog.getByRole("heading",{name:first.label,exact:true}).first()).toBeAttached();
    }
    const added=catalog.find(s => s.industrySubsector === "Coiffure" && suggestionRequiresPurchase(s.description) && catalog.filter(c => c.label === s.label).length === 1)!;
    await filter.selectOption("Coiffure");
    await expect(dialog.locator("article")).toHaveCount(catalog.filter(s=>s.industrySubsector === "Coiffure").length);
    const card=dialog.locator("article").filter({has:page.getByRole("heading",{name:added.label,exact:true})});
    await card.getByRole("button",{name:mode === "wizard" ? `Ajouter : ${added.label}` : "Ajouter",exact:true}).click();
    await filter.selectOption("");
    await expect(dialog.locator("article")).toHaveCount(catalog.length);
    if(mode === "wizard") await expect(dialog.getByRole("button",{name:`Ajouté : ${added.label}`,exact:true})).toBeDisabled();
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
    await expect(dialog.locator("article")).toHaveCount(catalog.length);
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
    await expect(narrowed.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true})).toHaveCount(0);
    await expect(narrowed.getByRole("heading",{name:"BRUSHING OFFERT",exact:true})).toHaveCount(0);
  });
}

for(const mode of ["wizard","classic"]) {
  test(`${mode} : filtrer chaque sous-secteur, non classés, aucun appel ni changement de profil`,async ({page}) => {
    let reads=0;
    const unclassified={...catalog[0],id:"custom-unclassified",label:"Idée personnalisée sans sous-secteur",industrySubsector:undefined,isActive:true};
    const items=[...catalog.map(s=>({...s,isActive:true})),unclassified];
    await page.route("**/api/prize-suggestions?*",route=>{
      reads++;
      const sub=new URL(route.request().url()).searchParams.get("subsector");
      return route.fulfill({json:{suggestions:sub === GENERAL_BEAUTY_SUBSECTOR ? items : items.filter(s=>s.industrySubsector === sub)}});
    });
    await page.goto("/dev/beauty-catalog-proof");
    await page.getByLabel("Interface",{exact:true}).selectOption(mode);
    const dialog=await openLibrary(page,mode);
    const filter=dialog.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true});
    await expect(dialog.locator("article")).toHaveCount(items.length);
    const initialReads=reads;
    for(const sub of BEAUTY_SUBSECTOR_OPTIONS) {
      await filter.selectOption(sub);
      const expected=items.filter(s=>s.industrySubsector === sub);
      await expect(dialog.locator("article")).toHaveCount(expected.length);
      await expect(dialog.locator("article").getByRole("heading")).toHaveText(expected.map(s=>s.label));
    }
    await filter.selectOption("__unclassified__");
    await expect(dialog.locator("article")).toHaveCount(1);
    await expect(dialog.getByRole("heading",{name:unclassified.label,exact:true})).toBeVisible();
    await filter.selectOption("");
    await expect(dialog.locator("article")).toHaveCount(items.length);
    expect(reads).toBe(initialReads);
    await dialog.getByRole("button",{name:mode === "wizard" ? "Terminer" : "Fermer",exact:true}).click();
    await expect(page.getByLabel("Activité de test")).toHaveValue(GENERAL_BEAUTY_SUBSECTOR);
    const reopened=await openLibrary(page,mode);
    await expect(reopened.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true})).toHaveValue("");
    await reopened.getByRole("button",{name:mode === "wizard" ? "Terminer" : "Fermer",exact:true}).click();
    await page.getByLabel("Activité de test").selectOption("Ongles");
    const specialized=await openLibrary(page,mode);
    await expect(specialized.locator("article")).toHaveCount(catalog.filter(s=>s.industrySubsector === "Ongles").length);
    await expect(specialized.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true})).toHaveCount(0);
  });

  test(`@visual-1280 ${mode} : filtre, état vide et rétablissement à1280 et mobile`,async ({page},info) => {
    const items=catalog.filter(s=>s.industrySubsector !== "Ongles").map(s=>({...s,isActive:true}));
    await page.route("**/api/prize-suggestions?*",route=>route.fulfill({json:{suggestions:items}}));
    await page.goto("/dev/beauty-catalog-proof");
    await page.getByLabel("Interface",{exact:true}).selectOption(mode);
    const dialog=await openLibrary(page,mode);
    const filter=dialog.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true});
    for(const [width,height] of [[1280,720],[1280,600],[390,844],[320,844]]) {
      await page.setViewportSize({width,height});
      await filter.focus();
      await filter.selectOption("Coiffure");
      await expect(filter).toBeFocused();
      await expect(filter).toBeInViewport();
      await expect(dialog.getByRole("button",{name:mode === "wizard" ? "Terminer" : "Fermer",exact:true})).toBeInViewport();
      const box=await dialog.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y+box!.height).toBeLessThanOrEqual(height+1);
      await assertNoPageOverflow(page);
      if(width === 1280) await captureVisualAt1280(page,info,`filtre-${mode}`,height);
      else await page.screenshot({path:info.outputPath(`filtre-${mode}-${width}.png`)});
      await filter.selectOption("Ongles");
      await expect(dialog.locator("article")).toHaveCount(0);
      await expect(dialog.getByText(/Aucune suggestion pour ce sous-secteur/)).toBeVisible();
      await expect(filter).toBeVisible();
      if(width === 1280) await captureVisualAt1280(page,info,`vide-${mode}`,height);
      await filter.selectOption("");
      await expect(dialog.locator("article")).toHaveCount(items.length);
    }
  });
}

test("wizard : filtrer les suggestions ne modifie pas les compositions ni Mes lots",async ({page}) => {
  await page.goto("/dev/beauty-catalog-proof");
  const dialog=await openLibrary(page,"wizard");
  await expect(dialog.locator("article")).toHaveCount(catalog.length);
  await dialog.getByRole("tab",{name:"Compositions",exact:true}).click();
  const compositions=await dialog.locator("article").allTextContents();
  expect(compositions.length).toBeGreaterThan(0);
  await dialog.getByRole("tab",{name:"Suggestions",exact:true}).click();
  const filter=dialog.getByRole("combobox",{name:"Sous-secteur des suggestions",exact:true});
  await filter.selectOption("Coiffure");
  await dialog.getByRole("tab",{name:"Compositions",exact:true}).click();
  await expect(filter).toHaveCount(0);
  await expect(dialog.locator("article")).toHaveText(compositions);
  await dialog.getByRole("tab",{name:"Mes lots",exact:true}).click();
  await expect(filter).toHaveCount(0);
  await dialog.getByRole("tab",{name:"Suggestions",exact:true}).click();
  await expect(filter).toHaveValue("Coiffure");
});
