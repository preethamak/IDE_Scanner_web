import { NextResponse } from "next/server";

const HACKATHON_PASS_COOKIE = "gr_hackathon_pass";
const PASS_WINDOW_DAYS = 30;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const destination = form?.get("to") === "scan"
    ? "/registry?source=hackathon"
    : "/account?next=%2Fworkspace&source=hackathon";
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: destination },
  });
  const secure = url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  response.headers.append(
    "Set-Cookie",
    `${HACKATHON_PASS_COOKIE}=1; Max-Age=${PASS_WINDOW_DAYS * 86_400}; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax`,
  );
  return response;
}
