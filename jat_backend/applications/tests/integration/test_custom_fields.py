from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from applications.tests.factories import (
    application_values,
    create_application,
    create_custom_field,
    create_user,
)


class CustomFieldApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_user_creates_and_lists_only_their_custom_field_definitions(self):
        other_user = create_user(username="another-user")
        create_custom_field(other_user, name="Practice Area", key="practice_area")

        response = self.client.post(
            reverse("custom-fields-list"),
            {
                "name": "Tech Stack",
                "field_type": "tags",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["key"], "tech_stack")
        self.assertEqual(response.data["user"], self.user.id)
        listed = self.client.get(reverse("custom-fields-list"))
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual(listed.data["results"][0]["name"], "Tech Stack")

    def test_custom_field_definitions_are_scoped_per_page(self):
        application_field = self.client.post(
            reverse("custom-fields-list"),
            {"name": "Practice Area", "field_type": "text", "scope": "application"},
            format="json",
        )
        company_field = self.client.post(
            reverse("custom-fields-list"),
            {"name": "Practice Area", "field_type": "text", "scope": "company"},
            format="json",
        )

        self.assertEqual(application_field.status_code, status.HTTP_201_CREATED)
        self.assertEqual(company_field.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(application_field.data["id"], company_field.data["id"])
        self.assertEqual(application_field.data["scope"], "application")
        self.assertEqual(company_field.data["scope"], "company")

    def test_application_saves_typed_custom_data(self):
        create_custom_field(self.user)
        payload = {
            **application_values(),
            "applied_on": application_values()["applied_on"].isoformat(),
            "custom_data": {
                "tech_stack": ["Kubernetes", "Terraform", "Python"],
            },
        }

        response = self.client.post(
            reverse("applications-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["custom_data"]["tech_stack"],
            ["Kubernetes", "Terraform", "Python"],
        )

    def test_rejects_custom_data_with_unknown_keys_or_wrong_value_types(self):
        create_custom_field(self.user)
        payload = {
            **application_values(),
            "applied_on": application_values()["applied_on"].isoformat(),
            "custom_data": {"tech_stack": "Kubernetes"},
        }

        response = self.client.post(
            reverse("applications-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("custom_data", response.data)

    def test_application_cannot_use_custom_fields_configured_for_companies(self):
        create_custom_field(
            self.user,
            name="Practice Area",
            key="practice_area",
            scope="company",
            field_type="text",
        )
        payload = {
            **application_values(),
            "applied_on": application_values()["applied_on"].isoformat(),
            "custom_data": {"practice_area": "Employment law"},
        }

        response = self.client.post(
            reverse("applications-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("custom_data", response.data)

    def test_application_list_ignores_filter_query_parameters(self):
        create_custom_field(self.user)
        first = create_application(
            self.user,
            company_name="CloudScale",
            vacancy_status="none",
            outside_eu_response="maybe",
            custom_data={"tech_stack": ["Python", "AWS"]},
        )
        second = create_application(
            self.user,
            company_name="Other Stack",
            custom_data={"tech_stack": ["Java"]},
        )
        create_application(
            create_user(username="private-user"),
            company_name="Private Match",
            vacancy_status="none",
            outside_eu_response="maybe",
            custom_data={"tech_stack": ["Java"]},
        )

        response = self.client.get(
            reverse("applications-list"),
            {
                "country": "ug",
                "outside_eu_response": "maybe",
                "custom_tech_stack": "Python",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            {item["id"] for item in response.data["results"]},
            {first.id, second.id},
        )

    def test_rejects_duplicate_custom_field_names_for_one_user(self):
        create_custom_field(self.user)

        response = self.client.post(
            reverse("custom-fields-list"),
            {"name": "Tech Stack", "field_type": "tags"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_single_select_definition_requires_options(self):
        response = self.client.post(
            reverse("custom-fields-list"),
            {"name": "Cloud Provider", "field_type": "select", "options": []},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("options", response.data)

    def test_profile_saves_the_users_profession_template(self):
        profile = self.client.get(reverse("tracking-profile"))

        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(
            profile.data,
            {
                "username": self.user.username,
                "first_name": "",
                "last_name": "",
                "email": "",
                "location": "",
                "profession_template": "",
            },
        )

        response = self.client.patch(
            reverse("tracking-profile"),
            {
                "first_name": "Alex",
                "last_name": "Morgan",
                "email": "alex@example.com",
                "location": "Kampala, Uganda",
                "profession_template": "Software / DevOps",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertEqual(response.data["first_name"], "Alex")
        self.assertEqual(response.data["last_name"], "Morgan")
        self.assertEqual(response.data["email"], "alex@example.com")
        self.assertEqual(response.data["location"], "Kampala, Uganda")
        self.assertEqual(response.data["profession_template"], "Software / DevOps")
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Alex")
        self.assertEqual(self.user.last_name, "Morgan")
        self.assertEqual(self.user.email, "alex@example.com")

    def test_profile_rejects_invalid_email(self):
        response = self.client.patch(
            reverse("tracking-profile"),
            {"email": "not-an-email"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_rejects_salary_range_when_minimum_exceeds_maximum(self):
        payload = {
            **application_values(),
            "applied_on": application_values()["applied_on"].isoformat(),
            "salary_min": "98000",
            "salary_max": "85000",
        }

        response = self.client.post(
            reverse("applications-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("salary_max", response.data)
