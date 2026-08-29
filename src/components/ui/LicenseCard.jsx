import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Flame, Store, Building2, Coffee, Receipt, SignpostBig, Pill, FileText, RefreshCw, ClipboardCheck, ArrowRight } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getLicenseById } from '../../utils/licenseTypes';
import { PENALTY_RULES } from '../../utils/penaltyRules';
import { useTranslation } from 'react-i18next';

const ICON_MAP = { UtensilsCrossed, Flame, Store, Building2, Coffee, Receipt, SignpostBig, Pill, FileText };

function MiniRing({ daysLeft, totalDays = 365 }) {
  const size = 56, sw = 4.5, radius = (size - sw) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = (daysLeft === null || daysLeft === undefined || daysLeft < 0) ? 0 : Math.min(1, daysLeft / totalDays);
  const offset = circ - pct * circ;
  const color = daysLeft < 0 ? '#C2410C' : daysLeft <= 7 ? '#C2410C' : daysLeft <= 30 ? '#CA8A04' : '#6B8F71';
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#D6CFC4" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center flex items-center justify-center">
        {daysLeft < 0 ? (
          <span className="text-danger font-bold font-mono text-[10px]">EXP</span>
        ) : (
          <span className="font-bold font-mono text-ink text-xs">{daysLeft}d</span>
        )}
      </div>
    </div>
  );
}

export default function LicenseCard({ license, onRenew }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const def = getLicenseById(license.license_type);
  const Icon = ICON_MAP[def?.icon] || FileText;
  const { daysLeft, computedStatus } = license;
  const isExpired = daysLeft < 0 || computedStatus === 'expired';
  const isExpiring = !isExpired && daysLeft !== null && daysLeft <= 30;
  const isNeeded = computedStatus === 'needed' || license.status === 'needed';

  const rule = PENALTY_RULES[license.license_type];
  const currentPenalty = rule?.slabs?.find(s => Math.abs(daysLeft) >= s.days_overdue)?.fine;

  // Left status bar color
  const rawTitle =
    license.requirement?.requirement_name ||
    license.requirement_name ||
    license.license_type ||
    license.name ||
    def?.name ||
    'Required License';

  const lookupKey = def?.id || (license.license_type && license.license_type !== 'undefined' ? license.license_type : null);
  const displayName = lookupKey ? t(`license_names.${lookupKey}`, { defaultValue: rawTitle }) : rawTitle;

  const rawAuthority =
    license.issuing_authority ||
    license.issuing_agency ||
    license.requirement?.issuing_agency ||
    def?.issuing_authority ||
    'Regulatory Authority';

  const authLookupKey = (license.issuing_authority && license.issuing_authority !== 'undefined') ? license.issuing_authority : (def?.issuing_authority || null);
  const displayAuthority = authLookupKey ? t(`authorities.${authLookupKey}`, { defaultValue: rawAuthority }) : rawAuthority;

  // Left status bar color
  const leftBorderColor = isExpired ? 'border-l-danger' : isExpiring ? 'border-l-caution' : isNeeded ? 'border-l-rule-dark' : 'border-l-settled';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`h-full bg-surface rounded-lg border border-rule-dark border-l-[3px] ${leftBorderColor} shadow-card hover:shadow-card-hover p-4 flex flex-col justify-between gap-3 transition-shadow duration-150`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border ${isExpired ? 'bg-red-50 border-red-200 text-danger' : isExpiring ? 'bg-amber-50 border-amber-200 text-accent-dark' : isNeeded ? 'bg-base border-rule-dark text-ink-muted' : 'bg-settled/10 border-settled/20 text-settled'}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold font-display text-ink text-sm leading-snug truncate">
              {displayName}
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5 truncate max-w-[140px]">
              {displayAuthority}
            </div>
          </div>
        </div>
        <StatusBadge status={computedStatus} />
      </div>

      {/* Metric Middle Section */}
      <div className="flex items-center justify-between py-1 bg-base/50 px-3 rounded-md border border-rule-dark/50">
        {isNeeded ? (
          <div className="flex items-center gap-2 py-1 text-ink-muted">
            <ClipboardCheck size={20} className="text-ink-faint" />
            <div className="text-xs font-display">
              <span className="font-semibold text-ink">Action Required</span>
              <div className="text-[10px] text-ink-faint">Application pending</div>
            </div>
          </div>
        ) : daysLeft !== null && daysLeft !== undefined ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <MiniRing daysLeft={daysLeft} />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold font-display text-ink-muted">
                  {isExpired ? t('dashboard.overdue', 'Overdue') : t('dashboard.days_left', 'Days Remaining')}
                </div>
                <div className={`text-xl font-bold font-mono ${isExpired ? 'text-danger' : isExpiring ? 'text-caution' : 'text-settled'}`}>
                  {isExpired ? `${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                </div>
              </div>
            </div>
            {isExpired && currentPenalty && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-semibold font-display text-danger">{t('dashboard.fine', 'Fine')}</div>
                <div className="text-xs font-bold font-mono text-danger">{formatCurrency(currentPenalty)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1 text-ink-muted">
            <FileText size={18} className="text-ink-faint" />
            <div className="text-xs font-display font-medium text-ink-muted">
              {license.status === 'in_progress' ? t('status.in_progress', 'In Progress') : t('status.pending', 'Pending Verification')}
            </div>
          </div>
        )}
      </div>

      {/* Metadata strip */}
      <div className="text-[11px] text-ink-muted border-t border-rule-dark/40 pt-2 flex items-center justify-between font-mono">
        <span className="truncate">
          <span className="text-ink-faint">{t('dashboard.expires_label', 'Expires')}:</span>{' '}
          <strong className="font-semibold text-ink">{formatDate(license.expiry_date) || '—'}</strong>
        </span>
        {license.license_number && (
          <span className="text-[10px] font-medium text-ink-faint truncate max-w-[100px]" title={license.license_number}>
            #{license.license_number}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button onClick={() => navigate(`/license/${license.id}`)} className="flex-1 py-1.5 px-2.5 rounded-md border border-rule-dark bg-surface hover:bg-base-dark text-ink text-xs font-medium font-display transition-colors flex items-center justify-center gap-1">
          <span>{t('dashboard.view_details', 'Details')}</span>
          <ArrowRight size={12} className="text-ink-faint" />
        </button>
        <button
          onClick={() => onRenew?.(license)}
          className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold font-display transition-colors flex items-center justify-center gap-1.5 shadow-subtle ${isExpired ? 'bg-danger hover:bg-danger/90 text-white' : isExpiring ? 'bg-caution hover:bg-caution/90 text-white' : 'bg-accent hover:bg-accent-dark text-white'}`}
        >
          <RefreshCw size={12} />
          <span>{isNeeded ? 'Apply' : t('dashboard.renew_now', 'Renew')}</span>
        </button>
      </div>
    </motion.div>
  );
}
