

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .application_rules import (
    ApplicationRuleValidationError,
    clean_application_fields,
    get_next_step,
)
from .country_options import COUNTRY_OPTIONS


class TrackingProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="tracking_profile",
    )
    profession_template = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Tracking profile for {self.user.username}"


class CustomFieldDefinition(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Text"
        TAGS = "tags", "Multi-select / tags"
        SELECT = "select", "Single select"
        BOOLEAN = "boolean", "Checkbox / boolean"
        NUMBER = "number", "Number"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="custom_field_definitions",
    )
    name = models.CharField(max_length=50)
    key = models.SlugField(max_length=50)
    field_type = models.CharField(max_length=20, choices=FieldType.choices)
    options = models.JSONField(default=list, blank=True)
    is_filterable = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "key"],
                name="unique_custom_field_key_per_user",
            ),
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_custom_field_name_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Company(models.Model):
    class OutsideEUHiring(models.TextChoices):
        CONFIRMED = "confirmed", "Confirmed"
        LIKELY = "likely", "Likely"
        UNVERIFIED = "unverified", "Unverified"
        LOCAL_ONLY = "local_only", "Local-only"
        REJECTED = "rejected", "Rejected"

    class RelocationSupport(models.TextChoices):
        YES = "yes", "Yes"
        POSSIBLE = "possible", "Possible"
        NO = "no", "No"
        UNKNOWN = "unknown", "Unknown"

    class LocationRequirement(models.TextChoices):
        OUTSIDE_EU_ACCEPTED = "outside_eu_accepted", "Outside-EU accepted"
        EU_ONLY = "eu_only", "EU only"
        GERMANY_ONLY = "germany_only", "Germany only"
        LOCAL_ONLY = "local_only", "Local only"
        UNKNOWN = "unknown", "Unknown"

    class SpeculativeContactStatus(models.TextChoices):
        NOT_CONTACTED = "not_contacted", "Not contacted"
        PREPARING = "preparing", "Preparing"
        SENT = "sent", "Sent"
        REPLY_RECEIVED = "reply_received", "Reply received"
        CONSIDERING = "considering", "Considering"
        INTERESTED = "interested", "Interested in future"
        NOT_INTERESTED = "not_interested", "Not interested"
        LOCAL_ONLY = "local_only", "Explicitly EU/local only"
        FOLLOW_UP = "follow_up", "Follow-up needed"

    class Priority(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        AVOID = "avoid", "Avoid"

    class HiringPattern(models.TextChoices):
        YEAR_ROUND = "year_round", "Year-round"
        Q4_Q1 = "Q4-Q1", "Q4-Q1"
        Q1_Q2 = "Q1-Q2", "Q1-Q2"
        Q2_Q3 = "Q2-Q3", "Q2-Q3"
        Q3_Q4 = "Q3-Q4", "Q3-Q4"
        IRREGULAR = "irregular", "Irregular"
        UNKNOWN = "unknown", "Unknown"

    class WorkArrangement(models.TextChoices):
        REMOTE = "remote", "Remote"
        HYBRID = "hybrid", "Hybrid"
        OFFICE = "office", "Office"
        FLEXIBLE = "flexible", "Flexible / varies"
        UNKNOWN = "unknown", "Unknown"

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tracked_companies",
    )
    name = models.CharField(max_length=255)
    country = models.CharField(
        max_length=2,
        choices=COUNTRY_OPTIONS,
        default="de",
    )
    outside_eu_hiring = models.CharField(
        max_length=20,
        choices=OutsideEUHiring.choices,
        default=OutsideEUHiring.UNVERIFIED,
    )
    outside_eu_evidence = models.TextField(blank=True)
    relocation_support = models.CharField(
        max_length=20,
        choices=RelocationSupport.choices,
        default=RelocationSupport.UNKNOWN,
    )
    location_requirement = models.CharField(
        max_length=30,
        choices=LocationRequirement.choices,
        default=LocationRequirement.UNKNOWN,
    )
    speculative_application = models.BooleanField(default=False)
    speculative_contact_status = models.CharField(
        max_length=20,
        choices=SpeculativeContactStatus.choices,
        default=SpeculativeContactStatus.NOT_CONTACTED,
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.B,
    )
    tech_stack_match = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )
    primary_stack_match = models.JSONField(default=list, blank=True)
    hiring_pattern = models.CharField(
        max_length=20,
        choices=HiringPattern.choices,
        default=HiringPattern.UNKNOWN,
    )
    next_hiring_window = models.CharField(max_length=100, blank=True)
    company_notes = models.TextField(blank=True)
    language_requirement = models.CharField(max_length=100, blank=True)
    work_arrangement = models.CharField(
        max_length=20,
        choices=WorkArrangement.choices,
        default=WorkArrangement.UNKNOWN,
    )
    relocation_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "owner",
                name="unique_company_name_per_owner",
            ),
            models.CheckConstraint(
                condition=models.Q(tech_stack_match__isnull=True)
                | models.Q(tech_stack_match__gte=0, tech_stack_match__lte=100),
                name="company_stack_match_between_0_and_100",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        previous_name = None
        if self.pk:
            previous_name = type(self).objects.filter(pk=self.pk).values_list(
                "name",
                flat=True,
            ).first()
        super().save(*args, **kwargs)
        if previous_name is not None and previous_name != self.name:
            self.applications.update(
                company_name=self.name,
                updated_at=timezone.now(),
            )


class Application(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="applications",
        null=True,
        blank=True,
        default=1,
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        related_name="applications",
        null=True,
        blank=True,
    )

    class Country(models.TextChoices):
        AT = "at", "Austria"
        CH = "ch", "Switzerland"
        DE = "de", "Germany"
        UG = "ug", "Uganda"

    class VacancyStatus(models.TextChoices):
        CURRENT = "current", "Current vacancy"
        NONE = "none", "No vacancy"

    class OutsideEUResponse(models.TextChoices):
        YES_OPEN = "yes_open", "Yes / open"
        MAYBE = "maybe", "Maybe"
        NO = "no", "No"

    class HiringPattern(models.TextChoices):
        Q4 = "Q4", "Q4"
        Q1 = "Q1", "Q1"
        MID_YEAR = "Mid-year", "Mid-year"

    class LanguageLevel(models.TextChoices):
        BEGINNER = "Beginner", "Beginner"
        INTERMEDIATE = "Intermediate", "Intermediate"
        ADVANCED = "Advanced", "Advanced"

    class EnglishRequirement(models.TextChoices):
        YES = "Yes", "Yes"
        NO = "No", "No"
        UNDEFINED = "Undefined", "Undefined"

    class GermanRequirement(models.TextChoices):
        YES = "Yes", "Yes"
        NO = "No", "No"
        UNDEFINED = "Undefined", "Undefined"

    class ApplicationType(models.TextChoices):
        COMPANY_PORTAL = "Company Portal", "Company Portal"
        JOB_PORTAL = "Job Portal", "Job Portal"
        REFERENCE_DIRECT = "Reference/Direct", "Reference/Direct"
        UNSOLICITED = "Unsolicited", "Unsolicited"

    class Status(models.TextChoices):
        TO_SEND = "to send", "to send"
        FOLLOW_UP = "Follow Up", "Follow Up"
        INTERVIEWED = "Interviewed", "Interviewed"
        REJECTED = "Rejected", "Rejected"        
        GOT_IT = "Got It", "Got It"

    country = models.CharField(
        max_length=2,
        choices=COUNTRY_OPTIONS,
        default=Country.DE,
    )

    vacancy_status = models.CharField(
        max_length=10,
        choices=VacancyStatus.choices,
        default=VacancyStatus.CURRENT,
    )

    outside_eu_response = models.CharField(
        max_length=10,
        choices=OutsideEUResponse.choices,
        blank=True,
        default="",
    )

    hiring_pattern = models.CharField(
        max_length=10,
        choices=HiringPattern.choices,
        blank=True,
        default="",
    )

    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)

    keywords = models.JSONField(default=list)

    url = models.URLField()

    applied_on = models.DateField(
        default=timezone.localdate
    )

    english_requirement = models.CharField(
        max_length=20,
        choices=EnglishRequirement.choices,
        default=EnglishRequirement.UNDEFINED,
    )

    english_level = models.CharField(
        max_length=20,
        choices=LanguageLevel.choices,
        blank=True,
    )

    german_requirement = models.CharField(
        max_length=20,
        choices=GermanRequirement.choices,
        default=GermanRequirement.UNDEFINED,
    )

    german_level = models.CharField(
        max_length=20,
        choices=LanguageLevel.choices,
        blank=True,
    )

    other_requirements = models.JSONField()

    application_type = models.CharField(
        max_length=30,
        choices=ApplicationType.choices,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TO_SEND,
    )

    salary = models.CharField(
        max_length=120,
        blank=True,
    )

    salary_min = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    salary_max = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    custom_data = models.JSONField(default=dict, blank=True)

    notes = models.TextField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-applied_on", "-id"]

    def __str__(self):
        return f"{self.company_name} - {self.job_title}"

    @property
    def approach(self):
        return (
            "Apply now"
            if self.vacancy_status == self.VacancyStatus.CURRENT
            else "Speculative"
        )

    @property
    def next_step(self):
        return get_next_step(self.vacancy_status, self.outside_eu_response)

    def clean(self):
        try:
            cleaned = clean_application_fields(
                keywords=self.keywords,
                english_requirement=self.english_requirement,
                english_level=self.english_level,
                german_requirement=self.german_requirement,
                german_level=self.german_level,
                other_requirements=self.other_requirements,
                vacancy_status=self.vacancy_status,
                outside_eu_response=self.outside_eu_response,
                hiring_pattern=self.hiring_pattern,
            )
        except ApplicationRuleValidationError as error:
            raise ValidationError(error.errors) from error

        self.keywords = cleaned["keywords"]
        self.other_requirements = cleaned["other_requirements"]
        self.vacancy_status = cleaned["vacancy_status"]
        self.outside_eu_response = cleaned["outside_eu_response"]
        self.hiring_pattern = cleaned["hiring_pattern"]
