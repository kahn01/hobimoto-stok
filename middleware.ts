import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get("hobimoto_session")?.value);
  const isLogin = request.nextUrl.pathname === "/login";

  if (!hasSessionCookie && !isLogin) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (hasSessionCookie && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/logout).*)"],
};
