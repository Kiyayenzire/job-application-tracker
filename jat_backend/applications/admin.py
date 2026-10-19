from django.contrib import admin

from .models import Application, Company, CustomFieldDefinition, TrackingProfile


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
    list_display = ("name", "key", "field_type", "is_filterable", "user")
    list_filter = ("field_type", "is_filterable")
    search_fields = ("name", "key", "user__username")


@admin.register(TrackingProfile)
class TrackingProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "profession_template")
    search_fields = ("user__username", "profession_template")
