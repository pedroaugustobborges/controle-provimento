"""
importar_editais_reachr.py
──────────────────────────
Reads all records from the `importacoes` table with
status = 'aguardando_processamento', then for each one:

  1. Logs in to Reachr (once per run, again automatically if the session expires).
  2. Searches for the edital code.
  3. Finds the card that shows the expected code ("Cód. XXXXX"), even when the
     search returns several cards.
  4. Captures cargo / unidade / publication date from THAT card.
  5. Opens the Kanban view and exports the "RESULTADO FINAL" column to Excel.
  6. Opens "Editar vaga" → "Etapas do Processo Seletivo" and reads the date of
     the LAST cronograma card ("Adicionado em DD/MM/YYYY") as data_resultado.
  7. Parses the Excel → inserts rows into `banco_candidatos` (idempotent).
  8. Deletes the temporary Excel file.
  9. Updates `importacoes.status` to reflect the result.

Resilience features (v2)
────────────────────────
  • Every locator is a LIST of XPaths tried together in one wait: a short
    component-anchored XPath first (e.g. //app-dash-filtro/...), the original
    absolute XPath second, a text-based XPath last. A small layout change no
    longer breaks the run.
  • The filter locator now targets the <button>, not the inner <span>. The
    span is a responsive label; it is not rendered/visible in a narrow
    headless window, which caused:
        wait_and_click failed for .../button/span ... NoSuchElementError
  • Headless Firefox gets an explicit 1920x1080 window. maximize_window() is
    a no-op in headless mode, so the page was rendered at a smaller
    breakpoint than the one the XPaths were copied from.
  • The loading-overlay check looks at ALL overlay elements, not just the
    first one in the DOM.
  • Navigation to the dashboard does a full reload, verifies the dashboard
    actually loaded, and re-logs in if Reachr redirected to the login page.
  • Login is verified (raises a clear error if it did not complete).
  • If the filter panel is already open, the toggle is NOT clicked again
    (clicking it would close the panel).
  • Typing is verified; falls back to setting the value via JS + input event.
  • Screenshot + HTML of the page are saved to DEBUG_DIR on every failure.
  • Re-running an import never duplicates candidates: rows from the same
    import_batch_id are deleted before inserting.
  • Excel parsing no longer turns empty cells into the string "nan" or phone
    numbers / CPFs into "62999999999.0"; column names are matched ignoring
    case/accents/punctuation.
  • Supabase calls are retried; a failed status update no longer aborts the
    whole batch.
  • A lock file prevents two overlapping runs (e.g. from cron).

Database requirement
─────────────────────
  banco_candidatos must have a `data_resultado` column, e.g.:
      alter table banco_candidatos
        add column if not exists data_resultado date;

Environment variables
──────────────────────
  SUPABASE_URL          – your project URL, e.g. https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY  – service-role key (bypasses RLS)
  REACHR_EMAIL          – login e-mail for Reachr
  REACHR_PASSWORD       – login password for Reachr
  REACHR_DASHBOARD_URL  – (optional) dashboard URL; default: the URL Reachr
                          lands on right after login
  GECKODRIVER_PATH      – (optional) default: /usr/local/bin/geckodriver
  DOWNLOAD_DIR          – (optional) default: /tmp/reachr_downloads
  DEBUG_DIR             – (optional) default: /tmp/reachr_debug
  MAX_EDITAL_ATTEMPTS   – (optional) attempts per edital, default: 2
  WINDOW_WIDTH/HEIGHT   – (optional) default: 1920 / 1080
  ACTION_DELAY          – (optional) settle time after clicks, default: 2.5 s
  LOCK_FILE             – (optional) default: /tmp/importar_editais_reachr.lock
"""

import os
import re
import time
import fcntl
import logging
import datetime
import unicodedata
from pathlib import Path
from typing import Optional, Sequence, Union

import pandas as pd
from supabase import create_client, Client
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    ElementNotInteractableException,
    JavascriptException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

LOGIN_EMAIL    = os.environ.get("REACHR_EMAIL", "")
LOGIN_PASSWORD = os.environ.get("REACHR_PASSWORD", "")

BASE_URL         = "https://www.reachr.com.br/empresas/#/autenticacao"
DASHBOARD_URL    = os.environ.get("REACHR_DASHBOARD_URL", "")
GECKODRIVER_PATH = os.environ.get("GECKODRIVER_PATH", "/usr/local/bin/geckodriver")
DOWNLOAD_DIR     = os.environ.get("DOWNLOAD_DIR", "/tmp/reachr_downloads")
DEBUG_DIR        = os.environ.get("DEBUG_DIR", "/tmp/reachr_debug")
LOCK_FILE        = os.environ.get("LOCK_FILE", "/tmp/importar_editais_reachr.lock")

WINDOW_WIDTH  = int(os.environ.get("WINDOW_WIDTH", "1920"))
WINDOW_HEIGHT = int(os.environ.get("WINDOW_HEIGHT", "1080"))

DEFAULT_TIMEOUT   = 30
SHORT_TIMEOUT     = 12
PAGE_LOAD_TIMEOUT = 90
ACTION_DELAY      = float(os.environ.get("ACTION_DELAY", "2.5"))

MAX_EDITAL_ATTEMPTS = int(os.environ.get("MAX_EDITAL_ATTEMPTS", "2"))

# Filled in after a successful login (the page Reachr lands on).
_state = {"dashboard_url": ""}

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

XPaths = Union[str, Sequence[str]]

# ============================================================================
# LOCATORS
# ============================================================================
# Each locator is a tuple tried TOGETHER (whichever matches first wins):
#   1. short XPath anchored on the Angular component tag  (survives wrapper changes)
#   2. original absolute XPath copied from DevTools        (what worked before)
#   3. text-based XPath                                     (survives reordering)

_LOWER = (
    "translate(normalize-space(.),"
    "'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ',"
    "'abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúç')"
)


def _has_text(fragment: str) -> str:
    """XPath predicate: element's normalized, lower-cased text contains fragment."""
    return f"contains({_LOWER},'{fragment}')"


def _own_text(fragment: str) -> str:
    """XPath predicate: one of the element's OWN text nodes contains fragment."""
    return f"text()[contains({_LOWER},'{fragment}')]"


_LOADING_OVERLAY_XPATH = "//div[contains(@class,'loading-overlay')]"

# ── login ───────────────────────────────────────────────────────────────────
_EMAIL_XPATHS = ("//*[@id='login-email']", "//input[@type='email']")
_PASSWORD_XPATHS = ("//*[@id='login-senha']", "//input[@type='password']")
_LOGIN_BTN_XPATHS = (
    "/html/body/app-root/app-full-layout/ng-component/div/main/section/form/button",
    "//form//button[@type='submit']",
    f"//form//button[{_has_text('entrar')} or {_has_text('login')} or {_has_text('acessar')}]",
)

# ── dashboard / filter ──────────────────────────────────────────────────────
_DASHBOARD_READY_XPATH = "//app-dash-filtro"
_DASH_ABS = "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"

# Target the BUTTON, not the <span> inside it (the span is a responsive label).
_FILTER_BTN_XPATHS = (
    "//app-dash-filtro/div/div[1]/div[2]/button",
    _DASH_ABS + "/app-dash-filtro/div/div[1]/div[2]/button",
    f"//app-dash-filtro//button[{_has_text('filtr')}]",
)
_VAGA_INPUT_XPATHS = (
    "//app-dash-filtro/div/div[2]/div/form/div[1]/div[1]/input",
    _DASH_ABS + "/app-dash-filtro/div/div[2]/div/form/div[1]/div[1]/input",
    "(//app-dash-filtro//form//input)[1]",
)
_SEARCH_BTN_XPATHS = (
    "//app-dash-filtro/div/div[2]/div/form/div[3]/div[2]/button[2]",
    _DASH_ABS + "/app-dash-filtro/div/div[2]/div/form/div[3]/div[2]/button[2]",
    f"//app-dash-filtro//form//button[{_has_text('buscar')} or {_has_text('pesquisar')}"
    f" or {_has_text('aplicar')} or {_has_text('filtrar')}]",
    "//app-dash-filtro//form//button[@type='submit']",
)

# ── vacancy cards (relative to one card) ────────────────────────────────────
_CARD_XPATH = "//app-dash-vaga"
_CARD_CODE_REL = "/div/div[1]/div[1]/div[2]"
_CARD_TITLE_RELS = ("/div/div[1]/div[1]/div[1]/span", "/div/div[1]/div[1]/div[1]")
_CARD_LOCATION_REL = "/div/div[2]/div[1]/div[2]/div[3]/div/span[1]"
_CARD_DATE_REL = "/div/div[2]/div[1]/div[2]/div[6]/div"

_CODE_RE = re.compile(r"C[oó]d\.?\s*:?\s*(\d+)", re.IGNORECASE)
_DDMMYYYY_RE = re.compile(r"(\d{2}/\d{2}/\d{4})")
_CARD_DATE_FALLBACK_RE = re.compile(r"Data[^:\d]*:\s*(\d{2}/\d{2}/\d{4})", re.IGNORECASE)

# ── kanban ──────────────────────────────────────────────────────────────────
_KANBAN_COLUMNS_XPATH = "//app-vaga-kanbam-coluna"
_KANBAN_COLUMNS_ABS = (
    "/html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[2]"
    "/app-vaga-kanbam/div/div[2]/app-vaga-kanbam-coluna"
)
_EXPORT_ICON_XPATH_TEMPLATES = (
    "(" + _KANBAN_COLUMNS_XPATH + ")[{column}]/div/div[2]/div/i[5]",
    _KANBAN_COLUMNS_ABS + "[{column}]/div/div[2]/div/i[5]",
)
_RESULTADO_FINAL_HEADER_XPATHS = ("./div/div[1]/span[1]", "./div/div[1]//span[1]")
_RESULTADO_FINAL_TEXT = "RESULTADO FINAL"
_RESULTADO_FINAL_LONG_TEXT = "RESULTADO FINAL DO PROCESSO SELETIVO"
# Only these two exact headers count (no partial matching).
_RESULTADO_FINAL_ACCEPTED_TEXTS = {_RESULTADO_FINAL_TEXT, _RESULTADO_FINAL_LONG_TEXT}
_MAX_KANBAN_COLUMNS = 15
_EXPORT_CLICK_ATTEMPTS = 3

# ── export modal ────────────────────────────────────────────────────────────
_MODAL = "//app-importar-exportar-candidatos"
_MODAL_ABS = "/html/body/div[2]/div/app-importar-exportar-candidatos"
_SELECT_DROPDOWN_XPATHS = (
    _MODAL + "//section/div[3]/div/div/div[2]/app-seletor/div/div",
    _MODAL_ABS + "/div/div/div/section/div[3]/div/div/div[2]/app-seletor/div/div",
)
_EXCEL_OPTION_XPATHS = (
    f"{_MODAL}//app-seletor//button[{_LOWER}='exportar para excel']",
    _MODAL + "//section/div[3]/div/div/div[2]/app-seletor/div[2]/div/button[14]",
    _MODAL_ABS + "/div/div/div/section/div[3]/div/div/div[2]/app-seletor/div[2]/div/button[14]",
    f"{_MODAL}//app-seletor//button[{_has_text('excel')}]",
)
_EXPORT_BTN_XPATHS = (
    _MODAL + "//section/div[3]/div/div[2]/div/button",
    _MODAL_ABS + "/div/div/div[1]/section/div[3]/div/div[2]/div/button",
    f"{_MODAL}//button[not(ancestor::app-seletor)][{_has_text('exportar')}]",
)
_EXPORT_MODAL_CLOSE_XPATHS = (
    _MODAL_ABS + "/div/header/button",
    _MODAL + "/div/header/button",
    "//nz-modal-container[.//app-importar-exportar-candidatos]"
    "//button[contains(@class,'ant-modal-close')]",
    "//nz-modal-container//button[contains(@class,'ant-modal-close')]",
    "//nz-modal-container//*[contains(@class,'ant-modal-close-x')]",
)

# ── data_resultado (cronograma) ─────────────────────────────────────────────
_EDITAR_VAGA_BTN_XPATHS = (
    "//app-vaga-header/div[2]/div[2]/div[2]/button[1]",
    "/html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[1]"
    "/app-vaga-header/div[2]/div[2]/div[2]/button[1]",
    f"//button[{_has_text('editar vaga')}]",
    f"//a[{_has_text('editar vaga')}]",
    f"//*[{_own_text('editar vaga')}]",
)
_ETAPAS_PROCESSO_XPATHS = (
    f"//nz-step[{_has_text('etapas do processo seletivo')}]"
    "//div[contains(@class,'ant-steps-item-container')]",
    "//app-vg-adicionar//nz-steps/div/nz-step[18]/div/div[3]/div[1]",
    "/html/body/app-root/app-common-layout/div/div/div/app-vg-adicionar/div/div/div[2]"
    "/div[1]/nz-steps/div/nz-step[18]/div/div[3]/div[1]",
    f"//div[contains(@class,'ant-tabs-tab')][{_has_text('etapas do processo seletivo')}]",
    f"//*[self::button or self::a or self::li][{_has_text('etapas do processo seletivo')}]",
    f"//*[{_own_text('etapas do processo seletivo')}]",
)
# Scoped to the cronograma component first, whole page as a fallback.
_CRONOGRAMA_DATE_XPATHS = (
    "//app-vg-cronograma//*[text()[contains(normalize-space(.),'Adicionado em')]]",
    "//*[text()[contains(normalize-space(.),'Adicionado em')]]",
)

# ============================================================================
# GENERIC SELENIUM HELPERS
# ============================================================================

def _as_list(xpaths: XPaths) -> list:
    return [xpaths] if isinstance(xpaths, str) else list(xpaths)


def _overlay_visible(driver: webdriver.Firefox) -> bool:
    for el in driver.find_elements(By.XPATH, _LOADING_OVERLAY_XPATH):
        try:
            if el.is_displayed():
                return True
        except StaleElementReferenceException:
            continue
    return False


def wait_for_overlay_gone(driver: webdriver.Firefox, timeout: int = DEFAULT_TIMEOUT) -> None:
    """Wait until NO 'loading-overlay' element is visible. Returns at once if none."""
    try:
        WebDriverWait(driver, timeout, poll_frequency=0.3).until(
            lambda d: not _overlay_visible(d)
        )
    except TimeoutException:
        logger.warning("Loading overlay still visible after %ss — proceeding anyway.", timeout)


def _any_visible(driver: webdriver.Firefox, xpaths: XPaths) -> bool:
    for xp in _as_list(xpaths):
        for el in driver.find_elements(By.XPATH, xp):
            try:
                if el.is_displayed():
                    return True
            except StaleElementReferenceException:
                continue
    return False


def find_element_any(driver: webdriver.Firefox, xpaths: XPaths,
                     timeout: int = DEFAULT_TIMEOUT, mode: str = "visible"):
    """
    Poll ALL given XPaths at once and return (element, xpath) for the first
    match. mode: 'present' | 'visible' | 'clickable'.
    Raises TimeoutException with a readable message listing the locators.
    """
    xpaths = _as_list(xpaths)

    def condition(d):
        for xp in xpaths:
            for el in d.find_elements(By.XPATH, xp):
                try:
                    if mode == "present":
                        return el, xp
                    if not el.is_displayed():
                        continue
                    if mode == "clickable" and not el.is_enabled():
                        continue
                    return el, xp
                except StaleElementReferenceException:
                    continue
        return False

    try:
        return WebDriverWait(driver, timeout, poll_frequency=0.5).until(condition)
    except TimeoutException:
        raise TimeoutException(
            f"nenhum de {len(xpaths)} localizador(es) ficou '{mode}' em {timeout}s: "
            + " | ".join(xpaths)
        ) from None


def wait_and_find(driver: webdriver.Firefox, xpaths: XPaths, timeout: int = DEFAULT_TIMEOUT):
    return find_element_any(driver, xpaths, timeout, mode="present")[0]


_CLICK_RETRY_ERRORS = (
    ElementClickInterceptedException,
    ElementNotInteractableException,
    StaleElementReferenceException,
    JavascriptException,
    TimeoutException,
)


def wait_and_click(driver: webdriver.Firefox, xpaths: XPaths,
                   timeout: int = DEFAULT_TIMEOUT, retries: int = 3):
    """
    Wait for the overlay, find the first clickable match among `xpaths`,
    scroll it into view, click it (JS click if the native click is
    intercepted). Retries the whole cycle on races.
    """
    xpaths = _as_list(xpaths)
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            wait_for_overlay_gone(driver, timeout=timeout)
            element, used = find_element_any(driver, xpaths, timeout, mode="clickable")
            if used != xpaths[0]:
                logger.info("Using fallback locator: %s", used)
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center', inline:'center'});", element
            )
            time.sleep(1)
            wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)
            try:
                element.click()
            except (ElementClickInterceptedException, ElementNotInteractableException):
                logger.warning(
                    "Native click intercepted for %s (attempt %d/%d) — using JS click.",
                    used, attempt, retries,
                )
                wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)
                driver.execute_script("arguments[0].click();", element)
            time.sleep(ACTION_DELAY)
            return element
        except _CLICK_RETRY_ERRORS as exc:
            last_error = exc
            logger.warning(
                "wait_and_click failed (attempt %d/%d): %s",
                attempt, retries, _first_line(exc),
            )
            if attempt < retries:
                time.sleep(2 * attempt)
    raise last_error


def wait_and_type(driver: webdriver.Firefox, xpaths: XPaths, text: str,
                  timeout: int = DEFAULT_TIMEOUT, retries: int = 3):
    """Find the input, clear it, type, and VERIFY the value (JS fallback)."""
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            wait_for_overlay_gone(driver, timeout=timeout)
            element, _ = find_element_any(driver, xpaths, timeout, mode="clickable")
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
            element.clear()
            if element.get_attribute("value"):
                element.send_keys(Keys.CONTROL, "a")
                element.send_keys(Keys.DELETE)
            time.sleep(0.5)
            element.send_keys(text)
            time.sleep(1)
            if (element.get_attribute("value") or "") != text:
                logger.warning("Typed value did not stick — setting it via JavaScript.")
                driver.execute_script(
                    "arguments[0].value = arguments[1];"
                    "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
                    "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                    element, text,
                )
            time.sleep(ACTION_DELAY)
            return element
        except _CLICK_RETRY_ERRORS as exc:
            last_error = exc
            logger.warning(
                "wait_and_type failed (attempt %d/%d): %s",
                attempt, retries, _first_line(exc),
            )
            if attempt < retries:
                time.sleep(2 * attempt)
    raise last_error


def safe_get_text(driver: webdriver.Firefox, xpaths: XPaths,
                  timeout: int = SHORT_TIMEOUT) -> str:
    """Return the element's textContent (works off-screen too) or ''."""
    try:
        wait_for_overlay_gone(driver, timeout=timeout)
        el, _ = find_element_any(driver, xpaths, timeout, mode="present")
        return " ".join((el.get_attribute("textContent") or el.text or "").split())
    except (TimeoutException, StaleElementReferenceException):
        logger.warning("Could not read text from: %s", _as_list(xpaths)[0])
        return ""


def click_first_available(driver: webdriver.Firefox, xpaths: XPaths,
                          label: str, timeout: int = SHORT_TIMEOUT) -> bool:
    """Click the first locator that works. Never raises — for optional flows."""
    try:
        wait_and_click(driver, xpaths, timeout=timeout, retries=2)
        logger.info("Clicked %s", label)
        return True
    except _CLICK_RETRY_ERRORS as exc:
        logger.warning("Could not click %s: %s", label, _first_line(exc))
        return False


def _driver_is_alive(driver: webdriver.Firefox) -> bool:
    try:
        _ = driver.current_url
        return True
    except WebDriverException:
        return False


def _first_line(exc: BaseException) -> str:
    text = str(exc).strip()
    text = re.sub(r"^Message:\s*", "", text)
    line = text.splitlines()[0].strip() if text else ""
    return line or exc.__class__.__name__


def save_debug_snapshot(driver: webdriver.Firefox, label: str) -> None:
    """Save a screenshot + page HTML so failures can be inspected later."""
    try:
        Path(DEBUG_DIR).mkdir(parents=True, exist_ok=True)
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe = re.sub(r"[^A-Za-z0-9_-]+", "_", label)[:80]
        base = Path(DEBUG_DIR) / f"{ts}_{safe}"
        driver.save_screenshot(str(base) + ".png")
        Path(str(base) + ".html").write_text(driver.page_source, encoding="utf-8")
        logger.info("Debug snapshot saved: %s.png / .html (url: %s)", base, driver.current_url)
    except Exception as exc:  # never let debugging break the run
        logger.warning("Could not save debug snapshot: %s", _first_line(exc))

# ============================================================================
# DRIVER SETUP
# ============================================================================

def setup_driver() -> webdriver.Firefox:
    Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)

    service = Service(executable_path=GECKODRIVER_PATH)
    options = webdriver.FirefoxOptions()
    options.add_argument("--headless")
    # maximize_window() does nothing useful in headless mode: set the size
    # explicitly so Reachr renders the same desktop layout the XPaths came from.
    options.add_argument(f"--width={WINDOW_WIDTH}")
    options.add_argument(f"--height={WINDOW_HEIGHT}")

    options.set_preference("browser.download.folderList", 2)
    options.set_preference("browser.download.useDownloadDir", True)
    options.set_preference("browser.download.manager.showWhenStarting", False)
    options.set_preference("browser.download.dir", DOWNLOAD_DIR)
    options.set_preference(
        "browser.helperApps.neverAsk.saveToDisk",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/vnd.ms-excel,application/octet-stream",
    )
    options.set_preference("browser.download.manager.alertOnEXEOpen", False)
    options.set_preference("browser.download.manager.closeWhenDone", True)

    driver = webdriver.Firefox(service=service, options=options)
    driver.set_window_size(WINDOW_WIDTH, WINDOW_HEIGHT)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    size = driver.get_window_size()
    logger.info("Browser window: %sx%s", size.get("width"), size.get("height"))
    return driver


def wait_for_new_xlsx(before_files: set, timeout: int = 90) -> Optional[str]:
    """Poll DOWNLOAD_DIR until a new, non-empty .xlsx has a stable size."""
    deadline = time.time() + timeout
    previous_sizes = {}
    while time.time() < deadline:
        current = {
            f for f in Path(DOWNLOAD_DIR).iterdir()
            if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
        }
        new_files = current - before_files
        for candidate in sorted(new_files, key=lambda f: f.stat().st_mtime, reverse=True):
            try:
                size = candidate.stat().st_size
            except FileNotFoundError:
                continue
            if size > 0 and previous_sizes.get(candidate) == size:
                logger.info("Completed download detected: %s", candidate)
                return str(candidate)
            previous_sizes[candidate] = size
        time.sleep(2)
    return None

# ============================================================================
# SUPABASE HELPERS
# ============================================================================

def _with_retries(fn, what: str, attempts: int = 3):
    for i in range(1, attempts + 1):
        try:
            return fn()
        except Exception as exc:
            if i == attempts:
                raise
            logger.warning("%s failed (attempt %d/%d): %s", what, i, attempts, exc)
            time.sleep(2 * i)


def get_pending_editais(supabase: Client) -> list:
    resp = _with_retries(
        lambda: supabase.table("importacoes")
        .select("*")
        .eq("status", "aguardando_processamento")
        .order("created_at", desc=False)
        .execute(),
        "Fetching pending editais",
    )
    return resp.data or []


def update_importacao_status(supabase: Client, record_id: str, status: str) -> None:
    _with_retries(
        lambda: supabase.table("importacoes").update({"status": status})
        .eq("id", record_id).execute(),
        f"Updating importacoes[{record_id}]",
    )
    logger.info("importacoes[%s] → '%s'", record_id, status)

# ============================================================================
# BROWSER STEPS
# ============================================================================

def login(driver: webdriver.Firefox) -> None:
    logger.info("Opening login page: %s", BASE_URL)
    driver.get(BASE_URL)
    time.sleep(3)

    logger.info("Typing e-mail…")
    wait_and_type(driver, _EMAIL_XPATHS, LOGIN_EMAIL)
    logger.info("Typing password…")
    wait_and_type(driver, _PASSWORD_XPATHS, LOGIN_PASSWORD)
    logger.info("Clicking login button…")
    wait_and_click(driver, _LOGIN_BTN_XPATHS)

    logger.info("Waiting for login to complete…")
    try:
        WebDriverWait(driver, DEFAULT_TIMEOUT * 2, poll_frequency=1).until(
            lambda d: "autenticacao" not in d.current_url and not _any_visible(d, _EMAIL_XPATHS)
        )
    except TimeoutException:
        save_debug_snapshot(driver, "login_failed")
        raise RuntimeError(
            "Login na Reachr não foi concluído (ainda na tela de autenticação) — "
            "verifique credenciais, captcha ou mudança na página de login."
        ) from None

    wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
    time.sleep(2)
    if not _state["dashboard_url"]:
        _state["dashboard_url"] = driver.current_url
    logger.info("Logged in. Landing URL: %s", driver.current_url)


def navigate_to_dashboard(driver: webdriver.Firefox) -> None:
    """
    Full reload of the dashboard (clears leftover modals / edit forms),
    verify it loaded, and log in again if the session expired.
    """
    target = DASHBOARD_URL or _state["dashboard_url"] or BASE_URL
    for attempt in (1, 2):
        logger.info("Navigating to dashboard: %s", target)
        # about:blank first: a hash-only URL change would NOT reload the SPA.
        driver.get("about:blank")
        driver.get(target)
        try:
            WebDriverWait(driver, DEFAULT_TIMEOUT, poll_frequency=0.5).until(
                lambda d: d.find_elements(By.XPATH, _DASHBOARD_READY_XPATH)
                or _any_visible(d, _EMAIL_XPATHS)
            )
        except TimeoutException:
            save_debug_snapshot(driver, "dashboard_not_loaded")
            raise TimeoutException(
                f"dashboard não carregou ({_DASHBOARD_READY_XPATH} ausente) em {DEFAULT_TIMEOUT}s"
            ) from None

        if _any_visible(driver, _EMAIL_XPATHS):
            if attempt == 1:
                logger.warning("Redirected to the login page — session expired, logging in again.")
                login(driver)
                continue
            raise RuntimeError("Sessão da Reachr expirou e o novo login não abriu o dashboard.")

        wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
        time.sleep(2)
        return


def apply_filter(driver: webdriver.Firefox, vaga_code: str) -> None:
    # If the filter panel is already open, clicking the toggle would CLOSE it.
    if _any_visible(driver, _VAGA_INPUT_XPATHS):
        logger.info("Filter panel already open.")
    else:
        logger.info("Opening filter panel for code: %s", vaga_code)
        wait_and_click(driver, _FILTER_BTN_XPATHS)
        find_element_any(driver, _VAGA_INPUT_XPATHS, DEFAULT_TIMEOUT, mode="visible")

    logger.info("Typing vacancy code…")
    wait_and_type(driver, _VAGA_INPUT_XPATHS, vaga_code)

    logger.info("Clicking search button…")
    wait_and_click(driver, _SEARCH_BTN_XPATHS)

    logger.info("Waiting for search results…")
    wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
    time.sleep(2)


def _card_xpath(index: int) -> str:
    return f"({_CARD_XPATH})[{index}]"


def _card_code(card) -> Optional[str]:
    """Extract the numeric code shown on a card ('Cód. 35361' → '35361')."""
    positional = card.find_elements(By.XPATH, "." + _CARD_CODE_REL)
    text = (positional[0].get_attribute("textContent") or "") if positional else ""
    match = _CODE_RE.search(text)
    if match:
        return match.group(1)
    if text.strip().isdigit():
        return text.strip()
    match = _CODE_RE.search(card.get_attribute("textContent") or "")
    return match.group(1) if match else None


def locate_card(driver: webdriver.Firefox, code: str,
                timeout: int = DEFAULT_TIMEOUT) -> Optional[int]:
    """
    Return the 1-based index of the card showing `code`, or None.
    Polls until results render, then re-checks so the index is stable.
    """
    code = code.strip()
    seen: list = []

    def find(d):
        seen.clear()
        for i, card in enumerate(d.find_elements(By.XPATH, _CARD_XPATH), start=1):
            c = _card_code(card)
            seen.append(c)
            if c == code:
                return i
        return False

    wait_kwargs = dict(poll_frequency=0.5, ignored_exceptions=(StaleElementReferenceException,))
    try:
        WebDriverWait(driver, timeout, **wait_kwargs).until(find)
        time.sleep(1.5)  # results may still be re-rendering
        index = WebDriverWait(driver, SHORT_TIMEOUT, **wait_kwargs).until(find)
    except TimeoutException:
        logger.warning(
            "Card with code %s not found among %d card(s). Codes seen: %s",
            code, len(seen), seen[:20],
        )
        return None

    logger.info("Card with code %s found at position %d.", code, index)
    return index


def get_card_info(driver: webdriver.Firefox, card_index: int) -> dict:
    """Read cargo, unidade and data_publicacao from the matched card."""
    card = _card_xpath(card_index)
    cargo_raw    = safe_get_text(driver, [card + rel for rel in _CARD_TITLE_RELS])
    location_raw = safe_get_text(driver, card + _CARD_LOCATION_REL)
    date_raw     = safe_get_text(driver, card + _CARD_DATE_REL)

    # "Goiânia - GO : Presencial" → "Goiânia - GO"
    unidade_card = location_raw.split(" :")[0].strip() if location_raw else None

    # "Data: 07/05/2026" / "Data Pub.: 12/08/2026" → "07/05/2026"
    match = _DDMMYYYY_RE.search(date_raw or "")
    if not match:
        # Positional XPath missed (layout changed): scan the whole card text.
        card_text = safe_get_text(driver, card)
        match = _CARD_DATE_FALLBACK_RE.search(card_text)
        if match:
            logger.info("Publication date found via card-text fallback.")
    data_publicacao = _parse_date(match.group(1)) if match else None

    logger.info("Card cargo        : %s", cargo_raw or "(not found)")
    logger.info("Card unidade      : %s", unidade_card or "(not found)")
    logger.info("Card date (raw)   : %s", date_raw or "(not found)")
    logger.info("Card date (parsed): %s", data_publicacao or "(not parsed)")
    return {
        "cargo":           cargo_raw.strip() or None,
        "unidade_card":    unidade_card,
        "data_publicacao": data_publicacao,
    }


def open_kanban(driver: webdriver.Firefox, code: str) -> None:
    # Re-locate the card right before clicking: Angular may have re-rendered.
    card_index = locate_card(driver, code, timeout=SHORT_TIMEOUT)
    if card_index is None:
        raise RuntimeError(f"Card {code} sumiu da lista antes de abrir o Kanban.")

    logger.info("Clicking vacancy title to open Kanban…")
    card = _card_xpath(card_index)
    wait_and_click(driver, [card + rel for rel in _CARD_TITLE_RELS])

    logger.info("Waiting for Kanban page…")
    wait_and_find(driver, (_KANBAN_COLUMNS_XPATH, _KANBAN_COLUMNS_ABS), timeout=DEFAULT_TIMEOUT)
    wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)
    time.sleep(3)


def _normalize_kanban_header(text: str) -> str:
    return " ".join((text or "").replace("\xa0", " ").split()).upper()


def _read_kanban_column_headers(driver: webdriver.Firefox) -> list:
    headers = []
    columns = driver.find_elements(By.XPATH, _KANBAN_COLUMNS_XPATH)
    for column_index, column in enumerate(columns[:_MAX_KANBAN_COLUMNS], start=1):
        text = ""
        for rel in _RESULTADO_FINAL_HEADER_XPATHS:
            try:
                header = column.find_element(By.XPATH, rel)
                text = header.get_attribute("textContent") or header.text or ""
                if text.strip():
                    break
            except (NoSuchElementException, StaleElementReferenceException):
                continue
        headers.append((column_index, _normalize_kanban_header(text)))
    return headers


def find_resultado_final_column(driver: webdriver.Firefox) -> int:
    """Index (1–15) of the column headed exactly RESULTADO FINAL [DO PROCESSO SELETIVO]."""
    wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)

    def locate(d):
        for column_index, header_text in _read_kanban_column_headers(d):
            if header_text in _RESULTADO_FINAL_ACCEPTED_TEXTS:
                return column_index
        return False

    try:
        column_index = WebDriverWait(
            driver, DEFAULT_TIMEOUT, poll_frequency=0.5,
            ignored_exceptions=(StaleElementReferenceException,),
        ).until(locate)
    except TimeoutException as exc:
        headers = _read_kanban_column_headers(driver)
        readable = ", ".join(f"{i}='{t or '(vazio)'}'" for i, t in headers) \
            or "nenhuma coluna encontrada"
        accepted = " / ".join(f"'{t}'" for t in sorted(_RESULTADO_FINAL_ACCEPTED_TEXTS))
        raise RuntimeError(
            f"Nenhuma coluna com o cabeçalho exato {accepted} entre as colunas 1 e "
            f"{_MAX_KANBAN_COLUMNS}. Cabeçalhos lidos: {readable}"
        ) from exc

    logger.info("Resultado-final column found at position %d.", column_index)
    return column_index


def _export_modal_is_visible(driver: webdriver.Firefox) -> bool:
    try:
        return _any_visible(driver, _SELECT_DROPDOWN_XPATHS)
    except WebDriverException:
        return False


def open_export_modal(driver: webdriver.Firefox, column_index: int) -> None:
    icon_xpaths = [t.format(column=column_index) for t in _EXPORT_ICON_XPATH_TEMPLATES]
    last_error = None

    for attempt in range(1, _EXPORT_CLICK_ATTEMPTS + 1):
        try:
            if _export_modal_is_visible(driver):
                return
            wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)

            # Present first (the column may be scrolled off-screen horizontally).
            icon, used = find_element_any(driver, icon_xpaths, DEFAULT_TIMEOUT, mode="present")
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center', inline:'center'});", icon
            )
            time.sleep(1)
            icon, used = find_element_any(driver, [used], SHORT_TIMEOUT, mode="clickable")
            try:
                icon.click()
            except (ElementClickInterceptedException, ElementNotInteractableException):
                logger.warning(
                    "Native export click blocked; using JS click (attempt %d/%d).",
                    attempt, _EXPORT_CLICK_ATTEMPTS,
                )
                driver.execute_script("arguments[0].click();", icon)

            find_element_any(driver, _SELECT_DROPDOWN_XPATHS, DEFAULT_TIMEOUT, mode="visible")
            logger.info("Export modal opened from Kanban column %d.", column_index)
            return
        except _CLICK_RETRY_ERRORS as exc:
            last_error = exc
            logger.warning(
                "Could not open export modal from column %d (attempt %d/%d): %s",
                column_index, attempt, _EXPORT_CLICK_ATTEMPTS, _first_line(exc),
            )
            if attempt < _EXPORT_CLICK_ATTEMPTS:
                time.sleep(2)

    raise RuntimeError(
        "Não foi possível abrir a exportação da coluna 'RESULTADO FINAL' "
        f"(posição {column_index}) após {_EXPORT_CLICK_ATTEMPTS} tentativas."
    ) from last_error


def export_excel(driver: webdriver.Firefox) -> str:
    """Trigger the Excel export and return the path of the downloaded file."""
    resultado_final_column = find_resultado_final_column(driver)

    before = {
        f for f in Path(DOWNLOAD_DIR).iterdir()
        if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
    }

    logger.info("Opening export in 'RESULTADO FINAL' column %d…", resultado_final_column)
    open_export_modal(driver, resultado_final_column)

    logger.info("Opening format dropdown…")
    wait_and_click(driver, _SELECT_DROPDOWN_XPATHS)

    logger.info("Selecting 'Exportar para excel'…")
    wait_and_click(driver, _EXCEL_OPTION_XPATHS)

    logger.info("Clicking export confirmation button…")
    wait_and_click(driver, _EXPORT_BTN_XPATHS)

    logger.info("Waiting for download to complete…")
    path = wait_for_new_xlsx(before, timeout=120)
    if not path:
        save_debug_snapshot(driver, "download_timeout")
        raise RuntimeError(f"Download não concluído — nenhum .xlsx novo em {DOWNLOAD_DIR} após 120 s.")
    return path

# ============================================================================
# DATA RESULTADO (cronograma of the vacancy)
# ============================================================================

def _close_export_modal(driver: webdriver.Firefox) -> bool:
    if not _export_modal_is_visible(driver):
        logger.info("[data_resultado] Export modal already closed.")
        return True

    if not click_first_available(driver, _EXPORT_MODAL_CLOSE_XPATHS, "export modal close button"):
        logger.info("[data_resultado] Falling back to ESC to close the modal…")
        try:
            ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        except WebDriverException as exc:
            logger.warning("[data_resultado] ESC fallback failed: %s", _first_line(exc))

    try:
        WebDriverWait(driver, SHORT_TIMEOUT).until(lambda d: not _export_modal_is_visible(d))
    except TimeoutException:
        return False
    wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)
    return True


def _read_last_cronograma_date(driver: webdriver.Firefox) -> Optional[str]:
    def collect(d):
        for xp in _CRONOGRAMA_DATE_XPATHS:
            dates = []
            for el in d.find_elements(By.XPATH, xp):
                text = (el.get_attribute("textContent") or "").strip()
                match = _DDMMYYYY_RE.search(text)
                if not match:
                    parent = el.find_element(By.XPATH, "..")
                    text = (parent.get_attribute("textContent") or "").strip()
                    match = _DDMMYYYY_RE.search(text)
                if match:
                    dates.append((match.group(1), " ".join(text.split())))
            if dates:
                return dates
        return False

    try:
        dates = WebDriverWait(
            driver, DEFAULT_TIMEOUT, poll_frequency=0.5,
            ignored_exceptions=(StaleElementReferenceException, NoSuchElementException),
        ).until(collect)
    except TimeoutException:
        logger.warning("[data_resultado] No 'Adicionado em DD/MM/YYYY' found in cronograma.")
        return None

    logger.info("[data_resultado] %d card date(s): %s", len(dates), [d for d, _ in dates])
    last_date, last_raw = dates[-1]
    logger.info("[data_resultado] Last card text: '%s'", last_raw)
    return last_date


def get_data_resultado(driver: webdriver.Firefox) -> Optional[str]:
    """
    Close export modal → 'Editar vaga' → 'Etapas do Processo Seletivo' →
    date of the LAST cronograma card. Never raises; returns None on failure.
    Nothing is saved in the edit form (the next edital reloads the page).
    """
    try:
        logger.info("[data_resultado] Closing export modal…")
        if not _close_export_modal(driver):
            logger.warning("[data_resultado] Export modal did not close.")
            return None

        logger.info("[data_resultado] Clicking 'Editar vaga'…")
        if not click_first_available(driver, _EDITAR_VAGA_BTN_XPATHS, "'Editar vaga'"):
            return None

        logger.info("[data_resultado] Waiting for edit form…")
        time.sleep(4)
        wait_for_overlay_gone(driver, timeout=DEFAULT_TIMEOUT)

        logger.info("[data_resultado] Clicking 'Etapas do Processo Seletivo'…")
        if not click_first_available(
            driver, _ETAPAS_PROCESSO_XPATHS, "'Etapas do Processo Seletivo'",
            timeout=DEFAULT_TIMEOUT,
        ):
            return None

        wait_for_overlay_gone(driver, timeout=SHORT_TIMEOUT)
        ddmmyyyy = _read_last_cronograma_date(driver)
        if not ddmmyyyy:
            return None

        try:
            parsed = datetime.datetime.strptime(ddmmyyyy, "%d/%m/%Y").strftime("%Y-%m-%d")
        except ValueError:
            logger.warning("[data_resultado] Invalid date '%s'.", ddmmyyyy)
            return None

        logger.info("[data_resultado] Extracted: %s", parsed)
        return parsed

    except Exception as exc:
        logger.warning("[data_resultado] Unexpected error: %s", exc, exc_info=True)
        save_debug_snapshot(driver, "data_resultado_error")
        return None

# ============================================================================
# EXCEL PARSING AND DATABASE INSERT
# ============================================================================

def _clean_str(val) -> Optional[str]:
    """
    Normalize an Excel cell to a clean string or None.
    NaN / NaT / '' / 'nan' → None ; 62999999999.0 → '62999999999'.
    """
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(val, float) and val.is_integer():
        return str(int(val))
    s = str(val).strip()
    return None if s.lower() in ("", "nan", "none", "nat", "null") else s


def _parse_float(val) -> Optional[float]:
    s = _clean_str(val)
    if s is None:
        return None
    try:
        return float(s.replace(",", "."))
    except ValueError:
        return None


def _parse_date(val) -> Optional[str]:
    """Return 'YYYY-MM-DD' or None (never a raw string the date column would reject)."""
    if val is None:
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):  # includes pd.Timestamp
        try:
            if pd.isna(val):
                return None
        except (TypeError, ValueError):
            pass
        return val.strftime("%Y-%m-%d")
    s = _clean_str(val)
    if s is None:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y"):
        try:
            return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    logger.warning("Could not parse date: '%s' — storing NULL.", s)
    return None


def _pad_cpf(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    return digits.zfill(11) if digits else None


def _norm_key(name) -> str:
    """'Nota da Avaliação' → 'notadaavaliacao' (for tolerant column matching)."""
    s = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _col(row: dict, cols: dict, *names):
    """First non-empty raw value among the given column names, or None."""
    for name in names:
        actual = cols.get(_norm_key(name))
        if actual is not None:
            value = row.get(actual)
            if _clean_str(value) is not None:
                return value
    return None


def process_excel(
    supabase: Client,
    excel_path: str,
    arquivo: str,
    numero_edital: str,
    is_teia: bool,
    card_info: dict,
    importacao_id: str,
    data_resultado: Optional[str] = None,
) -> int:
    """
    Parse the downloaded Excel, rank candidates and insert them into
    banco_candidatos. Idempotent per importacao_id. Returns rows inserted.
    """
    today_iso       = datetime.date.today().strftime("%Y-%m-%d")
    cargo_vaga      = card_info.get("cargo")
    unidade_card    = card_info.get("unidade_card")
    data_publicacao = card_info.get("data_publicacao")

    logger.info("Parsing Excel file: %s", excel_path)
    df = pd.read_excel(excel_path, engine="openpyxl", dtype=object)
    df.columns = [str(c).strip() for c in df.columns]
    cols = {_norm_key(c): c for c in df.columns}
    logger.info("Columns: %s", list(df.columns))

    if _norm_key("Nome") not in cols:
        raise RuntimeError(
            f"Planilha exportada sem coluna 'Nome' — colunas: {list(df.columns)[:15]}"
        )

    rows = []
    for record in df.to_dict(orient="records"):
        nome = _clean_str(_col(record, cols, "Nome"))
        if not nome:
            continue

        nota_av  = _parse_float(_col(record, cols, "Nota da avaliação", "Nota da avaliacao"))
        nota_ent = _parse_float(_col(record, cols, "Nota da Entrevista"))
        avg_score = ((nota_av or 0.0) + (nota_ent or 0.0)) / 2.0

        nascimento    = _parse_date(_col(record, cols, "Nascimento", "Data de Nascimento"))
        cpf           = _pad_cpf(_clean_str(_col(record, cols, "CPF")))
        unidade_excel = _clean_str(_col(record, cols, "Unidade"))

        rows.append({
            "nome":                     nome,
            "cpf":                      cpf,
            "data_nascimento":          nascimento,
            "email":                    _clean_str(_col(record, cols, "E-Mail", "Email")),
            "telefone":                 _clean_str(_col(record, cols, "Celular", "Telefone")),
            "unidade":                  unidade_card or unidade_excel,
            "cargo":                    cargo_vaga,
            "nota_avaliacao":           str(nota_av) if nota_av is not None else None,
            "nota_entrevista":          str(nota_ent) if nota_ent is not None else None,
            "observacao":               _clean_str(_col(record, cols, "Status Atual")),
            "numero_processo_seletivo": arquivo,
            "numero_edital":            numero_edital or None,
            "is_teia":                  is_teia,
            "media_final":              round(avg_score, 4),
            "data_publicacao":          data_publicacao,
            "data_resultado":           data_resultado,
            "data_importacao":          today_iso,
            "import_batch_id":          importacao_id,
            "status":                   "CADASTRO RESERVA",
            "status_calculado":         "CADASTRO RESERVA",
            "status_original":          "CADASTRO RESERVA",
            "origem":                   "reachr",
            "__avg":  avg_score,
            "__nasc": nascimento or "9999-99-99",
        })

    if not rows:
        logger.warning("Excel file contained no valid candidate rows.")
        return 0

    # Highest average first; on tie, oldest birth date first.
    rows.sort(key=lambda r: (-r["__avg"], r["__nasc"]))
    for rank, r in enumerate(rows, start=1):
        r["classificacao"] = str(rank)
        del r["__avg"]
        del r["__nasc"]

    # Idempotency: a retry / re-queue of the same importacao never duplicates rows.
    _with_retries(
        lambda: supabase.table("banco_candidatos").delete()
        .eq("import_batch_id", importacao_id).execute(),
        "Removing previous rows of this import batch",
    )

    batch_size = 100
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        _with_retries(
            lambda: supabase.table("banco_candidatos").insert(batch).execute(),
            f"Inserting rows {i + 1}–{i + len(batch)}",
        )
        total_inserted += len(batch)
        logger.info("  Inserted rows %d – %d", i + 1, total_inserted)

    logger.info(
        "Total rows inserted for proc. seletivo %s: %d (data_resultado=%s)",
        arquivo, total_inserted, data_resultado,
    )
    return total_inserted

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

_RETRYABLE_ERRORS = (WebDriverException, RuntimeError)  # TimeoutException ⊂ WebDriverException


def _error_status(step: str, exc: BaseException) -> str:
    if isinstance(exc, TimeoutException):
        kind = "timeout — o elemento pode ter mudado na página"
    elif isinstance(exc, WebDriverException):
        kind = "falha no navegador"
    else:
        kind = "erro"
    return f"Erro ({kind}) na etapa '{step}': {_first_line(exc)}"[:300]


def _acquire_lock():
    fh = open(LOCK_FILE, "w")
    try:
        fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fh.close()
        return None
    return fh


def run() -> None:
    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — starting")
    logger.info("═══════════════════════════════════════════════════════")

    missing = [
        v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "REACHR_EMAIL", "REACHR_PASSWORD")
        if not os.environ.get(v)
    ]
    if missing:
        raise EnvironmentError("Missing required environment variable(s): %s" % ", ".join(missing))

    lock = _acquire_lock()
    if lock is None:
        logger.warning("Another run is already in progress (lock: %s). Exiting.", LOCK_FILE)
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    editais = get_pending_editais(supabase)
    if not editais:
        logger.info("No editais with status 'aguardando_processamento'. Nothing to do.")
        return

    codes = [(e.get("arquivo") or "").strip() for e in editais]
    logger.info("Found %d pending edital(s): %s", len(editais), codes)
    duplicate_codes = {c for c in codes if c and codes.count(c) > 1}
    if duplicate_codes:
        logger.warning(
            "Duplicate 'arquivo' code(s) in this batch — scraped once, result copied: %s",
            sorted(duplicate_codes),
        )

    driver = setup_driver()
    logger.info("Browser started (headless).")
    processed_results = {}

    try:
        login(driver)

        for edital_row in editais:
            arquivo       = (edital_row.get("arquivo") or "").strip()
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

            if arquivo in processed_results:
                status_to_copy = processed_results[arquivo]
                logger.info("Already handled in this run — copying result '%s'.", status_to_copy)
                try:
                    update_importacao_status(supabase, importacao_id, status_to_copy)
                except Exception as exc:
                    logger.error("Could not update status of %s: %s", importacao_id, exc)
                continue

            final_status = None
            attempt = 0

            while final_status is None:
                attempt += 1
                step = "iniciando"
                try:
                    step = "verificando sessão do navegador"
                    if not _driver_is_alive(driver):
                        logger.warning("Browser session dead — restarting browser and logging in.")
                        try:
                            driver.quit()
                        except WebDriverException:
                            pass
                        driver = setup_driver()
                        step = "re-login após sessão morta"
                        login(driver)

                    step = "navegando ao dashboard"
                    navigate_to_dashboard(driver)

                    step = "aplicando filtro"
                    apply_filter(driver, arquivo)

                    step = "localizando o card do processo seletivo"
                    card_index = locate_card(driver, arquivo)
                    if card_index is None:
                        save_debug_snapshot(driver, f"{arquivo}_card_not_found_try{attempt}")
                        if attempt < MAX_EDITAL_ATTEMPTS:
                            logger.warning("Code %s not found — retrying the search.", arquivo)
                            continue
                        final_status = "Edital não encontrado na Reachr"
                        break

                    step = "lendo informações do card"
                    card_info = get_card_info(driver, card_index)

                    step = "abrindo kanban"
                    open_kanban(driver, arquivo)

                    step = "exportando Excel"
                    excel_path = export_excel(driver)

                    try:
                        step = "lendo data_resultado"
                        data_resultado = get_data_resultado(driver)
                        if data_resultado is None:
                            logger.warning(
                                "data_resultado not found for %s — importing with NULL.", arquivo
                            )

                        step = "importando candidatos no banco"
                        n = process_excel(
                            supabase, excel_path, arquivo, numero_edital, is_teia,
                            card_info, importacao_id, data_resultado,
                        )
                    finally:
                        try:
                            os.remove(excel_path)
                            logger.info("Deleted temporary file: %s", excel_path)
                        except OSError as err:
                            logger.warning("Could not delete %s: %s", excel_path, err)

                    final_status = "Candidato(a)s importados para o banco de talentos"
                    logger.info("Proc. seletivo %s processed successfully (%d candidates).", arquivo, n)

                except _RETRYABLE_ERRORS as exc:
                    logger.error(
                        "%s on proc. seletivo %s (attempt %d/%d) at step '%s': %s",
                        exc.__class__.__name__, arquivo, attempt, MAX_EDITAL_ATTEMPTS,
                        step, _first_line(exc),
                    )
                    save_debug_snapshot(driver, f"{arquivo}_try{attempt}_{step}")
                    if attempt < MAX_EDITAL_ATTEMPTS:
                        time.sleep(5)
                        continue
                    final_status = _error_status(step, exc)

                except Exception as exc:
                    logger.error("Unexpected error on %s at step '%s': %s",
                                 arquivo, step, exc, exc_info=True)
                    save_debug_snapshot(driver, f"{arquivo}_unexpected_{step}")
                    final_status = f"Erro inesperado na etapa '{step}': {_first_line(exc)}"[:300]

            try:
                update_importacao_status(supabase, importacao_id, final_status)
            except Exception as exc:  # don't abort the remaining editais
                logger.error("Could not update status of %s to '%s': %s",
                             importacao_id, final_status, exc)
            processed_results[arquivo] = final_status

    finally:
        logger.info("Closing browser.")
        try:
            driver.quit()
        except WebDriverException:
            pass
        lock.close()

    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — finished")
    logger.info("═══════════════════════════════════════════════════════")


if __name__ == "__main__":
    run()
