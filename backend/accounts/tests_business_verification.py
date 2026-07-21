"""Business verification submit + admin approve (production path)."""

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import (
    BusinessProfile,
    BusinessVerificationDocument,
    Profile,
    UserType,
    VerificationDocumentType,
    VerificationStatus,
)

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://app.example.com",
    DEBUG=True,
)
class BusinessVerificationFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="biz_owner", email="owner@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.owner).update(
            user_type=UserType.SERVICE_PROVIDER, email_verified=True
        )
        self.business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="verify-cafe",
            business_name="Verify Cafe",
            business_types=["food_drink"],
            region="Khomas",
            city="Windhoek",
            onboarding_completed=False,
            verification_status=VerificationStatus.UNVERIFIED,
        )
        self.admin = User.objects.create_user(
            username="staff_admin",
            email="staff@test.local",
            password="pass12345",
            is_staff=True,
        )
        Profile.objects.filter(user=self.admin).update(email_verified=True)

    def _upload_doc(self, doc_type=VerificationDocumentType.BUSINESS_REGISTRATION, name="reg.pdf"):
        self.client.force_authenticate(user=self.owner)
        pdf = SimpleUploadedFile(name, b"%PDF-1.4 fake", content_type="application/pdf")
        return self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/documents/",
            {"doc_type": doc_type, "file": pdf},
            format="multipart",
        )

    def test_submit_requires_document(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/submit-verification/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("document", res.data["detail"].lower())

    def test_submit_requires_typed_docs_for_accommodation(self):
        self.business.business_types = ["accommodation"]
        self.business.save(update_fields=["business_types"])
        up = self._upload_doc()
        self.assertEqual(up.status_code, 201, up.data)

        submit = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/submit-verification/",
            {},
            format="json",
        )
        self.assertEqual(submit.status_code, 400, submit.data)
        self.assertIn("tourism", submit.data["detail"].lower())

        up2 = self._upload_doc(VerificationDocumentType.TOURISM_LICENSE, "tourism.pdf")
        self.assertEqual(up2.status_code, 201, up2.data)
        submit2 = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/submit-verification/",
            {},
            format="json",
        )
        self.assertEqual(submit2.status_code, 200, submit2.data)

    def test_submit_then_admin_approve_sends_email(self):
        up = self._upload_doc()
        self.assertEqual(up.status_code, 201, up.data)

        submit = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/submit-verification/",
            {},
            format="json",
        )
        self.assertEqual(submit.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, VerificationStatus.PENDING)
        self.assertTrue(self.business.onboarding_completed)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Pending", mail.outbox[0].subject)

        self.client.force_authenticate(user=self.admin)
        approve = self.client.patch(
            f"/api/accounts/admin/businesses/{self.business.pk}/verification/",
            {"verification_status": "verified"},
            format="json",
        )
        self.assertEqual(approve.status_code, 200)
        self.assertTrue(approve.data.get("email_sent"), approve.data)
        self.assertEqual(approve.data.get("email_recipient"), "owner@test.local")
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, VerificationStatus.VERIFIED)
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("Verified", mail.outbox[1].subject)
        self.assertIn("app.example.com/provider/settings", mail.outbox[1].body)

        doc = BusinessVerificationDocument.objects.get(business=self.business)
        self.assertEqual(doc.status, "approved")

    def test_admin_reject_requires_reason_and_emails(self):
        self._upload_doc()
        self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/submit-verification/",
            {},
            format="json",
        )
        mail.outbox.clear()

        self.client.force_authenticate(user=self.admin)
        bad = self.client.patch(
            f"/api/accounts/admin/businesses/{self.business.pk}/verification/",
            {"verification_status": "rejected"},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        reject = self.client.patch(
            f"/api/accounts/admin/businesses/{self.business.pk}/verification/",
            {"verification_status": "rejected", "reason": "Registration certificate unreadable."},
            format="json",
        )
        self.assertEqual(reject.status_code, 200, reject.data)
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, VerificationStatus.REJECTED)
        self.assertIn("unreadable", self.business.verification_notes.lower())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Rejected", mail.outbox[0].subject)

    def test_document_file_url_is_absolute(self):
        up = self._upload_doc()
        self.assertEqual(up.status_code, 201)
        self.assertTrue(str(up.data["file"]).startswith("http"))

    def test_reject_bad_file_extension(self):
        self.client.force_authenticate(user=self.owner)
        exe = SimpleUploadedFile("malware.exe", b"MZ fake", content_type="application/octet-stream")
        res = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/documents/",
            {"doc_type": VerificationDocumentType.BUSINESS_REGISTRATION, "file": exe},
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)

    def test_delete_document(self):
        up = self._upload_doc()
        self.assertEqual(up.status_code, 201)
        doc_id = up.data["id"]
        res = self.client.delete(
            f"/api/accounts/me/businesses/{self.business.pk}/documents/{doc_id}/",
        )
        self.assertEqual(res.status_code, 204)
        self.assertFalse(BusinessVerificationDocument.objects.filter(pk=doc_id).exists())

    def test_replace_same_doc_type(self):
        up1 = self._upload_doc(name="reg1.pdf")
        self.assertEqual(up1.status_code, 201)
        up2 = self._upload_doc(name="reg2.pdf")
        self.assertEqual(up2.status_code, 201)
        self.assertEqual(
            BusinessVerificationDocument.objects.filter(
                business=self.business,
                doc_type=VerificationDocumentType.BUSINESS_REGISTRATION,
            ).count(),
            1,
        )

    @override_settings(DEBUG=False, CLOUDINARY_URL="")
    def test_upload_requires_durable_media_in_production(self):
        # Clear any inherited Cloudinary settings from STORAGES for this case.
        with self.settings(
            STORAGES={
                "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
                "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
            }
        ):
            res = self._upload_doc()
        self.assertEqual(res.status_code, 503)
        self.assertIn("CLOUDINARY", res.data["detail"])
