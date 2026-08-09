import { Download, TrendingUp, DollarSign, ArrowDownRight, RefreshCw } from "lucide-react";
import { transactions, business } from "../data/mock";
import { StatusBadge } from "../components/ui/StatusBadge";

export default function Payments() {
  const totalGross = transactions.reduce((sum, t) => sum + t.gross, 0);
  const totalNet = transactions.reduce((sum, t) => sum + t.net, 0);
  const totalFees = transactions.reduce((sum, t) => sum + Math.abs(t.delveeFee), 0);
  const totalRefunds = transactions.reduce((sum, t) => sum + Math.abs(t.refunds), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Payments & Finance</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">Financial summary for August 2026</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-[#DDD6CA] px-3 py-2 rounded-lg text-sm text-[#6F695F] hover:bg-[#FAF8F4] transition-colors">
          <Download size={14} /> Download statement
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Gross sales", value: `$${totalGross.toLocaleString()}`, icon: TrendingUp, color: "purple" },
            { label: "Net earnings", value: `$${totalNet.toLocaleString()}`, icon: DollarSign, color: "green" },
            { label: "Platform fees", value: `$${totalFees.toLocaleString()}`, icon: ArrowDownRight, color: "amber" },
            { label: "Refunds issued", value: `$${totalRefunds.toLocaleString()}`, icon: RefreshCw, color: "red" },
          ].map(({ label, value, icon: Icon, color }) => {
            const colorMap: Record<string, string> = {
              purple: "bg-purple-50 text-purple-600",
              green: "bg-green-50 text-green-600",
              amber: "bg-amber-50 text-amber-700",
              red: "bg-red-50 text-red-600",
            };
            return (
              <div key={label} className="bg-white rounded-xl border border-[#DDD6CA] p-5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1A1814]">{value}</p>
                  <p className="text-xs text-[#6F695F]">{label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payout Info */}
        <div className="bg-[#EDE5FF] border border-purple-200 rounded-xl p-5 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-[#5F2FC9] mb-1">Available payout balance</p>
            <p className="text-3xl font-bold text-[#1A1814]" style={{ fontFamily: "Syne, sans-serif" }}>
              ${business.payoutBalance.toLocaleString()}
            </p>
            <p className="text-xs text-[#6F695F] mt-1">Pending: ${business.pendingBalance.toLocaleString()} · Next payout: {business.nextPayout}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button className="px-4 py-2 bg-[#5F2FC9] text-white text-sm font-medium rounded-lg hover:bg-[#4E26A8] transition-colors">
              Request early payout
            </button>
            <button className="px-4 py-2 bg-white border border-purple-200 text-[#5F2FC9] text-sm font-medium rounded-lg hover:bg-white/80 transition-colors">
              Payout settings
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DDD6CA] flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1A1814]">Transactions</h2>
            <button className="flex items-center gap-1.5 text-sm text-[#6F695F] hover:text-[#1A1814]">
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                  {["Reference", "Description", "Date", "Gross", "Platform fee", "Refunds", "Net", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6F695F] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#FAF8F4] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-[#5F2FC9]">{t.reference}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#1A1814]">{t.traveler}</p>
                      <p className="text-xs text-[#6F695F]">{t.description}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F695F]">{t.date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#1A1814]">${t.gross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#C83B3B]">{t.delveeFee < 0 ? `-$${Math.abs(t.delveeFee).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#C83B3B]">{t.refunds < 0 ? `-$${Math.abs(t.refunds).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#1A1814]">${t.net.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} size="xs" /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#DDD6CA] bg-[#FAF8F4]">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-[#1A1814]">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#1A1814]">${totalGross.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#C83B3B]">-${totalFees.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#C83B3B]">-${totalRefunds.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#16845B]">${totalNet.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-xs text-[#6F695F] text-center">
          Currency: USD · All amounts shown before local taxes where applicable · Delve is not responsible for tax compliance in your jurisdiction
        </p>
      </div>
    </div>
  );
}
