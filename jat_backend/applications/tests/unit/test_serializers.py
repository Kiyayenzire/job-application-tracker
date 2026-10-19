from django.test import SimpleTestCase

from applications.serializers import ApplicationSerializer
from applications.tests.factories import application_values


class ApplicationSerializerTests(SimpleTestCase):
    def test_valid_data_returns_cleaned_application_fields(self):
        data = application_values(
            keywords=[" python ", "django", "react", "mysql", "docker"],
            other_requirements=[
                "python",
                "Django",
                "react",
                "linux",
                "mysql",
                "js",
                "docker",
            ],
        )
        data["applied_on"] = data["applied_on"].isoformat()
        serializer = ApplicationSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["keywords"],
            ["python", "django", "react", "mysql", "docker"],
        )

    def test_rejects_application_with_too_few_other_requirements(self):
        data = application_values(other_requirements=["python"])
        data["applied_on"] = data["applied_on"].isoformat()
        serializer = ApplicationSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("other_requirements", serializer.errors)

    def test_serializes_speculative_decision_and_recommended_next_step(self):
        data = application_values(
            vacancy_status="none",
            outside_eu_response="yes_open",
            hiring_pattern="Mid-year",
        )
        data["applied_on"] = data["applied_on"].isoformat()
        serializer = ApplicationSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["vacancy_status"], "none")
        self.assertEqual(serializer.validated_data["outside_eu_response"], "yes_open")
        self.assertEqual(serializer.validated_data["hiring_pattern"], "Mid-year")

    def test_existing_clients_default_to_current_vacancy(self):
        data = application_values()
        data.pop("vacancy_status")
        data.pop("outside_eu_response")
        data.pop("hiring_pattern")
        data["applied_on"] = data["applied_on"].isoformat()
        serializer = ApplicationSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["vacancy_status"], "current")
        self.assertEqual(serializer.validated_data["outside_eu_response"], "")
        self.assertEqual(serializer.validated_data["hiring_pattern"], "")

    def test_accepts_optional_salary_range_and_custom_data(self):
        data = application_values(
            salary_min="85000",
            salary_max="98000",
            custom_data={},
        )
        data["applied_on"] = data["applied_on"].isoformat()
        serializer = ApplicationSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(str(serializer.validated_data["salary_min"]), "85000.00")
        self.assertEqual(serializer.validated_data["custom_data"], {})
