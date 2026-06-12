from rest_framework import permissions


class IsServiceProvider(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            hasattr(request.user, "profile")
            and request.user.profile.user_type == "service_provider"
        )


class IsProviderOrBusinessMember(permissions.BasePermission):
    """Service providers or users on a business team with dashboard access."""

    message = "Provider or business team access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if (
            hasattr(request.user, "profile")
            and request.user.profile.user_type == "service_provider"
        ):
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
