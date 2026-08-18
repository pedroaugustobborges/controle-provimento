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
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
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

DEFAULT_TIMEOUT = 30
SHORT_TIMEOUT   = 12

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

def wait_and_find(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until an element is present in the DOM and return it."""
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )


def wait_and_click(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until clickable, scroll into view, click."""
    element = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.XPATH, xpath))
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
    time.sleep(2.5)    # original 0.5 + 2
    element.click()
    time.sleep(3.5)    # original 1.5 + 2
    return element


def wait_and_type(driver: webdriver.Firefox, xpath: str, text: str,
                  timeout: int = DEFAULT_TIMEOUT):
    """Wait until visible, clear, type."""
    element = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.XPATH, xpath))
    )
    element.clear()
    time.sleep(2.3)    # original 0.3 + 2
    element.send_keys(text)
    time.sleep(3.5)    # original 1.5 + 2
    return element


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
    Poll DOWNLOAD_DIR until a new .xlsx file (not a partial download) appears.
    Returns the absolute path or None on timeout.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        current = {
            f for f in Path(DOWNLOAD_DIR).iterdir()
            if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
        }
        new_files = current - before_files
        if new_files:
            path = str(sorted(new_files, key=lambda f: f.stat().st_mtime)[-1])
            logger.info("New download detected: %s", path)
            return path
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

# /html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[2]/app-vaga-kanbam/div/div[2]/app-vaga-kanbam-coluna[11]/div[3]/i[6]


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
    time.sleep(10)    # original 8 + 2


def navigate_to_dashboard(driver: webdriver.Firefox) -> None:
    logger.info("Navigating back to dashboard…")
    driver.get(BASE_URL)
    time.sleep(7)     # give Angular app time to bootstrap


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
    time.sleep(6)     # original 4 + 2


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
      - data_publicacao : publication date as 'YYYY-MM-DD' (DATE_XPATH, format 'Data: dd/mm/yyyy')
    """
    cargo_raw    = safe_get_text(driver, _VAGA_TITLE_XPATH)
    location_raw = safe_get_text(driver, _LOCATION_XPATH)
    date_raw     = safe_get_text(driver, _DATE_XPATH)

    # "Goiânia - GO : Presencial" → "Goiânia - GO"
    unidade_card = location_raw.split(" :")[0].strip() if location_raw else None

    # "Data: 07/05/2026" → "2026-05-07"
    date_clean = re.sub(r"(?i)data\s*:\s*", "", date_raw).strip()
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


def export_excel(driver: webdriver.Firefox) -> str:
    """
    Trigger the Excel export in Reachr and wait for the file to land in
    DOWNLOAD_DIR. Returns the local path to the downloaded file.
    Raises RuntimeError if the download times out.
    """
    # Snapshot existing files before triggering download
    before = {
        f for f in Path(DOWNLOAD_DIR).iterdir()
        if f.suffix.lower() == ".xlsx" and not f.name.endswith(".part")
    }

    logger.info("Clicking 'Exportar Candidatos' icon…")
    time.sleep(8.5)
    wait_and_click(driver, _EXPORT_ICON_XPATH)

    logger.info("Waiting for export modal…")
    time.sleep(8.5)    # original 3.5 + 2

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
    missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY") if not os.environ.get(v)]
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

    driver = setup_driver()
    logger.info("Browser started (headless).")

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

            try:
                # ── 1. Go to dashboard & filter ──────────────────────────────
                navigate_to_dashboard(driver)
                apply_filter(driver, arquivo)

                # ── 2. Verify the card shows the expected code ────────────────
                if not verify_code(driver, arquivo):
                    logger.warning("Código %s not found in Reachr.", arquivo)
                    update_importacao_status(
                        supabase, importacao_id, "Edital não encontrado na Reachr"
                    )
                    continue

                # ── 3. Capture card info (cargo, unidade, date) BEFORE clicking title
                card_info = get_card_info(driver)

                # ── 4. Open Kanban ────────────────────────────────────────────
                open_kanban(driver)

                # ── 5. Export Excel & wait for download ───────────────────────
                excel_path = export_excel(driver)

                # ── 6. Parse Excel & insert into banco_candidatos ─────────────
                n = process_excel(
                    supabase, excel_path, arquivo, numero_edital, is_teia, card_info, importacao_id
                )

                # ── 7. Delete temporary file ──────────────────────────────────
                try:
                    os.remove(excel_path)
                    logger.info("Deleted temporary file: %s", excel_path)
                except OSError as err:
                    logger.warning("Could not delete %s: %s", excel_path, err)

                # ── 8. Mark as done ───────────────────────────────────────────
                update_importacao_status(
                    supabase,
                    importacao_id,
                    "Candidato(a)s importados para o banco de talentos",
                )
                logger.info("Proc. seletivo %s processed successfully (%d candidates).", arquivo, n)

            except TimeoutException as exc:
                logger.error("Timeout on proc. seletivo %s: %s", arquivo, exc)
                update_importacao_status(
                    supabase, importacao_id, "Erro: timeout ao processar edital"
                )
            except WebDriverException as exc:
                logger.error("WebDriver error on proc. seletivo %s: %s", arquivo, exc)
                update_importacao_status(
                    supabase, importacao_id, "Erro: falha no navegador"
                )
            except RuntimeError as exc:
                logger.error("Runtime error on proc. seletivo %s: %s", arquivo, exc)
                update_importacao_status(
                    supabase, importacao_id, f"Erro: {str(exc)[:200]}"
                )
            except Exception as exc:
                logger.error("Unexpected error on proc. seletivo %s: %s", arquivo, exc, exc_info=True)
                update_importacao_status(
                    supabase, importacao_id, f"Erro inesperado: {str(exc)[:200]}"
                )

    finally:
        logger.info("Closing browser.")
        driver.quit()

    logger.info("═══════════════════════════════════════════════════════")
    logger.info("  Reachr Edital Import Automation — finished")
    logger.info("═══════════════════════════════════════════════════════")


if __name__ == "__main__":
    run()

