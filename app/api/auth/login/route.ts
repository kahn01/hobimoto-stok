import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookie, sessionMaxAge } from "@/lib/session";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const expectedUsername = process.env.APP_LOGIN_USERNAME;
    const expectedPassword = process.env.APP_LOGIN_PASSWORD;
    if (!expectedUsername || !expectedPassword || !process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "Giriş sistemi henüz yapılandırılmamış." }, { status: 503 });
    }
    if (typeof username !== "string" || typeof password !== "string" ||
        !safeEqual(username, expectedUsername) || !safeEqual(password, expectedPassword)) {
      return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, createSessionToken(expectedUsername), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: sessionMaxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Giriş isteği işlenemedi." }, { status: 400 });
  }
}
