type StatusVariant =
  | "published" | "draft" | "in_review" | "paused" | "archived" | "rejected" | "changes_requested" | "unavailable"
  | "active" | "scheduled" | "expired" | "ended"
  | "confirmed" | "pending_confirmation" | "in_progress" | "completed" | "cancelled_by_traveler" | "cancelled_by_provider" | "no_show" | "refund_pending" | "refunded" | "disputed"
  | "paid" | "authorized" | "paid_out" | "payout_pending" | "failed" | "chargeback"
  | "approved" | "pending" | "not_submitted" | "limited"
  | "verified" | "invited" | "inactive"
  | string;

const statusMap: Record<string, { label: string; style: string }> = {
  published: { label: "Published", style: "bg-green-50 text-green-700 border border-green-200" },
  active: { label: "Active", style: "bg-green-50 text-green-700 border border-green-200" },
  completed: { label: "Completed", style: "bg-green-50 text-green-700 border border-green-200" },
  approved: { label: "Approved", style: "bg-green-50 text-green-700 border border-green-200" },
  paid: { label: "Paid", style: "bg-green-50 text-green-700 border border-green-200" },
  paid_out: { label: "Paid Out", style: "bg-green-50 text-green-700 border border-green-200" },
  verified: { label: "Verified", style: "bg-green-50 text-green-700 border border-green-200" },

  draft: { label: "Draft", style: "bg-gray-100 text-gray-600 border border-gray-200" },
  not_submitted: { label: "Not submitted", style: "bg-gray-100 text-gray-600 border border-gray-200" },
  inactive: { label: "Inactive", style: "bg-gray-100 text-gray-600 border border-gray-200" },
  archived: { label: "Archived", style: "bg-gray-100 text-gray-600 border border-gray-200" },

  in_review: { label: "In Review", style: "bg-blue-50 text-blue-700 border border-blue-200" },
  pending: { label: "Pending", style: "bg-blue-50 text-blue-700 border border-blue-200" },
  pending_confirmation: { label: "Awaiting Confirm", style: "bg-blue-50 text-blue-700 border border-blue-200" },
  authorized: { label: "Authorized", style: "bg-blue-50 text-blue-700 border border-blue-200" },
  payout_pending: { label: "Payout Pending", style: "bg-blue-50 text-blue-700 border border-blue-200" },
  scheduled: { label: "Scheduled", style: "bg-blue-50 text-blue-700 border border-blue-200" },
  invited: { label: "Invited", style: "bg-blue-50 text-blue-700 border border-blue-200" },

  in_progress: { label: "In Progress", style: "bg-purple-50 text-purple-700 border border-purple-200" },

  paused: { label: "Paused", style: "bg-amber-50 text-amber-700 border border-amber-200" },
  changes_requested: { label: "Changes Requested", style: "bg-amber-50 text-amber-700 border border-amber-200" },
  refund_pending: { label: "Refund Pending", style: "bg-amber-50 text-amber-700 border border-amber-200" },
  limited: { label: "Limited", style: "bg-amber-50 text-amber-700 border border-amber-200" },

  rejected: { label: "Rejected", style: "bg-red-50 text-red-700 border border-red-200" },
  unavailable: { label: "Unavailable", style: "bg-red-50 text-red-700 border border-red-200" },
  cancelled_by_traveler: { label: "Cancelled", style: "bg-red-50 text-red-700 border border-red-200" },
  cancelled_by_provider: { label: "Cancelled by you", style: "bg-red-50 text-red-700 border border-red-200" },
  no_show: { label: "No Show", style: "bg-red-50 text-red-700 border border-red-200" },
  refunded: { label: "Refunded", style: "bg-red-50 text-red-700 border border-red-200" },
  disputed: { label: "Disputed", style: "bg-red-50 text-red-700 border border-red-200" },
  failed: { label: "Failed", style: "bg-red-50 text-red-700 border border-red-200" },
  chargeback: { label: "Chargeback", style: "bg-red-50 text-red-700 border border-red-200" },
  expired: { label: "Expired", style: "bg-gray-100 text-gray-500 border border-gray-200" },
  maintenance: { label: "Maintenance", style: "bg-amber-50 text-amber-700 border border-amber-200" },
};

export function StatusBadge({ status, size = "sm" }: { status: StatusVariant; size?: "xs" | "sm" }) {
  const entry = statusMap[status] ?? { label: status, style: "bg-gray-100 text-gray-600 border border-gray-200" };
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${padding} ${entry.style}`}>
      {entry.label}
    </span>
  );
}
