interface StatItem {
  label: string;
  value: number | string;
}

interface StatsCardProps {
  title: string;
  stats: StatItem[];
}

export function StatsCard({ title, stats }: Readonly<StatsCardProps>) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-lg">{title}</h3>
      </div>
      <div className="card-content space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              {stat.label}
            </span>
            <span className="font-semibold text-etsa-primary">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
