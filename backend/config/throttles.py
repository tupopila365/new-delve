from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class FollowThrottle(UserRateThrottle):
    scope = "follow"


class PostCreateThrottle(UserRateThrottle):
    scope = "post_create"


class MessageStartThrottle(UserRateThrottle):
    scope = "message_start"


class MessagingPeopleSearchThrottle(UserRateThrottle):
    scope = "messaging_people_search"


class PasswordResetThrottle(AnonRateThrottle):
    scope = "password_reset"


class PasswordResetConfirmThrottle(AnonRateThrottle):
    scope = "password_reset_confirm"


class ResendVerificationThrottle(AnonRateThrottle):
    scope = "resend_verification"


class AccountDeleteThrottle(UserRateThrottle):
    scope = "account_delete"
