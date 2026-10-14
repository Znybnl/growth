import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#faf8ff",
        color: "#0f172b",
        padding: 70,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          fontSize: 48,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 86,
            height: 86,
            borderRadius: 18,
            background: "#6c00f6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="62" height="62" viewBox="0 0 24 24">
            <path
              fill="white"
              d="m12 3 2.8 5.7 6.3.9-4.55 4.45 1.08 6.28L12 17.36l-5.63 2.97 1.08-6.28L2.9 9.6l6.3-.9Z"
            />
          </svg>
        </div>
        Okado
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 64,
          lineHeight: 1.12,
          maxWidth: 980,
          fontWeight: 700,
        }}
      >
        Un jeu par QR code. Une raison de revenir.
      </div>
      <div style={{ display: "flex", fontSize: 29, color: "#475569" }}>
        Roue de la fortune · Ticket à gratter · Affiches · Retrait des gains
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#6c00f6" }}>
        www.okado.app · 30 jours d’essai sans carte bancaire
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
