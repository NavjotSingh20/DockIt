export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-20 w-20 rounded-full mx-auto" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-10 flex-1 rounded-xl" />
        <div className="skeleton h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
}
