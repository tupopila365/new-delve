import {
  TrendingUp, TrendingDown, Calendar, Star, MessageSquare, DollarSign,
  Eye, ShoppingBag, AlertTriangle, Info, Plus, Tag, Car,
  CheckCircle, ArrowRight, Zap, BarChart2, Users, Bell
} from "lucide-react";
import { business, metrics, revenueChart, alerts, upcomingServices, bookings, reviews } from "../data/mock";
import { AreaSpark } from "../components/Charts";

function MetricCard({
  label, value, prev, prefix = "", suffix = "", icon: Icon, color = "purple"
}: {
  label: string; value: number | string; prev?: number; prefix?: string; suffix?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>; color?: string;
}) {
  const numValue = typeof value === "number" ? value : parseFloat(String(value));
  const prevNum = typeof prev === "number" ? prev : undefined;
  const change = prevNum !== undefined ? ((numValue - prevNum) / prevNum) * 100 : null;
  const up = change !== null && change >= 0;
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-600",
  };

  const fmt = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl border border-[#DDD6CA] p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        {change !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#1A1814" }}>
          {prefix}{typeof value === "number" ? fmt(numValue) : value}{suffix}
        </p>
        <p className="text-xs text-[#6F695F] mt-1">{label}</p>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: typeof alerts[0] }) {
  const styles = {
    warning: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600", btn: "text-amber-700 hover:text-amber-900" },
    info: { bg: "bg-blue-50 border-blue-200", icon: "text-blue-600", btn: "text-blue-700 hover:text-blue-900" },
    error: { bg: "bg-red-50 border-red-200", icon: "text-red-600", btn: "text-red-700 hover:text-red-900" },
  };
  const s = styles[alert.type] || styles.info;
  const IconComp = alert.type === "warning" ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3.5 ${s.bg}`}>
      <IconComp size={16} className={`mt-0.5 shrink-0 ${s.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1814]">{alert.title}</p>
        <p className="text-xs text-[#6F695F] mt-0.5">{alert.description}</p>
      </div>
      <button className={`text-xs font-medium shrink-0 ${s.btn}`}>{alert.action}</button>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-[#DDD6CA] hover:border-[#8C52FF] hover:bg-purple-50 transition-all group"
    >
      <div className="w-8 h-8 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-[#5F2FC9] transition-colors">
        <Icon size={16} />
      </div>
      <span className="text-xs font-medium text-[#1A1814] text-center leading-tight">{label}</span>
    </button>
  );
}

export default function Dashboard({
  onNavigate,
  onOpenBuilder,
}: {
  onNavigate: (section: string) => void
  onOpenBuilder?: (req: { kind: 'listing' | 'deal' | 'transport' }) => void
}) {
  const recentBookings = bookings.slice(0, 4);
  const recentReviews = reviews.slice(0, 2);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1814]">Good morning, Zawadi</h1>
          <p className="text-sm text-[#6F695F] mt-1">{business.displayName} · Arusha, Tanzania · August 8, 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-sm font-medium text-[#1A1814] bg-white border border-[#DDD6CA] px-3 py-2 rounded-lg hover:bg-[#FAF8F4] transition-colors">
            <Calendar size={14} />
            Last 30 days
          </button>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs font-medium">
            <CheckCircle size={12} />
            Business verified
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
        </div>
      )}

      {/* Key Metrics */}
      <div>
        <h2 className="text-sm font-semibold text-[#6F695F] uppercase tracking-wide mb-3">Performance overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Revenue this period" value={metrics.revenueTotal} prev={metrics.revenuePrev} prefix="$" icon={DollarSign} color="green" />
          <MetricCard label="Confirmed bookings" value={metrics.bookingsConfirmed} prev={metrics.bookingsPrev} icon={ShoppingBag} color="purple" />
          <MetricCard label="Listing views" value={metrics.listingViews} prev={metrics.viewsPrev} icon={Eye} color="blue" />
          <MetricCard label="Average rating" value={metrics.averageRating} prev={metrics.ratingPrev} suffix="/5" icon={Star} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <MetricCard label="Conversion rate" value={`${metrics.conversionRate}%`} icon={BarChart2} color="purple" />
        <MetricCard label="Pending requests" value={metrics.bookingsPending} icon={Bell} color="amber" />
        <MetricCard label="Unread messages" value={metrics.unreadMessages} icon={MessageSquare} color="blue" />
        <MetricCard label="Active deals" value={metrics.activeDeals} icon={Tag} color="green" />
      </div>

      {/* Revenue Chart + Today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#DDD6CA] p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-[#1A1814]">Revenue & Bookings</h2>
            <span className="text-xs text-[#6F695F]">Last 6 months</span>
          </div>
          <AreaSpark
            data={revenueChart.map(d => ({ label: d.month, value: d.revenue }))}
            height={200}
            formatY={v => `$${(v / 1000).toFixed(0)}k`}
          />
        </div>

        <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1A1814]">Today's Schedule</h2>
            <button className="text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium">Full calendar</button>
          </div>
          <div className="flex flex-col gap-3">
            {upcomingServices.map((svc, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <span className="text-xs font-semibold text-[#8C52FF] whitespace-nowrap">{svc.time}</span>
                  {i < upcomingServices.length - 1 && (
                    <div className="w-px h-8 bg-[#DDD6CA] mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1814] truncate">{svc.service}</p>
                  <p className="text-xs text-[#6F695F]">{svc.traveler}</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    svc.status === "in_progress" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {svc.status === "in_progress" ? "In progress" : "Confirmed"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#F0EBE3]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#6F695F]">Available payout</span>
              <span className="text-sm font-bold text-[#1A1814]">${business.payoutBalance.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6F695F]">Next payout</span>
              <span className="text-xs font-medium text-[#1A1814]">{business.nextPayout}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings + Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#DDD6CA]">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold text-[#1A1814]">Recent Bookings</h2>
            <button onClick={() => onNavigate("bookings")} className="flex items-center gap-1 text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#F0EBE3]">
            {recentBookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F4] transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                  {b.traveler.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1814] truncate">{b.traveler}</p>
                  <p className="text-xs text-[#6F695F] truncate">{b.service}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#1A1814]">${b.total.toLocaleString()}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    b.bookingStatus === "confirmed" ? "bg-green-50 text-green-700" :
                    b.bookingStatus === "in_progress" ? "bg-purple-50 text-purple-700" :
                    b.bookingStatus === "completed" ? "bg-green-50 text-green-700" :
                    b.bookingStatus === "pending_confirmation" ? "bg-blue-50 text-blue-700" :
                    "bg-red-50 text-red-600"
                  }`}>
                    {b.bookingStatus === "pending_confirmation" ? "Awaiting confirm" :
                     b.bookingStatus === "in_progress" ? "In progress" :
                     b.bookingStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DDD6CA]">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1A1814]">Recent Reviews</h2>
              <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                <Star size={14} fill="currentColor" /> {metrics.averageRating}
              </span>
            </div>
            <button onClick={() => onNavigate("reviews")} className="flex items-center gap-1 text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#F0EBE3]">
            {recentReviews.map(r => (
              <div key={r.id} className="px-5 py-3 hover:bg-[#FAF8F4] transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                    {r.traveler.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="text-sm font-medium text-[#1A1814]">{r.traveler}</span>
                  <div className="flex gap-0.5 ml-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < r.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[#6F695F] line-clamp-2">{r.text}</p>
                {!r.hasResponse && (
                  <button className="mt-2 text-xs text-[#8C52FF] hover:text-[#5F2FC9] font-medium">Respond to review</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-[#8C52FF]" />
          <h2 className="text-base font-semibold text-[#1A1814]">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          <QuickAction icon={Plus} label="Create listing" onClick={() => (onOpenBuilder ? onOpenBuilder({ kind: 'listing' }) : onNavigate("listings"))} />
          <QuickAction icon={Tag} label="Create deal" onClick={() => (onOpenBuilder ? onOpenBuilder({ kind: 'deal' }) : onNavigate("deals"))} />
          <QuickAction icon={Car} label="Add transport" onClick={() => (onOpenBuilder ? onOpenBuilder({ kind: 'transport' }) : onNavigate("transport"))} />
          <QuickAction icon={Calendar} label="Update availability" onClick={() => onNavigate("availability")} />
          <QuickAction icon={ShoppingBag} label="View bookings" onClick={() => onNavigate("bookings")} />
          <QuickAction icon={MessageSquare} label="Send update" onClick={() => onNavigate("messages")} />
          <QuickAction icon={Users} label="Invite team" onClick={() => onNavigate("team")} />
        </div>
      </div>
    </div>
  );
}
