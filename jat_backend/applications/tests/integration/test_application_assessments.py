from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from applications.tests.factories import create_application, create_user


class ApplicationAssessmentApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.application = create_application(self.user)
        self.url = reverse(
            "applications-assessment",
            args=[self.application.id],
        )

    def test_get_returns_an_unsaved_default_assessment(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["id"])
        self.assertEqual(response.data["application"], self.application.id)
        self.assertEqual(response.data["status"], "not_started")
        self.assertEqual(response.data["essential_scores"], {})
        self.assertEqual(response.data["nice_to_have_scores"], {})
        self.assertIsNone(response.data["essential_score"])
        self.assertIsNone(response.data["nice_to_have_score"])
        self.assertFalse(hasattr(self.application, "assessment"))

    def test_saves_assessment_scores_and_calculated_averages(self):
        response = self.client.put(
            self.url,
            {
                "status": "in_progress",
                "essential_scores": {
                    "career_growth": 5,
                    "ownership": 3,
                    "role_fit": None,
                },
                "nice_to_have_scores": {
                    "salary_benefits": 4,
                    "work_flexibility": 2,
                },
                "evidence_notes": "Manager gave a concrete growth example.",
                "outstanding_questions": "Clarify promotion review timing.",
                "red_flags_concerns": "",
                "career_growth_outlook": "moderate",
                "relocation_feasibility": "needs_verification",
                "final_assessment": "potential_fit",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["essential_score"], 4.0)
        self.assertEqual(response.data["nice_to_have_score"], 3.0)
        self.assertEqual(response.data["last_assessed_date"], timezone.localdate().isoformat())
        self.assertEqual(response.data["application"], self.application.id)

        self.client.patch(
            self.url,
            {"essential_scores": {"career_growth": 1}},
            format="json",
        )
        response = self.client.get(self.url)
        self.assertEqual(response.data["essential_score"], 2.0)
        self.assertEqual(response.data["evidence_notes"], "Manager gave a concrete growth example.")

    def test_rejects_unknown_score_keys_and_out_of_range_scores(self):
        for scores in (
            {"not_a_parameter": 4},
            {"career_growth": 6},
            {"career_growth": True},
        ):
            with self.subTest(scores=scores):
                response = self.client.put(
                    self.url,
                    {"essential_scores": scores},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_users_cannot_read_or_write_another_users_assessment(self):
        other_user = create_user(username="other-assessment-user")
        other_application = create_application(other_user)
        other_url = reverse(
            "applications-assessment",
            args=[other_application.id],
        )

        self.assertEqual(
            self.client.get(other_url).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.put(
                other_url,
                {"evidence_notes": "not allowed"},
                format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
