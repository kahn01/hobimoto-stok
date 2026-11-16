import { NextRequest, NextResponse } from "next/server";
import { getProducts, getHistory } from "@/lib/sheets";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  try {
    const [products, history] = await Promise.all([getProducts(), getHistory(100)]);
    return NextResponse.json({ products, history });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Veriler alınamadı." }, { status: 500 });
  }
}
