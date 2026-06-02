import os
import time
import logging
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    StaleElementReferenceException,
    WebDriverException,
)

# ============================================================================
# CONFIGURATION
# ============================================================================

GECKODRIVER_PATH = "C:\\Users\\16144-pedro\\Documents\\bot_solicitacao\\geckodriver.exe"

LOGIN_EMAIL    = "luanna.sousa@agirsaude.org.br"
LOGIN_PASSWORD = "reachr@2025"

BASE_URL = "https://www.reachr.com.br/empresas/#/dashboard"

VAGA_CODE = "32203"

DEFAULT_TIMEOUT = 30
SHORT_TIMEOUT   = 10

# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("reachr_export.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ============================================================================
# HELPERS
# ============================================================================

def wait_and_find(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until an element is present in the DOM and return it."""
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )


def wait_and_click(driver: webdriver.Firefox, xpath: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until an element is clickable, scroll it into view, then click."""
    element = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.XPATH, xpath))
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
    time.sleep(0.5)
    element.click()
    time.sleep(1.5)   # post-click buffer — every action needs breathing room
    return element


def wait_and_type(driver: webdriver.Firefox, xpath: str, text: str, timeout: int = DEFAULT_TIMEOUT):
    """Wait until an input is visible, clear it, then type the given text."""
    element = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.XPATH, xpath))
    )
    element.clear()
    time.sleep(0.3)
    element.send_keys(text)
    time.sleep(1.5)   # let Angular/React digest the input before the next action
    return element


def safe_get_text(driver: webdriver.Firefox, xpath: str, timeout: int = SHORT_TIMEOUT) -> str:
    """Try to retrieve the text of an element; return empty string on failure."""
    try:
        el = WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.XPATH, xpath))
        )
        return el.text.strip()
    except (TimeoutException, NoSuchElementException):
        logger.warning("Could not read text from xpath: %s", xpath)
        return ""

# ============================================================================
# MAIN AUTOMATION
# ============================================================================

def run():
    logger.info("=== Starting Reachr export automation ===")

    # ------------------------------------------------------------------
    # Driver setup
    # ------------------------------------------------------------------
    service = Service(executable_path=GECKODRIVER_PATH)
    options = webdriver.FirefoxOptions()
    # options.add_argument("--headless")  # uncomment for headless mode

    driver = webdriver.Firefox(service=service, options=options)
    driver.maximize_window()

    try:
        # ------------------------------------------------------------------
        # 1. Open login page
        # ------------------------------------------------------------------
        logger.info("Opening: %s", BASE_URL)
        driver.get(BASE_URL)
        time.sleep(3.5)

        # ------------------------------------------------------------------
        # 2. Type e-mail
        # ------------------------------------------------------------------
        EMAIL_XPATH = (
            "/html/body/app-root/login-juridico/main/section/div/div/div[2]/div/div[1]"
            "/article/app-formulario-login/div/form/div[1]/input"
        )
        logger.info("Typing e-mail…")
        wait_and_type(driver, EMAIL_XPATH, LOGIN_EMAIL)

        # ------------------------------------------------------------------
        # 3. Type password
        # ------------------------------------------------------------------
        PASSWORD_XPATH = (
            "/html/body/app-root/login-juridico/main/section/div/div/div[2]/div/div[1]"
            "/article/app-formulario-login/div/form/div[2]/input"
        )
        logger.info("Typing password…")
        wait_and_type(driver, PASSWORD_XPATH, LOGIN_PASSWORD)

        # ------------------------------------------------------------------
        # 4. Click login button
        # ------------------------------------------------------------------
        LOGIN_BTN_XPATH = (
            "/html/body/app-root/login-juridico/main/section/div/div/div[2]/div/div[1]"
            "/article/app-formulario-login/div/form/div[4]/input"
        )
        logger.info("Clicking login button…")
        wait_and_click(driver, LOGIN_BTN_XPATH)

        # Wait for dashboard to load
        logger.info("Waiting for dashboard…")
        time.sleep(5)

        # ------------------------------------------------------------------
        # 5. Click "Filtros" / expand filter panel
        # ------------------------------------------------------------------
        FILTER_BTN_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
            "/app-dash-filtro/div/div[1]/div[2]/div/button/span"
        )
        logger.info("Opening filter panel…")
        wait_and_click(driver, FILTER_BTN_XPATH)
        time.sleep(1)

        # ------------------------------------------------------------------
        # 6. Type vacancy code
        # ------------------------------------------------------------------
        VAGA_INPUT_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
            "/app-dash-filtro/div/div[2]/div/form/div[1]/div[1]/nz-form-item/nz-form-control"
            "/div/div/input"
        )
        logger.info("Typing vacancy code: %s", VAGA_CODE)
        wait_and_type(driver, VAGA_INPUT_XPATH, VAGA_CODE)
        time.sleep(2.0)

        # ------------------------------------------------------------------
        # 7. Click search / apply filter
        # ------------------------------------------------------------------
        SEARCH_BTN_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
            "/app-dash-filtro/div/div[2]/div/form/div[3]/div[2]/nz-form-item/nz-form-control"
            "/div/div/button/span"
        )
        logger.info("Clicking search button…")
        wait_and_click(driver, SEARCH_BTN_XPATH)

        # Wait for results
        logger.info("Waiting for results to load…")
        time.sleep(4)

        # ------------------------------------------------------------------
        # 8. Store location and date info from the vacancy card
        # ------------------------------------------------------------------
        LOCATION_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
            "/div[2]/div/div/app-dash-vaga/div/div[2]/div[4]/div"
        )
        DATE_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
            "/div[2]/div/div/app-dash-vaga/div/div[2]/div[7]/div"
        )

        location_text = safe_get_text(driver, LOCATION_XPATH)
        date_text     = safe_get_text(driver, DATE_XPATH)

        logger.info("Vacancy location : %s", location_text or "(not found)")
        logger.info("Vacancy date     : %s", date_text     or "(not found)")
        time.sleep(1.5)

        # ------------------------------------------------------------------
        # 9. Click vacancy title to open the Kanban view
        # ------------------------------------------------------------------
        VAGA_TITLE_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-dashboard/div/div/main"
            "/div[2]/div/div/app-dash-vaga/div/div[1]/div[1]/div[1]/div/span"
        )
        logger.info("Clicking on vacancy title…")
        wait_and_click(driver, VAGA_TITLE_XPATH)

        # Wait for Kanban page
        logger.info("Waiting for Kanban page to load…")
        time.sleep(5)

        # ------------------------------------------------------------------
        # 10. Click "Exportar Candidatos" icon
        # ------------------------------------------------------------------
        EXPORT_ICON_XPATH = (
            "/html/body/app-root/app-common-layout/div/div/div/app-vaga/div/div[2]"
            "/app-vaga-kanbam/div/div[2]/app-vaga-kanbam-coluna[10]/div[3]/i[6]"
        )
        logger.info("Clicking 'Exportar Candidatos'…")
        wait_and_click(driver, EXPORT_ICON_XPATH)

        # Wait for modal
        logger.info("Waiting for export modal…")
        time.sleep(3.5)

        # ------------------------------------------------------------------
        # 11. Click the nz-select dropdown to open options
        # ------------------------------------------------------------------
        SELECT_DROPDOWN_XPATH = (
            "/html/body/div/div[2]/div/nz-modal-container/div/div/div[2]"
            "/app-importar-exportar-candidatos/div[2]/div/div[1]/nz-select/nz-select-top-control"
        )
        logger.info("Opening export format dropdown…")
        wait_and_click(driver, SELECT_DROPDOWN_XPATH)
        time.sleep(2.0)

        # ------------------------------------------------------------------
        # 12. Select "Exportar para excel" option
        # ------------------------------------------------------------------
        EXCEL_OPTION_XPATH = (
            "/html/body/div/div[3]/div/nz-option-container/div"
            "/cdk-virtual-scroll-viewport/div[1]/nz-option-item[13]/div"
        )
        logger.info("Selecting 'Exportar para excel'…")
        wait_and_click(driver, EXCEL_OPTION_XPATH)
        time.sleep(2.0)

        # ------------------------------------------------------------------
        # 13. Click "Exportar para Excel" confirmation button
        # ------------------------------------------------------------------
        EXPORT_BTN_XPATH = (
            "/html/body/div/div[2]/div/nz-modal-container/div/div/div[2]"
            "/app-importar-exportar-candidatos/div[2]/div/div[2]/div[1]/button/span"
        )
        logger.info("Clicking 'Exportar para Excel' button…")
        wait_and_click(driver, EXPORT_BTN_XPATH)

        logger.info("Export triggered successfully!")
        logger.info("Vacancy location : %s", location_text)
        logger.info("Vacancy date     : %s", date_text)

        # Give the browser time to start the download
        time.sleep(6)

    except TimeoutException as e:
        logger.error("Timeout waiting for element: %s", e)
        raise
    except WebDriverException as e:
        logger.error("WebDriver error: %s", e)
        raise
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        raise
    finally:
        logger.info("Closing browser.")
        driver.quit()


if __name__ == "__main__":
    run()