import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * UX 補助のリダイレクトのみ。認可の正本は RSC / API / Server Actions 内の auth()。
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/cs", req.nextUrl.origin));
  }

  const isProtected =
    pathname === "/cs" ||
    pathname.startsWith("/cs/") ||
    pathname.startsWith("/api/cs");

  if (!isProtected || isLoggedIn) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.nextUrl.origin);
  const callbackUrl = `${pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  loginUrl.searchParams.set("reason", "auth");
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/cs", "/cs/:path*", "/api/cs/:path*", "/login"],
};
