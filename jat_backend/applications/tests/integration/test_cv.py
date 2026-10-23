from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from applications.tests.factories import create_user


class CandidateCVApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_user_saves_and_reads_their_cv(self):
        url = reverse("candidate-cv")
        initial = self.client.get(url)

        self.assertEqual(initial.status_code, status.HTTP_200_OK)
        self.assertEqual(
            initial.data,
            {
                "professional_summary": "",
                "experience": [],
                "education": [],
                "skills": [],
            },
        )

        payload = {
            "professional_summary": "Experienced employment lawyer.",
            "experience": ["Associate Attorney at Legal Partners"],
            "education": ["LLB, Makerere University"],
            "skills": ["Employment law", "Legal research"],
        }
        saved = self.client.patch(url, payload, format="json")
        loaded = self.client.get(url)

        self.assertEqual(saved.status_code, status.HTTP_200_OK)
        self.assertEqual(saved.data, payload)
        self.assertEqual(loaded.data, payload)

    def test_cv_lists_accept_only_strings(self):
        response = self.client.patch(
            reverse("candidate-cv"),
            {"skills": ["Legal research", 7]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("skills", response.data)

    def test_cv_is_not_available_without_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("candidate-cv"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
