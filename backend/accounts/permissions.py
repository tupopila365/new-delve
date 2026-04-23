from rest_framework import permissions


class IsServiceProvider(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            hasattr(request.user, "profile")
            and request.user.profile.user_type == "service_provider"
        )


class IsEmailVerified(permissions.BasePermission):
    message = "Verify your email to complete this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user.profile, "email_verified", False)
