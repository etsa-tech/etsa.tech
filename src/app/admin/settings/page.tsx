export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Configure your admin interface and integrations.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center py-12">
          <span className="text-4xl">⚙️</span>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Settings coming soon
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            LinkedIn and Mailchimp integration settings will be available in the
            next update.
          </p>
        </div>
      </div>
    </div>
  );
}
