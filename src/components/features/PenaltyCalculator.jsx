import { formatCurrency } from '../../utils/formatters';
import { calculatePenalty } from '../../utils/penaltyRules';
import { TrendingUp } from 'lucide-react';

export default function PenaltyCalculator({ licenseType, daysOverdue = 0 }) {
  const data = calculatePenalty(licenseType, daysOverdue);
  const isOverdue = daysOverdue > 0;

  const slabColors = ['bg-amber-400', 'bg-orange-500', 'bg-red-500', 'bg-red-700', 'bg-red-900'];

  return (
    <div className="bg-surface rounded-2xl border border-rule p-6 space-y-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚖️</span>
        <h3 className="section-title">Penalty Exposure</h3>
      </div>

      {/* Current fine */}
      {isOverdue ? (
        <div className="bg-danger/10 border-2 border-danger/30 rounded-2xl p-5 text-center">
          <div className="text-xs font-bold text-danger uppercase tracking-wide mb-1">Current Fine</div>
          <div className="text-4xl font-black text-danger font-display">{formatCurrency(data.currentFine)}</div>
          <div className="text-sm text-danger/90 mt-1">{data.currentConsequence}</div>
          <div className="text-xs text-danger/80 mt-2 font-mono">+{formatCurrency(data.dailyCost)}/day</div>
        </div>
      ) : (
        <div className="bg-settled/10 border border-settled/30 rounded-xl p-4 text-sm text-settled font-medium">
          ✅ No fines yet — renew on time to avoid penalties below
        </div>
      )}

      {/* Escalation timeline */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wide font-display">Fine Escalation</div>
        {data.projections.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${slabColors[i]}`} />
            <div className="flex-1 text-sm text-ink font-medium">In {p.days} days</div>
            <div className={`font-bold text-sm font-mono ${i === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-danger'}`}>
              {formatCurrency(p.fine)}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-ink-faint font-mono">
          <span>Today</span><span>30d</span><span>90d</span><span>180d</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-base">
          {slabColors.map((c, i) => (
            <div key={i} className={`flex-1 ${c} ${i < Math.ceil(daysOverdue / 30) ? 'opacity-100' : 'opacity-30'} transition-all`} />
          ))}
        </div>
      </div>

      {/* Legal reference */}
      {data.legalReference && (
        <div className="text-xs text-ink-faint border-t border-rule/50 pt-3 font-mono">
          📖 {data.legalReference}
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <TrendingUp size={16} className="text-amber-600 dark:text-amber-400" />
        Every day costs you {formatCurrency(data.dailyCost)} more
      </div>
    </div>
  );
}
