import sharp from "sharp";

export async function GET() {
  const { data, info } = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "#ffffff" },
  })
    .webp()
    .toBuffer({ resolveWithObject: true });

  return Response.json({ format: info.format, bytes: data.byteLength });
}
