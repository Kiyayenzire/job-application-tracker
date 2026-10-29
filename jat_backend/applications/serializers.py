

from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from .application_rules import (
    ApplicationRuleValidationError,
    clean_application_fields,
)
from .custom_field_rules import (
    CustomDataValidationError,
    validate_custom_data,
)
from .models import (
    Application,
    ApplicationAssessment,
    CandidateCV,
    Company,
    CustomFieldDefinition,
)

ESSENTIAL_ASSESSMENT_KEYS = {
    "career_growth",
    "technical_challenge",
    "team_management",
    "ownership",
    "company_growth",
    "relocation",
    "role_fit",
}

NICE_TO_HAVE_ASSESSMENT_KEYS = {
    "salary_benefits",
    "technology_stack",
    "product_interest",
    "work_flexibility",
    "learning_resources",
    "company_reputation",
    "employee_retention",
    "international_culture",
    "future_mobility",
    "location_commute",
    "interview_experience",
}


class CompanySerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    application_count = serializers.IntegerField(read_only=True, default=0)
    tech_stack_match = serializers.IntegerField(
        min_value=0,
        max_value=100,
        allow_null=True,
        required=False,
    )
    primary_stack_match = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
    )
    custom_data = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = Company
        fields = [
            "id",
            "owner",
            "application_count",
            "name",
            "country",
            "outside_eu_hiring",
            "outside_eu_evidence",
            "relocation_support",
            "location_requirement",
            "speculative_application",
            "speculative_contact_status",
            "priority",
            "tech_stack_match",
            "primary_stack_match",
            "hiring_pattern",
            "next_hiring_window",
            "company_notes",
            "custom_data",
            "language_requirement",
            "german_level",
            "english_level",
            "work_arrangement",
            "relocation_required",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        fields["name"].trim_whitespace = True
        fields["name"].allow_blank = False
        return fields

    def validate_name(self, value):
        value = value.strip()
        duplicates = Company.objects.filter(
            owner=self.context["request"].user,
            name__iexact=value,
        )
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                "A company with this name already exists on your account."
            )
        return value

    def validate(self, attrs):
        if "custom_data" in attrs:
            custom_data = attrs["custom_data"]
            request = self.context.get("request")
            if request is None and custom_data == {}:
                pass
            elif request is None:
                raise serializers.ValidationError(
                    {"custom_data": "A user context is required to validate custom data."}
                )
            else:
                try:
                    validate_custom_data(
                        custom_data,
                        request.user,
                        scope=CustomFieldDefinition.Scope.COMPANY,
                        existing_data=(
                            self.instance.custom_data
                            if self.instance
                            else None
                        ),
                    )
                except CustomDataValidationError as error:
                    raise serializers.ValidationError(error.errors) from error
        return attrs


class CustomFieldDefinitionSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    key = serializers.SlugField(read_only=True)
    options = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
    )

    class Meta:
        model = CustomFieldDefinition
        fields = [
            "id",
            "user",
            "scope",
            "name",
            "key",
            "field_type",
            "options",
        ]
        read_only_fields = ["id", "user", "key"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Field name cannot be blank.")
        return value

    def validate(self, attrs):
        field_type = attrs.get(
            "field_type",
            getattr(self.instance, "field_type", None),
        )
        options = attrs.get(
            "options",
            getattr(self.instance, "options", []),
        )
        if field_type == CustomFieldDefinition.FieldType.SELECT and not options:
            raise serializers.ValidationError(
                {"options": "Add at least one option for a single-select field."}
            )
        if field_type != CustomFieldDefinition.FieldType.SELECT and options:
            raise serializers.ValidationError(
                {"options": "Options are only supported for single-select fields."}
            )

        name = attrs.get("name", getattr(self.instance, "name", ""))
        key = slugify(name).replace("-", "_")[:50]
        if not key:
            raise serializers.ValidationError(
                {"name": "Field name must contain letters or numbers."}
            )

        user = self.context["request"].user
        scope = attrs.get(
            "scope",
            getattr(self.instance, "scope", CustomFieldDefinition.Scope.APPLICATION),
        )
        duplicates = CustomFieldDefinition.objects.filter(
            user=user,
            scope=scope,
        ).filter(
            Q(name__iexact=name)
            | Q(key=key)
        )
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                {"name": "A field with this name already exists on your account."}
            )

        attrs["_generated_key"] = key
        return attrs

    def create(self, validated_data):
        validated_data["key"] = validated_data.pop("_generated_key")
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("_generated_key", None)
        return super().update(instance, validated_data)


class TrackingProfileSerializer(serializers.Serializer):
    username = serializers.CharField(read_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(max_length=254, required=False, allow_blank=True)
    location = serializers.CharField(max_length=150, required=False, allow_blank=True)
    profession_template = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    def validate_profession_template(self, value):
        return value.strip()

    def validate_location(self, value):
        return value.strip()

    def validate_first_name(self, value):
        return value.strip()

    def validate_last_name(self, value):
        return value.strip()


class CandidateCVSerializer(serializers.ModelSerializer):
    class StrictStringField(serializers.CharField):
        def to_internal_value(self, data):
            if not isinstance(data, str):
                raise serializers.ValidationError("Expected a string value.")
            return super().to_internal_value(data)

    experience = serializers.ListField(
        child=StrictStringField(max_length=500),
        required=False,
    )
    education = serializers.ListField(
        child=StrictStringField(max_length=500),
        required=False,
    )
    skills = serializers.ListField(
        child=StrictStringField(max_length=100),
        required=False,
    )

    class Meta:
        model = CandidateCV
        fields = ["professional_summary", "experience", "education", "skills"]
        extra_kwargs = {"professional_summary": {"max_length": 3000}}


class ApplicationSerializer(serializers.ModelSerializer):
    no = serializers.IntegerField(source="id", read_only=True)
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.none(),
        required=False,
        allow_null=True,
    )
    company_data = CompanySerializer(source="company", read_only=True)
    vacancy_status = serializers.ChoiceField(
        choices=Application.VacancyStatus.choices,
        default=Application.VacancyStatus.CURRENT,
    )
    outside_eu_response = serializers.ChoiceField(
        choices=Application.OutsideEUResponse.choices,
        allow_blank=True,
        default="",
    )
    hiring_pattern = serializers.ChoiceField(
        choices=Application.HiringPattern.choices,
        allow_blank=True,
        default="",
    )
    approach = serializers.CharField(read_only=True)

    # ✅ FIX: make DRF understand this is a list of strings, not raw JSON
    other_requirements = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of required skills. Can include predefined or custom values."
    )
    next_step = serializers.CharField(read_only=True)
    custom_data = serializers.JSONField(required=False, default=dict)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            fields["company"].queryset = Company.objects.filter(owner=request.user)
        return fields

    class Meta:
        model = Application
        fields = [
            "id",
            "no",
            "owner",
            "company",
            "company_data",
            "country",
            "vacancy_status",
            "outside_eu_response",
            "hiring_pattern",
            "approach",
            "next_step",
            "company_name",
            "job_title",
            "keywords",
            "url",
            "applied_on",
            "english_requirement",
            "english_level",
            "german_requirement",
            "german_level",
            "other_requirements",
            "application_type",
            "status",
            "salary",
            "salary_min",
            "salary_max",
            "custom_data",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "no", "created_at", "updated_at"]

    def validate(self, attrs):
        data = {}

        # rebuild full instance state (important for clean())
        if self.instance:
            for field in Application._meta.fields:
                data[field.name] = getattr(self.instance, field.name)

        data.update(attrs)

        company = attrs.get("company")
        if company is not None:
            attrs["company_name"] = company.name
            data["company_name"] = company.name
        elif self.instance and self.instance.company_id:
            attrs["company"] = self.instance.company
            attrs["company_name"] = self.instance.company.name
            data["company_name"] = self.instance.company.name

        salary_min = data.get("salary_min")
        salary_max = data.get("salary_max")
        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise serializers.ValidationError(
                {"salary_max": "Maximum salary must be greater than or equal to minimum salary."}
            )

        if "custom_data" in attrs:
            custom_data = attrs["custom_data"]
            request = self.context.get("request")
            if request is None and custom_data == {}:
                pass
            elif request is None:
                raise serializers.ValidationError(
                    {"custom_data": "A user context is required to validate custom data."}
                )
            else:
                try:
                    validate_custom_data(
                        custom_data,
                        request.user,
                        scope=CustomFieldDefinition.Scope.APPLICATION,
                        existing_data=(
                            self.instance.custom_data
                            if self.instance
                            else None
                        ),
                    )
                except CustomDataValidationError as error:
                    raise serializers.ValidationError(error.errors) from error

        try:
            cleaned = clean_application_fields(
                keywords=data.get("keywords"),
                english_requirement=data.get("english_requirement"),
                english_level=data.get("english_level"),
                german_requirement=data.get("german_requirement"),
                german_level=data.get("german_level"),
                other_requirements=data.get("other_requirements"),
                vacancy_status=data.get(
                    "vacancy_status",
                    Application.VacancyStatus.CURRENT,
                ),
                outside_eu_response=data.get("outside_eu_response") or "",
                hiring_pattern=data.get("hiring_pattern") or "",
            )
        except ApplicationRuleValidationError as error:
            raise serializers.ValidationError(error.errors) from error

        attrs.update(cleaned)

        return attrs


class ApplicationAssessmentSerializer(serializers.ModelSerializer):
    application = serializers.IntegerField(source="application_id", read_only=True)
    essential_score = serializers.SerializerMethodField()
    nice_to_have_score = serializers.SerializerMethodField()
    essential_scores = serializers.JSONField(required=False)
    nice_to_have_scores = serializers.JSONField(required=False)

    class Meta:
        model = ApplicationAssessment
        fields = [
            "id",
            "application",
            "status",
            "essential_scores",
            "nice_to_have_scores",
            "essential_score",
            "nice_to_have_score",
            "evidence_notes",
            "outstanding_questions",
            "red_flags_concerns",
            "career_growth_outlook",
            "relocation_feasibility",
            "final_assessment",
            "last_assessed_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "application",
            "essential_score",
            "nice_to_have_score",
            "created_at",
            "updated_at",
        ]

    def validate_essential_scores(self, value):
        return self._validate_scores(value, ESSENTIAL_ASSESSMENT_KEYS)

    def validate_nice_to_have_scores(self, value):
        return self._validate_scores(value, NICE_TO_HAVE_ASSESSMENT_KEYS)

    @staticmethod
    def _validate_scores(value, allowed_keys):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Scores must be an object.")

        errors = {}
        for key, score in value.items():
            if key not in allowed_keys:
                errors[key] = "Unknown assessment parameter."
            elif score is not None and (
                isinstance(score, bool)
                or not isinstance(score, int)
                or not 1 <= score <= 5
            ):
                errors[key] = "Score must be an integer from 1 to 5 or null."
        if errors:
            raise serializers.ValidationError(errors)
        return value

    @staticmethod
    def _average_score(scores):
        assessed_scores = [
            score
            for score in scores.values()
            if isinstance(score, int) and not isinstance(score, bool)
        ]
        if not assessed_scores:
            return None
        return round(sum(assessed_scores) / len(assessed_scores), 2)

    def get_essential_score(self, instance):
        return self._average_score(instance.essential_scores)

    def get_nice_to_have_score(self, instance):
        return self._average_score(instance.nice_to_have_scores)

    def create(self, validated_data):
        validated_data.setdefault("last_assessed_date", timezone.localdate())
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.setdefault("last_assessed_date", timezone.localdate())
        if self.partial:
            for field in ("essential_scores", "nice_to_have_scores"):
                if field in validated_data:
                    validated_data[field] = {
                        **getattr(instance, field),
                        **validated_data[field],
                    }
        return super().update(instance, validated_data)
