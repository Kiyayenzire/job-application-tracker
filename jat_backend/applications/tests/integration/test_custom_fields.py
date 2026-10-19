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
                "is_filterable": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["key"], "tech_stack")
        self.assertEqual(response.data["user"], self.user.id)
        listed = self.client.get(reverse("custom-fields-list"))
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual(listed.data["results"][0]["name"], "Tech Stack")

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

    def test_filters_by_strategy_and_custom_tags_without_crossing_users(self):
        create_custom_field(self.user)
        matching = create_application(
            self.user,
            company_name="CloudScale",
            vacancy_status="none",
            outside_eu_response="maybe",
            custom_data={"tech_stack": ["Python", "AWS"]},
        )
        create_application(
            self.user,
            company_name="Other Stack",
            vacancy_status="none",
            outside_eu_response="maybe",
            custom_data={"tech_stack": ["Java"]},
        )
        other_user = create_user(username="private-user")
        create_custom_field(other_user)
        create_application(
            other_user,
            company_name="Private Match",
            vacancy_status="none",
            outside_eu_response="maybe",
            custom_data={"tech_stack": ["Python", "AWS"]},
        )

        response = self.client.get(
            reverse("applications-list"),
            {
                "outside_eu_response": "maybe",
                "custom_tech_stack": "Python",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], matching.id)

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
        response = self.client.patch(
            reverse("tracking-profile"),
            {"profession_template": "Software / DevOps"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profession_template"], "Software / DevOps")

    def test_rejects_custom_filters_for_fields_not_marked_filterable(self):
        create_custom_field(self.user, is_filterable=False)

        response = self.client.get(
            reverse("applications-list"),
            {"custom_tech_stack": "Python"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("custom_filters", response.data)

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
