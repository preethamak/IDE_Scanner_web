import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "GuardRails - Check IDE extensions before you install them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand palette: green-black ink, deep-green signal, lime accent.
const INK = "#14201a";
const MUTED = "#66716b";
const SIGNAL = "#1f6a4a";
const LIME = "#c9ff45";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/logo-transparent.png"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#ffffff",
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={`data:image/png;base64,${logo.toString("base64")}`}
              width={56}
              height={58}
              alt=""
            />
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                marginLeft: 20,
              }}
            >
              GuardRails
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
            abscissa.dev
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: -1.5,
            }}
          >
            Know what an extension does
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: -1.5,
              color: SIGNAL,
            }}
          >
            before you install it.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 31,
              color: MUTED,
              marginTop: 26,
            }}
          >
            Every update re-checked before it reaches your editor.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "14px 30px",
                background: INK,
                borderRadius: 999,
                fontSize: 27,
                color: "#ffffff",
              }}
            >
              Scan an extension now
            </div>
            <div
              style={{
                display: "flex",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: LIME,
              }}
            />
            <div
              style={{
                display: "flex",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: SIGNAL,
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 27, color: MUTED }}>
            abscissa.dev
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
