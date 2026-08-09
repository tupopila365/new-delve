import { useState } from "react";
import { Search, Filter, Download, ChevronRight, CheckCircle, X, MessageSquare, FileText, MoreHorizontal } from "lucide-react";
import { bookings } from "../data/mock";
import { StatusBadge } from "../components/ui/StatusBadge";

type Booking = typeof bookings[0];

function BookingDetailPanel({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-[#DDD6CA] shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDD6CA]">
        <div>
          <h2 className="text-base font-semibold text-[#1A1814]">{booking.reference}</h2>
          <p className="text-xs text-[#6F695F]">Booking details</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.bookingStatus} />
          <StatusBadge status={booking.paymentStatus} />
        </div>

        {/* Traveler */}
        <div className="bg-[#FAF8F4] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-3">Traveler</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
              {booking.traveler.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1814]">{booking.traveler}</p>
              <p className="text-xs text-[#6F695F]">{booking.travelerEmail}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-white border border-[#DDD6CA] rounded-lg hover:bg-[#F0EBE3] transition-colors text-[#1A1814]">
              <MessageSquare size={12} /> Message
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-white border border-[#DDD6CA] rounded-lg hover:bg-[#F0EBE3] transition-colors text-[#1A1814]">
              <FileText size={12} /> Send instructions
            </button>
          </div>
        </div>

        {/* Service */}
        <div>
          <p className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-2">Service</p>
          <p className="text-sm font-medium text-[#1A1814]">{booking.service}</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { label: "Service date", value: booking.serviceDate },
              { label: "Party size", value: `${booking.partySize} guest${booking.partySize !== 1 ? "s" : ""}` },
              { label: "Booked on", value: booking.bookingDate },
              { label: "Source", value: booking.source },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[#6F695F]">{label}</p>
                <p className="text-sm font-medium text-[#1A1814] mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div>
          <p className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-2">Price Breakdown</p>
          <div className="bg-[#FAF8F4] rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#6F695F]">Service total</span>
              <span className="text-[#1A1814]">${booking.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6F695F]">Taxes & fees</span>
              <span className="text-[#1A1814]">Calculated at checkout</span>
            </div>
            <div className="border-t border-[#DDD6CA] pt-2 flex justify-between text-sm font-semibold">
              <span className="text-[#1A1814]">Total charged</span>
              <span className="text-[#1A1814]">${booking.total.toLocaleString()} {booking.currency}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-3">Booking Timeline</p>
          <div className="flex flex-col gap-3">
            {[
              { event: "Booking created", date: booking.bookingDate, done: true },
              { event: "Payment authorized", date: booking.bookingDate, done: ["paid", "authorized", "refunded"].includes(booking.paymentStatus) },
              { event: "Booking confirmed", date: booking.serviceDate, done: ["confirmed", "in_progress", "completed"].includes(booking.bookingStatus) },
              { event: "Service completed", date: booking.serviceDate, done: booking.bookingStatus === "completed" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${step.done ? "border-[#5F2FC9] bg-[#5F2FC9]" : "border-[#DDD6CA] bg-white"}`}>
                  {step.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={`text-sm ${step.done ? "text-[#1A1814] font-medium" : "text-[#6F695F]"}`}>{step.event}</p>
                  <p className="text-xs text-[#6F695F]">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {booking.bookingStatus === "pending_confirmation" && (
        <div className="border-t border-[#DDD6CA] p-4 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-[#5F2FC9] text-white rounded-lg hover:bg-[#4E26A8] transition-colors">
            <CheckCircle size={14} /> Confirm booking
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border border-[#DDD6CA] text-[#C83B3B] rounded-lg hover:bg-red-50 transition-colors">
            <X size={14} /> Decline
          </button>
        </div>
      )}
      {booking.bookingStatus === "confirmed" && (
        <div className="border-t border-[#DDD6CA] p-4 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-[#5F2FC9] text-white rounded-lg hover:bg-[#4E26A8] transition-colors">
            <CheckCircle size={14} /> Check in
          </button>
          <button className="p-2.5 border border-[#DDD6CA] rounded-lg text-[#6F695F] hover:bg-[#F0EBE3] transition-colors">
            <Download size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Bookings() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);

  const statuses = ["all", "confirmed", "pending_confirmation", "in_progress", "completed", "cancelled_by_traveler", "refunded"];
  const filtered = bookings.filter(b => {
    const matchSearch = b.reference.toLowerCase().includes(search.toLowerCase()) ||
      b.traveler.toLowerCase().includes(search.toLowerCase()) ||
      b.service.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.bookingStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Bookings</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">{bookings.length} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-white border border-[#DDD6CA] px-3 py-2 rounded-lg text-sm text-[#6F695F] hover:bg-[#FAF8F4] transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === s ? "bg-[#5F2FC9] text-white" : "bg-white text-[#6F695F] border border-[#DDD6CA] hover:bg-[#FAF8F4]"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${statusFilter === s ? "bg-white/20" : "bg-[#F0EBE3]"}`}>
                {s === "all" ? bookings.length : bookings.filter(b => b.bookingStatus === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F695F]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reference, traveler or service…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#DDD6CA] rounded-lg text-sm placeholder:text-[#6F695F] focus:outline-none focus:border-[#8C52FF]"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-[#DDD6CA] px-3 py-2 rounded-lg text-sm text-[#6F695F] hover:bg-[#FAF8F4] transition-colors">
            <Filter size={14} /> Filters
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                  {["Reference", "Traveler", "Service", "Service Date", "Guests", "Total", "Payment", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6F695F] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {filtered.map(b => (
                  <tr
                    key={b.id}
                    className="hover:bg-[#FAF8F4] cursor-pointer transition-colors"
                    onClick={() => setSelected(b)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-[#5F2FC9]">{b.reference}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                          {b.traveler.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm text-[#1A1814]">{b.traveler}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1A1814] max-w-[180px]"><span className="truncate block">{b.service}</span></td>
                    <td className="px-4 py-3 text-sm text-[#6F695F]">{b.serviceDate}</td>
                    <td className="px-4 py-3 text-sm text-[#1A1814]">{b.partySize}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#1A1814]">${b.total.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.paymentStatus} size="xs" /></td>
                    <td className="px-4 py-3"><StatusBadge status={b.bookingStatus} size="xs" /></td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className="text-[#6F695F]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <BookingDetailPanel booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
