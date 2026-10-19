

from rest_framework import serializers
from django.db.models import Q
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
    Company,
    CustomFieldDefinition,
    TrackingProfile,
)


class CompanySerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
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

    class Meta:
        model = Company
        fields = [
            "id",
            "owner",
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
            "language_requirement",
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
            "name",
            "key",
            "field_type",
            "options",
            "is_filterable",
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
        duplicates = CustomFieldDefinition.objects.filter(user=user).filter(
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


class TrackingProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackingProfile
        fields = ["profession_template"]

    def validate_profession_template(self, value):
        return value.strip()


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

        custom_data = attrs.get("custom_data")
        if custom_data:
            try:
                validate_custom_data(
                    custom_data,
                    self.context["request"].user,
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
