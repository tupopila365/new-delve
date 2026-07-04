from rest_framework import permissions

from accounts.profile_access import user_is_service_provider


class IsServiceProvider(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return user_is_service_provider(request.user)


class IsProviderOrBusinessMember(permissions.BasePermission):
    """Service providers or users on a business team with dashboard access."""

    message = "Provider or business team access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if user_is_service_provider(request.user):
            return True
        from .models import BusinessMembership

        return BusinessMembership.objects.filter(user=request.user).exists()


class IsEmailVerified(permissions.BasePermission):
    message = "Verify your email to complete this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user.profile, "email_verified", False)


class IsPlatformAdmin(permissions.BasePermission):
    message = "Platform admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class IsListingManager(permissions.BasePermission):
    """Business owner, service provider, or team manager+."""

    message = "Listing management access required."

    def has_permission(self, request, view):
        from .business_access import user_has_listing_manager_access

        return user_has_listing_manager_access(request.user)


class IsBookingManager(permissions.BasePermission):
    """Business owner, service provider, or team staff+."""

    message = "Booking management access required."

    def has_permission(self, request, view):
        from .business_access import user_has_booking_manager_access

        return user_has_booking_manager_access(request.user)
