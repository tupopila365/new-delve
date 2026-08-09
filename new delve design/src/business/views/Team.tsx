import { useState } from "react";
import { UserPlus, MoreHorizontal, Mail, Shield, CheckCircle, Clock } from "lucide-react";
import { teamMembers } from "../data/mock";
import { StatusBadge } from "../components/ui/StatusBadge";

const roleColors: Record<string, string> = {
  "Business Owner": "bg-purple-100 text-purple-700",
  "Operations Manager": "bg-blue-50 text-blue-700",
  "Booking Manager": "bg-green-50 text-green-700",
  "Transport Dispatcher": "bg-amber-50 text-amber-700",
  "Customer Support Agent": "bg-gray-100 text-gray-700",
  "Finance Manager": "bg-teal-50 text-teal-700",
};

export default function Team() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Team & Permissions</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">{teamMembers.length} team members</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-[#5F2FC9] hover:bg-[#4E26A8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus size={15} /> Invite member
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        {/* Team Table */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                {["Member", "Role", "Assigned to", "Last active", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6F695F] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {teamMembers.map(m => (
                <tr key={m.id} className="hover:bg-[#FAF8F4] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">{m.avatar}</div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1814]">{m.name}</p>
                        <p className="text-xs text-[#6F695F]">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[m.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.assignedLocations.map(loc => (
                        <span key={loc} className="text-xs text-[#6F695F] bg-[#F0EBE3] px-1.5 py-0.5 rounded">{loc}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs text-[#6F695F]">
                      {m.status === "active" ? <CheckCircle size={11} className="text-green-600" /> : <Clock size={11} className="text-amber-600" />}
                      {m.lastActive}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} size="xs" /></td>
                  <td className="px-4 py-3">
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permissions Matrix */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DDD6CA] flex items-center gap-2">
            <Shield size={16} className="text-[#5F2FC9]" />
            <h2 className="text-base font-semibold text-[#1A1814]">Role permissions overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DDD6CA] bg-[#FAF8F4]">
                  <th className="px-4 py-2 font-semibold text-[#6F695F]">Module</th>
                  {["Owner", "Admin", "Ops", "Bookings", "Finance", "Support"].map(r => (
                    <th key={r} className="px-3 py-2 font-semibold text-[#6F695F] text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {[
                  { module: "Listings", access: [true, true, true, false, false, false] },
                  { module: "Deals", access: [true, true, true, false, false, false] },
                  { module: "Bookings", access: [true, true, true, true, false, true] },
                  { module: "Payments", access: [true, true, false, false, true, false] },
                  { module: "Analytics", access: [true, true, true, false, true, false] },
                  { module: "Team", access: [true, true, false, false, false, false] },
                  { module: "Settings", access: [true, false, false, false, false, false] },
                ].map(row => (
                  <tr key={row.module} className="hover:bg-[#FAF8F4]">
                    <td className="px-4 py-2.5 font-medium text-[#1A1814]">{row.module}</td>
                    {row.access.map((has, i) => (
                      <td key={i} className="px-3 py-2.5 text-center">
                        {has
                          ? <CheckCircle size={13} className="text-green-600 mx-auto" />
                          : <span className="text-[#DDD6CA]">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-[#6F695F] border-t border-[#F0EBE3]">
            Permissions are managed by the backend. Contact Delve support if you need custom roles.
          </p>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#DDD6CA] shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[#1A1814] mb-1">Invite team member</h2>
            <p className="text-sm text-[#6F695F] mb-5">They will receive an email invitation to join your business on Delve.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-1.5 block">Email address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F695F]" />
                  <input placeholder="colleague@example.com" className="w-full pl-9 pr-3 py-2.5 border border-[#DDD6CA] rounded-lg text-sm focus:outline-none focus:border-[#8C52FF]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-1.5 block">Role</label>
                <select className="w-full px-3 py-2.5 border border-[#DDD6CA] rounded-lg text-sm focus:outline-none focus:border-[#8C52FF] bg-white text-[#1A1814]">
                  <option>Booking Manager</option>
                  <option>Operations Manager</option>
                  <option>Finance Manager</option>
                  <option>Customer Support Agent</option>
                  <option>Transport Dispatcher</option>
                  <option>Check-in Staff</option>
                  <option>Analyst</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 border border-[#DDD6CA] rounded-lg text-sm font-medium text-[#6F695F] hover:bg-[#FAF8F4] transition-colors">
                  Cancel
                </button>
                <button className="flex-1 py-2.5 bg-[#5F2FC9] text-white rounded-lg text-sm font-medium hover:bg-[#4E26A8] transition-colors">
                  Send invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
