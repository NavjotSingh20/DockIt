import { formatCurrency } from '../../utils/formatters';
import { calculatePenalty } from '../../utils/penaltyRules';
import { TrendingUp } from 'lucide-react';

export default function PenaltyCalculator({ licenseType, daysOverdue = 0, country }) {
  const data = calculatePenalty(licenseType, daysOverdue);
  const isOverdue = daysOverdue > 0;

  const slabColors = ['bg-amber-400', 'bg-orange-500', 'bg-red-500', 'bg-red-700', 'bg-red-900'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚖️</span>
        <h3 className="section-title">Penalty Exposure</h3>
      </div>

      {/* Current fine */}
      {isOverdue ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-center">
          <div className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Current Fine</div>
          <div className="text-4xl font-black text-red-600">{formatCurrency(data.currentFine, country)}</div>
          <div className="text-sm text-red-500 mt-1">{data.currentConsequence}</div>
          <div className="text-xs text-red-400 mt-2">+{formatCurrency(data.dailyCost, country)}/day</div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
          ✅ No fines yet — renew on time to avoid penalties below
        </div>
      )}

      {/* Escalation timeline */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fine Escalation</div>
        {data.projections.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${slabColors[i]}`} />
            <div className="flex-1 text-sm text-gray-700">In {p.days} days</div>
            <div className={`font-bold text-sm ${i === 0 ? 'text-orange-600' : i === 1 ? 'text-red-600' : 'text-red-800'}`}>
              {formatCurrency(p.fine, country)}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Today</span><span>30d</span><span>90d</span><span>180d</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
          {slabColors.map((c, i) => (
            <div key={i} className={`flex-1 ${c} ${i < Math.ceil(daysOverdue / 30) ? 'opacity-100' : 'opacity-30'} transition-all`} />
          ))}
        </div>
      </div>

      {/* Legal reference */}
      {data.legalReference && (
        <div className="text-xs text-gray-400 border-t border-gray-50 pt-3">
          📖 {data.legalReference}
        </div>
      )}

      <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
        <TrendingUp size={16} />
        Every day costs you {formatCurrency(data.dailyCost)} more
      </div>
    </div>
  );
}
