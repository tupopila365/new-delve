from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from payments.models import SimulatedPaymentIntent
from payments.stripe_sim import (
    apply_webhook_event,
    confirm_payment_intent,
    create_payment_intent,
    serialize_intent,
)


class PaymentIntentCreateView(APIView):
    """POST { target_type, target_id, metadata? } → PaymentIntent (Stripe-shaped)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        target_type = (request.data.get("target_type") or "").strip()
        target_id = request.data.get("target_id")
        metadata = request.data.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        try:
            pi = create_payment_intent(
                buyer=request.user,
                target_type=target_type,
                target_id=str(target_id),
                metadata=metadata,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_intent(pi), status=status.HTTP_201_CREATED)


class PaymentIntentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, stripe_id):
        pi = SimulatedPaymentIntent.objects.filter(stripe_id=stripe_id).first()
        if not pi:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if pi.buyer_id != request.user.pk and not request.user.is_staff:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return Response(serialize_intent(pi))


class PaymentIntentConfirmView(APIView):
    """
    Simulate stripe.confirmCardPayment / PaymentIntents.confirm.
    Body: { card_number, exp_month?, exp_year?, cvc? }
    Test cards:
      4242 4242 4242 4242 → success
      4000 0000 0000 0002 → declined
      4000 0000 0000 9995 → insufficient funds
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, stripe_id):
        try:
            pi = confirm_payment_intent(
                buyer=request.user,
                payment_intent_id=stripe_id,
                card_number=str(request.data.get("card_number") or ""),
                exp_month=str(request.data.get("exp_month") or ""),
                exp_year=str(request.data.get("exp_year") or ""),
                cvc=str(request.data.get("cvc") or ""),
            )
        except LookupError:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload = serialize_intent(pi)
        if pi.status == "failed":
            return Response(
                {
                    **payload,
                    "detail": pi.failure_message or "Your card was declined.",
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        return Response(payload)


class PaymentWebhookSimulateView(APIView):
    """
    Local stand-in for Stripe webhooks.
    Platform admins can POST { type, payment_intent } to refund / fail / re-apply hold.
    """

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        event_type = (request.data.get("type") or request.data.get("event_type") or "").strip()
        pi_id = (
            request.data.get("payment_intent")
            or request.data.get("payment_intent_id")
            or (request.data.get("data") or {}).get("object", {}).get("id")
            or ""
        )
        pi_id = str(pi_id).strip()
        try:
            pi = apply_webhook_event(
                event_type=event_type,
                payment_intent_id=pi_id,
                failure_code=str(request.data.get("failure_code") or ""),
                failure_message=str(request.data.get("failure_message") or ""),
            )
        except LookupError:
            return Response({"detail": "PaymentIntent not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"received": True, "payment_intent": serialize_intent(pi, include_buyer=True)})


class PaymentTestCardsView(APIView):
    """Document simulated Stripe test cards for the UI."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "provider": "stripe_sim",
                "note": "No real Stripe keys. Cards behave like Stripe test numbers.",
                "cards": [
                    {"number": "4242424242424242", "result": "succeeded", "label": "Success"},
                    {"number": "4000000000000002", "result": "failed", "label": "Card declined"},
                    {
                        "number": "4000000000009995",
                        "result": "failed",
                        "label": "Insufficient funds",
                    },
                    {"number": "4000000000009987", "result": "failed", "label": "Expired card"},
                ],
            }
        )


class PlatformPaymentIntentListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        limit = min(int(request.query_params.get("limit") or 100), 200)
        status_filter = (request.query_params.get("status") or "").strip()
        qs = SimulatedPaymentIntent.objects.select_related("buyer").all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response([serialize_intent(pi, include_buyer=True) for pi in qs[:limit]])


class PlatformPaymentIntentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, stripe_id):
        pi = (
            SimulatedPaymentIntent.objects.select_related("buyer")
            .filter(stripe_id=stripe_id)
            .first()
        )
        if not pi:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_intent(pi, include_buyer=True))
