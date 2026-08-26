export default function StatusBadge({ status, large = false }) {
  const sz = large ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs';
  const map = {
    active:   { cls: 'bg-settled-light text-settled',        label: 'Active' },
    expiring: { cls: 'bg-accent-light text-accent-dark',     label: 'Expiring Soon' },
    expired:  { cls: 'bg-red-100 text-danger',               label: 'Expired' },
    unknown:  { cls: 'bg-base-dark text-ink-muted',          label: 'Unknown' },
  };
  const { cls, label } = map[status] || map.unknown;
  return <span className={`inline-flex items-center font-bold font-display rounded-full ${sz} ${cls}`}>{label}</span>;
}
