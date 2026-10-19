from django.core.exceptions import ValidationError
from django.test import SimpleTestCase
from django.utils import timezone

from applications.models import Application
from applications.tests.factories import build_application


class ApplicationModelTests(SimpleTestCase):
    def test_defaults_country_and_current_date(self):
        application = Application()

        self.assertEqual(application.country, Application.Country.DE)
        self.assertEqual(application.applied_on, timezone.localdate())

    def test_clean_assigns_normalized_rule_values(self):
        application = build_application(
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

        application.clean()

        self.assertEqual(
            application.keywords,
            ["python", "django", "react", "mysql", "docker"],
        )
        self.assertEqual(
            application.other_requirements,
            ["python", "Django", "react", "linux", "mysql", "js", "docker"],
        )

    def test_clean_exposes_rule_errors_as_django_validation_errors(self):
        application = build_application(keywords=["python"])

        with self.assertRaises(ValidationError) as error:
            application.clean()

        self.assertIn("keywords", error.exception.message_dict)

    def test_string_representation_contains_company_and_role(self):
        application = build_application()

        self.assertEqual(str(application), "Acme GmbH - Full Stack Developer")

    def test_next_step_tracks_the_vacancy_and_outside_eu_decision(self):
        current_vacancy = build_application()
        self.assertEqual(current_vacancy.approach, "Apply now")
        self.assertEqual(current_vacancy.next_step, "Apply now")

        speculative_target = build_application(
            vacancy_status="none",
            outside_eu_response="yes_open",
            hiring_pattern="Q4",
        )
        self.assertEqual(
            speculative_target.approach,
            "Speculative",
        )
        self.assertEqual(
            speculative_target.next_step,
            "Target",
        )
        self.assertEqual(
            build_application(
                vacancy_status="none",
                outside_eu_response="maybe",
            ).next_step,
            "Re-contact later",
        )
        self.assertEqual(
            build_application(
                vacancy_status="none",
                outside_eu_response="no",
            ).next_step,
            "Remove for now",
        )
