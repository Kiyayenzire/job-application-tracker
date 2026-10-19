import sys
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

# =============================================================================
# 1. PROJECT AND ENVIRONMENT
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

is_pytest = any("pytest" in argument.lower() for argument in sys.argv)
env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    SECURE_SSL_REDIRECT=(bool, False),
    DJANGO_ALLOWED_HOSTS=(
        list,
        ["localhost", "127.0.0.1", "backend"],
    ),
    DB_PORT=(int, 3306),
    DB_CONN_MAX_AGE=(int, 60),
)

production_env_file = PROJECT_ROOT / ".env"
development_env_file = PROJECT_ROOT / ".env.dev"

if is_pytest:
    if development_env_file.is_file():
        environ.Env.read_env(development_env_file)
elif env.str("DJANGO_ENV", default="development").lower() == "development":
    if development_env_file.is_file():
        environ.Env.read_env(development_env_file)
    if production_env_file.is_file():
        environ.Env.read_env(production_env_file)
elif production_env_file.is_file():
    environ.Env.read_env(production_env_file)

APP_ENV = env.str(
    "DJANGO_ENV",
    default="test" if is_pytest else "development",
).lower()
if APP_ENV not in {"development", "test", "production"}:
    raise ImproperlyConfigured(
        "DJANGO_ENV must be development, test, or production."
    )

IS_TEST = is_pytest or APP_ENV == "test" or "test" in sys.argv

SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default=env("SECRET_KEY", default=""),
)
if not SECRET_KEY:
    if APP_ENV == "production":
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY must be set in production."
        )
    SECRET_KEY = (
        "test-only-secret-key"
        if APP_ENV == "test"
        else "dev-only-secret-key"
    )

DEBUG = env.bool(
    "DJANGO_DEBUG",
    default=APP_ENV == "development",
)
if APP_ENV != "development":
    DEBUG = False

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
BASE_URL = env.str("BASE_URL", default="http://localhost:5177")
DJANGO_ADMIN_URL = env.str(
    "DJANGO_ADMIN_URL",
    default="admin",
).strip("/")
DJANGO_LOG_LEVEL = env.str(
    "DJANGO_LOG_LEVEL",
    default="DEBUG" if DEBUG else "INFO",
).upper()

# =============================================================================
# 2. DJANGO APPLICATIONS AND MIDDLEWARE
# =============================================================================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "applications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
]
if not IS_TEST:
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")
MIDDLEWARE.extend(
    [
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
    ]
)

ROOT_URLCONF = "jat.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "jat.wsgi.application"

# =============================================================================
# 3. DATABASE CONFIGURATION
# =============================================================================
if IS_TEST:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": env("DB_NAME"),
            "USER": env("DB_USER"),
            "PASSWORD": env("DB_PASSWORD"),
            "HOST": env("DB_HOST", default="db"),
            "PORT": env("DB_PORT"),
            "CONN_MAX_AGE": env("DB_CONN_MAX_AGE"),
            "OPTIONS": {
                "charset": env.str("DB_CHARSET", default="utf8mb4"),
            },
        }
    }

# =============================================================================
# 4. AUTHENTICATION, SECURITY AND PROXY SETTINGS
# =============================================================================
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
REFERRER_POLICY = "same-origin"
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=False,
)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 7},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Kampala"
USE_I18N = True
USE_TZ = True

# =============================================================================
# 5. STATIC AND MEDIA FILES
# =============================================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = (
    [BASE_DIR / "static"]
    if (BASE_DIR / "static").is_dir()
    else []
)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if IS_TEST
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        ),
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# 6. CACHE
# =============================================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "job-application-tracker",
    }
}

# =============================================================================
# 7. REST FRAMEWORK, CORS AND CSRF CONFIGURATION
# =============================================================================
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=(
        ["http://localhost:5177", "http://127.0.0.1:5177"]
        if DEBUG
        else []
    ),
)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=(
        ["http://localhost:5177", "http://127.0.0.1:5177"]
        if DEBUG
        else []
    ),
)

CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
}

# =============================================================================
# 8. LOGGING
# =============================================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": DJANGO_LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": DJANGO_LOG_LEVEL,
            "propagate": False,
        },
    },
}
