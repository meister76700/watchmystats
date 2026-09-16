import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ============================================================================
// Protection des routes privées: tout ce qui est sous /dashboard, /videos,
// /analytics, /platforms, /revenue, /ai, /settings, /profile nécessite une
// session valide. Les routes non authentifiées sont redirigées vers /login.
// ============================================================================

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/videos/:path*",
    "/analytics/:path*",
    "/platforms/:path*",
    "/revenue/:path*",
    "/ai/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
