import { ImageResponse } from "next/og";

export const alt = "SF Police Scanner – live San Francisco police calls";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 80,
          background: "linear-gradient(135deg, #09090b 0%, #1c1917 60%, #450a0a 100%)",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 120 }}>🚨</div>
        <div style={{ fontSize: 80, fontWeight: 700, marginTop: 16 }}>SF Police Scanner</div>
        <div style={{ fontSize: 36, color: "#a1a1aa", marginTop: 12 }}>
          Live San Francisco police dispatch calls — list, map &amp; stats
        </div>
      </div>
    ),
    size,
  );
}
