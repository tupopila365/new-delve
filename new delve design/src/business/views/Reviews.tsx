import { useState } from "react";
import { Star, ThumbsUp, Flag, ChevronDown, CheckCircle } from "lucide-react";
import { reviews, metrics } from "../data/mock";

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < rating ? "text-amber-500 fill-amber-500" : "text-gray-200 fill-gray-200"} />
      ))}
    </div>
  );
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#6F695F] w-6 shrink-0">{rating}★</span>
      <div className="flex-1 h-1.5 bg-[#F0EBE3] rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#6F695F] w-5 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function Reviews() {
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [showReply, setShowReply] = useState<Record<string, boolean>>({});

  const total = reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: reviews.filter(rv => rv.rating === r).length }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#DDD6CA] bg-white">
        <div>
          <h1 className="text-xl font-bold text-[#1A1814]">Reviews</h1>
          <p className="text-sm text-[#6F695F] mt-0.5">{total} verified reviews</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-[#DDD6CA] p-5">
          <div className="flex items-start gap-8 flex-wrap">
            <div className="text-center">
              <p className="text-5xl font-bold text-[#1A1814]" style={{ fontFamily: "Syne, sans-serif" }}>{metrics.averageRating}</p>
              <StarRating rating={Math.round(metrics.averageRating)} size={16} />
              <p className="text-xs text-[#6F695F] mt-1">{total} reviews</p>
            </div>
            <div className="flex-1 min-w-[180px] flex flex-col gap-2">
              {ratingCounts.map(({ rating, count }) => (
                <RatingBar key={rating} rating={rating} count={count} total={total} />
              ))}
            </div>
          </div>
        </div>

        {/* Review Cards */}
        <div className="flex flex-col gap-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-[#DDD6CA] p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {r.traveler.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1A1814]">{r.traveler}</p>
                      {r.verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={9} /> Verified booking
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6F695F]">{r.service} · {r.date}</p>
                  </div>
                </div>
                <StarRating rating={r.rating} size={13} />
              </div>

              <p className="text-sm text-[#1A1814] leading-relaxed">{r.text}</p>

              {/* Category ratings */}
              {r.categories && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {Object.entries(r.categories).filter(([, v]) => v !== null).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="text-xs text-[#6F695F] capitalize">{key}</span>
                      <StarRating rating={val as number} size={10} />
                    </div>
                  ))}
                </div>
              )}

              {/* Response */}
              {r.hasResponse && r.responseText && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-[#5F2FC9] mb-1">Response from Serengeti Horizons</p>
                  <p className="text-xs text-[#1A1814] leading-relaxed">{r.responseText}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#F0EBE3]">
                {!r.hasResponse && (
                  <button
                    onClick={() => setShowReply(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#8C52FF] hover:text-[#5F2FC9] transition-colors"
                  >
                    <ThumbsUp size={12} /> Respond
                    <ChevronDown size={11} className={`transition-transform ${showReply[r.id] ? "rotate-180" : ""}`} />
                  </button>
                )}
                <button className="flex items-center gap-1.5 text-xs text-[#6F695F] hover:text-red-600 transition-colors ml-auto">
                  <Flag size={12} /> Report
                </button>
              </div>

              {showReply[r.id] && !r.hasResponse && (
                <div className="mt-3">
                  <textarea
                    value={replyDraft[r.id] ?? ""}
                    onChange={e => setReplyDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Write a public response to this review…"
                    rows={3}
                    className="w-full bg-[#FAF8F4] border border-[#DDD6CA] rounded-lg p-3 text-sm text-[#1A1814] placeholder:text-[#6F695F] focus:outline-none focus:border-[#8C52FF] resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1.5 bg-[#5F2FC9] text-white text-xs font-medium rounded-lg hover:bg-[#4E26A8] transition-colors">
                      Post response
                    </button>
                    <button onClick={() => setShowReply(prev => ({ ...prev, [r.id]: false }))} className="px-3 py-1.5 text-xs text-[#6F695F] hover:text-[#1A1814] font-medium">
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-[#6F695F] mt-1.5">Your response will be visible to all travelers on the listing page.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
