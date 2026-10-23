from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter

from applications.views import (
    ApplicationViewSet,
    AuthLoginView,
    AuthLogoutView,
    AuthMeView,
    AuthRegisterView,
    GoogleAuthView,
    CompanyViewSet,
    candidate_cv,
    CustomFieldDefinitionViewSet,
    country_options,
    requirement_options,
    tracking_profile,
)

router = DefaultRouter()
router.register("applications", ApplicationViewSet, basename="applications")
router.register("companies", CompanyViewSet, basename="companies")
router.register(
    "custom-fields",
    CustomFieldDefinitionViewSet,
    basename="custom-fields",
)

urlpatterns = [
    path("", RedirectView.as_view(url=settings.BASE_URL, permanent=False)),
    path(f"{settings.DJANGO_ADMIN_URL}/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/auth/register/", AuthRegisterView.as_view(), name="auth-register"),
    path("api/auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("api/auth/google/", GoogleAuthView.as_view(), name="auth-google"),
    path("api/auth/logout/", AuthLogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("api/countries/", country_options, name="country-options"),
    path("api/requirement-options/", requirement_options, name="requirement-options"),
    path("api/profile/", tracking_profile, name="tracking-profile"),
    path("api/cv/", candidate_cv, name="candidate-cv"),
]
