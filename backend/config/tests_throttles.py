from copy import deepcopy

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.settings import api_settings

from accounts.views import PasswordResetConfirmView, PasswordResetRequestView, ResendVerificationView, SelfDeleteAccountView
from config.throttles import (
    AccountDeleteThrottle,
    FollowThrottle,
    MessageStartThrottle,
    MessagingPeopleSearchThrottle,
    PasswordResetConfirmThrottle,
    PasswordResetThrottle,
    PostCreateThrottle,
    ResendVerificationThrottle,
)
from messaging.views import MessagingPeopleSearchView, StartOrGetConversationView
from social.views import PostViewSet, UserFollowToggleView

User = get_user_model()


class ThrottleConfigurationTests(TestCase):
    def test_social_and_messaging_views_declare_throttles(self):
        self.assertEqual(UserFollowToggleView.throttle_classes, [FollowThrottle])
        self.assertEqual(MessagingPeopleSearchView.throttle_classes, [MessagingPeopleSearchThrottle])
        self.assertEqual(StartOrGetConversationView.throttle_classes, [MessageStartThrottle])
        view = PostViewSet()
        view.action = "create"
        throttles = view.get_throttles()
        self.assertTrue(any(isinstance(t, PostCreateThrottle) for t in throttles))

        self.assertEqual(PasswordResetRequestView.throttle_classes, [PasswordResetThrottle])
        self.assertEqual(PasswordResetConfirmView.throttle_classes, [PasswordResetConfirmThrottle])
        self.assertEqual(ResendVerificationView.throttle_classes, [ResendVerificationThrottle])
        self.assertEqual(SelfDeleteAccountView.throttle_classes, [AccountDeleteThrottle])

    def test_rate_limits_configured(self):
        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        self.assertEqual(rates["follow"], "120/hour")
        self.assertEqual(rates["post_create"], "60/hour")
        self.assertEqual(rates["message_start"], "30/hour")
        self.assertEqual(rates["messaging_people_search"], "30/min")
        self.assertEqual(rates["password_reset"], "5/hour")
        self.assertEqual(rates["password_reset_confirm"], "10/hour")
        self.assertEqual(rates["resend_verification"], "5/hour")
        self.assertEqual(rates["account_delete"], "3/day")

    def test_throttle_scopes_resolve_rates(self):
        rf = deepcopy(settings.REST_FRAMEWORK)
        api_settings.reload()
        self.assertEqual(FollowThrottle().get_rate(), "120/hour")
        self.assertEqual(PostCreateThrottle().get_rate(), "60/hour")
        self.assertEqual(MessageStartThrottle().get_rate(), "30/hour")
        self.assertEqual(MessagingPeopleSearchThrottle().get_rate(), "30/min")
        self.assertEqual(PasswordResetThrottle().get_rate(), "5/hour")
        self.assertEqual(PasswordResetConfirmThrottle().get_rate(), "10/hour")
        self.assertEqual(ResendVerificationThrottle().get_rate(), "5/hour")
        self.assertEqual(AccountDeleteThrottle().get_rate(), "3/day")
