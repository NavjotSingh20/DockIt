export default function StatusBadge({ status, large = false }) {
  const sz = large ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs';
  const map = {
    active:   { cls: 'bg-green-100 text-green-700',   label: 'Active' },
    expiring: { cls: 'bg-amber-100 text-amber-700',   label: 'Expiring Soon' },
    expired:  { cls: 'bg-red-100 text-red-700',       label: 'Expired' },
    unknown:  { cls: 'bg-gray-100 text-gray-600',     label: 'Unknown' },
  };
  const { cls, label } = map[status] || map.unknown;
  return <span className={`inline-flex items-center font-bold rounded-full ${sz} ${cls}`}>{label}</span>;
}
