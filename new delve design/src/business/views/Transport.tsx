import { Plus, AlertTriangle, Car, Wrench, CheckCircle, Users, MapPin, MoreHorizontal } from "lucide-react";
import { vehicles } from "../data/mock";
import { StatusBadge } from "../components/ui/StatusBadge";

export default function Transport({
  onAddAsset,
  onAddRoute,
  onManageSchedule,
  onEditAsset,
}: {
  onAddAsset?: () => void
  onAddRoute?: () => void
  onManageSchedule?: (assetId?: string) => void
  onEditAsset?: (id: string) => void
} = {}) {
  const routes = [
    { id: "rt_01", name: "Arusha → Serengeti Gate", mode: "road", departures: 2, vehicle: "Toyota Land Cruiser 200", duration: "4h 30m" },
    { id: "rt_02", name: "Arusha → Ngorongoro Crater", mode: "road", departures: 1, vehicle: "Toyota Coaster Minibus", duration: "2h 15m" },
    { id: "rt_03", name: "JRO Airport → Arusha Hotels", mode: "road", departures: 6, vehicle: "Multiple", duration: "45m" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Transport Management</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">{vehicles.length} vehicles · {routes.length} routes</p>
        </div>
        <button type="button" onClick={onAddAsset} className="flex items-center gap-2 bg-[#5F2FC9] hover:bg-[#4E26A8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
          <Plus size={15} /> Add asset
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {/* Fleet Overview */}
        <div>
          <h2 className="text-sm font-semibold text-[#6F695F] uppercase tracking-wide mb-3">Fleet</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-[#DDD6CA] p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                    <Car size={18} />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.status as "active" | "maintenance"} size="xs" />
                    <button type="button" onClick={() => onEditAsset?.(v.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors" aria-label="Edit asset">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#1A1814]">{v.name}</h3>
                  <p className="text-xs text-[#6F695F] mt-0.5">{v.type} · {v.registration}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#6F695F]">
                    <Users size={12} /> {v.seats} seats
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6F695F]">
                    <Car size={12} /> {v.driver}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-3 border-t border-[#F0EBE3]">
                  {[
                    { label: "Insurance", date: v.insuranceExpiry, ok: true },
                    { label: "Permit", date: v.permitExpiry, ok: v.permitExpiry > "2026-09-01" },
                    { label: "Next service", date: v.nextService, ok: v.status !== "maintenance" },
                  ].map(({ label, date, ok }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-[#6F695F]">{label}</span>
                      <div className="flex items-center gap-1.5">
                        {ok ? <CheckCircle size={11} className="text-green-600" /> : <AlertTriangle size={11} className="text-amber-600" />}
                        <span className={`text-xs font-medium ${ok ? "text-[#1A1814]" : "text-amber-700"}`}>{date}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {v.status === "maintenance" && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Wrench size={12} className="text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-700">In maintenance — unavailable for dispatch</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Routes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#6F695F] uppercase tracking-wide">Routes</h2>
            <button type="button" onClick={onAddRoute} className="flex items-center gap-1.5 text-sm text-[#8C52FF] hover:text-[#5F2FC9] font-medium min-h-[44px]">
              <Plus size={13} /> Add route
            </button>
          </div>
          <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                  {["Route", "Vehicle", "Daily departures", "Duration", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6F695F] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {routes.map(r => (
                  <tr key={r.id} className="hover:bg-[#FAF8F4] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-[#8C52FF] shrink-0" />
                        <span className="text-sm font-medium text-[#1A1814]">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F695F]">{r.vehicle}</td>
                    <td className="px-4 py-3 text-sm text-[#1A1814]">{r.departures}</td>
                    <td className="px-4 py-3 text-sm text-[#6F695F]">{r.duration}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onManageSchedule?.()} className="text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium min-h-[44px]">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
