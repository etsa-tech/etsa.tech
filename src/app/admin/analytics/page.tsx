import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics - ETSA Admin",
  description: "View blog post analytics and performance metrics",
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
