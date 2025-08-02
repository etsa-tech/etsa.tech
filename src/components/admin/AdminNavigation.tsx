"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
interface AdminNavigationProps {
  user:
    | {
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | undefined;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: "📊" },
  { name: "Blog Posts", href: "/admin/posts", icon: "📝" },
  { name: "Assets", href: "/admin/assets", icon: "🖼️" },
  { name: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export default function AdminNavigation({ user }: AdminNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/admin" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded bg-etsa-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="text-xl font-bold text-etsa-primary">
                  ETSA Admin
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    pathname === item.href
                      ? "border-etsa-primary text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  {user?.image ? (
                    <Image
                      className="h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800"
                      src={user.image}
                      alt={user.name || "User"}
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-etsa-primary flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                      <span className="text-white font-semibold text-sm">
                        {user?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user?.name}
                    </div>
                    <div className="text-gray-500 dark:text-gray-300">
                      {user?.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Clear admin session data
                    localStorage.setItem(
                      "etsa-admin-logout",
                      Date.now().toString(),
                    );
                    localStorage.removeItem("etsa-admin-branch");
                    signOut({ callbackUrl: "/" });
                  }}
                  className="rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-etsa-primary transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
