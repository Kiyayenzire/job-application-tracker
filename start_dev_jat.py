from __future__ import annotations

import argparse
import logging
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# ============================================================
# CONFIGURATION & CONSTANTS
# ============================================================
PROJECT_DIR = Path(__file__).resolve().parent
LOGS_DIR = PROJECT_DIR / "logs"

DOCKER_TIMEOUT = 180
DOCKER_CHECK_INTERVAL = 3
COMMAND_TIMEOUT = 120

# Required services that must be running in docker compose
REQUIRED_SERVICES = frozenset({"db", "backend", "frontend"})

# URLs to open in Firefox once services are verified
FRONTEND_URL = "http://localhost:5177"
ADMIN_URL = "http://localhost:8007/jatalthech2026/"

# Platform-specific paths
WINDOWS_DOCKER_DESKTOP = Path(
    r"C:\Program Files\Docker\Docker\Docker Desktop.exe"
)
WINDOWS_FIREFOX_PATHS = (
    Path(r"C:\Program Files\Mozilla Firefox\firefox.exe"),
    Path(r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe"),
    Path(os.path.expandvars(r"%LOCALAPPDATA%\Mozilla Firefox\firefox.exe")),
)
MACOS_FIREFOX = Path("/Applications/Firefox.app/Contents/MacOS/firefox")
VSCODE_COMMAND = "code"

ERROR_PATTERN = re.compile(
    r"\b(error|exception|fatal|failed|traceback|critical)\b",
    re.IGNORECASE,
)

# Global module loggers
logger = logging.getLogger("startup")
error_logger = logging.getLogger("errors")


# ============================================================
# LOGGING SETUP
# ============================================================
def create_loggers(logs_dir: Path = LOGS_DIR) -> tuple[logging.Logger, logging.Logger]:
    """Create separate timestamped startup and error logs with clean console streaming."""
    logs_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    startup_log = logs_dir / f"startup_{timestamp}.log"
    error_log = logs_dir / f"errors_{timestamp}.log"
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    for target_logger in (logger, error_logger):
        for handler in target_logger.handlers[:]:
            target_logger.removeHandler(handler)
            handler.close()
        target_logger.propagate = False

    logger.setLevel(logging.INFO)
    
    startup_file = logging.FileHandler(startup_log, encoding="utf-8")
    startup_file.setFormatter(formatter)
    logger.addHandler(startup_file)

    startup_console = logging.StreamHandler()
    startup_console.setFormatter(formatter)
    logger.addHandler(startup_console)

    error_file = logging.FileHandler(error_log, encoding="utf-8")
    error_file.setFormatter(formatter)
    error_logger.addHandler(error_file)

    logger.info("Startup log initialized: %s", startup_log)
    logger.info("Error log initialized: %s", error_log)
    return logger, error_logger


# ============================================================
# GENERAL UTILITIES
# ============================================================
def get_operating_system() -> str:
    """Return a normalized operating-system name."""
    system = platform.system()
    if system == "Windows":
        return "Windows"
    if system == "Darwin":
        return "macOS"
    if system == "Linux":
        return "Linux"
    raise RuntimeError(f"Unsupported operating system: {system}")


def command_exists(command: str) -> bool:
    """Return True if a command exists in PATH."""
    return shutil.which(command) is not None


def ensure_port_available(port: int = 8007) -> None:
    """Ensure the local development port is free by terminating any lingering holders."""
    logger.info("Ensuring port %s is available...", port)
    if platform.system() == "Windows":
        try:
            cmd = f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"
            res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, shell=False)
            pids = {line.strip() for line in res.stdout.splitlines() if line.strip().isdigit()}
            for pid in pids:
                logger.warning("Port %s is currently held by PID %s. Freeing port...", port, pid)
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, shell=False)
        except Exception as exc:
            logger.debug("Could not automatically inspect/free port %s: %s", port, exc)


def run_command(
    command: list[str],
    *,
    cwd: Path = PROJECT_DIR,
    timeout: int = COMMAND_TIMEOUT,
) -> subprocess.CompletedProcess[str]:
    """Run a command from the project directory without shell and log STDOUT/STDERR."""
    logger.info("Running command: %s", subprocess.list2cmdline(command))

    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            shell=False,
            timeout=timeout,
        )
    except Exception as exc:
        logger.exception("Failed to execute command.")
        error_logger.error("Failed to execute command: %s", subprocess.list2cmdline(command))
        error_logger.error("Exception: %s", exc)
        raise

    if result.stdout.strip():
        logger.info("STDOUT:\n%s", result.stdout.strip())

    if result.stderr.strip():
        logger.warning("STDERR:\n%s", result.stderr.strip())
        error_logger.warning("Command stderr:\n%s", result.stderr.strip())

    return result


def launch_gui_app(command: list[str | Path], os_name: str) -> bool:
    """Launch a GUI application as a completely detached background process."""
    cmd_str = [str(c) for c in command]
    logger.info("Launching GUI application: %s", cmd_str[0])
    
    kwargs: dict[str, int | bool | None] = {
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }

    if os_name == "Windows":
        detached = getattr(subprocess, "DETACHED_PROCESS", 0x00000008)
        new_group = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
        kwargs["creationflags"] = detached | new_group

    try:
        subprocess.Popen(cmd_str, **kwargs)
    except OSError as exc:
        logger.error("Unable to launch %s: %s", cmd_str[0], exc)
        error_logger.exception("Unable to launch desktop application.")
        return False
    return True


# ============================================================
# STEP 1: START DOCKER
# ============================================================
def start_docker(os_name: str) -> bool:
    """Start Docker Desktop on Windows/macOS with multiple fallback paths."""
    logger.info("[1] Starting Docker...")

    if os_name == "Windows":
        candidates = [
            WINDOWS_DOCKER_DESKTOP,
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Docker" / "Docker" / "Docker Desktop.exe",
        ]
        docker_desktop = next((path for path in candidates if path.is_file()), None)
        if docker_desktop is None:
            msg = f"Docker Desktop was not found. Checked locations: {candidates}"
            logger.error(msg)
            error_logger.error(msg)
            return False
        return launch_gui_app([docker_desktop], os_name)

    elif os_name == "macOS":
        return launch_gui_app(["open", "-a", "Docker"], os_name)

    elif os_name == "Linux":
        logger.info("Linux detected. Docker is expected to be managed by system services.")
        return True
    
    return False


# ============================================================
# STEP 2: OPEN VS CODE (SILENT BACKGROUND LAUNCH)
# ============================================================
def open_vscode(os_name: str) -> bool:
    """Open VS Code targeting the current project directory silently."""
    logger.info("[2] Opening VS Code...")

    code_path = shutil.which("code") or shutil.which("code.cmd")
    if code_path is None:
        msg = "VS Code command 'code' or 'code.cmd' was not found in PATH."
        logger.warning(msg)
        error_logger.warning(msg)
        return False

    kwargs: dict[str, int | bool | None] = {
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }

    if os_name == "Windows":
        detached = getattr(subprocess, "DETACHED_PROCESS", 0x00000008)
        new_group = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
        no_window = 0x08000000  # CREATE_NO_WINDOW
        kwargs["creationflags"] = detached | new_group | no_window
        launch_cmd = [code_path, str(PROJECT_DIR)]
    else:
        launch_cmd = [code_path, str(PROJECT_DIR)]

    try:
        subprocess.Popen(launch_cmd, **kwargs)
    except OSError as exc:
        logger.error("Unable to launch VS Code: %s", exc)
        error_logger.exception("Unable to launch VS Code.")
        return False
    return True


# ============================================================
# STEP 3: OPEN FIREFOX WITH URLS
# ============================================================
def open_firefox(os_name: str) -> bool:
    """Open Firefox browser pointing to frontend and Django admin endpoints."""
    logger.info("[3] Opening Firefox...")

    firefox_path = None
    if os_name == "Windows":
        for path in WINDOWS_FIREFOX_PATHS:
            if path.is_file():
                firefox_path = str(path)
                break
        if not firefox_path:
            firefox_path = shutil.which("firefox")
    elif os_name == "macOS":
        if MACOS_FIREFOX.is_file():
            firefox_path = str(MACOS_FIREFOX)
    
    if not firefox_path:
        firefox_path = shutil.which("firefox")

    if not firefox_path:
        msg = "Firefox executable was not found."
        logger.warning(msg)
        error_logger.warning(msg)
        return False

    return launch_gui_app([firefox_path, FRONTEND_URL, ADMIN_URL], os_name)


# ============================================================
# STEP 4: WAIT FOR DOCKER ENGINE
# ============================================================
def wait_for_docker() -> bool:
    """Wait until Docker Engine responds successfully to `docker info`."""
    logger.info("[4] Waiting for Docker Engine (timeout: %s seconds)...", DOCKER_TIMEOUT)
    start_time = time.monotonic()

    while time.monotonic() - start_time < DOCKER_TIMEOUT:
        try:
            result = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                shell=False,
                timeout=15,
            )
            if result.returncode == 0:
                logger.info("Docker Engine is ready.")
                return True
        except (subprocess.TimeoutExpired, OSError):
            pass

        logger.info("Docker Engine is not ready yet. Retrying in %s seconds...", DOCKER_CHECK_INTERVAL)
        time.sleep(DOCKER_CHECK_INTERVAL)

    msg = f"Docker Engine did not become ready within {DOCKER_TIMEOUT} seconds."
    logger.error(msg)
    error_logger.error(msg)
    return False


# ============================================================
# STEP 5: VERIFY DOCKER COMPOSE
# ============================================================
def verify_compose_available() -> bool:
    """Check that Docker Compose V2 is available."""
    logger.info("[5] Checking Docker Compose...")
    result = run_command(["docker", "compose", "version"])
    if result.returncode != 0:
        logger.error("Docker Compose is not available.")
        error_logger.error("Docker Compose is not available.")
        return False
    logger.info("Docker Compose is available.")
    return True


# ============================================================
# STEPS 6 & 7: START COMPOSE & CHECK STATUS
# ============================================================
def start_compose() -> bool:
    """Start database first, wait for true container health, then start the rest of the stack."""
    # Ensure port 8007 is clear of lingering sockets before starting compose
    ensure_port_available(8007)

    logger.info("[6] Starting database container first...")
    db_result = run_command(["docker", "compose", "up", "-d", "db"])
    if db_result.returncode != 0:
        logger.error("Failed to start database service.")
        return False

    logger.info("Waiting for database container (jat_db) to become fully healthy...")
    start_time = time.monotonic()
    while time.monotonic() - start_time < 120:
        try:
            inspect_result = subprocess.run(
                ["docker", "inspect", "--format", "{{.State.Health.Status}}", "jat_db"],
                capture_output=True,
                text=True,
                shell=False,
            )
            health = inspect_result.stdout.strip()
            if health == "healthy":
                logger.info("Database container is healthy and ready.")
                break
            logger.info("Database health status: '%s'. Waiting...", health or "starting")
        except Exception:
            pass
        time.sleep(3)
    else:
        logger.error("Database did not become healthy within the timeout period.")
        return False

    logger.info("Starting remaining Docker Compose containers (migrations, backend, frontend)...")
    result = run_command(["docker", "compose", "up", "-d", "--remove-orphans"], timeout=600)
    if result.returncode != 0:
        logger.error("Docker Compose failed to start/reconcile the containers.")
        error_logger.error("Docker Compose failed to start/reconcile the containers.")
        return False
    logger.info("Docker Compose containers are started/reconciled.")
    return True


def check_container_status() -> bool:
    """Ensure required services (db, backend, frontend) are running smoothly."""
    logger.info("[7] Checking required container status...")
    result = run_command(["docker", "compose", "ps", "--status", "running", "--services"])
    if result.returncode != 0:
        logger.error("Unable to retrieve container status.")
        error_logger.error("Unable to retrieve container status.")
        return False

    running_services = {line.strip() for line in result.stdout.splitlines() if line.strip()}
    missing = REQUIRED_SERVICES - running_services
    if missing:
        msg = f"Required Compose services are not running: {sorted(missing)}"
        logger.error(msg)
        error_logger.error(msg)
        return False

    logger.info("All required services are running: %s", sorted(REQUIRED_SERVICES))
    return True


# ============================================================
# STEPS 8 & 9: LOG COLLECTION & ERROR INSPECTION
# ============================================================
def check_container_logs() -> bool:
    """Collect recent container logs and check for patterns matching errors/exceptions."""
    logger.info("[8] Collecting recent container logs...")
    result = run_command(["docker", "compose", "logs", "--tail", "100"])
    if result.returncode != 0:
        logger.error("Unable to retrieve container logs.")
        error_logger.error("Unable to retrieve container logs.")
        return False

    logs = f"{result.stdout}\n{result.stderr}"
    found_errors = [line for line in logs.splitlines() if ERROR_PATTERN.search(line)]

    if found_errors:
        logger.warning("Potential errors detected in container logs.")
        error_logger.warning("Potential errors detected in container logs:")
        for err in found_errors:
            error_logger.warning(err)
        return False

    logger.info("No obvious errors detected in recent container logs.")
    return True


# ============================================================
# ARGUMENT PARSING & MAIN EXECUTION
# ============================================================
def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start project development stack safely.")
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Start and verify Docker services without opening external GUI apps (VS Code / Firefox).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    create_loggers()
    args = parse_arguments(argv)

    logger.info("=" * 70)
    logger.info("DEVELOPMENT ENVIRONMENT STARTUP")
    logger.info("=" * 70)
    logger.info("Project directory: %s", PROJECT_DIR)

    try:
        os_name = get_operating_system()
        logger.info("Operating system: %s", os_name)

        if not command_exists("docker"):
            logger.error("Docker command was not found in PATH.")
            error_logger.error("Docker command was not found in PATH.")
            return 1

        if not start_docker(os_name):
            logger.error("Failed to start Docker application.")
            return 1

        if not wait_for_docker():
            logger.error("Docker is not available. Startup aborted.")
            return 1

        if not verify_compose_available():
            logger.error("Docker Compose is not available. Startup aborted.")
            return 1

        if not start_compose():
            logger.error("Docker Compose startup failed.")
            return 1

        status_ok = check_container_status()
        logs_ok = check_container_logs()

        if status_ok and not args.no_open:
            open_vscode(os_name)
            open_firefox(os_name)

        if status_ok and logs_ok:
            logger.info("=" * 70)
            logger.info("DEVELOPMENT ENVIRONMENT STARTUP COMPLETE")
            logger.info("Frontend URL: %s", FRONTEND_URL)
            logger.info("Django Admin: %s", ADMIN_URL)
            logger.info("=" * 70)
            return 0

        logger.warning("=" * 70)
        logger.warning("STARTUP COMPLETED WITH WARNINGS/ERRORS")
        logger.warning("=" * 70)
        return 1

    except KeyboardInterrupt:
        logger.warning("Startup interrupted by user.")
        error_logger.warning("Startup interrupted by user.")
        return 130
    except Exception:
        logger.exception("Unexpected error during startup.")
        error_logger.exception("Unexpected error during startup.")
        return 1


# ============================================================
# ENTRY POINT
# ============================================================
if __name__ == "__main__":
    sys.exit(main())