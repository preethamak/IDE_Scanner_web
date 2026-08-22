import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabaseProxy";

export async function proxy(request: NextRequest) { return refreshSession(request); }
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
