"""Required verification documents by business type (mirrors frontend providerOnboarding)."""

from __future__ import annotations

from .models import BusinessProfile, VerificationDocumentType

# Required doc_type ids per service. Optional docs are omitted.
_ACCOMMODATION = (
    VerificationDocumentType.BUSINESS_REGISTRATION,
    VerificationDocumentType.TOURISM_LICENSE,
)
_GUIDE = (
    VerificationDocumentType.NATIONAL_ID,
    VerificationDocumentType.TOUR_GUIDE_LICENSE,
    VerificationDocumentType.FIRST_AID_CERT,
)
_FOOD = (VerificationDocumentType.BUSINESS_REGISTRATION,)
_RETAIL = (VerificationDocumentType.BUSINESS_REGISTRATION,)
_ACTIVITY = (VerificationDocumentType.BUSINESS_REGISTRATION,)
_TRANSPORT_RENTAL = (
    VerificationDocumentType.BUSINESS_REGISTRATION,
    VerificationDocumentType.OPERATING_PERMIT,
    VerificationDocumentType.TRANSPORT_INSURANCE,
    VerificationDocumentType.VEHICLE_REGISTRATION,
)
_TRANSPORT_SHARED = (
    VerificationDocumentType.BUSINESS_REGISTRATION,
    VerificationDocumentType.OPERATING_PERMIT,
    VerificationDocumentType.TRANSPORT_INSURANCE,
    VerificationDocumentType.VEHICLE_REGISTRATION,
    VerificationDocumentType.FIRE_SAFETY_CERT,
)

# Services that always need verification before submit is meaningful.
MANDATORY_VERIFY_TYPES = frozenset({"accommodation", "transport", "guide"})

DOC_LABELS = {choice.value: choice.label for choice in VerificationDocumentType}


def required_doc_types_for_business(business: BusinessProfile) -> list[str]:
    """Return unique required document type ids for this business."""
    types = [str(t) for t in (business.business_types or [])]
    modes = [str(m) for m in (business.transport_modes or [])]
    seen: set[str] = set()
    ordered: list[str] = []

    def add(ids: tuple[str, ...]) -> None:
        for doc_id in ids:
            if doc_id not in seen:
                seen.add(doc_id)
                ordered.append(doc_id)

    for svc in types:
        if svc == "transport":
            if "rental" in modes:
                add(_TRANSPORT_RENTAL)
            if "shared" in modes:
                add(_TRANSPORT_SHARED)
            # Transport selected but modes not set yet — require registration + permit minimum.
            if not modes:
                add(
                    (
                        VerificationDocumentType.BUSINESS_REGISTRATION,
                        VerificationDocumentType.OPERATING_PERMIT,
                    )
                )
        elif svc == "accommodation":
            add(_ACCOMMODATION)
        elif svc == "guide":
            add(_GUIDE)
        elif svc == "food_drink":
            add(_FOOD)
        elif svc == "retail_shop":
            add(_RETAIL)
        elif svc == "activity":
            add(_ACTIVITY)

    return ordered


def missing_required_documents(business: BusinessProfile) -> list[str]:
    """Return required doc type ids that have no uploaded file yet."""
    required = required_doc_types_for_business(business)
    if not required:
        # No typed requirements (e.g. empty types) — caller still enforces ≥1 doc.
        return []
    uploaded = set(
        business.verification_documents.values_list("doc_type", flat=True)
    )
    return [doc_id for doc_id in required if doc_id not in uploaded]


def missing_required_detail(business: BusinessProfile) -> str | None:
    missing = missing_required_documents(business)
    if not missing:
        return None
    labels = [DOC_LABELS.get(doc_id, doc_id) for doc_id in missing]
    if len(labels) == 1:
        return f"Upload the required document before submitting: {labels[0]}."
    listed = ", ".join(labels[:-1]) + f", and {labels[-1]}"
    return f"Upload the required documents before submitting: {listed}."


# Upload hygiene
ALLOWED_VERIFICATION_EXTENSIONS = frozenset(
    {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
)
ALLOWED_VERIFICATION_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/octet-stream",  # some browsers omit type for PDFs
    }
)
MAX_VERIFICATION_FILE_BYTES = 12 * 1024 * 1024  # 12 MB
