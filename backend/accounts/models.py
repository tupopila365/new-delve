import secrets
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)

    class Meta:
        ordering = ["-date_joined"]


class UserType(models.TextChoices):
    NORMAL = "normal", "Normal user"
    SERVICE_PROVIDER = "service_provider", "Service provider"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    user_type = models.CharField(
        max_length=32,
        choices=UserType.choices,
        default=UserType.NORMAL,
    )
    display_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    region = models.CharField(max_length=120, blank=True, help_text="e.g. Windhoek, Swakopmund")
    city = models.CharField(max_length=120, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.user.username

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.user.username
        super().save(*args, **kwargs)


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_tokens")
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_expired(self, hours: int = 48) -> bool:
        return self.created_at < timezone.now() - timezone.timedelta(hours=hours)

    @classmethod
    def create_for_user(cls, user: User) -> "EmailVerificationToken":
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(user=user)


def generate_username_suggestion(base: str) -> str:
    return f"{base}_{secrets.token_hex(3)}"
