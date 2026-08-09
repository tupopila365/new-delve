import { useState } from "react";
import { Info, Download, TrendingUp, TrendingDown } from "lucide-react";
import { revenueChart, metrics } from "../data/mock";
import { AreaSpark, DualBarChart, DonutChart } from "../components/Charts";

const bookingsChart = revenueChart.map((d, i) => ({
  label: d.month,
  a: d.bookings - (8 + (i % 5) * 3),
  b: d.bookings,
}));

const sourceData = [
  { name: "Direct — Delve app", value: 68 },
  { name: "Delve web", value: 22 },
  { name: "Referral", value: 10 },
];

const COLORS = ["#5F2FC9", "#8C52FF", "#C4A8FF"];

function StatTile({ label, value, change, prefix = "", suffix = "" }: {
  label: string; value: number | string; change?: number; prefix?: string; suffix?: string;
}) {
  const up = change !== undefined && change >= 0;
  return (
    <div className="bg-white rounded-xl border border-[#DDD6CA] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6F695F] flex items-center gap-1">{label} <Info size={11} className="text-[#DDD6CA]" /></p>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[#1A1814]">{prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}</p>
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState("30d");
  const periods = ["7d", "30d", "90d", "12m"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Analytics</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">Decision-focused performance data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#DDD6CA] rounded-lg overflow-hidden bg-white">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-[#5F2FC9] text-white" : "text-[#6F695F] hover:bg-[#FAF8F4]"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 bg-white border border-[#DDD6CA] px-3 py-2 rounded-lg text-sm text-[#6F695F] hover:bg-[#FAF8F4] transition-colors">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Revenue" value={metrics.revenueTotal} change={17.2} prefix="$" />
          <StatTile label="Bookings" value={metrics.bookingsConfirmed} change={10.9} />
          <StatTile label="Avg booking value" value={340} change={5.4} prefix="$" />
          <StatTile label="Cancellation rate" value={`${metrics.cancellationRate}%`} change={-0.8} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Listing views" value={metrics.listingViews} change={24.0} />
          <StatTile label="Conversion rate" value={`${metrics.conversionRate}%`} change={10.3} />
          <StatTile label="Avg rating" value={`${metrics.averageRating}/5`} change={2.1} />
          <StatTile label="Occupancy rate" value={`${metrics.occupancyRate}%`} change={8.5} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
            <h2 className="text-sm font-semibold text-[#1A1814] mb-4">Revenue trend</h2>
            <AreaSpark
              data={revenueChart.map(d => ({ label: d.month, value: d.revenue }))}
              height={200}
              formatY={v => `$${(v / 1000).toFixed(0)}k`}
            />
          </div>

          <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
            <h2 className="text-sm font-semibold text-[#1A1814] mb-4">Bookings vs. previous period</h2>
            <DualBarChart data={bookingsChart} height={200} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
            <h2 className="text-sm font-semibold text-[#1A1814] mb-4">Booking source</h2>
            <div className="flex flex-col items-center">
              <DonutChart data={sourceData} colors={COLORS} />
              <div className="flex flex-col gap-2 w-full mt-2">
                {sourceData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-xs text-[#6F695F]">{entry.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1A1814]">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-xl border border-[#DDD6CA] p-5">
            <h2 className="text-sm font-semibold text-[#1A1814] mb-4">Top listings by revenue</h2>
            <div className="flex flex-col gap-3">
              {[
                { name: "Serengeti Safari — 3 Days", bookings: 68, revenue: 68_000, change: 12 },
                { name: "Ngorongoro Crater Day Tour", bookings: 44, revenue: 16_720, change: 8 },
                { name: "Zanzibar Beach Villa — Sunset Suite", bookings: 22, revenue: 7_040, change: 22 },
              ].map((listing, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1814] truncate">{listing.name}</p>
                    <p className="text-xs text-[#6F695F]">{listing.bookings} bookings</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1A1814]">${listing.revenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">+{listing.change}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-[#6F695F] text-center">
          Analytics data may reflect a 24–48 hour delay. Data is informational and not financial advice.
        </p>
      </div>
    </div>
  );
}
