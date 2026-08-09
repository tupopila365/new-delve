import { Search, Shield, Info } from "lucide-react";
import { bookings } from "../data/mock";

const customers = [
  ...new Map(bookings.map(b => [b.travelerEmail, {
    name: b.traveler,
    email: b.travelerEmail,
    bookings: bookings.filter(x => x.travelerEmail === b.travelerEmail).length,
    totalSpend: bookings.filter(x => x.travelerEmail === b.travelerEmail).reduce((s, x) => s + x.total, 0),
    lastBooking: bookings.filter(x => x.travelerEmail === b.travelerEmail).sort((a, c) => c.serviceDate.localeCompare(a.serviceDate))[0]?.serviceDate,
    avatar: b.traveler.split(" ").map(n => n[0]).join(""),
  }])).values()
];

export default function Customers() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Customers</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">Travelers who have booked with your business</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        {/* Privacy Notice */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Shield size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Privacy notice</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Only information shared during the booking process is displayed. Personal traveler profile data not shared for a booking is not accessible to your business. Handle all customer data in accordance with your data retention policy.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F695F]" />
          <input
            placeholder="Search customers…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DDD6CA] rounded-lg text-sm placeholder:text-[#6F695F] focus:outline-none focus:border-[#8C52FF]"
          />
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                {["Customer", "Bookings", "Total spend", "Last booking", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6F695F] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {customers.map(c => (
                <tr key={c.email} className="hover:bg-[#FAF8F4] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">{c.avatar}</div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1814]">{c.name}</p>
                        <p className="text-xs text-[#6F695F]">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1A1814]">{c.bookings}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[#1A1814]">${c.totalSpend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-[#6F695F]">{c.lastBooking}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium">View bookings</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#6F695F]">
          <Info size={12} /> Customer data is subject to Delve's data retention policy. Notes added here are visible to your team members.
        </div>
      </div>
    </div>
  );
}
