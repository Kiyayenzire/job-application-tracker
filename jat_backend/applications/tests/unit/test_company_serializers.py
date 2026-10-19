from types import SimpleNamespace

from django.test import TestCase

from applications.models import Company
from applications.serializers import CompanySerializer
from applications.tests.factories import create_user


class CompanySerializerTests(TestCase):
    def setUp(self):
        self.user = create_user(username="company-serializer-user")
        self.context = {"request": SimpleNamespace(user=self.user)}

    def test_accepts_company_research_and_stack_score(self):
        data = {
            "name": "Entrix",
            "country": "de",
            "outside_eu_hiring": "unverified",
            "outside_eu_evidence": "International offices; needs confirmation.",
            "relocation_support": "unknown",
            "location_requirement": "unknown",
            "speculative_application": True,
            "speculative_contact_status": "not_contacted",
            "priority": "A",
            "tech_stack_match": 85,
            "primary_stack_match": ["Python", "Django", "AWS"],
            "hiring_pattern": "Q4-Q1",
            "next_hiring_window": "Nov 2026-Feb 2027",
            "company_notes": "Monitor closely.",
            "language_requirement": "English",
            "work_arrangement": "Hybrid",
            "relocation_required": False,
        }

        serializer = CompanySerializer(data=data, context=self.context)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["tech_stack_match"], 85)
        self.assertEqual(serializer.validated_data["primary_stack_match"], ["Python", "Django", "AWS"])
        self.assertEqual(serializer.validated_data["outside_eu_hiring"], Company.OutsideEUHiring.UNVERIFIED)

    def test_rejects_stack_scores_outside_zero_to_one_hundred(self):
        serializer = CompanySerializer(
            data={"name": "Entrix", "tech_stack_match": 101},
            context=self.context,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("tech_stack_match", serializer.errors)
