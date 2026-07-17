import { NextResponse } from "next/server";
import { getPublicInventory } from "@/lib/productData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPublicInventory(), { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
