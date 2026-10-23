from django.test import TestCase
from django.test import override_settings
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch

from applications.models import GoogleIdentity


class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registers_logs_in_and_logs_out_user(self):
        credentials = {
            "username": "registered-user",
            "password": "Strong-password-123!",
        }

        registration = self.client.post(
            reverse("auth-register"),
            credentials,
            format="json",
        )

        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        token = registration.data["token"]
        self.assertTrue(token)

        login = self.client.post(
            reverse("auth-login"),
            credentials,
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        current_user = self.client.get(reverse("auth-me"))
        self.assertEqual(current_user.status_code, status.HTTP_200_OK)
        self.assertEqual(current_user.data["username"], credentials["username"])

        logout = self.client.post(reverse("auth-logout"))
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("applications.views.id_token.verify_oauth2_token")
    def test_google_sign_in_creates_user_and_token(self, verify_token):
        verify_token.return_value = {
            "sub": "google-subject-123",
            "email": "new.user@example.com",
            "email_verified": True,
            "given_name": "New",
            "family_name": "User",
        }

        response = self.client.post(
            reverse("auth-google"),
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = User.objects.get(email="new.user@example.com")
        self.assertEqual(response.data["user"]["id"], user.id)
        self.assertTrue(response.data["token"])
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.first_name, "New")
        self.assertEqual(user.last_name, "User")
        self.assertEqual(
            GoogleIdentity.objects.get(user=user).subject,
            "google-subject-123",
        )
        verify_token.assert_called_once()

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("applications.views.id_token.verify_oauth2_token")
    def test_google_sign_in_links_verified_email_to_existing_user(self, verify_token):
        user = User.objects.create_user(
            username="existing-user",
            email="EXISTING@example.com",
            password="Strong-password-123!",
        )
        verify_token.return_value = {
            "sub": "google-subject-existing",
            "email": "existing@example.com",
            "email_verified": True,
        }

        response = self.client.post(
            reverse("auth-google"),
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "existing-user")
        self.assertEqual(GoogleIdentity.objects.get(user=user).subject, "google-subject-existing")
        self.assertTrue(user.check_password("Strong-password-123!"))

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("applications.views.id_token.verify_oauth2_token")
    def test_google_sign_in_rejects_unverified_email(self, verify_token):
        verify_token.return_value = {
            "sub": "google-subject-unverified",
            "email": "unverified@example.com",
            "email_verified": False,
        }

        response = self.client.post(
            reverse("auth-google"),
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="")
    def test_google_sign_in_reports_missing_configuration(self):
        response = self.client.post(
            reverse("auth-google"),
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("applications.views.id_token.verify_oauth2_token", side_effect=ValueError)
    def test_google_sign_in_rejects_invalid_token(self, _verify_token):
        response = self.client.post(
            reverse("auth-google"),
            {"credential": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.exists())

    def test_admin_uses_the_configured_custom_path(self):
        admin_url = reverse("admin:index")

        self.assertEqual(admin_url, "/jatalthech2026/")
        self.assertEqual(
            self.client.get(admin_url).status_code,
            status.HTTP_302_FOUND,
        )

    def test_admin_pages_include_oas_theme_overrides(self):
        from django.contrib.auth import get_user_model

        admin_user = get_user_model().objects.create_superuser(
            username="oas-admin",
            email="admin@example.com",
            password="Strong-password-123!",
        )
        self.client.force_login(admin_user)

        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, "--header-bg: #0f172a")
        self.assertContains(response, "--accent: #b7791f")
        self.assertContains(response, 'html[data-theme="dark"]')
        self.assertNotContains(response, "prefers-color-scheme")
        self.assertContains(response, ".login #content-main")
        self.assertContains(response, "color-scheme: light")

    def test_admin_login_uses_polished_light_theme(self):
        response = self.client.get(reverse("admin:login"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, "Job Application Tracker")
        self.assertNotContains(response, "Online Archive System")
        self.assertContains(response, ".login #content-main")
        self.assertContains(response, "--body-bg: #f8f7f4")
        self.assertContains(response, "color-scheme: light")
        self.assertContains(response, 'class="oas-login-layout"')
        self.assertContains(response, "Your next move,")
        self.assertContains(response, "in focus.")
        self.assertContains(response, 'id="login-form"')
        self.assertContains(response, 'name="username"')
        self.assertContains(response, "calc(100vh - 140px)")
        self.assertContains(response, "@media (max-height: 620px)")
