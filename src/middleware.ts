import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect all routes except API, login, and static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
