"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionProvider>{children}</SessionProvider>;
}
