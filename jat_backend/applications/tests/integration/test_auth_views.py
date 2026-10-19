from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


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

    def test_admin_uses_the_configured_custom_path(self):
        admin_url = reverse("admin:index")

        self.assertEqual(admin_url, "/jatalthech2026/")
        self.assertEqual(
            self.client.get(admin_url).status_code,
            status.HTTP_302_FOUND,
        )
