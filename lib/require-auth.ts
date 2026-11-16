import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

export function requireAuth(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get("hobimoto_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Oturum süren dolmuş. Yeniden giriş yap." }, { status: 401 });
  }
  return null;
}
