"use client";

import { useSession } from "next-auth/react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import AdminSignIn from "@/components/admin/AdminSignIn";
import { AdminProvider } from "@/contexts/AdminContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-etsa-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading admin interface...
          </p>
        </div>
      </div>
    );
  }

  // Show signin if not authenticated
  if (!session) {
    return <AdminSignIn />;
  }

  // Show authenticated admin interface
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminNavigation user={session.user} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
