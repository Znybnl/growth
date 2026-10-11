import { expect, test } from "@playwright/test";

for (const width of [320,390,1280]) {
  test(`Supervision fiable, filtres, navigation et états indisponibles à ${width}px`, async ({page},testInfo)=>{
    await page.setViewportSize({width,height:900});
    const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    await page.goto("/dev/support-monitoring");
    await expect(page.getByRole("table")).toHaveCount(4);
    await expect(page.getByText("2 affichés sur 58 résultats")).toBeVisible();
    await expect(page.getByText("Intervention requise",{exact:true})).toBeVisible();
    await expect(page.getByText("Synchronisation active")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const nav=page.getByRole("navigation",{name:"Pagination E-mails"});
    await nav.getByRole("link",{name:"Suivant"}).click();
    await expect(page).toHaveURL(/emailsPage=2/);
    await expect(page.getByText("Page 2 / 3",{exact:false})).toBeVisible();
    await page.getByLabel("Recherche support",{exact:true}).fill("ancien");
    await page.getByRole("combobox",{name:"Établissement",exact:true}).selectOption("demo");
    await page.getByLabel("Du (jour UTC)",{exact:true}).fill("2026-10-01");
    await page.getByLabel("Au (jour UTC inclus)",{exact:true}).fill("2026-10-11");
    await page.getByRole("button",{name:"Filtrer",exact:true}).click();
    const url=new URL(page.url());
    expect(url.searchParams.get("q")).toBe("ancien");
    expect(url.searchParams.get("merchant")).toBe("demo");
    expect(url.searchParams.has("emailsPage")).toBe(false); // filters reset all page numbers
    const next=page.getByRole("navigation",{name:"Pagination E-mails"}).getByRole("link",{name:"Suivant"});
    expect(await next.getAttribute("href")).toContain("merchant=demo");
    await page.getByRole("link",{name:"Effacer",exact:true}).click();
    await page.getByText("Voir l’erreur complète",{exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.getByText("Voir l’erreur complète",{exact:true}).click();
    if(width<980){
      const region=page.getByRole("region",{name:"Tableau E-mails",exact:true});
      await region.focus();await page.keyboard.press("ArrowRight");
      await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
      await region.evaluate(el=>{el.scrollLeft=0;});
    }
    await page.screenshot({path:testInfo.outputPath(`supervision-fiable-${width}.png`),fullPage:true});
    await page.goto("/dev/support-monitoring?unavailable=1");
    await expect(page.getByRole("alert").filter({hasText:"Données indisponibles"})).toContainText("Journal");
    await expect(page.getByRole("region",{name:"Tableau Journal",exact:true})).toContainText("Lecture indisponible");
    await expect(page.getByRole("table")).toHaveCount(4);
    await page.goto("/dev/support-monitoring?section=logs");
    await expect(page.getByRole("table")).toHaveCount(1);
    await page.goto("/dev/support-monitoring?handled=1");
    await expect(page.getByRole("button",{name:"Marquer comme traité"})).toHaveCount(0);
    await expect(page.getByText("Traité le",{exact:false})).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("Supervision : visiteur refusé sans révéler les données", async({request})=>{
  const response=await request.get("/support",{maxRedirects:0});
  expect([302,303,307,308]).toContain(response.status());
  expect(response.headers().location).toContain("connexion");
});
