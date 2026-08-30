import { useTranslation } from 'react-i18next';

export default function StatusBadge({ status, large = false }) {
  const { t } = useTranslation();
  const sz = large ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  const map = {
    active:           { cls: 'bg-settled/10 text-settled border border-settled/25', dot: 'bg-settled', key: 'status.active', default: 'Active' },
    satisfied:        { cls: 'bg-settled/10 text-settled border border-settled/25', dot: 'bg-settled', key: 'status.satisfied', default: 'Active / Satisfied' },
    payment_recorded: { cls: 'bg-blue-50 text-blue-700 border border-blue-200',      dot: 'bg-blue-500', key: 'status.payment_recorded', default: 'Payment Recorded' },
    in_progress:      { cls: 'bg-amber-50 text-amber-800 border border-amber-200',    dot: 'bg-amber-500', key: 'status.in_progress', default: 'In Progress' },
    expiring:         { cls: 'bg-accent-light/60 text-accent-dark border border-accent/25', dot: 'bg-accent', key: 'status.expiring', default: 'Expiring Soon' },
    expired:          { cls: 'bg-red-50 text-danger border border-red-200',          dot: 'bg-danger', key: 'status.expired', default: 'Expired' },
    needed:           { cls: 'bg-base-dark text-ink-muted border border-rule-dark',   dot: 'bg-ink-faint', key: 'status.needed', default: 'Needed' },
    unknown:          { cls: 'bg-base-dark text-ink-muted border border-rule-dark',   dot: 'bg-ink-faint', key: 'status.unknown', default: 'Unknown' },
  };
  const item = map[status] || map.unknown;
  const label = t(item.key, item.default);
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium font-display tracking-tight rounded-md ${sz} ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{label}</span>
    </span>
  );
}
