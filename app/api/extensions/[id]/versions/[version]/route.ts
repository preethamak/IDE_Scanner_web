import { NextResponse } from "next/server";
import { getVersionProduct } from "@/lib/productData";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await context.params;
  const product = await getVersionProduct(decodeURIComponent(id), decodeURIComponent(version));
  return product ? NextResponse.json(product) : NextResponse.json({ error: "Version intelligence is not available yet." }, { status: 404 });
}
