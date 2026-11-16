import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, saveProduct, type Product } from "@/lib/sheets";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const p: Product = {
      barcode: String(body.barcode || "").trim(), name: String(body.name || "").trim(),
      category: String(body.category || "").trim(), price: Number(body.price || 0),
      stock: Number(body.stock || 0), critical: Number(body.critical || 0),
      shelf: String(body.shelf || "").trim()
    };
    if (!p.barcode || !p.name || !Number.isFinite(p.price) || p.price < 0 ||
        !Number.isInteger(p.stock) || p.stock < 0 || !Number.isInteger(p.critical) || p.critical < 0)
      return NextResponse.json({ error: "Barkod, ürün adı ve geçerli sayısal değerler gerekli." }, { status: 400 });
    await saveProduct(p, body.originalBarcode ? String(body.originalBarcode) : undefined);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Ürün kaydedilemedi." }, { status: 400 });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const barcode = req.nextUrl.searchParams.get("barcode");
    if (!barcode) return NextResponse.json({ error: "Barkod gerekli." }, { status: 400 });
    await deleteProduct(barcode);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Ürün silinemedi." }, { status: 400 });
  }
}
