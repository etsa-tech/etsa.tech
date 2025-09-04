// Simple middleware - let the admin layout handle authentication
export { default } from "next-auth/middleware";

export const config = {
  matcher: [],
};
