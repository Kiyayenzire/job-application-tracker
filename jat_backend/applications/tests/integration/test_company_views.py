from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from applications.models import Company
from applications.tests.factories import application_values, create_user


class CompanyApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_creates_and_lists_private_company_research(self):
        other_user = create_user(username="other-company-owner")
        Company.objects.create(owner=other_user, name="Private Company")
        payload = {
            "name": "Entrix",
            "country": "de",
            "outside_eu_hiring": "unverified",
            "tech_stack_match": 85,
            "primary_stack_match": ["Python", "Django", "AWS"],
            "hiring_pattern": "Q4-Q1",
            "priority": "A",
        }

        created = self.client.post(reverse("companies-list"), payload, format="json")
        listed = self.client.get(reverse("companies-list"))

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["owner"], self.user.id)
        self.assertEqual(created.data["tech_stack_match"], 85)
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual(listed.data["results"][0]["name"], "Entrix")

    def test_links_application_to_owned_company_and_reuses_company_name(self):
        company = Company.objects.create(
            owner=self.user,
            name="Entrix",
            country="de",
            outside_eu_hiring="likely",
            priority="A",
            tech_stack_match=85,
        )
        payload = {
            **application_values(company=""),
            "company": company.id,
            "company_name": "Stale duplicate name",
            "applied_on": application_values()["applied_on"].isoformat(),
        }

        response = self.client.post(reverse("applications-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company"], company.id)
        self.assertEqual(response.data["company_name"], "Entrix")
        self.assertEqual(response.data["company_data"]["outside_eu_hiring"], "likely")

    def test_rejects_linking_to_another_users_company(self):
        other_user = create_user(username="foreign-company-owner")
        company = Company.objects.create(owner=other_user, name="Private Company")
        payload = {
            **application_values(),
            "company": company.id,
            "applied_on": application_values()["applied_on"].isoformat(),
        }

        response = self.client.post(reverse("applications-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", response.data)

    def test_rejects_duplicate_company_names_for_the_same_owner(self):
        Company.objects.create(owner=self.user, name="Entrix")

        response = self.client.post(
            reverse("companies-list"),
            {"name": "entrix"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
