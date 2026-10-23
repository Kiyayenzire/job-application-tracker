import json
from decimal import Decimal

from .models import CustomFieldDefinition


class CustomDataValidationError(ValueError):
    def __init__(self, errors):
        self.errors = errors
        super().__init__("Custom data is invalid.")


def validate_custom_data(
    custom_data,
    user,
    scope=CustomFieldDefinition.Scope.APPLICATION,
    existing_data=None,
):
    if not isinstance(custom_data, dict):
        raise CustomDataValidationError(
            {"custom_data": "Custom data must be an object."}
        )

    definitions = {
        definition.key: definition
        for definition in CustomFieldDefinition.objects.filter(
            user=user,
            scope=scope,
        )
    }
    errors = {}

    for key, value in custom_data.items():
        definition = definitions.get(key)
        if definition is None:
            if existing_data is not None and json.dumps(
                existing_data.get(key),
                sort_keys=True,
            ) == json.dumps(value, sort_keys=True):
                continue
            errors[key] = "This field is not defined for your account."
            continue

        if not _is_valid_value(definition, value):
            errors[key] = f"Value does not match the {definition.field_type} field type."

    if errors:
        raise CustomDataValidationError({"custom_data": errors})

    return custom_data


def _is_valid_value(definition, value):
    if definition.field_type == CustomFieldDefinition.FieldType.TEXT:
        return isinstance(value, str)
    if definition.field_type == CustomFieldDefinition.FieldType.TAGS:
        return isinstance(value, list) and all(isinstance(item, str) for item in value)
    if definition.field_type == CustomFieldDefinition.FieldType.BOOLEAN:
        return isinstance(value, bool)
    if definition.field_type == CustomFieldDefinition.FieldType.NUMBER:
        return isinstance(value, (int, float, Decimal)) and not isinstance(value, bool)
    if definition.field_type == CustomFieldDefinition.FieldType.SELECT:
        return isinstance(value, str) and value in definition.options
    return False
