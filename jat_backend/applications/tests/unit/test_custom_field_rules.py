from django.test import TestCase

from applications.custom_field_rules import (
    CustomDataValidationError,
    validate_custom_data,
)
from applications.tests.factories import create_custom_field, create_user


class CustomDataRulesTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def test_accepts_values_matching_each_custom_field_type(self):
        create_custom_field(self.user, key="practice_area", name="Practice Area", field_type="text")
        create_custom_field(self.user, key="tech_stack", field_type="tags")
        create_custom_field(self.user, key="has_clearance", name="Has Clearance", field_type="boolean")
        create_custom_field(self.user, key="years_experience", name="Years Experience", field_type="number")
        create_custom_field(
            self.user,
            key="cloud_provider",
            name="Cloud Provider",
            field_type="select",
            options=["AWS", "Azure"],
        )

        result = validate_custom_data(
            {
                "practice_area": "Corporate Law",
                "tech_stack": ["Terraform", "AWS"],
                "has_clearance": False,
                "years_experience": 5,
                "cloud_provider": "AWS",
            },
            self.user,
        )

        self.assertEqual(result["practice_area"], "Corporate Law")
        self.assertIs(result["has_clearance"], False)

    def test_rejects_values_that_do_not_match_the_custom_field_type(self):
        create_custom_field(self.user, key="has_clearance", name="Has Clearance", field_type="boolean")

        with self.assertRaises(CustomDataValidationError) as error:
            validate_custom_data({"has_clearance": "no"}, self.user)

        self.assertIn("has_clearance", error.exception.errors["custom_data"])

    def test_preserves_unchanged_values_for_deleted_field_definitions(self):
        previous_data = {"old_profession_field": ["legacy value"]}

        result = validate_custom_data(
            previous_data,
            self.user,
            existing_data=previous_data,
        )

        self.assertEqual(result, previous_data)

    def test_rejects_changes_to_values_for_deleted_field_definitions(self):
        previous_data = {"old_profession_field": ["legacy value"]}

        with self.assertRaises(CustomDataValidationError):
            validate_custom_data(
                {"old_profession_field": ["changed value"]},
                self.user,
                existing_data=previous_data,
            )

    def test_does_not_treat_boolean_and_number_legacy_values_as_equal(self):
        with self.assertRaises(CustomDataValidationError):
            validate_custom_data(
                {"old_profession_field": False},
                self.user,
                existing_data={"old_profession_field": 0},
            )
