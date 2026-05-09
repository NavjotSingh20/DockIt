import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Flame, Store, Building2, Coffee, Receipt, SignpostBig, Pill, FileText, RefreshCw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getLicenseById } from '../../utils/licenseTypes';
import { PENALTY_RULES } from '../../utils/penaltyRules';
import { useTranslation } from 'react-i18next';

const ICON_MAP = { UtensilsCrossed, Flame, Store, Building2, Coffee, Receipt, SignpostBig, Pill, FileText };

function MiniRing({ daysLeft, totalDays = 365 }) {
  const size = 72, sw = 6, radius = (size - sw) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = daysLeft < 0 ? 0 : Math.min(1, daysLeft / totalDays);
  const offset = circ - pct * circ;
  const color = daysLeft < 0 ? '#DC2626' : daysLeft <= 7 ? '#DC2626' : daysLeft <= 30 ? '#F59E0B' : '#16A34A';
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        {daysLeft < 0
          ? <span className="text-red-600 font-black" style={{fontSize:9}}>EXP</span>
          : <span className="font-black text-gray-800" style={{fontSize:11}}>{daysLeft}d</span>
        }
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
  const isExpired = daysLeft < 0;
  const isExpiring = !isExpired && daysLeft <= 30;

  const rule = PENALTY_RULES[license.license_type];
  const currentPenalty = rule?.slabs?.find(s => Math.abs(daysLeft) >= s.days_overdue)?.fine;

  const borderColor = isExpired ? 'border-red-200' : isExpiring ? 'border-amber-200' : 'border-gray-100';
  const bgColor = isExpired ? 'bg-red-50/40' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border-2 ${borderColor} ${bgColor} p-5 flex flex-col gap-3 ${isExpiring && !isExpired ? 'expiring-pulse' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isExpired ? 'bg-red-100' : isExpiring ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <Icon size={20} className={isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-blue-600'} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm leading-tight">{def?.name || license.license_type}</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[130px]">{license.issuing_authority || def?.issuing_authority}</div>
          </div>
        </div>
        <StatusBadge status={computedStatus} />
      </div>

      {/* Ring + days */}
      <div className="flex items-center justify-between">
        <MiniRing daysLeft={daysLeft} />
        <div className="text-right">
          <div className={`text-2xl font-black ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-green-600'}`}>
            {isExpired ? `${Math.abs(daysLeft)}d` : `${daysLeft}d`}
          </div>
          <div className="text-xs text-gray-400">{isExpired ? 'overdue' : t('dashboard.days_left')}</div>
          {isExpired && currentPenalty && (
            <div className="text-xs font-bold text-red-600 mt-1">{formatCurrency(currentPenalty)} fine</div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 border-t border-gray-50 pt-2">
        Expires: <span className="font-medium text-gray-600">{formatDate(license.expiry_date)}</span>
        {license.license_number && <span className="ml-2 text-gray-300">·</span>}
        {license.license_number && <span className="ml-2 truncate">{license.license_number}</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button onClick={() => navigate(`/license/${license.id}`)} className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-xs font-semibold hover:border-blue-300 hover:text-blue-600 transition-all">
          {t('dashboard.view_details')}
        </button>
        <button
          onClick={() => onRenew?.(license)}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${isExpired ? 'bg-red-600 hover:bg-red-700 text-white' : isExpiring ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          <RefreshCw size={12} /> {t('dashboard.renew_now')}
        </button>
      </div>
    </motion.div>
  );
}
