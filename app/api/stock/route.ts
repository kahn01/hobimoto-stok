import { NextRequest, NextResponse } from "next/server";
import { adjustStock } from "@/lib/sheets";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const barcode = String(body.barcode || "").trim();
    const type = body.type;
    const quantity = Number(body.quantity);
    if (!barcode || !["Giriş","Çıkış"].includes(type))
      return NextResponse.json({ error: "Barkod ve işlem türü gerekli." }, { status: 400 });
    const result = await adjustStock(barcode, type, quantity, String(body.user || "Personel").slice(0, 80));
    return NextResponse.json({ ok: true, product: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Stok işlemi başarısız." }, { status: 400 });
  }
}
