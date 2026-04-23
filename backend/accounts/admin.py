from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import EmailVerificationToken, Profile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    ordering = ("-date_joined",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "user_type", "region", "email_verified")
    list_filter = ("user_type", "email_verified")


@admin.register(EmailVerificationToken)
class EmailTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "used", "created_at")
    readonly_fields = ("token", "created_at")
