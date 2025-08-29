import { ReactNode } from "react";

interface ContentPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  sidebar: ReactNode;
  emptyState?: ReactNode;
  showEmptyState?: boolean;
}

export function ContentPageLayout({
  title,
  description,
  children,
  sidebar,
  emptyState,
  showEmptyState = false,
}: Readonly<ContentPageLayoutProps>) {
  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">{children}</div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-8">{sidebar}</div>
        </div>
      </div>

      {/* Empty State */}
      {showEmptyState && emptyState}
    </div>
  );
}
