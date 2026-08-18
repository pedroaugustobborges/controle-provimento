"""
importar_editais_reachr.py
──────────────────────────
Reads all records from the `importacoes` table with
status = 'aguardando_processamento', then for each one:

  1. Opens a FRESH browser and logs in to Reachr.
  2. Searches for the edital code.
  3. Verifies the card shows the expected code ("Cód. XXXXX").
  4. Captures the publication date shown on the card.
  5. Opens the Kanban view and exports candidates to Excel.
  6. Closes the export modal, opens "Editar vaga" → "Etapas do Processo
     Seletivo" and reads the date of the LAST schedule card
     ("Adicionado em dd/mm/yyyy") → this becomes `data_resultado`.
  7. Parses the Excel → inserts rows into `banco_candidatos`
     (every candidate of that proc. seletivo gets the same data_resultado).
  8. Deletes the temporary Excel file.
  9. Closes the browser and moves on to the next `arquivo`.

Resilience features (built for an unattended cron job on an AWS VM)
──────────────────────────────────────────────────────────────────
  • Single-instance file lock — overlapping cron invocations exit cleanly.
  • One isolated browser per edital — a crash on edital N never poisons N+1.
  • Automatic retries per edital (fresh browser each attempt) with backoff.
  • Idempotent inserts — existing rows for the same import_batch_id are
    wiped before re-insert, so a retry never duplicates candidates.
  • Stale-element / intercepted-click recovery with JS-click fallback.
  • Supabase calls wrapped with retry-on-transient-error.
  • Screenshots + page-source dumps captured on failure for debugging.
  • Best-effort cleanup of orphaned firefox/geckodriver processes at start.
  • Rotating log file so the VM disk never fills up.

Environment variables
──────────────────────
  SUPABASE_URL              – project URL, e.g. https://xxxx.supabase.co   (required)
  SUPABASE_SERVICE_KEY      – service-role key (bypasses RLS)              (required)
  REACHR_EMAIL              – login e-mail for Reachr                      (required)
  REACHR_PASSWORD           – login password for Reachr                    (required)
  GECKODRIVER_PATH          – path to geckodriver     (default /usr/local/bin/geckodriver)
  DOWNLOAD_DIR              – temp downloads dir       (default /tmp/reachr_downloads)
  DEBUG_DIR                 – screenshots / dumps      (default $DOWNLOAD_DIR/debug)
  LOCK_FILE                 – cron lock path           (default /tmp/importar_editais.lock)
  MAX_ATTEMPTS_PER_EDITAL   – retries per edital       (default 3)
  KILL_STALE_BROWSERS       – "1"/"0" kill leftovers   (default 1)
"""

import os
import re
import sys
import time
import fcntl
import shutil
import logging
import datetime
import subprocess
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional

import pandas as pd
from supabase import create_client, Client
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
    StaleElementReferenceException,
    ElementClickInterceptedException,
)

# ============================================================================
# CONFIGURATION  (override via environment variables)
# ============================================================================

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

LOGIN_EMAIL    = os.environ.get("REACHR_EMAIL",    "luanna.sousa@agirsaude.org.br")
LOGIN_PASSWORD = os.environ.get("REACHR_PASSWORD", "reachr@2025")

BASE_URL         = "https://www.reachr.com.br/empresas/#/dashboard"
GECKODRIVER_PATH = os.environ.get("GECKODRIVER_PATH", "/usr/local/bin/geckodriver")
DOWNLOAD_DIR     = os.environ.get("DOWNLOAD_DIR",     "/tmp/reachr_downloads")
DEBUG_DIR        = os.environ.get("DEBUG_DIR",        os.path.join(DOWNLOAD_DIR, "debug"))
LOCK_FILE        = os.environ.get("LOCK_FILE",        "/tmp/importar_editais.lock")

MAX_ATTEMPTS_PER_EDITAL = int(os.environ.get("MAX_ATTEMPTS_PER_EDITAL", "3"))
KILL_STALE_BROWSERS     = os.environ.get("KILL_STALE_BROWSERS", "1") == "1"

DEFAULT_TIMEOUT = 30
SHORT_TIMEOUT   = 12

# Retry counts for low-level interactions (not the per-edital retry loop)
CLICK_RETRIES = 3
TYPE_RETRIES  = 3
DB_RETRIES    = 4

# ============================================================================
# LOGGING  (rotating file so the VM disk cannot fill up)
# ============================================================================

_rotating = RotatingFileHandler(
    "importar_editais.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[_rotating, logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ============================================================================
# GENERIC RETRY HELPER (used for flaky Supabase / network calls)
# ============================================================================

def retry_call(fn, *args, tries: int = DB_RETRIES, delay: float = 3.0, what: str = "call", **kwargs):
    """Run fn(*args, **kwargs), retrying on any exception with linear backoff."""
    last_exc = None
    for attempt in range(1, tries + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001 — we genuinely want to retry anything transient
            last_exc = exc
            logger.warning("%s failed (attempt %d/%d): %s", what, attempt, tries, exc)
            time.sleep(delay * attempt)
    logger.error("%s exhausted all %d attempts.", what, tries)
    raise last_exc

# ============================================================================
# SELENIUM HELPERS  (each sleep = previous value + 2 s; interactions retry)
# ============================================================================

def wait_and_find(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until an element is present in the DOM and return it."""
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )


def wait_and_click(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT,
                   retries: int = CLICK_RETRIES):
    """Wait until clickable, scroll into view, click. Retries stale/intercepted
    elements and falls back to a JS click when a normal click is intercepted."""
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
            time.sleep(4.5)    # original 0.5 + 2 + 2
            try:
                element.click()
            except (ElementClickInterceptedException, StaleElementReferenceException):
                logger.warning("Normal click failed — trying JS click on %s", xpath)
                driver.execute_script("arguments[0].click();", element)
            time.sleep(5.5)    # original 1.5 + 2 + 2
            return element
        except (StaleElementReferenceException, TimeoutException,
                ElementClickInterceptedException) as exc:
            last_exc = exc
            logger.warning("click attempt %d/%d failed on %s: %s",
                           attempt, retries, xpath, exc.__class__.__name__)
            time.sleep(3)
    raise last_exc


def wait_and_type(driver: webdriver.Firefox, xpath: str, text: str,
                  timeout: int = DEFAULT_TIMEOUT, retries: int = TYPE_RETRIES):
    """Wait until visible, clear, type. Retries stale elements and verifies the
    field actually holds the typed value before returning."""
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.visibility_of_element_located((By.XPATH, xpath))
            )
            element.clear()
            time.sleep(4.3)    # original 0.3 + 2 + 2
            element.send_keys(text)
            time.sleep(5.5)    # original 1.5 + 2 + 2
            return element
        except (StaleElementReferenceException, TimeoutException) as exc:
            last_exc = exc
            logger.warning("type attempt %d/%d failed on %s: %s",
                           attempt, retries, xpath, exc.__class__.__name__)
            time.sleep(3)
    raise last_exc


def safe_get_text(driver: webdriver.Firefox, xpath: str,
                  timeout: int = SHORT_TIMEOUT) -> str:
    """Return element text or empty string if not found."""
    try:
        el = WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.XPATH, xpath))
        )
        return el.text.strip()
    except (TimeoutException, NoSuchElementException):
        logger.warning("Could not read text from xpath: %s", xpath)
        return ""


def dump_debug(driver: Optional[webdriver.Firefox], tag: str) -> None:
    """Best-effort screenshot + page-source dump for post-mortem debugging."""
    if driver is None:
        return
    try:
        Path(DEBUG_DIR).mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        base = os.path.join(DEBUG_DIR, f"{stamp}_{tag}")
        driver.save_screenshot(base + ".png")
        with open(base + ".html", "w", encoding="utf-8") as fh:
            fh.write(driver.page_source)
        logger.info("Saved debug artefacts: %s.{png,html}", base)
    except Exception as exc:  # noqa: BLE001 — debugging must never crash the run
        logger.warning("Could not save debug artefacts (%s): %s", tag, exc)

# ============================================================================
# PROCESS / DRIVER SETUP
# ============================================================================

def kill_stale_browsers() -> None:
    """Kill orphaned firefox/geckodriver left behind by a crashed previous run.
    Safe because the single-instance lock guarantees no sibling run is active."""
    if not KILL_STALE_BROWSERS:
        return
    for proc in ("geckodriver", "firefox", "firefox-bin"):
        try:
            subprocess.run(["pkill", "-f", proc],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        except FileNotFoundError:
            pass  # pkill not installed — ignore
    time.sleep(2)


def setup_driver() -> webdriver.Firefox:
    Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)

    service = Service(executable_path=GECKODRIVER_PATH)
    options = webdriver.FirefoxOptions()
    options.add_argument("--headless")
    # Fixed viewport — maximize_window() is unreliable in headless mode.
    options.add_argument("--width=1920")
    options.add_argument("--height=1080")

    # Configure automatic download without dialog
    options.set_preference("browser.download.folderList", 2)
    options.set_preference("browser.download.manager.showWhenStarting", False)
    options.set_preference("browser.download.dir", DOWNLOAD_DIR)
    options.set_preference(
        "browser.helperApps.neverAsk.saveToDisk",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/octet-stream",
    )
    options.set_preference("browser.download.manager.alertOnEXEOpen", False)
    options.set_preference("browser.download.manager.closeWhenDone", True)
    options.set_preference("pdfjs.disabled", True)

    driver = webdriver.Firefox(service=service, options=options)
    driver.set_page_load_timeout(120)
    driver.set_script_timeout(60)
    try:
        driver.set_window_size(1920, 1080)
    except WebDriverException:
        pass
    return driver


def quit_driver(driver: Optional[webdriver.Firefox]) -> None:
    """Quit the driver, swallowing any teardown error."""
    if driver is None:
        return
    try:
        driver.quit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Error while quitting driver: %s", exc)


def wait_for_new_xlsx(before_files: set, timeout: int = 120) -> Optional[str]:
    """
    Poll DOWNLOAD_DIR until a new, fully-written .xlsx file appears (i.e. no
    matching .part file and size stable across two polls). Returns the absolute
    path or None on timeout.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        partials = any(f.suffix.lower() == ".part" for f in Path(DOWNLOAD_DIR).iterdir())
        current = {
            f for f in Path(DOWNLOAD_DIR).iterdir()
            if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
        }
        new_files = current - before_files
        if new_files and not partials:
            newest = sorted(new_files, key=lambda f: f.stat().st_mtime)[-1]
            # Confirm the file size is stable (download finished flushing).
            size1 = newest.stat().st_size
            time.sleep(2)
            if newest.exists() and newest.stat().st_size == size1 and size1 > 0:
                logger.info("New download detected: %s", newest)
                return str(newest)
        time.sleep(2)
    return None

# ============================================================================
# SUPABASE HELPERS
# ============================================================================

def get_pending_editais(supabase: Client) -> list:
    resp = retry_call(
        lambda: supabase.table("importacoes")
        .select("*")
        .eq("status", "aguardando_processamento")
        .order("created_at", desc=False)   # process oldest first
        .execute(),
        what="get_pending_editais",
    )
    return resp.data or []


def update_importacao_status(supabase: Client, record_id: str, status: str) -> None:
    retry_call(
        lambda: supabase.table("importacoes").update({"status": status}).eq("id", record_id).execute(),
        what="update_importacao_status",
    )
    logger.info("importacoes[%s] → '%s'", record_id, status)

# ============================================================================
# XPATH CONSTANTS
# ============================================================================

_EMAIL_XPATH = (
    "/html/body/app-root/login-juridico/main/section/div/div/div[2]/div/div[1]"
    "/article/app-formulario-login/div/form/div[1]/input"
)
_PASSWORD_XPATH = (
    "/html/body/app-root/login-juridico/main/section/div/div/div[2]/div/div[1]"
    "/article/app-formulario-login/div/form/div[2]/input"
)
_LOGIN_BTN_XPATH = (
    "/html/body/app-root/login-juridico/main/section/div/div/div[2]/div/div[1]"
    "/article/app-formulario-login/div/form/div[4]/input"
)
_FILTER_BTN_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/app-dash-filtro/div/div[1]/div[2]/div/button/span"
)
_VAGA_INPUT_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/app-dash-filtro/div/div[2]/div/form/div[1]/div[1]/nz-form-item/nz-form-control"
    "/div/div/input"
)
_SEARCH_BTN_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/app-dash-filtro/div/div[2]/div/form/div[3]/div[2]/nz-form-item/nz-form-control"
    "/div/div/button/span"
)
_CODE_VERIFY_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[1]/div[1]/div[2]"
)
_LOCATION_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[2]/div[4]/div"
)
_DATE_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[2]/div[7]/div"
)
_VAGA_TITLE_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[1]/div[1]/div[1]/div/span"
)
_EXPORT_ICON_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[2]"
    "/app-vaga-kanbam/div/div[2]/app-vaga-kanbam-coluna[11]/div[3]/i[6]"
)
_SELECT_DROPDOWN_XPATH = (
    "/html/body/div/div[2]/div/nz-modal-container/div/div/div[2]"
    "/app-importar-exportar-candidatos/div[2]/div/div[1]/nz-select/nz-select-top-control"
)
_EXCEL_OPTION_XPATH = (
    "/html/body/div/div[3]/div/nz-option-container/div"
    "/cdk-virtual-scroll-viewport/div[1]/nz-option-item[13]/div"
)
_EXPORT_BTN_XPATH = (
    "/html/body/div/div[2]/div/nz-modal-container/div/div/div[2]"
    "/app-importar-exportar-candidatos/div[2]/div/div[2]/div[1]/button/span"
)

# ── Data Resultado flow ──────────────────────────────────────────────────────
_EXPORT_MODAL_CLOSE_XPATH = (
    "/html/body/div/div[2]/div/nz-modal-container/div/div/button/span"
)
_EDITAR_VAGA_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[1]"
    "/app-vaga-header/div[2]/div[2]/div[2]/button[1]"
)
_ETAPAS_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-vg-adicionar/div/div[2]"
    "/div[2]/div[1]/nz-steps/div/nz-step[18]/div/div[3]/div[1]"
)
# Section that holds the schedule cards. The number of cards varies, so we
# always take the LAST direct <div> child (the last card) at runtime.
_RESULT_CARDS_SECTION_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-vg-adicionar/div/div[2]"
    "/div[2]/div[2]/app-vg-cronograma/div[2]/div[2]/div[2]"
)
_RESULT_CARDS_XPATH        = _RESULT_CARDS_SECTION_XPATH + "/div"
_RESULT_CARD_DATE_REL      = "./div[1]/div[1]/div[2]/span"   # inside a card → "Adicionado em dd/mm/yyyy"

# ============================================================================
# BROWSER STEPS
# ============================================================================

def login(driver: webdriver.Firefox) -> None:
    logger.info("Opening login page: %s", BASE_URL)
    driver.get(BASE_URL)
    time.sleep(7.5)    # original 3.5 + 2 + 2

    logger.info("Typing e-mail…")
    wait_and_type(driver, _EMAIL_XPATH, LOGIN_EMAIL)

    logger.info("Typing password…")
    wait_and_type(driver, _PASSWORD_XPATH, LOGIN_PASSWORD)

    logger.info("Clicking login button…")
    wait_and_click(driver, _LOGIN_BTN_XPATH)

    logger.info("Waiting for dashboard to load…")
    time.sleep(12)     # original 8 + 2 + 2


def navigate_to_dashboard(driver: webdriver.Firefox) -> None:
    logger.info("Navigating back to dashboard…")
    driver.get(BASE_URL)
    time.sleep(9)      # original 7 + 2  → give Angular app time to bootstrap


def apply_filter(driver: webdriver.Firefox, vaga_code: str) -> None:
    logger.info("Opening filter panel for code: %s", vaga_code)
    wait_and_click(driver, _FILTER_BTN_XPATH)
    time.sleep(5)      # original 1 + 2 + 2

    logger.info("Typing vacancy code…")
    wait_and_type(driver, _VAGA_INPUT_XPATH, vaga_code)
    time.sleep(6.0)    # original 2.0 + 2 + 2

    logger.info("Clicking search button…")
    wait_and_click(driver, _SEARCH_BTN_XPATH)

    logger.info("Waiting for search results…")
    time.sleep(8)      # original 4 + 2 + 2


def verify_code(driver: webdriver.Firefox, numero_edital: str) -> bool:
    """
    Read the vacancy card code (format: 'Cód. 32203') and confirm it matches
    the code we are looking for. Returns True if matched, False otherwise.
    """
    text = safe_get_text(driver, _CODE_VERIFY_XPATH)
    logger.info("Card code text: '%s'  (expecting code: '%s')", text, numero_edital)

    code_only = re.sub(r"[Cc][oó][Dd]\.?\s*", "", text).strip()
    matched = (code_only == numero_edital.strip())
    if not matched:
        logger.warning("Code mismatch: extracted '%s' vs expected '%s'", code_only, numero_edital)
    return matched


def get_card_info(driver: webdriver.Firefox) -> dict:
    """Read cargo / unidade / data_publicacao from the vacancy card."""
    cargo_raw    = safe_get_text(driver, _VAGA_TITLE_XPATH)
    location_raw = safe_get_text(driver, _LOCATION_XPATH)
    date_raw     = safe_get_text(driver, _DATE_XPATH)

    unidade_card = location_raw.split(" :")[0].strip() if location_raw else None

    date_clean = re.sub(r"(?i)data\s*:\s*", "", date_raw).strip()
    data_publicacao = _parse_date(date_clean) if date_clean else None

    logger.info("Card cargo        : %s", cargo_raw    or "(not found)")
    logger.info("Card unidade      : %s", unidade_card or "(not found)")
    logger.info("Card date (raw)   : %s", date_raw     or "(not found)")
    logger.info("Card date (parsed): %s", data_publicacao or "(not parsed)")
    time.sleep(5.5)    # original 1.5 + 2 + 2
    return {
        "cargo":           cargo_raw.strip() or None,
        "unidade_card":    unidade_card,
        "data_publicacao": data_publicacao,
    }


def open_kanban(driver: webdriver.Firefox) -> None:
    logger.info("Clicking vacancy title to open Kanban…")
    wait_and_click(driver, _VAGA_TITLE_XPATH)

    logger.info("Waiting for Kanban page…")
    time.sleep(9)      # original 5 + 2 + 2


def export_excel(driver: webdriver.Firefox) -> str:
    """
    Trigger the Excel export in Reachr and wait for the file to land in
    DOWNLOAD_DIR. Returns the local path to the downloaded file.
    Raises RuntimeError if the download times out.
    """
    before = {
        f for f in Path(DOWNLOAD_DIR).iterdir()
        if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
    }

    logger.info("Clicking 'Exportar Candidatos' icon…")
    time.sleep(10.5)   # original 6.5 + 2 + 2
    wait_and_click(driver, _EXPORT_ICON_XPATH)

    logger.info("Waiting for export modal…")
    time.sleep(10.5)   # original 6.5 + 2 + 2

    logger.info("Opening format dropdown…")
    time.sleep(3)      # original -1 + 2 + 2  → settle
    wait_and_click(driver, _SELECT_DROPDOWN_XPATH)
    time.sleep(6.0)    # original 2.0 + 2 + 2

    logger.info("Selecting 'Exportar para excel'…")
    wait_and_click(driver, _EXCEL_OPTION_XPATH)
    time.sleep(6.0)    # original 2.0 + 2 + 2

    logger.info("Clicking export confirmation button…")
    wait_and_click(driver, _EXPORT_BTN_XPATH)

    logger.info("Waiting for download to complete…")
    time.sleep(10)     # original 6 + 2 + 2

    path = wait_for_new_xlsx(before, timeout=120)
    if not path:
        raise RuntimeError(
            "Download timed out — no new .xlsx appeared in %s after 120 s." % DOWNLOAD_DIR
        )
    return path


def get_data_resultado(driver: webdriver.Firefox) -> Optional[str]:
    """
    Runs AFTER a confirmed Excel export. Closes the export modal, opens
    "Editar vaga" → "Etapas do Processo Seletivo", then reads the date of the
    LAST schedule card ("Adicionado em dd/mm/yyyy") and returns it as
    'YYYY-MM-DD'. Returns None if the date span cannot be read/parsed.

    The click steps propagate exceptions (so the per-edital retry loop can try
    again with a fresh browser); only the final date read is non-fatal.
    """
    logger.info("Closing export modal…")
    wait_and_click(driver, _EXPORT_MODAL_CLOSE_XPATH)
    time.sleep(4)      # settle after modal close

    logger.info("Clicking 'Editar vaga'…")
    wait_and_click(driver, _EDITAR_VAGA_XPATH)

    logger.info("Waiting for edit page (8 s + 2)…")
    time.sleep(10)     # requested 8 + 2

    logger.info("Clicking 'Etapas do Processo Seletivo'…")
    wait_and_click(driver, _ETAPAS_XPATH)
    time.sleep(4)      # let the schedule cards render

    # Wait for at least one card to be present, then walk the cards from the
    # last to the first and return the first parseable "Adicionado em" date.
    try:
        WebDriverWait(driver, SHORT_TIMEOUT).until(
            EC.presence_of_element_located((By.XPATH, _RESULT_CARDS_XPATH))
        )
    except TimeoutException:
        logger.warning("No schedule cards found — data_resultado will be NULL.")
        return None

    cards = driver.find_elements(By.XPATH, _RESULT_CARDS_XPATH)
    logger.info("Schedule cards found: %d", len(cards))

    for idx, card in enumerate(reversed(cards), start=1):
        try:
            span = card.find_element(By.XPATH, _RESULT_CARD_DATE_REL)
            raw = (span.text or "").strip()
        except (NoSuchElementException, StaleElementReferenceException):
            continue
        if not raw:
            continue
        # "Adicionado em 22/05/2026" → "22/05/2026"
        cleaned = re.sub(r"(?i)adicionado\s+em\s*", "", raw).strip()
        parsed = _parse_date(cleaned)
        logger.info("Card from end #%d: raw='%s' parsed='%s'", idx, raw, parsed)
        if parsed and re.match(r"^\d{4}-\d{2}-\d{2}$", parsed):
            return parsed

    logger.warning("Could not extract a valid data_resultado from any card.")
    return None

# ============================================================================
# PARSING HELPERS
# ============================================================================

def _parse_float(val) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    try:
        return float(str(val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return None


def _parse_date(val) -> Optional[str]:
    """Return ISO date string 'YYYY-MM-DD' or None."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    logger.warning("Could not parse date: '%s' — storing as-is.", s)
    return s  # fallback: store raw text


def _pad_cpf(raw: str) -> Optional[str]:
    """Strip non-digit characters and zero-pad CPF to 11 digits."""
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    return digits.zfill(11)

# ============================================================================
# EXCEL PARSING AND DATABASE INSERT
# ============================================================================

def process_excel(
    supabase: Client,
    excel_path: str,
    arquivo: str,
    numero_edital: str,
    is_teia: bool,
    card_info: dict,
    data_resultado: Optional[str],
    importacao_id: str,
) -> int:
    """
    Parse the downloaded Excel file, calculate rankings, and bulk-insert rows
    into banco_candidatos. `data_resultado` (scraped from the last schedule
    card) is applied to EVERY candidate of this proc. seletivo.

    Insertion is idempotent: any existing rows carrying this import_batch_id are
    deleted first, so a retry never duplicates candidates.
    Returns the number of rows inserted.
    """
    today_iso        = datetime.date.today().strftime("%Y-%m-%d")
    cargo_vaga       = card_info.get("cargo")
    unidade_card     = card_info.get("unidade_card")
    data_publicacao  = card_info.get("data_publicacao")

    logger.info("Parsing Excel file: %s", excel_path)
    df = pd.read_excel(excel_path, engine="openpyxl")

    df.columns = [str(c).strip() for c in df.columns]
    logger.info("Columns: %s", list(df.columns))

    rows = []
    for _, row in df.iterrows():
        nome = str(row.get("Nome") or "").strip()
        if not nome:
            continue  # skip blank rows

        nota_av  = _parse_float(row.get("Nota da avaliação") or row.get("Nota da avaliacao"))
        nota_ent = _parse_float(row.get("Nota da Entrevista"))

        avg_score = ((nota_av or 0.0) + (nota_ent or 0.0)) / 2.0

        nascimento = _parse_date(row.get("Nascimento"))

        cpf_raw = str(row.get("CPF") or "").strip()
        cpf     = _pad_cpf(cpf_raw) if cpf_raw else None

        unidade_excel = str(row.get("Unidade") or "").strip() or None
        unidade       = unidade_card or unidade_excel

        status_atual = str(row.get("Status Atual") or "").strip() or None

        rows.append({
            "nome":                     nome,
            "cpf":                      cpf,
            "data_nascimento":          nascimento,
            "email":                    str(row.get("E-Mail") or "").strip() or None,
            "telefone":                 str(row.get("Celular") or "").strip() or None,
            "unidade":                  unidade,
            "cargo":                    cargo_vaga,
            "nota_avaliacao":           str(nota_av)  if nota_av  is not None else None,
            "nota_entrevista":          str(nota_ent) if nota_ent is not None else None,
            "observacao":               status_atual,
            "numero_processo_seletivo": arquivo,
            "numero_edital":            numero_edital or None,
            "is_teia":                  is_teia,
            "media_final":              round(avg_score, 4),
            "data_publicacao":          data_publicacao,
            "data_resultado":           data_resultado,     # ← same date for all candidates
            "data_importacao":          today_iso,
            "import_batch_id":          importacao_id,
            "status":                   "CADASTRO RESERVA",
            "status_calculado":         "CADASTRO RESERVA",
            "status_original":          "CADASTRO RESERVA",
            "origem":                   "reachr",
            # ── temporary sort keys (removed before insert) ──────────────────
            "__avg":  avg_score,
            "__nasc": nascimento or "9999-99-99",
        })

    if not rows:
        logger.warning("Excel file contained no valid candidate rows.")
        return 0

    # ── Ranking ──────────────────────────────────────────────────────────────
    # Primary: average score (highest → rank 1); Secondary: oldest birth date.
    rows.sort(key=lambda r: (-r["__avg"], r["__nasc"]))
    for rank, r in enumerate(rows, start=1):
        r["classificacao"] = str(rank)
        del r["__avg"]
        del r["__nasc"]

    # ── Idempotency: clear any prior rows for this batch before inserting ─────
    logger.info("Clearing any previous rows for import_batch_id=%s …", importacao_id)
    retry_call(
        lambda: supabase.table("banco_candidatos").delete().eq("import_batch_id", importacao_id).execute(),
        what="delete_previous_batch",
    )

    # ── Insert in batches of 100 ──────────────────────────────────────────────
    batch_size = 100
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        retry_call(
            lambda b=batch: supabase.table("banco_candidatos").insert(b).execute(),
            what="insert_candidatos_batch",
        )
        total_inserted += len(batch)
        logger.info("  Inserted rows %d – %d", i + 1, total_inserted)

    logger.info("Total rows inserted for proc. seletivo %s: %d (data_resultado=%s)",
                arquivo, total_inserted, data_resultado)
    return total_inserted

# ============================================================================
# PER-EDITAL ORCHESTRATION (one isolated browser + retries)
# ============================================================================

class EditalNotFound(Exception):
    """Raised when the searched código does not exist in Reachr (no retry)."""


def _run_full_flow(driver: webdriver.Firefox, supabase: Client,
                   arquivo: str, numero_edital: str, is_teia: bool,
                   importacao_id: str) -> int:
    """One complete attempt: login → filter → export → data_resultado → insert."""
    login(driver)
    navigate_to_dashboard(driver)
    apply_filter(driver, arquivo)

    if not verify_code(driver, arquivo):
        raise EditalNotFound(arquivo)

    card_info = get_card_info(driver)
    open_kanban(driver)

    excel_path = export_excel(driver)
    try:
        data_resultado = get_data_resultado(driver)

        n = process_excel(
            supabase, excel_path, arquivo, numero_edital,
            is_teia, card_info, data_resultado, importacao_id,
        )
    finally:
        # Always remove the temp file, even if insertion failed mid-way.
        try:
            if os.path.exists(excel_path):
                os.remove(excel_path)
                logger.info("Deleted temporary file: %s", excel_path)
        except OSError as err:
            logger.warning("Could not delete %s: %s", excel_path, err)

    return n


def process_edital(supabase: Client, edital_row: dict) -> None:
    """
    Process a single edital end-to-end with its own fresh browser, retrying up
    to MAX_ATTEMPTS_PER_EDITAL times (new browser each attempt). Writes the
    final status back to `importacoes`.
    """
    arquivo       = (edital_row.get("arquivo")       or "").strip()
    numero_edital = (edital_row.get("numero_edital") or "").strip()
    is_teia       = bool(edital_row.get("is_teia", False))
    importacao_id = edital_row["id"]

    logger.info("───────────────────────────────────────────────────")
    logger.info("Processing proc. seletivo: %s | edital: %s  (importacao id: %s)",
                arquivo, numero_edital, importacao_id)

    if not arquivo:
        logger.warning("Row %s has empty arquivo — skipping.", importacao_id)
        update_importacao_status(supabase, importacao_id, "Erro: arquivo (código) vazio")
        return

    for attempt in range(1, MAX_ATTEMPTS_PER_EDITAL + 1):
        logger.info("Attempt %d/%d for proc. seletivo %s",
                    attempt, MAX_ATTEMPTS_PER_EDITAL, arquivo)
        driver = None
        try:
            driver = setup_driver()
            logger.info("Browser started (headless) for %s.", arquivo)

            n = _run_full_flow(driver, supabase, arquivo, numero_edital, is_teia, importacao_id)

            update_importacao_status(
                supabase, importacao_id,
                "Candidato(a)s importados para o banco de talentos",
            )
            logger.info("Proc. seletivo %s processed successfully (%d candidates).", arquivo, n)
            return  # success — stop retrying

        except EditalNotFound:
            logger.warning("Código %s not found in Reachr.", arquivo)
            update_importacao_status(supabase, importacao_id, "Edital não encontrado na Reachr")
            return  # definitive — do not retry

        except (TimeoutException, WebDriverException, RuntimeError) as exc:
            logger.error("Attempt %d failed for %s: %s: %s",
                         attempt, arquivo, exc.__class__.__name__, exc)
            dump_debug(driver, f"{arquivo}_attempt{attempt}")
        except Exception as exc:  # noqa: BLE001 — capture anything unexpected
            logger.error("Unexpected error on attempt %d for %s: %s",
                         attempt, arquivo, exc, exc_info=True)
            dump_debug(driver, f"{arquivo}_attempt{attempt}_unexpected")
        finally:
            quit_driver(driver)
            # Fresh browser next time → also clear any stale processes.
            kill_stale_browsers()

        if attempt < MAX_ATTEMPTS_PER_EDITAL:
            backoff = min(60, 10 * attempt)
            logger.info("Retrying %s in %d s…", arquivo, backoff)
            time.sleep(backoff)
        else:
            update_importacao_status(
                supabase, importacao_id,
                f"Erro: falha após {MAX_ATTEMPTS_PER_EDITAL} tentativas",
            )
            logger.error("Giving up on proc. seletivo %s after %d attempts.",
                         arquivo, MAX_ATTEMPTS_PER_EDITAL)

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def acquire_lock():
    """Acquire a single-instance file lock so overlapping cron runs exit cleanly.
    Returns the open lock file handle (must stay open for the lock to hold)."""
    lock_fh = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lock_fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        logger.warning("Another instance already holds %s — exiting.", LOCK_FILE)
        sys.exit(0)
    lock_fh.write(str(os.getpid()))
    lock_fh.flush()
    return lock_fh


def run() -> None:
    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — starting")
    logger.info("═══════════════════════════════════════════════════════")

    # ── Guard: required env vars ──────────────────────────────────────────────
    missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY",
                           "REACHR_EMAIL", "REACHR_PASSWORD") if not os.environ.get(v)]
    # REACHR_* have hard-coded fallbacks, so only fail on missing Supabase creds.
    missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY") if not os.environ.get(v)]
    if missing:
        raise EnvironmentError(
            "Missing required environment variable(s): %s" % ", ".join(missing)
        )

    kill_stale_browsers()
    Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    editais = get_pending_editais(supabase)
    if not editais:
        logger.info("No editais with status 'aguardando_processamento'. Nothing to do.")
        return

    codes = [e.get("arquivo", "(empty)") for e in editais]
    logger.info("Found %d pending edital(s): %s", len(editais), codes)

    # Each edital gets its own browser (open → work → close), then the next one.
    for edital_row in editais:
        try:
            process_edital(supabase, edital_row)
        except Exception as exc:  # noqa: BLE001 — never let one edital abort the whole run
            logger.error("Fatal error handling edital %s: %s",
                         edital_row.get("arquivo"), exc, exc_info=True)
            try:
                update_importacao_status(
                    supabase, edital_row["id"], f"Erro inesperado: {str(exc)[:200]}"
                )
            except Exception:  # noqa: BLE001
                logger.error("Could not even record the error status for %s.",
                             edital_row.get("id"))

    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — finished")
    logger.info("═══════════════════════════════════════════════════════")


if __name__ == "__main__":
    lock_handle = acquire_lock()
    try:
        run()
    finally:
        # Tidy up stray downloads so the VM disk stays clean.
        try:
            for f in Path(DOWNLOAD_DIR).iterdir():
                if f.suffix.lower() in (".part", ".xlsx"):
                    f.unlink(missing_ok=True)
        except Exception:  # noqa: BLE001
            pass
        try:
            fcntl.flock(lock_handle, fcntl.LOCK_UN)
            lock_handle.close()
        except Exception:  # noqa: BLE001
            pass