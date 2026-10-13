import { expect, test } from "@playwright/test";
for (const width of [320,390,1280]) {
  test(`ticket anonyme : préparation sans participation, premier grattage et pas de doublon à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    const played:unknown[]=[];const events:string[]=[];
    const errors:string[]=[];
    page.on("pageerror",(error)=>errors.push(error.message));
    await page.route("**/api/**",async(route)=>{
      const url=new URL(route.request().url());const body=route.request().postDataJSON();
      if(url.pathname.includes("/campaign/")) return route.fulfill({json:{campaign:{actions:[]}}});
      if(url.pathname.endsWith("/event")) {events.push(body.eventType);return route.fulfill({json:{event:{}}});}
      if(url.pathname.endsWith("/draw/session")) return route.fulfill({json:{prize:null,session:{
        id:"fixture-session",campaignId:"fixture-participation",status:"pending",
        createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+900000).toISOString(),
        participationToken:"fixture-signed-capability",
      }}});
      if(url.pathname.endsWith("/draw/played")) {played.push(body);return route.fulfill({json:{recorded:true}});}
      throw new Error("Unexpected API request: "+url.pathname);
    });
    await page.goto("/dev/participation-proof");
    const canvas=page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await canvas.click(); // start action step, no participation yet
    await page.getByRole("button",{name:/JOUER|Gratter|Jouer/i}).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("canvas")).toBeVisible();
    expect(played).toHaveLength(0);
    const ready=page.locator("canvas").first();
    await ready.scrollIntoViewIfNeeded();
    const box=await ready.boundingBox();expect(box).not.toBeNull();
    await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
    await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+10,box!.y+box!.height/2+10);await page.mouse.up();
    await expect.poll(()=>played.length).toBe(1);
    await page.mouse.down();await page.mouse.up();
    expect(played).toHaveLength(1);
    expect(played[0]).toEqual({campaignId:"fixture-participation",sessionId:"fixture-session",token:"fixture-signed-capability"});
    expect(events).not.toContain("game_played");
    await ready.evaluate((node)=>{const canvas=node as HTMLCanvasElement;canvas.getContext("2d")!.clearRect(0,0,canvas.width,canvas.height);});
    await page.mouse.down();await page.mouse.up();
    await expect(page.getByRole("heading",{name:"Perdu",exact:true})).toBeVisible();
    expect(played).toHaveLength(1);expect(errors).toEqual([]);
  });
}

test("prévisualisation : premier grattage sans enregistrement réel",async({page})=>{
  let played=0;let events=0;
  await page.route("**/api/**",async(route)=>{
    const path=new URL(route.request().url()).pathname;
    if(path.includes("/campaign/")) return route.fulfill({json:{campaign:{actions:[]}}});
    if(path.endsWith("/draw/session")) return route.fulfill({json:{prize:null,session:{
      id:"fixture-preview-session",campaignId:"fixture-participation",status:"pending",
      createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+900000).toISOString(),
      isPreview:true,previewSessionToken:"preview-only",
    }}});
    if(path.endsWith("/draw/played")) {played++;return route.fulfill({json:{recorded:true}});}
    if(path.endsWith("/event")) {events++;return route.fulfill({json:{}});}
    throw Error("Unexpected preview request");
  });
  await page.goto("/dev/participation-proof?preview=1");
  await page.locator("canvas").first().click();
  await page.getByRole("button",{name:/JOUER|Gratter|Jouer/i}).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const canvas=page.locator("canvas").first();
  await canvas.click();
  expect(played).toBe(0);expect(events).toBe(0);
});
