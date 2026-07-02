import QRCode from "qrcode";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(request.url);
  const redeemUrl = `${url.origin}/redeem/${encodeURIComponent(code)}`;
  const svg = await QRCode.toString(redeemUrl, {
    type: "svg",
    margin: 1,
    width: 960,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="qr-lot-${code}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
