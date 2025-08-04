import PopularTags from "@/components/PopularTags";

interface TagsCardProps {
  title: string;
  limit?: number;
  showViewAll?: boolean;
}

export function TagsCard({
  title,
  limit,
  showViewAll = false,
}: Readonly<TagsCardProps>) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-lg">{title}</h3>
      </div>
      <div className="card-content">
        <PopularTags limit={limit} showViewAll={showViewAll} />
      </div>
    </div>
  );
}
