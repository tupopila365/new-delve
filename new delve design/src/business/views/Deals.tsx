import { useState } from "react";
import { Plus, Tag, TrendingUp, MoreHorizontal, Edit2, Pause, Copy, Trash2 } from "lucide-react";
import { deals } from "../data/mock";
import { StatusBadge } from "../components/ui/StatusBadge";

type Deal = typeof deals[0];

function DealCard({ deal, onEdit }: { deal: Deal; onEdit?: (id: string) => void }) {
  const pct = deal.usageLimit > 0 ? Math.round((deal.redemptions / deal.usageLimit) * 100) : 0;
  const saving = deal.originalPrice - deal.dealPrice;
  const savingPct = Math.round((saving / deal.originalPrice) * 100);

  return (
    <div className="bg-white rounded-xl border border-[#DDD6CA] p-5 hover:shadow-sm transition-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={deal.status} size="xs" />
            {deal.status === "active" && deal.endDate <= "2026-08-20" && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Ending soon</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[#1A1814]">{deal.title}</h3>
          <p className="text-xs text-[#6F695F] mt-0.5 truncate">{deal.listing}</p>
        </div>
        <button type="button" onClick={() => onEdit?.(deal.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors shrink-0" aria-label="Edit deal">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className="flex items-end gap-2">
        <div>
          <p className="text-xl font-bold text-[#1A1814]">${deal.dealPrice.toLocaleString()}</p>
          <p className="text-xs text-[#6F695F] line-through">${deal.originalPrice.toLocaleString()}</p>
        </div>
        <span className="mb-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
          {savingPct}% off
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-[#6F695F] mb-1.5">
          <span>{deal.redemptions} / {deal.usageLimit} redeemed</span>
          <span className="font-medium text-[#1A1814]">{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#F0EBE3] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#8C52FF] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#6F695F] pt-1 border-t border-[#F0EBE3]">
        <span>{deal.startDate} — {deal.endDate}</span>
        <span className="capitalize">{deal.discountType.replace("_", " ")}</span>
      </div>
    </div>
  );
}

export default function Deals({
  onCreate,
  onEdit,
}: {
  onCreate?: () => void
  onEdit?: (id: string) => void
} = {}) {
  const [activeTab, setActiveTab] = useState("active");

  const tabs = [
    { id: "active", label: "Active", count: deals.filter(d => d.status === "active").length },
    { id: "scheduled", label: "Scheduled", count: deals.filter(d => d.status === "scheduled").length },
    { id: "expired", label: "Expired", count: deals.filter(d => d.status === "expired").length },
  ];

  const filtered = activeTab === "all" ? deals : deals.filter(d => d.status === activeTab);

  const totalRedemptions = deals.reduce((sum, d) => sum + d.redemptions, 0);
  const totalRevenue = deals.reduce((sum, d) => sum + d.redemptions * d.dealPrice, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Deals Management</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">{deals.length} deals across all listings</p>
        </div>
        <button type="button" onClick={onCreate} className="flex items-center gap-2 bg-[#5F2FC9] hover:bg-[#4E26A8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
          <Plus size={15} /> Create deal
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total redemptions", value: totalRedemptions, icon: Tag },
            { label: "Revenue from deals", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp },
            { label: "Active deals", value: deals.filter(d => d.status === "active").length, icon: Tag },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-[#DDD6CA] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-[#1A1814]">{value}</p>
                <p className="text-xs text-[#6F695F]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id ? "bg-[#5F2FC9] text-white" : "bg-white text-[#6F695F] border border-[#DDD6CA] hover:bg-[#FAF8F4]"
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-white/20" : "bg-[#F0EBE3]"}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => <DealCard key={d.id} deal={d} onEdit={onEdit} />)}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-[#6F695F] text-sm">No deals in this category.</div>
          )}
        </div>
      </div>
    </div>
  );
}
