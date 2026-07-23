import { NextResponse } from "next/server";
import { getExtensionProduct } from "@/lib/productData";
import { serverDb } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await getExtensionProduct(decodeURIComponent(id), await serverDb());
  return product ? NextResponse.json({ versions: product.versions }) : NextResponse.json({ error: "Extension not found." }, { status: 404 });
}
