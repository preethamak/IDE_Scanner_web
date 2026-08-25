import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A1017 0%, #101B26 100%)",
          padding: 3,
        }}
      >
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={26}
          height={26}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
