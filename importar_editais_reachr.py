"""
importar_editais_reachr.py
──────────────────────────
Reads all records from the `importacoes` table with
status = 'aguardando_processamento', then for each one:

  1. Logs in to Reachr (once per run).
  2. Searches for the edital code.
  3. Verifies the card shows the expected code ("Cód. XXXXX").
  4. Captures the publication date shown on the card.
  5. Opens the Kanban view and exports candidates to Excel.
  6. Parses the Excel → inserts rows into `banco_candidatos`.
  7. Deletes the temporary Excel file.
  8. Updates `importacoes.status` to reflect the result.

Resilience features
────────────────────
  • wait_and_click / wait_and_type now wait for Reachr's Angular
    "loading-overlay" to disappear before interacting with an element,
    retry a few times on ElementClickIntercepted / stale-element races,
    and fall back to a JavaScript click if the native click is blocked.
    This is what was crashing the run with:
      "Element <span class="ml-2"> is not clickable ... loading-overlay
       obscures it"
  • Each edital is retried (MAX_EDITAL_ATTEMPTS, default 2) before being
    marked as failed, and the browser session is health-checked and
    automatically restarted (with re-login) if it has died.
  • Duplicate 'arquivo' codes returned in the same batch (e.g. the same
    row queued twice) are scraped/exported only once; duplicates simply
    copy the first result instead of re-exporting and double-inserting
    candidates into banco_candidatos.
  • Fixed the publication-date parser: it only stripped a "Data:" prefix,
    so real cards showing "Data Pub.: 12/08/2026" fell through to the
    raw-text fallback and stored an unparsable string instead of an ISO
    date. It now strips any "Data ... :" prefix.

Environment variables required
───────────────────────────────
  SUPABASE_URL          – your project URL, e.g. https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY  – service-role key (bypasses RLS)
  REACHR_EMAIL          – login e-mail for Reachr
  REACHR_PASSWORD       – login password for Reachr
  GECKODRIVER_PATH      – (optional) path to geckodriver binary
                          default: /usr/local/bin/geckodriver
  DOWNLOAD_DIR          – (optional) directory for temporary downloads
                          default: /tmp/reachr_downloads
  MAX_EDITAL_ATTEMPTS   – (optional) retries per edital before giving up
                          default: 2
"""

import os
import re
import time
import logging
import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from supabase import create_client, Client
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    ElementNotInteractableException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)

# ============================================================================
# CONFIGURATION  (override via environment variables)
# ============================================================================

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

LOGIN_EMAIL    = os.environ.get("REACHR_EMAIL", "")
LOGIN_PASSWORD = os.environ.get("REACHR_PASSWORD", "")

BASE_URL         = "https://www.reachr.com.br/empresas/#/dashboard"
GECKODRIVER_PATH = os.environ.get("GECKODRIVER_PATH", "/usr/local/bin/geckodriver")
DOWNLOAD_DIR     = os.environ.get("DOWNLOAD_DIR",     "/tmp/reachr_downloads")

DEFAULT_TIMEOUT = 30
SHORT_TIMEOUT   = 12

# How many total attempts (1 + retries) to give a single edital before
# giving up and recording a permanent error status for it.
MAX_EDITAL_ATTEMPTS = int(os.environ.get("MAX_EDITAL_ATTEMPTS", "2"))

# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("importar_editais.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ============================================================================
# SELENIUM HELPERS  (all sleep values are original + 2 s)
# ============================================================================

# Reachr's Angular dashboard shows a full-screen "loading-overlay" div for a
# second or two after almost every navigation / filter / search action. If a
# click is attempted while this overlay is still in the DOM, Selenium raises
# ElementClickInterceptedException even though the target element itself
# passed the "clickable" check moments earlier. Every interaction below
# waits for this overlay to clear first.
_LOADING_OVERLAY_XPATH = "//div[contains(@class,'loading-overlay')]"


def wait_for_overlay_gone(driver: webdriver.Firefox, timeout: int = DEFAULT_TIMEOUT) -> None:
    """
    Wait until Reachr's 'loading-overlay' element is gone (absent or
    invisible). Returns immediately if the overlay never appears — this
    does not add latency to the common case.
    """
    try:
        WebDriverWait(driver, timeout).until(
            EC.invisibility_of_element_located((By.XPATH, _LOADING_OVERLAY_XPATH))
        )
    except TimeoutException:
        logger.warning(
            "Loading overlay still visible after %ss — proceeding anyway.", timeout
        )


def wait_and_find(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until an element is present in the DOM and return it."""
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )


def wait_and_click(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT,
                    retries: int = 3):
    """
    Wait until clickable, scroll into view, click.

    Resilient against the loading-overlay race: waits for the overlay to
    clear before each attempt, falls back to a JS click if the native click
    is intercepted, and retries the whole wait→click cycle a few times for
    slower page loads (this is what previously crashed the run with
    "... loading-overlay ng-star-inserted obscures it").
    """
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            wait_for_overlay_gone(driver, timeout=timeout)
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
            time.sleep(2.5)    # original 0.5 + 2

            try:
                element.click()
            except (ElementClickInterceptedException, ElementNotInteractableException):
                logger.warning(
                    "Native click intercepted for %s (attempt %d/%d) — "
                    "waiting for overlay and retrying with a JS click.",
                    xpath, attempt, retries,
                )
                wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)
                driver.execute_script("arguments[0].click();", element)

            time.sleep(3.5)    # original 1.5 + 2
            return element

        except (ElementClickInterceptedException, StaleElementReferenceException,
                 TimeoutException) as exc:
            last_error = exc
            logger.warning(
                "wait_and_click failed for %s (attempt %d/%d): %s",
                xpath, attempt, retries, exc,
            )
            if attempt < retries:
                time.sleep(2 * attempt)   # small backoff before retrying

    raise last_error


def wait_and_type(driver: webdriver.Firefox, xpath: str, text: str,
                  timeout: int = DEFAULT_TIMEOUT, retries: int = 3):
    """Wait until visible, clear, type. Retries on stale-element/overlay races."""
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            wait_for_overlay_gone(driver, timeout=timeout)
            element = WebDriverWait(driver, timeout).until(
                EC.visibility_of_element_located((By.XPATH, xpath))
            )
            element.clear()
            time.sleep(2.3)    # original 0.3 + 2
            element.send_keys(text)
            time.sleep(3.5)    # original 1.5 + 2
            return element
        except (StaleElementReferenceException, ElementNotInteractableException,
                 TimeoutException) as exc:
            last_error = exc
            logger.warning(
                "wait_and_type failed for %s (attempt %d/%d): %s",
                xpath, attempt, retries, exc,
            )
            if attempt < retries:
                time.sleep(2 * attempt)

    raise last_error


def safe_get_text(driver: webdriver.Firefox, xpath: str,
                  timeout: int = SHORT_TIMEOUT) -> str:
    """Return element text or empty string if not found."""
    try:
        wait_for_overlay_gone(driver, timeout=timeout)
        el = WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.XPATH, xpath))
        )
        return el.text.strip()
    except (TimeoutException, NoSuchElementException):
        logger.warning("Could not read text from xpath: %s", xpath)
        return ""


def _driver_is_alive(driver: webdriver.Firefox) -> bool:
    """Return whether the Selenium/Firefox session is still responsive."""
    try:
        _ = driver.current_url
        return True
    except WebDriverException:
        return False

# ============================================================================
# DRIVER SETUP
# ============================================================================

def setup_driver() -> webdriver.Firefox:
    Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)

    service = Service(executable_path=GECKODRIVER_PATH)
    options = webdriver.FirefoxOptions()
    options.add_argument("--headless")

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

    driver = webdriver.Firefox(service=service, options=options)
    driver.maximize_window()
    return driver


def wait_for_new_xlsx(before_files: set, timeout: int = 90) -> Optional[str]:
    """
    Poll DOWNLOAD_DIR until a new, non-empty .xlsx file has a stable size.
    Returns the absolute path or None on timeout.
    """
    deadline = time.time() + timeout
    previous_sizes = {}

    while time.time() < deadline:
        current = {
            f for f in Path(DOWNLOAD_DIR).iterdir()
            if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
        }
        new_files = current - before_files
        if new_files:
            for candidate in sorted(new_files, key=lambda f: f.stat().st_mtime, reverse=True):
                try:
                    current_size = candidate.stat().st_size
                except FileNotFoundError:
                    continue

                if current_size > 0 and previous_sizes.get(candidate) == current_size:
                    path = str(candidate)
                    logger.info("Completed download detected: %s", path)
                    return path
                previous_sizes[candidate] = current_size
        time.sleep(2)
    return None

# ============================================================================
# SUPABASE HELPERS
# ============================================================================

def get_pending_editais(supabase: Client) -> list:
    resp = (
        supabase.table("importacoes")
        .select("*")
        .eq("status", "aguardando_processamento")
        .order("created_at", desc=False)   # process oldest first
        .execute()
    )
    return resp.data or []


def update_importacao_status(supabase: Client, record_id: str, status: str) -> None:
    supabase.table("importacoes").update({"status": status}).eq("id", record_id).execute()
    logger.info("importacoes[%s] → '%s'", record_id, status)

# ============================================================================
# BROWSER STEPS
# ============================================================================

# XPath constants
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
# /html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main/div[2]/div/div/app-dash-vaga/div/div[1]/div[1]/div[2]

_LOCATION_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[2]/div[1]/div[2]/div[3]/div"
)
# /html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main/div[2]/div/div/app-dash-vaga/div/div[2]/div[1]/div[2]/div[3]/div
# /html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main/div[2]/div/div/app-dash-vaga/div/div[2]/div[1]/div[2]/div[3]/div

_DATE_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[2]/div[1]/div[2]/div[6]/div"
)
# /html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main/div[2]/div/div/app-dash-vaga/div/div[2]/div[1]/div[2]/div[6]/div

_VAGA_TITLE_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
    "/div[2]/div/div/app-dash-vaga/div/div[1]/div[1]/div[1]/span"
)
# /html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main
# /div[2]/div/div/app-dash-vaga/div/div[1]/div[1]/div[1]/span

_KANBAN_COLUMNS_XPATH = (
    "/html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[2]"
    "/app-vaga-kanbam/div/div[2]/app-vaga-kanbam-coluna"
)
_EXPORT_ICON_XPATH_TEMPLATE = _KANBAN_COLUMNS_XPATH + "[{column}]/div[3]/i[6]"
_RESULTADO_FINAL_HEADER_XPATH = "./div[1]/span[1]"
_RESULTADO_FINAL_TEXT = "RESULTADO FINAL"
_RESULTADO_FINAL_LONG_TEXT = "RESULTADO FINAL DO PROCESSO SELETIVO"
# Reachr boards use one of these two exact headers for the final-result
# column — nothing else counts as a match (no partial/contains matching,
# no other wording variants).
_RESULTADO_FINAL_ACCEPTED_TEXTS = {_RESULTADO_FINAL_TEXT, _RESULTADO_FINAL_LONG_TEXT}
_MAX_KANBAN_COLUMNS = 15
_EXPORT_CLICK_ATTEMPTS = 3


_SELECT_DROPDOWN_XPATH = (
    "/html/body/div/div[2]/div/nz-modal-container/div/div/div[2]"
    "/app-importar-exportar-candidatos/div[2]/div/div[1]/nz-select/nz-select-top-control"
)

# /html/body/div/div[2]/div/nz-modal-container/div/div/div[2]/app-importar-exportar-candidatos/div[2]/div/div[1]/nz-select/nz-select-top-control
# /html/body/div/div[2]/div/nz-modal-container/div/div/div[2]/app-importar-exportar-candidatos/div[2]/div/div[1]/nz-select
_EXCEL_OPTION_XPATH = (
    "/html/body/div/div[3]/div/nz-option-container/div"
    "/cdk-virtual-scroll-viewport/div[1]/nz-option-item[13]/div"
)
_EXPORT_BTN_XPATH = (
    "/html/body/div/div[2]/div/nz-modal-container/div/div/div[2]"
    "/app-importar-exportar-candidatos/div[2]/div/div[2]/div[1]/button/span"
)


def login(driver: webdriver.Firefox) -> None:
    logger.info("Opening login page: %s", BASE_URL)
    driver.get(BASE_URL)
    time.sleep(5.5)    # original 3.5 + 2

    logger.info("Typing e-mail…")
    wait_and_type(driver, _EMAIL_XPATH, LOGIN_EMAIL)

    logger.info("Typing password…")
    wait_and_type(driver, _PASSWORD_XPATH, LOGIN_PASSWORD)

    logger.info("Clicking login button…")
    wait_and_click(driver, _LOGIN_BTN_XPATH)

    logger.info("Waiting for dashboard to load…")
    time.sleep(8)      # original 6 + 2
    wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
    time.sleep(2)


def navigate_to_dashboard(driver: webdriver.Firefox) -> None:
    logger.info("Navigating back to dashboard…")
    driver.get(BASE_URL)
    time.sleep(5)      # give Angular time to start bootstrapping
    wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
    time.sleep(2)      # small settle buffer, same total budget as before


def apply_filter(driver: webdriver.Firefox, vaga_code: str) -> None:
    logger.info("Opening filter panel for code: %s", vaga_code)
    wait_and_click(driver, _FILTER_BTN_XPATH)
    time.sleep(3)     # original 1 + 2

    logger.info("Typing vacancy code…")
    wait_and_type(driver, _VAGA_INPUT_XPATH, vaga_code)
    time.sleep(4.0)   # original 2.0 + 2

    logger.info("Clicking search button…")
    wait_and_click(driver, _SEARCH_BTN_XPATH)

    logger.info("Waiting for search results…")
    wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
    time.sleep(4)     # original 4 + 2, minus the time already spent waiting on the overlay


def verify_code(driver: webdriver.Firefox, numero_edital: str) -> bool:
    """
    Read the vacancy card code (format: 'Cód. 32203') and confirm it matches
    the numero_edital we are looking for.
    Returns True if matched, False otherwise.
    """
    text = safe_get_text(driver, _CODE_VERIFY_XPATH)
    logger.info("Card code text: '%s'  (expecting code: '%s')", text, numero_edital)

    # Strip the 'Cód. ' prefix and compare
    code_only = re.sub(r"[Cc][oó][Dd]\.?\s*", "", text).strip()
    matched = (code_only == numero_edital.strip())
    if not matched:
        logger.warning("Code mismatch: extracted '%s' vs expected '%s'", code_only, numero_edital)
    return matched


def get_card_info(driver: webdriver.Firefox) -> dict:
    """
    Read vacancy card fields before opening the Kanban:
      - cargo        : title text (VAGA_TITLE_XPATH)
      - unidade_card : location text trimmed to the part before ' :' (LOCATION_XPATH)
      - data_publicacao : publication date as 'YYYY-MM-DD' (DATE_XPATH, format 'Data: dd/mm/yyyy'
        or 'Data Pub.: dd/mm/yyyy')
    """
    cargo_raw    = safe_get_text(driver, _VAGA_TITLE_XPATH)
    location_raw = safe_get_text(driver, _LOCATION_XPATH)
    date_raw     = safe_get_text(driver, _DATE_XPATH)

    # "Goiânia - GO : Presencial" → "Goiânia - GO"
    unidade_card = location_raw.split(" :")[0].strip() if location_raw else None

    # "Data: 07/05/2026" → "07/05/2026"
    # "Data Pub.: 12/08/2026" → "12/08/2026"
    # The label isn't always exactly "Data:" (Reachr also shows "Data Pub.:"),
    # so strip anything from "Data" up to the first colon, not just "Data:".
    date_clean = re.sub(r"(?i)^data[^:]*:\s*", "", date_raw).strip()
    data_publicacao = _parse_date(date_clean) if date_clean else None

    logger.info("Card cargo        : %s", cargo_raw    or "(not found)")
    logger.info("Card unidade      : %s", unidade_card or "(not found)")
    logger.info("Card date (raw)   : %s", date_raw     or "(not found)")
    logger.info("Card date (parsed): %s", data_publicacao or "(not parsed)")
    time.sleep(3.5)    # original 1.5 + 2
    return {
        "cargo":           cargo_raw.strip() or None,
        "unidade_card":    unidade_card,
        "data_publicacao": data_publicacao,
    }


def open_kanban(driver: webdriver.Firefox) -> None:
    logger.info("Clicking vacancy title to open Kanban…")
    wait_and_click(driver, _VAGA_TITLE_XPATH)

    logger.info("Waiting for Kanban page…")
    time.sleep(7)      # original 5 + 2


def _normalize_kanban_header(text: str) -> str:
    """Normalize harmless whitespace/case differences before exact comparison."""
    return " ".join((text or "").replace("\xa0", " ").split()).upper()


def _read_kanban_column_headers(driver: webdriver.Firefox) -> list:
    """Return the first 15 Kanban headers currently present in the DOM."""
    headers = []
    columns = driver.find_elements(By.XPATH, _KANBAN_COLUMNS_XPATH)

    for column_index, column in enumerate(columns[:_MAX_KANBAN_COLUMNS], start=1):
        try:
            header = column.find_element(By.XPATH, _RESULTADO_FINAL_HEADER_XPATH)
            # textContent also works for horizontally off-screen columns.
            raw_text = header.get_attribute("textContent") or header.text or ""
            headers.append((column_index, _normalize_kanban_header(raw_text)))
        except (NoSuchElementException, StaleElementReferenceException):
            headers.append((column_index, ""))

    return headers


def find_resultado_final_column(driver: webdriver.Firefox) -> int:
    """
    Find the Kanban column whose header is exactly ``RESULTADO FINAL`` or
    exactly ``RESULTADO FINAL DO PROCESSO SELETIVO`` — these are the only
    two accepted spellings, matched exactly with no partial/contains
    matching and no other variants.

    The board is rescanned while Angular is rendering it, so this works whether
    the target is column 9, 10, 11, 12, or any other position from 1 through 15.
    Only the index is returned; the element itself is deliberately not retained
    because Angular may recreate it and make the reference stale.
    """
    wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)

    def locate(driver_instance):
        for column_index, header_text in _read_kanban_column_headers(driver_instance):
            logger.debug("Kanban column %d header: '%s'", column_index, header_text)
            if header_text in _RESULTADO_FINAL_ACCEPTED_TEXTS:
                return column_index
        return False

    try:
        column_index = WebDriverWait(
            driver,
            DEFAULT_TIMEOUT,
            poll_frequency=0.5,
            ignored_exceptions=(StaleElementReferenceException,),
        ).until(locate)
    except TimeoutException as exc:
        headers = _read_kanban_column_headers(driver)
        readable_headers = ", ".join(
            f"{index}='{text or '(vazio)'}'" for index, text in headers
        ) or "nenhuma coluna encontrada"
        accepted = " / ".join(f"'{t}'" for t in sorted(_RESULTADO_FINAL_ACCEPTED_TEXTS))
        raise RuntimeError(
            f"Nenhuma coluna com o cabeçalho exato {accepted} foi encontrada "
            f"entre as colunas 1 e {_MAX_KANBAN_COLUMNS}. "
            f"Cabeçalhos lidos: {readable_headers}"
        ) from exc

    logger.info("Resultado-final column found at position %d.", column_index)
    return column_index


def _export_modal_is_visible(driver: webdriver.Firefox) -> bool:
    """Return whether the export modal is already open and ready."""
    try:
        return driver.find_element(By.XPATH, _SELECT_DROPDOWN_XPATH).is_displayed()
    except (NoSuchElementException, StaleElementReferenceException):
        return False


def open_export_modal(driver: webdriver.Firefox, column_index: int) -> None:
    """Click the export icon in the selected column and confirm the modal opened."""
    export_icon_xpath = _EXPORT_ICON_XPATH_TEMPLATE.format(column=column_index)
    last_error = None

    for attempt in range(1, _EXPORT_CLICK_ATTEMPTS + 1):
        try:
            if _export_modal_is_visible(driver):
                return

            wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)

            # Re-locate on every attempt because Angular may recreate columns.
            icon = WebDriverWait(driver, DEFAULT_TIMEOUT).until(
                EC.presence_of_element_located((By.XPATH, export_icon_xpath))
            )
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center', inline:'center'});",
                icon,
            )
            time.sleep(1)

            icon = WebDriverWait(driver, SHORT_TIMEOUT).until(
                EC.element_to_be_clickable((By.XPATH, export_icon_xpath))
            )
            try:
                icon.click()
            except (ElementClickInterceptedException, ElementNotInteractableException):
                logger.warning(
                    "Native export click was blocked; using JavaScript click "
                    "(attempt %d/%d).",
                    attempt,
                    _EXPORT_CLICK_ATTEMPTS,
                )
                driver.execute_script("arguments[0].click();", icon)

            WebDriverWait(driver, DEFAULT_TIMEOUT).until(
                EC.visibility_of_element_located((By.XPATH, _SELECT_DROPDOWN_XPATH))
            )
            logger.info(
                "Export modal opened from Kanban column %d.", column_index
            )
            return
        except (
            ElementClickInterceptedException,
            ElementNotInteractableException,
            StaleElementReferenceException,
            TimeoutException,
        ) as exc:
            last_error = exc
            logger.warning(
                "Could not open export modal from column %d "
                "(attempt %d/%d): %s",
                column_index,
                attempt,
                _EXPORT_CLICK_ATTEMPTS,
                exc,
            )
            if attempt < _EXPORT_CLICK_ATTEMPTS:
                time.sleep(2)

    raise RuntimeError(
        "Não foi possível abrir a exportação da coluna 'RESULTADO FINAL' "
        f"(posição {column_index}) após {_EXPORT_CLICK_ATTEMPTS} tentativas."
    ) from last_error


def export_excel(driver: webdriver.Firefox) -> str:
    """
    Trigger the Excel export in Reachr and wait for the file to land in
    DOWNLOAD_DIR. Returns the local path to the downloaded file.
    Raises RuntimeError if the download times out.
    """
    # Locate the correct dynamic column before triggering the download.
    resultado_final_column = find_resultado_final_column(driver)

    # Snapshot existing files before triggering download
    before = {
        f for f in Path(DOWNLOAD_DIR).iterdir()
        if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
    }

    logger.info(
        "Clicking 'Exportar Candidatos' in 'RESULTADO FINAL' column %d…",
        resultado_final_column,
    )
    open_export_modal(driver, resultado_final_column)

    logger.info("Opening format dropdown…")
    time.sleep(1)
    wait_and_click(driver, _SELECT_DROPDOWN_XPATH)
    time.sleep(4.0)    # original 2.0 + 2

    logger.info("Selecting 'Exportar para excel'…")
    wait_and_click(driver, _EXCEL_OPTION_XPATH)
    time.sleep(4.0)    # original 2.0 + 2

    logger.info("Clicking export confirmation button…")
    wait_and_click(driver, _EXPORT_BTN_XPATH)

    logger.info("Waiting for download to complete…")
    time.sleep(8)      # original 6 + 2

    path = wait_for_new_xlsx(before, timeout=90)
    if not path:
        raise RuntimeError(
            "Download timed out — no new .xlsx appeared in %s after 90 s." % DOWNLOAD_DIR
        )
    return path

# ============================================================================
# EXCEL PARSING AND DATABASE INSERT
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


def process_excel(
    supabase: Client,
    excel_path: str,
    arquivo: str,
    numero_edital: str,
    is_teia: bool,
    card_info: dict,
    importacao_id: str,
) -> int:
    """
    Parse the downloaded Excel file, calculate rankings, and bulk-insert
    rows into banco_candidatos.
    - arquivo       → numero_processo_seletivo  (5-digit Reachr code)
    - numero_edital → numero_edital             (###/#### formatted edital)
    - is_teia       → is_teia                   (boolean flag)
    Returns the number of rows inserted.
    """
    today_iso        = datetime.date.today().strftime("%Y-%m-%d")
    cargo_vaga       = card_info.get("cargo")
    unidade_card     = card_info.get("unidade_card")
    data_publicacao  = card_info.get("data_publicacao")

    logger.info("Parsing Excel file: %s", excel_path)
    df = pd.read_excel(excel_path, engine="openpyxl")

    # Normalize column names
    df.columns = [str(c).strip() for c in df.columns]
    logger.info("Columns: %s", list(df.columns))

    rows = []
    for _, row in df.iterrows():
        nome = str(row.get("Nome") or "").strip()
        if not nome:
            continue  # skip blank rows

        nota_av  = _parse_float(row.get("Nota da avaliação") or row.get("Nota da avaliacao"))
        nota_ent = _parse_float(row.get("Nota da Entrevista"))

        # Score for ranking: treat None as 0 so they rank last
        avg_score = ((nota_av or 0.0) + (nota_ent or 0.0)) / 2.0

        nascimento = _parse_date(row.get("Nascimento"))

        # CPF: remove non-digits and zero-pad to 11
        cpf_raw = str(row.get("CPF") or "").strip()
        cpf     = _pad_cpf(cpf_raw) if cpf_raw else None

        # unidade: prefer card location over Excel column (card is more reliable)
        unidade_excel = str(row.get("Unidade") or "").strip() or None
        unidade       = unidade_card or unidade_excel

        # observacao: "Status Atual" column
        status_atual = str(row.get("Status Atual") or "").strip() or None

        rows.append({
            "nome":                    nome,
            "cpf":                     cpf,
            "data_nascimento":         nascimento,
            "email":                   str(row.get("E-Mail") or "").strip() or None,
            "telefone":                str(row.get("Celular") or "").strip() or None,
            "unidade":                 unidade,
            "cargo":                   cargo_vaga,
            "nota_avaliacao":          str(nota_av)  if nota_av  is not None else None,
            "nota_entrevista":         str(nota_ent) if nota_ent is not None else None,
            "observacao":              status_atual,
            "numero_processo_seletivo": arquivo,
            "numero_edital":           numero_edital or None,
            "is_teia":                 is_teia,
            "media_final":             round(avg_score, 4),
            "data_publicacao":         data_publicacao,
            "data_importacao":         today_iso,
            "import_batch_id":         importacao_id,
            "status":                  "CADASTRO RESERVA",
            "status_calculado":        "CADASTRO RESERVA",
            "status_original":         "CADASTRO RESERVA",
            "origem":                  "reachr",
            # ── temporary sort keys (removed before insert) ──────────────────
            "__avg":  avg_score,
            # Oldest birthdate = highest priority on tie; missing dates rank last.
            "__nasc": nascimento or "9999-99-99",
        })

    if not rows:
        logger.warning("Excel file contained no valid candidate rows.")
        return 0

    # ── Ranking ──────────────────────────────────────────────────────────────
    # Primary  : average score  (highest → rank 1)
    # Secondary: birth date     (oldest = smallest date → rank 1 on tie)
    rows.sort(key=lambda r: (-r["__avg"], r["__nasc"]))

    for rank, r in enumerate(rows, start=1):
        r["classificacao"] = str(rank)
        del r["__avg"]
        del r["__nasc"]

    # ── Insert in batches of 100 ──────────────────────────────────────────────
    batch_size = 100
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase.table("banco_candidatos").insert(batch).execute()
        total_inserted += len(batch)
        logger.info("  Inserted rows %d – %d", i + 1, total_inserted)

    logger.info("Total rows inserted for proc. seletivo %s: %d", arquivo, total_inserted)
    return total_inserted

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def run() -> None:
    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — starting")
    logger.info("═══════════════════════════════════════════════════════")

    # ── Guard: required env vars ──────────────────────────────────────────────
    missing = [
        variable
        for variable in (
            "SUPABASE_URL",
            "SUPABASE_SERVICE_KEY",
            "REACHR_EMAIL",
            "REACHR_PASSWORD",
        )
        if not os.environ.get(variable)
    ]
    if missing:
        raise EnvironmentError(
            "Missing required environment variable(s): %s" % ", ".join(missing)
        )

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    editais = get_pending_editais(supabase)
    if not editais:
        logger.info("No editais with status 'aguardando_processamento'. Nothing to do.")
        return

    codes = [e.get("arquivo", "(empty)") for e in editais]
    logger.info("Found %d pending edital(s): %s", len(editais), codes)

    # A code queued twice in the same batch (same 'arquivo' on two different
    # importacoes rows) previously got scraped and exported twice, inserting
    # duplicate candidates into banco_candidatos. Scrape/export each distinct
    # code only once and copy the result to any duplicate rows.
    duplicate_codes = {code for code in codes if code and codes.count(code) > 1}
    if duplicate_codes:
        logger.warning(
            "Duplicate 'arquivo' code(s) queued in this batch — each will be "
            "scraped once and the result copied to the duplicate row(s): %s",
            sorted(duplicate_codes),
        )

    driver = setup_driver()
    logger.info("Browser started (headless).")

    processed_results = {}   # arquivo -> status string already applied this run

    try:
        login(driver)

        for edital_row in editais:
            arquivo       = (edital_row.get("arquivo")       or "").strip()
            numero_edital = (edital_row.get("numero_edital") or "").strip()
            is_teia       = bool(edital_row.get("is_teia", False))
            importacao_id = edital_row["id"]

            if not arquivo:
                logger.warning("Row %s has empty arquivo — skipping.", importacao_id)
                continue

            logger.info("───────────────────────────────────────────────────")
            logger.info(
                "Processing proc. seletivo: %s | edital: %s  (importacao id: %s)",
                arquivo, numero_edital, importacao_id,
            )

            # ── Duplicate short-circuit ────────────────────────────────────────
            if arquivo in processed_results:
                status_to_copy = processed_results[arquivo]
                logger.info(
                    "Proc. seletivo %s was already handled earlier in this run — "
                    "copying result ('%s') instead of scraping/exporting again.",
                    arquivo, status_to_copy,
                )
                update_importacao_status(supabase, importacao_id, status_to_copy)
                continue

            final_status = None
            attempt = 0

            while final_status is None:
                attempt += 1
                try:
                    # ── 0. Make sure the browser session is actually alive ──────
                    if not _driver_is_alive(driver):
                        logger.warning(
                            "Browser session appears dead — restarting the "
                            "browser and logging in again."
                        )
                        try:
                            driver.quit()
                        except WebDriverException:
                            pass
                        driver = setup_driver()
                        login(driver)

                    # ── 1. Go to dashboard & filter ──────────────────────────────
                    navigate_to_dashboard(driver)
                    apply_filter(driver, arquivo)

                    # ── 2. Verify the card shows the expected code ─────────────────
                    if not verify_code(driver, arquivo):
                        logger.warning("Código %s not found in Reachr.", arquivo)
                        final_status = "Edital não encontrado na Reachr"
                        break

                    # ── 3. Capture card info (cargo, unidade, date) BEFORE clicking title
                    card_info = get_card_info(driver)

                    # ── 4. Open Kanban ──────────────────────────────────────────────
                    open_kanban(driver)

                    # ── 5. Export Excel & wait for download ─────────────────────────
                    excel_path = export_excel(driver)

                    # ── 6. Parse Excel & insert into banco_candidatos ───────────────
                    n = process_excel(
                        supabase, excel_path, arquivo, numero_edital, is_teia, card_info, importacao_id
                    )

                    # ── 7. Delete temporary file ─────────────────────────────────────
                    try:
                        os.remove(excel_path)
                        logger.info("Deleted temporary file: %s", excel_path)
                    except OSError as err:
                        logger.warning("Could not delete %s: %s", excel_path, err)

                    final_status = "Candidato(a)s importados para o banco de talentos"
                    logger.info(
                        "Proc. seletivo %s processed successfully (%d candidates).",
                        arquivo, n,
                    )

                except TimeoutException as exc:
                    logger.error(
                        "Timeout on proc. seletivo %s (attempt %d/%d): %s",
                        arquivo, attempt, MAX_EDITAL_ATTEMPTS, exc,
                    )
                    if attempt < MAX_EDITAL_ATTEMPTS:
                        time.sleep(5)
                        continue
                    final_status = "Erro: timeout ao processar edital"

                except WebDriverException as exc:
                    logger.error(
                        "WebDriver error on proc. seletivo %s (attempt %d/%d): %s",
                        arquivo, attempt, MAX_EDITAL_ATTEMPTS, exc,
                    )
                    if attempt < MAX_EDITAL_ATTEMPTS:
                        time.sleep(5)
                        continue
                    final_status = "Erro: falha no navegador"

                except RuntimeError as exc:
                    logger.error(
                        "Runtime error on proc. seletivo %s (attempt %d/%d): %s",
                        arquivo, attempt, MAX_EDITAL_ATTEMPTS, exc,
                    )
                    if attempt < MAX_EDITAL_ATTEMPTS:
                        time.sleep(5)
                        continue
                    final_status = f"Erro: {str(exc)[:200]}"

                except Exception as exc:
                    logger.error(
                        "Unexpected error on proc. seletivo %s: %s",
                        arquivo, exc, exc_info=True,
                    )
                    final_status = f"Erro inesperado: {str(exc)[:200]}"

            update_importacao_status(supabase, importacao_id, final_status)
            processed_results[arquivo] = final_status

    finally:
        logger.info("Closing browser.")
        try:
            driver.quit()
        except WebDriverException:
            pass

    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — finished")
    logger.info("═══════════════════════════════════════════════════════")


if __name__ == "__main__":
    run()