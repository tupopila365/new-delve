import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit2, Pause, Copy, Archive, Star, LayoutGrid, List } from "lucide-react";
import { listings } from "../data/mock";
import { StatusBadge } from "../components/ui/StatusBadge";

type Listing = typeof listings[0];

function ListingRow({ listing, onEdit, onDuplicate }: { listing: Listing; onEdit?: (id: string) => void; onDuplicate?: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <tr className="hover:bg-[#FAF8F4] transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
            {listing.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1A1814] truncate max-w-[200px]">{listing.name}</p>
            <p className="text-xs text-[#6F695F]">{listing.location}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-[#6F695F]">{listing.category}</td>
      <td className="px-4 py-3 text-sm font-medium text-[#1A1814]">
        {listing.priceFrom > 0 ? `$${listing.priceFrom.toLocaleString()}` : "—"}
      </td>
      <td className="px-4 py-3"><StatusBadge status={listing.status} /></td>
      <td className="px-4 py-3"><StatusBadge status={listing.verificationStatus} /></td>
      <td className="px-4 py-3">
        {listing.rating > 0 ? (
          <span className="flex items-center gap-1 text-sm">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span className="font-medium text-[#1A1814]">{listing.rating}</span>
          </span>
        ) : <span className="text-xs text-[#6F695F]">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-[#1A1814]">{listing.views > 0 ? listing.views.toLocaleString() : "—"}</td>
      <td className="px-4 py-3 text-sm text-[#1A1814]">{listing.bookings > 0 ? listing.bookings : "—"}</td>
      <td className="px-4 py-3">
        {listing.dealAttached && (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200">Deal</span>
        )}
      </td>
      <td className="px-4 py-3 relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] hover:text-[#1A1814] opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Listing actions"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-4 top-10 z-20 bg-white border border-[#DDD6CA] rounded-xl shadow-lg py-1 w-44">
            {[
              { icon: Eye, label: "Preview listing", action: () => onEdit?.(listing.id) },
              { icon: Edit2, label: "Edit listing", action: () => onEdit?.(listing.id) },
              { icon: Copy, label: "Duplicate", action: () => onDuplicate?.(listing.id) },
              { icon: Pause, label: "Pause listing", action: () => undefined },
              { icon: Archive, label: "Archive", action: () => undefined },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} type="button" onClick={() => { setMenuOpen(false); action() }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#1A1814] hover:bg-[#FAF8F4] transition-colors">
                <Icon size={13} className="text-[#6F695F]" /> {label}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Listings({
  onCreate,
  onEdit,
  onDuplicate,
}: {
  onCreate?: () => void
  onEdit?: (id: string) => void
  onDuplicate?: (id: string) => void
} = {}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"table" | "grid">("table");

  const filtered = listings.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: listings.length,
    published: listings.filter(l => l.status === "published").length,
    draft: listings.filter(l => l.status === "draft").length,
    in_review: listings.filter(l => l.status === "in_review").length,
    paused: listings.filter(l => l.status === "paused").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Listings & Services</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">{listings.length} listings across all categories</p>
        </div>
        <button type="button" onClick={onCreate} className="flex items-center gap-2 bg-[#5F2FC9] hover:bg-[#4E26A8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
          <Plus size={15} /> New listing
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-[#5F2FC9] text-white"
                  : "bg-white text-[#6F695F] border border-[#DDD6CA] hover:bg-[#FAF8F4]"
              }`}
            >
              {status === "all" ? "All" : status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === status ? "bg-white/20" : "bg-[#F0EBE3]"}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F695F]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search listings…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#DDD6CA] rounded-lg text-sm placeholder:text-[#6F695F] focus:outline-none focus:border-[#8C52FF]"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-[#DDD6CA] px-3 py-2 rounded-lg text-sm text-[#6F695F] hover:bg-[#FAF8F4] transition-colors">
            <Filter size={14} /> Filters
          </button>
          <div className="flex items-center border border-[#DDD6CA] rounded-lg overflow-hidden bg-white ml-auto">
            <button onClick={() => setView("table")} className={`p-2 ${view === "table" ? "bg-[#F0EBE3] text-[#1A1814]" : "text-[#6F695F] hover:bg-[#FAF8F4]"}`}>
              <List size={15} />
            </button>
            <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-[#F0EBE3] text-[#1A1814]" : "text-[#6F695F] hover:bg-[#FAF8F4]"}`}>
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                  {["Listing", "Category", "From", "Status", "Verification", "Rating", "Views", "Bookings", "Deal", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6F695F] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {filtered.length > 0 ? filtered.map(l => <ListingRow key={l.id} listing={l} onEdit={onEdit} onDuplicate={onDuplicate} />) : (
                  <tr><td colSpan={10} className="text-center py-12 text-[#6F695F] text-sm">No listings match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
