import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // If not logged in and trying to access dashboard, redirect to login
  if (!isLoggedIn && nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  return;
});

export const config = {
  matcher: ["/dashboard/:path*"],
};

