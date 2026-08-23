import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Guardrails - Check IDE extensions before you install them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));

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
          background: "linear-gradient(135deg, #0A1017 0%, #101B26 100%)",
          color: "#E8EEF4",
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
              Guardrails
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#7E93A8" }}>
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
              color: "#3ECF8E",
            }}
          >
            before you install it.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 31,
              color: "#94A8BC",
              marginTop: 26,
            }}
          >
            Every update re-checked for quiet access gains.
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
              padding: "14px 30px",
              background: "#12202C",
              border: "1px solid #23384A",
              borderRadius: 999,
              fontSize: 27,
              color: "#BFDCF2",
            }}
          >
            Scan an extension now
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#3ECF8E" }}>
            abscissa.dev
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
