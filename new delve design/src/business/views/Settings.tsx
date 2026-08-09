import { useState } from "react";
import { Building, MapPin, CreditCard, Shield, Bell, Globe, LogOut, AlertTriangle, ChevronRight } from "lucide-react";
import { business } from "../data/mock";

const sections = [
  { id: "profile", label: "Business profile", icon: Building },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "payout", label: "Payout method", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Globe },
];

function InputField({ label, value, type = "text", hint }: { label: string; value: string; type?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide">{label}</label>
      <input
        type={type}
        defaultValue={value}
        className="px-3 py-2.5 border border-[#DDD6CA] rounded-lg text-sm text-[#1A1814] focus:outline-none focus:border-[#8C52FF] bg-white"
      />
      {hint && <p className="text-xs text-[#6F695F]">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <h1 className="text-xl font-bold text-[#1A1814]">Business Settings</h1>
        <p className="text-sm text-[#6F695F] mt-0.5">Manage your business profile and preferences</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Nav */}
        <div className="w-56 border-r border-[#DDD6CA] bg-white py-4 shrink-0 overflow-y-auto">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                activeSection === s.id
                  ? "bg-purple-50 text-[#5F2FC9] border-r-2 border-[#5F2FC9]"
                  : "text-[#6F695F] hover:bg-[#FAF8F4] hover:text-[#1A1814]"
              }`}
            >
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
          <div className="px-4 py-2 mt-4 border-t border-[#F0EBE3]">
            <button className="flex items-center gap-2.5 w-full py-2.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
              <AlertTriangle size={15} /> Deactivate business
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === "profile" && (
            <div className="max-w-2xl flex flex-col gap-6">
              <div>
                <h2 className="text-base font-semibold text-[#1A1814] mb-4">Business Profile</h2>
                <div className="bg-white rounded-xl border border-[#DDD6CA] p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-[#F0EBE3]">
                    <div className="w-16 h-16 rounded-xl bg-purple-100 text-purple-700 text-xl font-bold flex items-center justify-center">
                      {business.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1814]">{business.displayName}</p>
                      <p className="text-xs text-[#6F695F]">{business.categories.join(" · ")}</p>
                      <button className="mt-1 text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium">Upload logo</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Legal business name" value={business.legalName} />
                    <InputField label="Display name" value={business.displayName} hint="Shown to travelers on Delve" />
                    <InputField label="Business email" value="info@serengetihorizons.com" type="email" />
                    <InputField label="Business phone" value="+255 784 000 000" type="tel" />
                    <InputField label="Website" value="https://serengetihorizons.com" type="url" />
                    <InputField label="Country" value="Tanzania" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6F695F] uppercase tracking-wide mb-1.5 block">Business description</label>
                    <textarea
                      rows={3}
                      defaultValue="Serengeti Horizons is a leading safari and travel company based in Arusha, Tanzania. We offer premium wildlife safaris, cultural experiences, and accommodation across East Africa."
                      className="w-full px-3 py-2.5 border border-[#DDD6CA] rounded-lg text-sm text-[#1A1814] focus:outline-none focus:border-[#8C52FF] resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button className="px-4 py-2 bg-[#5F2FC9] text-white text-sm font-medium rounded-lg hover:bg-[#4E26A8] transition-colors">
                      Save changes
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#1A1814] mb-4">Verification Status</h2>
                <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1A1814]">Business identity verified</p>
                      <p className="text-xs text-[#6F695F] mt-0.5">All required documents approved · Last reviewed Jan 2026</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      ✓ Verified
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {["Business registration", "Owner ID", "Operating permit", "Insurance certificate"].map(doc => (
                      <div key={doc} className="flex items-center gap-2 text-xs text-green-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "payout" && (
            <div className="max-w-2xl flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[#1A1814]">Payout Method</h2>
              <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1814]">CRDB Bank Tanzania</p>
                    <p className="text-xs text-[#6F695F]">Account ending ••••3841 · USD</p>
                    <p className="text-xs text-green-600 mt-0.5">Verified · Active</p>
                  </div>
                  <button className="text-sm text-[#8C52FF] hover:text-[#5F2FC9] font-medium">Update</button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  Never share your full bank account or card details in this interface. Delve and its payment partner hold account data securely.
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
                <h3 className="text-sm font-semibold text-[#1A1814] mb-3">Payout Schedule</h3>
                <p className="text-sm text-[#6F695F]">Payouts are processed automatically every 7 days for confirmed and completed bookings. Funds typically arrive within 2–5 business days depending on your bank.</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-[#6F695F]">Next scheduled payout:</span>
                  <span className="text-xs font-semibold text-[#1A1814]">{business.nextPayout}</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="max-w-2xl flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[#1A1814]">Notification Preferences</h2>
              <div className="bg-white rounded-xl border border-[#DDD6CA] divide-y divide-[#F0EBE3]">
                {[
                  { label: "New booking requests", email: true, push: true },
                  { label: "Booking confirmations", email: true, push: false },
                  { label: "Traveler messages", email: true, push: true },
                  { label: "New reviews", email: true, push: false },
                  { label: "Payout processed", email: true, push: true },
                  { label: "Document expiry warnings", email: true, push: true },
                  { label: "Weekly performance summary", email: true, push: false },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-[#1A1814]">{n.label}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-[#6F695F] cursor-pointer">
                        <input type="checkbox" defaultChecked={n.email} className="w-3.5 h-3.5 accent-[#5F2FC9]" />
                        Email
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#6F695F] cursor-pointer">
                        <input type="checkbox" defaultChecked={n.push} className="w-3.5 h-3.5 accent-[#5F2FC9]" />
                        Push
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="max-w-2xl flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[#1A1814]">Security</h2>
              <div className="bg-white rounded-xl border border-[#DDD6CA] divide-y divide-[#F0EBE3]">
                {[
                  { label: "Change password", desc: "Last changed 90 days ago" },
                  { label: "Two-factor authentication", desc: "Enabled via authenticator app" },
                  { label: "Active sessions", desc: "2 active sessions" },
                  { label: "Login history", desc: "View recent login activity" },
                ].map(item => (
                  <button key={item.label} className="flex items-center justify-between w-full px-5 py-4 hover:bg-[#FAF8F4] transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-[#1A1814]">{item.label}</p>
                      <p className="text-xs text-[#6F695F]">{item.desc}</p>
                    </div>
                    <ChevronRight size={15} className="text-[#6F695F]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {["locations", "integrations"].includes(activeSection) && (
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold text-[#1A1814] mb-4">{sections.find(s => s.id === activeSection)?.label}</h2>
              <div className="bg-white rounded-xl border border-[#DDD6CA] p-8 text-center">
                <p className="text-sm text-[#6F695F]">Settings for this section will be available in the next update.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
