import assert from "node:assert/strict";
import test from "node:test";
import {createPosterSettingsDefaults} from "./poster-utils.ts";
import {getBotanicalPosterQrLayout,getPosterTemplate} from "./poster-templates.ts";
import {buildPosterSvg,getPosterSubtitleLayout} from "./poster-render.ts";

function fixture(id,gameType="wheel",logoMode="text",text="De belles surprises vous attendent lors de votre prochaine visite !") {
  const template=getPosterTemplate(id);
  const poster=createPosterSettingsDefaults({templateId:id,logoMode,logoText:"Maison de test",logoUrl:logoMode==="image" ? "data:image/svg+xml;base64,PHN2Zy8+" : undefined,
    headline:"Scannez, jouez, récupérez votre cadeau !",headlineFontFamily:"cormorant",headlineFontSizePx:58,posterSubtitleEnabled:true,wheel:template.wheel});
  const campaign={id:"fixture-game",merchantId:"fixture",createdAt:"2026-10-25",title:"Jeu fictif",gameType,isActive:false,logoText:"Maison de test",subtitle:poster.headline,
    presentation:{heading:{fontFamily:"roboto"},layout:{wheelSubtitle:text},poster}};
  return {campaign,poster,template};
}

test("Botanique réduit à360 et Élégance élargit à360 sans modifier police, corps, couleurs ou saisie",() => {
  for(const id of ["botanical-wheel","premium-wheel"]) for(const game of ["wheel","scratch"]) for(const logo of ["text","image","none"]) {
    const f=fixture(id,game,logo);
    const before=structuredClone(f);
    const layout=getPosterSubtitleLayout(f.campaign,f.poster,f.template);
    assert.equal(layout.maxWidth,360);
    assert.equal(layout.fontSize,24);
    assert.match(layout.family,/Inter/);
    assert.equal(layout.lines.join(" "),f.campaign.presentation.layout.wheelSubtitle);
    const svg=buildPosterSvg({...f,prizes:[],qrDataUrl:"data:image/png;base64,qr-fixture"});
    assert.match(svg,/data-poster-subtitle="true"/);
    assert.doesNotMatch(svg.match(/<g data-poster-subtitle="true">([\s\S]*?)<\/g>/)?.[0] ?? "",/textLength|lengthAdjust/);
    assert.deepEqual(f,before);
    assert.equal(getPosterSubtitleLayout(f.campaign,{...f.poster,posterSubtitleEnabled:false},f.template),null);
  }
});

test("Botanique : phrase longue et retours explicites conservés malgré la colonne plus étroite",() => {
  for(const text of ["Une surprise !","Une ligne\nUne deuxième ligne\nUne troisième ligne", "De belles surprises vous attendent lors de votre prochaine visite dans notre établissement. Profitez de votre cadeau et découvrez nos prestations à partager avec vos proches dans une ambiance chaleureuse et accueillante."]) {
    const f=fixture("botanical-wheel","wheel","text",text);
    const layout=getPosterSubtitleLayout(f.campaign,f.poster,f.template);
    assert.equal(layout.lines.join(" "),text.replace(/\s+/g," "));
    assert.ok(layout.x+layout.maxWidth < getBotanicalPosterQrLayout(f.template).frame.x);
    assert.ok(layout.top+layout.fontSize+(layout.lines.length-1)*layout.lineHeight < 944);
  }
});

test("Botanique : QR carré, marges égales de31, bandeau dégagé et SVG de la même géométrie",() => {
  const f=fixture("botanical-wheel");
  const {frame,image,label}=getBotanicalPosterQrLayout(f.template);
  assert.deepEqual(frame,{x:448,y:489,size:281});
  assert.deepEqual(image,{x:479,y:520,size:219});
  assert.equal(image.x-frame.x,frame.x+frame.size-image.x-image.size);
  assert.equal(image.y-frame.y,frame.y+frame.size-image.y-image.size);
  assert.ok(label.y>=frame.y+frame.size+18);
  const svg=buildPosterSvg({...f,prizes:[],qrDataUrl:"QR-FIXTURE"});
  assert.match(svg,/<image href="QR-FIXTURE" x="479" y="520" width="219" height="219"\/>/);
  for(const qrSize of [180,245,320]) {
    const next=getBotanicalPosterQrLayout({...f.template,qrSize});
    assert.equal(next.image.x+next.image.size/2,next.frame.x+next.frame.size/2);
    assert.equal(next.image.y+next.image.size/2,next.frame.y+next.frame.size/2);
  }
});

test("Botanique éditorial conserve sa largeur et son QR distincts ; texte vide reste masqué",() => {
  const f=fixture("botanical-editorial-poster");
  assert.equal(getPosterSubtitleLayout(f.campaign,f.poster,f.template).maxWidth,650);
  const svg=buildPosterSvg({...f,prizes:[],qrDataUrl:"EDITORIAL-QR"});
  assert.match(svg,/<image href="EDITORIAL-QR" x="0" y="0" width="286" height="286"\/>/);
  f.campaign.presentation.layout.wheelSubtitle="";
  assert.equal(getPosterSubtitleLayout(f.campaign,f.poster,f.template),null);
});
