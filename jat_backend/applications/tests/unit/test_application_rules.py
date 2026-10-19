from django.test import SimpleTestCase

from applications.application_rules import (
    ApplicationRuleValidationError,
    clean_application_fields,
)
from applications.tests.factories import application_values


class ApplicationRuleTests(SimpleTestCase):
    def test_cleans_keyword_and_requirement_lists(self):
        values = application_values(
            keywords=[" python ", "", "django", "react", "mysql", "docker "],
            other_requirements=[
                "python",
                " Django ",
                "react",
                "linux",
                "mysql",
                "js",
                "docker",
                "python",
            ],
        )

        cleaned = clean_application_fields(**{
            field: values[field]
            for field in (
                "keywords",
                "english_requirement",
                "english_level",
                "german_requirement",
                "german_level",
                "other_requirements",
                "vacancy_status",
                "outside_eu_response",
                "hiring_pattern",
            )
        })

        self.assertEqual(
            cleaned["keywords"],
            ["python", "django", "react", "mysql", "docker"],
        )
        self.assertEqual(
            cleaned["other_requirements"],
            ["python", "Django", "react", "linux", "mysql", "js", "docker"],
        )

    def test_reports_invalid_keyword_requirement_and_language_fields(self):
        values = application_values(
            keywords=["python"],
            other_requirements=["python"],
            german_requirement="No",
            german_level="Beginner",
        )

        with self.assertRaises(ApplicationRuleValidationError) as error:
            clean_application_fields(**{
                field: values[field]
                for field in (
                    "keywords",
                    "english_requirement",
                    "english_level",
                    "german_requirement",
                    "german_level",
                    "other_requirements",
                    "vacancy_status",
                    "outside_eu_response",
                    "hiring_pattern",
                )
            })

        self.assertEqual(
            set(error.exception.errors),
            {"keywords", "other_requirements", "german_level"},
        )

    def test_requires_a_valid_outside_eu_decision_for_speculative_applications(self):
        values = application_values(
            vacancy_status="none",
            outside_eu_response="yes_open",
            hiring_pattern="Q1",
        )

        cleaned = clean_application_fields(**{
            field: values[field]
            for field in (
                "keywords",
                "english_requirement",
                "english_level",
                "german_requirement",
                "german_level",
                "other_requirements",
                "vacancy_status",
                "outside_eu_response",
                "hiring_pattern",
            )
        })

        self.assertEqual(cleaned["hiring_pattern"], "Q1")

    def test_requires_a_hiring_pattern_for_a_yes_or_open_response(self):
        values = application_values(
            vacancy_status="none",
            outside_eu_response="yes_open",
        )

        with self.assertRaises(ApplicationRuleValidationError) as error:
            clean_application_fields(**{
                field: values[field]
                for field in (
                    "keywords",
                    "english_requirement",
                    "english_level",
                    "german_requirement",
                    "german_level",
                    "other_requirements",
                    "vacancy_status",
                    "outside_eu_response",
                    "hiring_pattern",
                )
            })

        self.assertIn("hiring_pattern", error.exception.errors)

    def test_rejects_speculative_fields_for_a_current_vacancy(self):
        values = application_values(
            outside_eu_response="maybe",
        )

        with self.assertRaises(ApplicationRuleValidationError) as error:
            clean_application_fields(**{
                field: values[field]
                for field in (
                    "keywords",
                    "english_requirement",
                    "english_level",
                    "german_requirement",
                    "german_level",
                    "other_requirements",
                    "vacancy_status",
                    "outside_eu_response",
                    "hiring_pattern",
                )
            })

        self.assertIn("outside_eu_response", error.exception.errors)
