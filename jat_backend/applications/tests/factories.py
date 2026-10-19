from django.contrib.auth.models import User
from django.utils import timezone

from applications.models import Application, CustomFieldDefinition


def application_values(**overrides):
    values = {
        "country": "de",
        "salary_min": None,
        "salary_max": None,
        "custom_data": {},
        "vacancy_status": "current",
        "outside_eu_response": "",
        "hiring_pattern": "",
        "company_name": "Acme GmbH",
        "job_title": "Full Stack Developer",
        "keywords": ["python", "django", "react", "mysql", "docker"],
        "url": "https://example.com/jobs/1",
        "applied_on": timezone.localdate(),
        "english_requirement": "Yes",
        "english_level": "Advanced",
        "german_requirement": "Undefined",
        "german_level": "",
        "other_requirements": [
            "python",
            "Django",
            "react",
            "linux",
            "mysql",
            "js",
            "docker",
        ],
        "application_type": "Company Portal",
        "status": "to send",
        "salary": "60000 EUR",
        "notes": "",
    }
    values.update(overrides)
    return values


def build_application(**overrides):
    return Application(**application_values(**overrides))


def create_user(username="test-user", password="Test-password-123!", **overrides):
    values = {"username": username, **overrides}
    return User.objects.create_user(password=password, **values)


def create_application(owner, **overrides):
    application = build_application(owner=owner, **overrides)
    application.save()
    return application


def create_custom_field(owner, **overrides):
    values = {
        "user": owner,
        "name": "Tech Stack",
        "key": "tech_stack",
        "field_type": CustomFieldDefinition.FieldType.TAGS,
        "options": [],
        "is_filterable": True,
    }
    values.update(overrides)
    return CustomFieldDefinition.objects.create(**values)
