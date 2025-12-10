import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for the auth session cookie (NextAuth v5 uses authjs.session-token)
  const sessionToken = request.cookies.get("authjs.session-token")?.value 
    || request.cookies.get("__Secure-authjs.session-token")?.value;

  // If no session and trying to access protected route, redirect to login
  if (!sessionToken && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

