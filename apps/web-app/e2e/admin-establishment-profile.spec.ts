import { expect, test } from "@playwright/test";
import { join } from "node:path";

const locations = [
  {
    id:"test-centre",companyName:"Institut de test · Centre",logoText:"Institut de test",
    industry:"Beauté",industrySubsector:"Beauté généraliste",city:"Ville de test",
    address:"12 rue de la Démonstration",contactName:"Contact de test",phone:"0102030405",
    restaurantEmail:"contact@example.test",timeZone:"Europe/Paris",
    googleReviewUrl:"https://example.test/avis",instagramUrl:"https://example.test/instagram",
    facebookUrl:"https://example.test/facebook",tiktokUrl:"https://example.test/tiktok",
    tripadvisorUrl:"https://example.test/tripadvisor",websiteUrl:"https://example.test/site",
    appointmentUrl:"https://example.test/rendez-vous",customLinkUrl:"https://example.test/"+"very-long-link-".repeat(18),
    googlePlaceName:"Institut de test",googlePlaceAddress:"12 rue de la Démonstration",
    googlePlaceRating:4.8,googlePlaceReviewCount:0,defaultPrizeCost:0,
    preferredGoals:["Collecter des contacts","Faire revenir les clients"],
    diffusionSupport:["QR code vitrine et comptoir"],onboardingCompleted:true,
    redemptionPinConfigured:true,createdAt:"2026-10-01T12:00:00Z",
    gainNotification:{frequency:"weekly",updatedAt:"2026-10-06T10:00:00Z"},
  },
  {id:"test-second",companyName:"Site secondaire de test",logoText:"Site secondaire",createdAt:"2026-10-01T12:00:00Z",customLinkUrl:"javascript:alert(1)",gainNotification:{frequency:"disabled",updatedAt:null}},
];

for (const width of [320,390,1280]) {
  test(`fiche complète, multi-sites et fermeture accessible à ${width}px`,async ({page},testInfo) => {
    await page.setViewportSize({width,height:width===1280 ? 720 : 640});
    const errors:string[] = [];
    page.on("pageerror",error=>errors.push(error.message));
    let requests = 0;
    await page.route("**/api/admin/merchants/profile-fixture/profile?userId=profile-user",route=>{
      requests++;
      return route.fulfill({json:{locations}});
    });
    await page.goto("/dev/admin-location-profile-proof");
    const trigger=page.getByRole("button",{name:"Voir la fiche",exact:true});
    await expect(trigger).toBeVisible();
    expect(requests).toBe(0);
    await trigger.click();
    const dialog=page.getByRole("dialog",{name:"Fiche établissement"});
    await expect(dialog.getByText("contact@example.test", {exact:true})).toBeVisible();
    // React Strict Mode replays effects in development and aborts the first
    // request. Production performs one read; site selection must do none.
    const openedRequests=requests;
    expect(openedRequests).toBeGreaterThanOrEqual(1);
    await expect(dialog.getByRole("link")).toHaveCount(8);
    for (const link of await dialog.getByRole("link").all()) {
      await expect(link).toHaveAttribute("target","_blank");
      await expect(link).toHaveAttribute("rel","noopener noreferrer");
    }
    await expect(dialog.getByText("Configuré (masqué)")).toBeAttached();
    await expect(dialog.getByText("0 €")).toBeAttached();
    const box=await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
    expect(box!.y+box!.height).toBeLessThanOrEqual(width===1280 ? 721 : 641);
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await expect(dialog.getByRole("button",{name:"Fermer",exact:true})).toBeInViewport();
    await page.screenshot({path:testInfo.outputPath(`profile-${width}.png`)});
    const notification=dialog.locator("section").filter({has:page.getByRole("heading",{name:"Notifications de gains"})});
    await notification.scrollIntoViewIfNeeded();
    await expect(notification.getByText("Synthèse hebdomadaire",{exact:true})).toBeVisible();
    await expect(notification.getByText("Réglage personnel du compte consulté pour cet établissement.")).toBeVisible();
    await expect(notification.locator("button, input, select")).toHaveCount(0);
    await expect(dialog.getByRole("button",{name:"Fermer",exact:true})).toBeInViewport();
    await page.screenshot({path:testInfo.outputPath(`profile-notifications-${width}.png`)});
    await dialog.getByLabel("Établissement du compte").selectOption("test-second");
    await expect(dialog.locator("dd").filter({hasText:/^Site secondaire de test$/})).toBeVisible();
    await expect(dialog.getByText("Non renseigné").first()).toBeVisible();
    await expect(dialog.getByRole("link")).toHaveCount(0);
    await expect(dialog.getByText("(lien non ouvrable)",{exact:false})).toBeAttached();
    await notification.scrollIntoViewIfNeeded();
    await expect(notification.getByText("Désactivées (par défaut)",{exact:true})).toBeVisible();
    expect(requests).toBe(openedRequests);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(page.getByRole("dialog").getByText("contact@example.test",{exact:true})).toBeVisible();
    expect(requests).toBeGreaterThan(openedRequests);
    await page.getByRole("button",{name:"Fermer la fiche établissement",exact:true}).click();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test("chargement, erreur, reprise et confinement du focus",async ({page})=>{
  let canSucceed=false;
  let releaseFirst!:()=>void;
  const firstResponse = new Promise<void>(resolve=>{releaseFirst=resolve;});
  await page.route("**/api/admin/merchants/profile-fixture/profile?userId=profile-user",async route=>{
    if(!canSucceed) {
      await firstResponse;
      return route.fulfill({status:503,json:{error:"La fiche n’a pas pu être chargée. Réessayez."}});
    }
    return route.fulfill({json:{locations}});
  });
  await page.goto("/dev/admin-location-profile-proof");
  await page.getByRole("button",{name:"Voir la fiche"}).click();
  const dialog=page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toContainText("Chargement de la fiche");
  releaseFirst();
  await expect(dialog.getByRole("alert")).toContainText("Réessayez");
  canSucceed=true;
  await dialog.getByRole("button",{name:"Réessayer"}).click();
  await expect(dialog.getByText("contact@example.test",{exact:true})).toBeVisible();
  const close=dialog.getByRole("button",{name:"Fermer",exact:true});
  await close.focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button",{name:"Fermer la fiche établissement"})).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toHaveCount(0);
});

test("le vrai endpoint refuse un visiteur sans exposer de profil",async ({request})=>{
  const response=await request.get("/api/admin/merchants/profile-fixture/profile");
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({error:"Authentification requise."});
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});

test("mono-site : logo visible puis repli propre si l'image est indisponible",async ({page})=>{
  await page.setViewportSize({width:1280,height:480});
  let broken=false;
  await page.route("https://example.test/logo.svg",route=>broken
    ? route.fulfill({status:404})
    : route.fulfill({path:join(process.cwd(),"src/app/icon.svg"),contentType:"image/svg+xml"}));
  await page.route("https://example.test/missing-logo.svg",route=>route.fulfill({status:404}));
  await page.route("**/api/admin/merchants/profile-fixture/profile?userId=profile-user",route=>route.fulfill({
    json:{locations:[{...locations[0],logoUrl:broken ? "https://example.test/missing-logo.svg" : "https://example.test/logo.svg"}]},
  }));
  await page.goto("/dev/admin-location-profile-proof");
  const trigger=page.getByRole("button",{name:"Voir la fiche"});
  await trigger.click();
  const dialog=page.getByRole("dialog");
  const logo=dialog.getByRole("img",{name:"Logo de Institut de test · Centre"});
  await expect(logo).toBeVisible();
  await expect.poll(()=>logo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
  await expect(dialog.getByLabel("Établissement du compte")).toHaveCount(0);
  await expect(dialog.getByRole("button",{name:"Fermer",exact:true})).toBeInViewport();
  await page.keyboard.press("Escape");
  broken=true;
  await trigger.click();
  await expect(dialog.getByText("contact@example.test",{exact:true})).toBeVisible();
  await expect(logo).toHaveCount(0);
  await dialog.getByRole("button",{name:"Fermer",exact:true}).click();
  await expect(trigger).toBeFocused();
});
