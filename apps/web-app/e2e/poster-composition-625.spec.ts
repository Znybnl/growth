import {expect,test} from "@playwright/test";
import {readFile} from "node:fs/promises";
import QRCode from "qrcode";
import sharp from "sharp";
import {rejectAnalyticsForVisualTests,assertNoPageOverflow} from "./helpers/visual-1280";

const secondary="De belles surprises vous attendent lors de votre prochaine visite !";

test.beforeEach(async ({page,context,baseURL}) => {
  await rejectAnalyticsForVisualTests(context,baseURL!);
  await page.route(/https:\/\//,route => route.abort());
  await page.route("**/api/**",route => route.fulfill({json:{items:[],assets:{},ok:true}}));
});

// Validate every encoded module, including after A5 scaling, rather than only
// checking for a dark square. The QR must still encode the game's public URL.
async function assertBotanicalQr(png:Buffer,url:string,width=794) {
  const matrix=QRCode.create(url,{errorCorrectionLevel:"M"}).modules;
  const {data,info}=await sharp(png).resize({width}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const scale=width/794;
  let mismatches=0;
  for(let r=0;r<matrix.size;r++) for(let c=0;c<matrix.size;c++) {
    const x=Math.floor((479+219*(c+1.5)/(matrix.size+2))*scale);
    const y=Math.floor((520+219*(r+1.5)/(matrix.size+2))*scale);
    const pixel=(y*info.width+x)*info.channels;
    if((data[pixel]<128) !== Boolean(matrix.get(r,c))) mismatches++;
  }
  expect(mismatches,"Every QR module remains intact and encodes the correct public URL").toBe(0);
}

for (const label of ["Botanique","Élégance"]) for (const game of ["wheel","scratch"]) {
  test(`@visual-1280 ${label}/${game} : largeur, PNG identique et QR lisible A4/A5`,async ({page,baseURL},info) => {
    await page.setViewportSize({width:1280,height:600});
    const source=game === "scratch" ? "beauty-scratch-nude" : "classic";
    await page.goto(`/dev/template-rendering-proof?mode=poster-download&template=${source}&secondary=${encodeURIComponent(secondary)}`);
    const select=page.getByRole("button",{name:label === "Botanique" ? /^Botanique Fond botanique/ : /^Élégance/});
    await select.click();
    await expect(select).toHaveAttribute("aria-pressed","true");
    await page.getByRole("checkbox",{name:/Afficher le texte secondaire sur l’affiche|Afficher le texte secondaire sur l'affiche/}).check();
    const preview=page.getByAltText("Prévisualisation affiche");
    const downloadButton=page.getByRole("button",{name:"Télécharger le PNG",exact:true});
    await expect(downloadButton).toBeEnabled();
    await expect(preview).toBeVisible();
    const frame=page.getByTestId("poster-preview-frame");
    await frame.scrollIntoViewIfNeeded();
    await assertNoPageOverflow(page);
    await page.screenshot({path:info.outputPath(`${label}-${game}-1280x600.png`),animations:"disabled"});
    const bytes=Buffer.from(await preview.evaluate(async img => Array.from(new Uint8Array(await (await fetch((img as HTMLImageElement).src)).arrayBuffer()))));
    await sharp(bytes).toFile(info.outputPath(`${label}-${game}-artwork.png`));
    await expect(frame).toHaveAttribute("data-subtitle-max-width","360");
    expect((await sharp(bytes).metadata()).width).toBe(794);
    expect((await sharp(bytes).metadata()).height).toBe(1123);
    if(label === "Botanique") {
      await assertBotanicalQr(bytes,`${baseURL}/campaign/template-proof-campaign`);
      await assertBotanicalQr(bytes,`${baseURL}/campaign/template-proof-campaign`,562);
      const qr=page.getByTestId("botanical-thumbnail-qr");
      const geometry=await qr.evaluate(node => {
        const rect=node.querySelector("rect")!;
        const image=node.querySelector("image")!;
        const value=(el:Element,key:string)=>Number(el.getAttribute(key));
        return {dx:value(image,"x")+value(image,"width")/2-value(rect,"x")-value(rect,"width")/2,
          dy:value(image,"y")+value(image,"height")/2-value(rect,"y")-value(rect,"height")/2};
      });
      expect(geometry).toEqual({dx:0,dy:0});
    }
    const downloading=page.waitForEvent("download");
    await downloadButton.click();
    await page.getByRole("dialog",{name:"Enregistrer avant le téléchargement ?"}).getByRole("button",{name:"Enregistrer et télécharger"}).click();
    const download=await downloading;
    const path=info.outputPath(`${label}-${game}-affiche-a4-a5.png`);
    await download.saveAs(path);
    expect(await readFile(path)).toEqual(bytes);
    await page.getByRole("dialog").getByRole("button",{name:/Fermer/}).first().click();
    await page.setViewportSize({width:1280,height:720});
    await frame.scrollIntoViewIfNeeded();
    await assertNoPageOverflow(page);
    await page.screenshot({path:info.outputPath(`${label}-${game}-1280x720.png`),animations:"disabled"});
    await page.setViewportSize({width:390,height:844});
    await frame.scrollIntoViewIfNeeded();
    await assertNoPageOverflow(page);
    await page.screenshot({path:info.outputPath(`${label}-${game}-390.png`),animations:"disabled"});
  });
}
