import { NextResponse } from "next/server";
import { getExtensionProduct } from "@/lib/productData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await getExtensionProduct(decodeURIComponent(id));
  if (!result) {
    return NextResponse.json({ error: "Extension not found in the catalog or supported registries." }, { status: 404 });
  }
  return NextResponse.json(result);
}
