

import hashlib

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils.text import slugify
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Application,
    ApplicationAssessment,
    CandidateCV,
    Company,
    CustomFieldDefinition,
    GoogleIdentity,
    TrackingProfile,
)
from .country_options import COUNTRY_OPTIONS
from .serializers import (
    ApplicationSerializer,
    ApplicationAssessmentSerializer,
    CandidateCVSerializer,
    CompanySerializer,
    CustomFieldDefinitionSerializer,
    TrackingProfileSerializer,
)


DEFAULT_REQUIREMENTS = [
    "Python",
    "Django",
    "Django REST Framework",
    "FastAPI",
    "React",
    "JavaScript",
    "TypeScript",
    "HTML/CSS",
    "PostgreSQL",
    "MySQL",
    "SQL",
    "Redis",
    "REST API",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "Linux",
    "CI/CD",
    "GitHub Actions",
    "Terraform",
    "Kafka",
    "Celery",
    "MongoDB",
    "Neo4j",
    "GraphQL",
    "Git",
    "Agile",
    "Scrum",
    "DevOps",
    "Documentation",
    "Testing",
]


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(owner=self.request.user).order_by(
            "-applied_on",
            "-id",
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get", "put", "patch"])
    def assessment(self, request, pk=None):
        application = self.get_object()
        try:
            assessment = application.assessment
        except ApplicationAssessment.DoesNotExist:
            assessment = ApplicationAssessment(application=application)

        if request.method == "GET":
            serializer = ApplicationAssessmentSerializer(assessment)
            return Response(serializer.data)

        serializer = ApplicationAssessmentSerializer(
            assessment,
            data=request.data,
            partial=request.method == "PATCH",
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
        return Company.objects.filter(owner=self.request.user).annotate(
            application_count=Count("applications"),
        ).order_by("name", "id")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def tracking_profile(request):
    profile, _created = TrackingProfile.objects.get_or_create(user=request.user)
    if request.method == "PATCH":
        serializer = TrackingProfileSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        profile_updates = {}
        user_updates = {}
        for field, value in serializer.validated_data.items():
            if field in {"location", "profession_template"}:
                profile_updates[field] = value
            elif field != "username":
                user_updates[field] = value
        for field, value in profile_updates.items():
            setattr(profile, field, value)
        if profile_updates:
            profile.save(update_fields=list(profile_updates))
        for field, value in user_updates.items():
            setattr(request.user, field, value)
        if user_updates:
            request.user.save(update_fields=[*user_updates])
        profile_data = _tracking_profile_data(request.user, profile)
        serializer = TrackingProfileSerializer(instance=profile_data)
    else:
        serializer = TrackingProfileSerializer(
            instance=_tracking_profile_data(request.user, profile),
        )
    return Response(serializer.data)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def candidate_cv(request):
    cv, _created = CandidateCV.objects.get_or_create(user=request.user)
    if request.method == "PATCH":
        serializer = CandidateCVSerializer(cv, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = CandidateCVSerializer(cv)
    return Response(serializer.data)


def _tracking_profile_data(user, profile):
    return {
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "location": profile.location,
        "profession_template": profile.profession_template,
    }


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


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response(
                {"detail": "Google sign-in is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        credential = request.data.get("credential")
        if not isinstance(credential, str) or not credential:
            return Response(
                {"detail": "A Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            claims = id_token.verify_oauth2_token(
                credential,
                GoogleRequest(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {"detail": "The Google credential is invalid or expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except GoogleAuthError:
            return Response(
                {"detail": "Google sign-in is temporarily unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        subject = claims.get("sub")
        email = claims.get("email")
        given_name = claims.get("given_name")
        family_name = claims.get("family_name")
        if (
            not isinstance(subject, str)
            or not subject
            or not isinstance(email, str)
            or not email
            or claims.get("email_verified") is not True
        ):
            return Response(
                {"detail": "Google must provide a verified email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip().lower()
        if not email:
            return Response(
                {"detail": "Google must provide a verified email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(given_name, str):
            given_name = ""
        if not isinstance(family_name, str):
            family_name = ""

        try:
            with transaction.atomic():
                identity = (
                    GoogleIdentity.objects.select_related("user")
                    .filter(subject=subject)
                    .first()
                )
                if identity:
                    user = identity.user
                else:
                    matching_users = list(
                        User.objects.filter(email__iexact=email).order_by("id")[:2]
                    )
                    if len(matching_users) > 1:
                        return Response(
                            {
                                "detail": (
                                    "More than one account uses this email. "
                                    "Sign in with your username and contact support."
                                )
                            },
                            status=status.HTTP_409_CONFLICT,
                        )

                    user = matching_users[0] if matching_users else None
                    if user and GoogleIdentity.objects.filter(user=user).exists():
                        return Response(
                            {
                                "detail": (
                                    "This account is already linked to a different "
                                    "Google account."
                                )
                            },
                            status=status.HTTP_409_CONFLICT,
                        )

                    if user is None:
                        user = User.objects.create_user(
                            username=_google_username(email, subject),
                            password=None,
                            email=email,
                            first_name=given_name[:150],
                            last_name=family_name[:150],
                        )

                    GoogleIdentity.objects.create(user=user, subject=subject)
        except IntegrityError:
            identity = (
                GoogleIdentity.objects.select_related("user")
                .filter(subject=subject)
                .first()
            )
            if identity is None:
                return Response(
                    {"detail": "Unable to link this Google account."},
                    status=status.HTTP_409_CONFLICT,
                )
            user = identity.user

        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": {"id": user.id, "username": user.username},
            },
            status=status.HTTP_200_OK,
        )


def _google_username(email, subject):
    local_part = email.split("@", maxsplit=1)[0]
    base = slugify(local_part)[:130] or "google-user"
    suffix = hashlib.sha256(subject.encode("utf-8")).hexdigest()[:12]
    username = f"{base}-{suffix}"
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}-{suffix}-{counter}"
        counter += 1
    return username


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
