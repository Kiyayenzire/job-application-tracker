

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Application, Company, CustomFieldDefinition, TrackingProfile
from .country_options import COUNTRY_OPTIONS
from .serializers import (
    ApplicationSerializer,
    CompanySerializer,
    CustomFieldDefinitionSerializer,
    TrackingProfileSerializer,
)


DEFAULT_REQUIREMENTS = [
    "python",
    "Django",
    "react",
    "linux",
    "postgresql",
    "mysql",
    "mongo db",
    "neo4j",
    "Graphql",
    "sql",
    "js",
    "css",
    "docker",
    "aws",
    "gcp",
    "azure",
    "kubernates",
    "git",
    "ci/cd",
    "agile",
    "scrum",
    "devops",
    "documentation",
    "testing",
]


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        params = self.request.query_params
        queryset = Application.objects.filter(owner=self.request.user)

        for parameter, field in (
            ("country", "country"),
            ("vacancy_status", "vacancy_status"),
            ("application_type", "application_type"),
            ("outside_eu_response", "outside_eu_response"),
            ("hiring_pattern", "hiring_pattern"),
            ("status", "status"),
        ):
            value = params.get(parameter)
            if value:
                queryset = queryset.filter(**{field: value})

        date_from = params.get("date_from")
        date_to = params.get("date_to")
        if date_from:
            queryset = queryset.filter(applied_on__gte=date_from)
        if date_to:
            queryset = queryset.filter(applied_on__lte=date_to)

        salary_min = params.get("salary_min")
        salary_max = params.get("salary_max")
        if salary_min:
            queryset = queryset.filter(
                Q(salary_max__gte=salary_min)
                | Q(salary_max__isnull=True, salary_min__gte=salary_min)
            )
        if salary_max:
            queryset = queryset.filter(
                Q(salary_min__lte=salary_max)
                | Q(salary_min__isnull=True, salary_max__lte=salary_max)
            )

        custom_filters = {
            key.removeprefix("custom_"): value
            for key, value in params.items()
            if key.startswith("custom_") and value
        }
        if custom_filters:
            definitions = {
                definition.key: definition
                for definition in CustomFieldDefinition.objects.filter(
                    user=self.request.user,
                    is_filterable=True,
                    key__in=custom_filters,
                )
            }
            unknown_keys = set(custom_filters) - set(definitions)
            if unknown_keys:
                raise ValidationError(
                    {
                        "custom_filters": (
                            "Unknown or non-filterable custom field: "
                            + ", ".join(sorted(unknown_keys))
                        )
                    }
                )

            values = list(queryset.order_by("-applied_on", "-id"))
            for key, expected in custom_filters.items():
                definition = definitions[key]
                values = [
                    application
                    for application in values
                    if _matches_custom_value(
                        definition,
                        application.custom_data.get(key),
                        expected,
                    )
                ]
            return values

        return queryset.order_by("-applied_on", "-id")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CustomFieldDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFieldDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CustomFieldDefinition.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Company.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def tracking_profile(request):
    profile, _created = TrackingProfile.objects.get_or_create(user=request.user)
    if request.method == "PATCH":
        serializer = TrackingProfileSerializer(
            profile,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = TrackingProfileSerializer(profile)
    return Response(serializer.data)


def _matches_custom_value(definition, actual, expected):
    if actual is None:
        return False
    if definition.field_type == CustomFieldDefinition.FieldType.TAGS:
        expected_tags = {value.strip().casefold() for value in expected.split(",") if value.strip()}
        actual_tags = {value.casefold() for value in actual}
        return bool(expected_tags) and expected_tags.issubset(actual_tags)
    if definition.field_type == CustomFieldDefinition.FieldType.TEXT:
        return expected.casefold() in str(actual).casefold()
    return str(actual).casefold() == expected.casefold()


class AuthRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = (request.data.get("password") or "").strip()

        if not username or not password:
            return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)

        return Response({"token": token.key, "user": {"id": user.id, "username": user.username}}, status=status.HTTP_201_CREATED)


class AuthLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = (request.data.get("password") or "").strip()

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)

        return Response({"token": token.key, "user": {"id": user.id, "username": user.username}}, status=status.HTTP_200_OK)


class AuthLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class AuthMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"id": request.user.id, "username": request.user.username})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def country_options(_request):
    return Response(
        [
            {
                "code": value,
                "name": label,
            }
            for value, label in COUNTRY_OPTIONS
        ]
    )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def requirement_options(_request):
    return Response(
        {
            "language_levels": [
                value
                for value, _label
                in Application.LanguageLevel.choices
            ],
            "other_requirements": DEFAULT_REQUIREMENTS,
            "application_types": [
                value
                for value, _label
                in Application.ApplicationType.choices
            ],
            "statuses": [
                value
                for value, _label
                in Application.Status.choices
            ],
        }
    )
