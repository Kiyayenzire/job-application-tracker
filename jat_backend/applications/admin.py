from django.contrib import admin

from .models import (
    Application,
    ApplicationAssessment,
    Company,
    CustomFieldDefinition,
    TrackingProfile,
)


admin.site.site_header = "Job Application Tracker"
admin.site.site_title = "Job Application Tracker Admin"
admin.site.index_title = "Tracker administration"


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "country",
        "company_name",
        "job_title",
        "vacancy_status",
        "outside_eu_response",
        "hiring_pattern",
        "applied_on",
        "application_type",
        "status",
    )
    list_filter = (
        "country",
        "vacancy_status",
        "outside_eu_response",
        "hiring_pattern",
        "application_type",
        "status",
        "english_requirement",
        "german_requirement",
    )
    search_fields = ("company_name", "job_title", "keywords", "other_requirements", "notes")


@admin.register(ApplicationAssessment)
class ApplicationAssessmentAdmin(admin.ModelAdmin):
    list_display = (
        "application",
        "status",
        "career_growth_outlook",
        "relocation_feasibility",
        "final_assessment",
        "last_assessed_date",
    )
    list_filter = (
        "status",
        "career_growth_outlook",
        "relocation_feasibility",
        "final_assessment",
    )
    search_fields = ("application__company_name", "application__job_title")


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "country",
        "outside_eu_hiring",
        "priority",
        "tech_stack_match",
        "hiring_pattern",
        "owner",
    )
    list_filter = ("country", "outside_eu_hiring", "priority", "hiring_pattern")
    search_fields = ("name", "outside_eu_evidence", "company_notes", "owner__username")


@admin.register(CustomFieldDefinition)
class CustomFieldDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "field_type", "user")
    list_filter = ("field_type",)
    search_fields = ("name", "key", "user__username")


@admin.register(TrackingProfile)
class TrackingProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "profession_template")
    search_fields = ("user__username", "profession_template")
