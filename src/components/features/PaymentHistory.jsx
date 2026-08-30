import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, FileDown, CheckCircle2, Search, Filter, Calendar, Building2, MapPin, Receipt, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { generatePaymentReceiptPDF } from '../../utils/formFillEngine';

export default function PaymentHistory({ business, licenses = [] }) {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');

  useEffect(() => {
    // 1. Gather all transactions from localStorage
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('dockit_payment_history') || '[]');
    } catch (e) {
      stored = [];
    }

    // 2. Also gather any licenses currently marked as 'payment_recorded' that may not be in local array
    const recordedLicenses = (licenses || []).filter(l => l.status === 'payment_recorded');
    recordedLicenses.forEach(l => {
      const existing = stored.find(s => s.requirementId === (l.requirement_id || l.id) || s.paymentId === l.payment_id);
      if (!existing) {
        const fee = l.fee_max ?? l.fee_min ?? l.requirement?.fee_max ?? l.requirement?.fee_min ?? 50;
        stored.push({
          id: l.payment_id || `pi_seed_${l.id}`,
          paymentId: l.payment_id || `pi_seed_${l.id}`,
          requirementId: l.requirement_id || l.id,
          requirementName: l.requirement?.requirement_name || l.license_type || 'Business License',
          issuingAgency: l.issuing_authority || l.requirement?.issuing_agency || 'Regulatory Authority',
          businessName: business?.business_name || 'Business Client',
          ownerName: business?.owner_name || 'Owner',
          city: l.requirement?.city || business?.cities?.[0] || business?.city || 'Local Jurisdiction',
          country: business?.country || 'USA',
          currency: (business?.country === 'India' ? 'INR' : 'USD'),
          baseFee: fee,
          penalty: 0,
          daysOverdue: 0,
          amount: fee,
          paidAt: l.payment_recorded_at || l.issue_date || new Date().toISOString(),
          status: 'payment_recorded'
        });
      }
    });

    setHistory(stored);
  }, [licenses, business]);

  // Unique cities from transaction history
  const cities = ['ALL', ...new Set(history.map(h => h.city).filter(Boolean))];

  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      (item.requirementName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.paymentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.issuingAgency || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'ALL' || item.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const totalAmountPaid = filteredHistory.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleDownload = (tx) => {
    const dataForReceipt = {
      paymentId: tx.paymentId || tx.id,
      amount: tx.amount,
      baseFee: tx.baseFee || tx.amount,
      penalty: tx.penalty || 0,
      daysOverdue: tx.daysOverdue || 0,
      currency: tx.currency || (business?.country === 'India' ? 'INR' : 'USD'),
      requirementName: tx.requirementName,
      issuingAgency: tx.issuingAgency,
      businessName: tx.businessName || business?.business_name,
      ownerName: tx.ownerName || business?.owner_name,
      businessAddress: tx.businessAddress || business?.address,
      city: tx.city,
      country: tx.country || business?.country || 'USA',
      paidAt: tx.paidAt,
    };

    const pdfBlob = generatePaymentReceiptPDF(dataForReceipt);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (tx.requirementName || 'Payment').replace(/[^a-zA-Z0-9_]/g, '_');
    a.download = `Official_Receipt_${safeName}_${(tx.paymentId || '').slice(-8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded Payment Confirmation PDF!');
  };

  return (
    <div className="bg-surface rounded-2xl border border-rule p-6 space-y-6 shadow-sm">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-ink">Statutory Payment History</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Itemized ledger of recorded government filing fees and late penalties
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-base/70 border border-rule rounded-xl px-3.5 py-2 text-right">
            <div className="text-[10px] font-bold font-display text-ink-faint uppercase tracking-wider">Total Paid</div>
            <div className="text-base font-black font-mono text-accent">
              {formatCurrency(totalAmountPaid)}
            </div>
          </div>
          <div className="bg-base/70 border border-rule rounded-xl px-3.5 py-2 text-right">
            <div className="text-[10px] font-bold font-display text-ink-faint uppercase tracking-wider">Transactions</div>
            <div className="text-base font-bold font-mono text-ink">
              {filteredHistory.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by license name, agency, or transaction ID..."
            className="input text-xs pl-9 w-full bg-base/50"
          />
        </div>

        {cities.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCity(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display whitespace-nowrap transition-all border ${
                  selectedCity === c
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-base/70 text-ink-muted border-rule hover:text-ink hover:border-accent/40'
                }`}
              >
                {c === 'ALL' ? 'All Jurisdictions' : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transaction List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-rule bg-base/30 space-y-2">
          <CreditCard size={32} className="mx-auto text-ink-faint" />
          <div className="text-sm font-bold font-display text-ink">No Statutory Payments Recorded Yet</div>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            When you complete a government renewal or license fee payment in sandbox test mode, it will appear here with downloadable receipts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((tx) => {
            const isOverduePaid = tx.penalty > 0;
            return (
              <motion.div
                key={tx.id || tx.paymentId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface hover:bg-base/40 rounded-xl border border-rule/80 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold font-display text-sm text-ink">
                      {tx.requirementName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-700 font-bold text-[10px] font-mono">
                      ✓ payment_recorded
                    </span>
                    {isOverduePaid && (
                      <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-bold text-[10px] font-mono">
                        Includes {tx.daysOverdue}d Late Penalty
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-ink-muted flex-wrap font-mono">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} className="text-ink-faint" />
                      {tx.issuingAgency}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-ink-faint" />
                      {tx.city}
                    </span>
                    <span className="flex items-center gap-1 text-ink-faint">
                      <Calendar size={12} />
                      {new Date(tx.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-ink-faint flex items-center gap-1.5">
                    <span>Ref:</span>
                    <span className="text-accent font-semibold">{tx.paymentId}</span>
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-rule/50 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <div className="text-base font-black font-mono text-ink">
                      {formatCurrency(tx.amount)}
                    </div>
                    {tx.penalty > 0 ? (
                      <div className="text-[10px] text-ink-faint font-mono">
                        Base {formatCurrency(tx.baseFee)} + Penalty {formatCurrency(tx.penalty)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-green-600 font-mono font-medium">
                        Base statutory fee
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDownload(tx)}
                    className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 hover:border-accent hover:text-accent font-semibold shrink-0 shadow-xs"
                    title="Download Official Payment Confirmation PDF"
                  >
                    <FileDown size={14} /> Receipt (PDF)
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
