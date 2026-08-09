import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type CellStatus = "open" | "limited" | "closed" | "booked";

const mockData: Record<string, CellStatus> = {
  "2026-08-08": "booked", "2026-08-09": "limited", "2026-08-10": "open",
  "2026-08-11": "open", "2026-08-12": "booked", "2026-08-13": "open",
  "2026-08-14": "limited", "2026-08-15": "open", "2026-08-16": "open",
  "2026-08-17": "closed", "2026-08-18": "booked", "2026-08-19": "open",
  "2026-08-20": "limited", "2026-08-21": "open", "2026-08-22": "booked",
  "2026-08-23": "open", "2026-08-24": "open", "2026-08-25": "closed",
  "2026-08-26": "open", "2026-08-27": "limited", "2026-08-28": "open",
  "2026-08-29": "open", "2026-08-30": "booked", "2026-08-31": "open",
};

const cellStyles: Record<CellStatus, string> = {
  open: "bg-green-50 border-green-200 text-green-700",
  limited: "bg-amber-50 border-amber-200 text-amber-700",
  closed: "bg-[#F0EBE3] border-[#DDD6CA] text-[#6F695F]",
  booked: "bg-purple-50 border-purple-200 text-purple-700",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function Availability() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7); // August
  const [selectedListing, setSelectedListing] = useState("Serengeti Safari — 3 Days");

  const listings = ["Serengeti Safari — 3 Days", "Ngorongoro Crater Day Tour", "Zanzibar Beach Villa — Sunset Suite"];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Availability & Inventory</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">Manage open, closed, and limited dates</p>
        </div>
        <button className="flex items-center gap-2 bg-[#5F2FC9] hover:bg-[#4E26A8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={15} /> Bulk update
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        {/* Listing Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {listings.map(l => (
            <button
              key={l}
              onClick={() => setSelectedListing(l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedListing === l ? "bg-[#5F2FC9] text-white" : "bg-white text-[#6F695F] border border-[#DDD6CA] hover:bg-[#FAF8F4]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-[#DDD6CA] p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1A1814]">{MONTHS[month]} {year}</h2>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-[#6F695F] py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const status: CellStatus = mockData[dateKey] ?? "open";
                const isToday = day === 8 && month === 7 && year === 2026;
                return (
                  <button
                    key={i}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-xs font-medium transition-all hover:scale-105 ${cellStyles[status]} ${isToday ? "ring-2 ring-[#8C52FF]" : ""}`}
                  >
                    <span className={`text-sm font-semibold ${isToday ? "text-[#5F2FC9]" : ""}`}>{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend + Actions */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
              <h3 className="text-sm font-semibold text-[#1A1814] mb-3">Legend</h3>
              <div className="flex flex-col gap-2">
                {([
                  { status: "open", label: "Open" },
                  { status: "limited", label: "Limited availability" },
                  { status: "booked", label: "Fully booked" },
                  { status: "closed", label: "Closed / Blocked" },
                ] as { status: CellStatus; label: string }[]).map(({ status, label }) => (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md border ${cellStyles[status]}`} />
                    <span className="text-sm text-[#6F695F]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
              <h3 className="text-sm font-semibold text-[#1A1814] mb-3">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                {[
                  "Open selected dates",
                  "Close selected dates",
                  "Set limited capacity",
                  "Block date range",
                  "Copy to next month",
                  "Set minimum stay",
                ].map(action => (
                  <button key={action} className="text-left text-sm text-[#5F2FC9] hover:text-[#4E26A8] font-medium py-1.5 border-b border-[#F0EBE3] last:border-0 transition-colors">
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#EDE5FF] rounded-xl border border-purple-200 p-4">
              <p className="text-xs font-semibold text-[#5F2FC9] mb-1">August summary</p>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6F695F]">Open days</span>
                  <span className="font-medium text-[#1A1814]">18</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6F695F]">Booked days</span>
                  <span className="font-medium text-[#1A1814]">7</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6F695F]">Closed days</span>
                  <span className="font-medium text-[#1A1814]">2</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6F695F]">Limited</span>
                  <span className="font-medium text-[#1A1814]">4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
