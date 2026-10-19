from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from applications.tests.factories import (
    application_values,
    create_application,
    create_user,
)


class ApplicationApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.payload = application_values()
        self.payload["applied_on"] = self.payload["applied_on"].isoformat()

    def test_creates_application_for_authenticated_user(self):
        response = self.client.post(
            reverse("applications-list"),
            {**self.payload, "owner": self.user.id + 1},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["country"], "de")
        self.assertEqual(response.data["no"], response.data["id"])
        self.assertEqual(response.data["owner"], self.user.id)

    def test_creates_application_in_a_country_outside_the_original_choices(self):
        response = self.client.post(
            reverse("applications-list"),
            {**self.payload, "country": "ua"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["country"], "ua")

    def test_rejects_incomplete_requirements(self):
        payload = {**self.payload, "other_requirements": ["python"]}

        response = self.client.post(
            reverse("applications-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("other_requirements", response.data)

    def test_creates_a_speculative_application_with_the_outside_eu_path(self):
        payload = {
            **self.payload,
            "vacancy_status": "none",
            "outside_eu_response": "yes_open",
            "hiring_pattern": "Q1",
        }

        response = self.client.post(
            reverse("applications-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["approach"], "Speculative")
        self.assertEqual(response.data["next_step"], "Target")
        self.assertEqual(response.data["hiring_pattern"], "Q1")
        self.assertEqual(response.data["vacancy_status"], "none")

    def test_rejects_unauthenticated_application_access(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("applications-list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_users_only_see_and_modify_their_own_applications(self):
        other_user = create_user(username="another-user")
        own_application = create_application(self.user, company_name="Owned Company")
        other_application = create_application(
            other_user,
            company_name="Other Company",
        )

        response = self.client.get(reverse("applications-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["company_name"], "Owned Company")

        detail_url = reverse("applications-detail", args=[other_application.id])
        self.assertEqual(
            self.client.get(detail_url).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        own_detail_url = reverse("applications-detail", args=[own_application.id])
        updated = self.client.patch(
            own_detail_url,
            {"company_name": "Updated Company"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["company_name"], "Updated Company")

    def test_returns_option_endpoints_without_authentication(self):
        self.client.force_authenticate(user=None)

        countries = self.client.get(reverse("country-options"))
        requirements = self.client.get(reverse("requirement-options"))

        self.assertEqual(countries.status_code, status.HTTP_200_OK)
        self.assertEqual(requirements.status_code, status.HTTP_200_OK)
        self.assertIn({"code": "de", "name": "Germany"}, countries.data)
        self.assertIn({"code": "ua", "name": "Ukraine"}, countries.data)
        self.assertIn({"code": "us", "name": "United States"}, countries.data)
        self.assertGreater(len(countries.data), 200)
        self.assertIn("Docker", requirements.data["other_requirements"])
        self.assertIn("Django REST Framework", requirements.data["other_requirements"])
