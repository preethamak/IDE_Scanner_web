import { NextResponse } from "next/server";
import { getVersionScanProduct } from "@/lib/productData";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string; version: string; scanId: string }> }) {
  const route = await context.params;
  const product = await getVersionScanProduct(decodeURIComponent(route.id), decodeURIComponent(route.version), decodeURIComponent(route.scanId));
  return product ? NextResponse.json(product) : NextResponse.json({ error: "That immutable scan does not belong to this exact artifact." }, { status: 404 });
}
