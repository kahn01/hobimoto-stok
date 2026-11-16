import { NextResponse } from "next/server";
import { getProducts, getHistory } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [products, history] = await Promise.all([getProducts(), getHistory(100)]);
    return NextResponse.json({ products, history });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Veriler alınamadı." }, { status: 500 });
  }
}
