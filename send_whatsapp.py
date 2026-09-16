import sys
import requests

# --- CONFIGURAÇÕES TATODESK ---
API_KEY = "04717fac-95e0-45cc-856d-57a67abd8a41"
APP_ID = "c36a03c9-2122-4381-975c-b479b4a1da0e"
TEMPLATE_ID = "76864409-b6de-4a3e-a2ad-27f97f4f9a0a"
API_URL = "https://api.tatodesk.com/dl/v1/whatsapp/messages"

# --- NÚMERO DE DESTINO ---
PHONE_NUMBER = "5562985891365"


def send_whatsapp_message(phone: str, body_params: list[str] | None = None, header_image_url: str | None = None):
    """
    Envia mensagem WhatsApp via Tatodesk usando template.

    Args:
        phone: Número do destinatário (ex: '5562993013303')
        body_params: Lista de textos para as variáveis do corpo do template (opcional)
        header_image_url: URL da imagem para o header do template (opcional)
    """
    headers = {
        "TATODESK-API-KEY": API_KEY,
        "Content-Type": "application/json",
    }

    template_payload = {}

    if header_image_url:
        template_payload["header"] = {
            "params": [
                {
                    "type": "image",
                    "image": {"link": header_image_url},
                }
            ]
        }

    if body_params:
        template_payload["body"] = {
            "params": [{"type": "TEXT", "text": p} for p in body_params]
        }

    payload = {
        "appID": APP_ID,
        "templateID": TEMPLATE_ID,
        "whatsapp": {
            "type": "template",
            "to": phone,
            "templatePayload": template_payload,
        },
    }

    response = requests.post(API_URL, json=payload, headers=headers)

    if response.ok:
        data = response.json()
        if data.get("error"):
            print(f"[ERRO API] {data['error']['message']}")
        else:
            print(f"[OK] Mensagem enviada para {phone}")
            print(f"     Resposta: {data}")
    else:
        print(f"[ERRO HTTP] Status: {response.status_code}")
        print(f"            Resposta: {response.text}")

    return response


if __name__ == "__main__":
    # Uso: python send_whatsapp.py <vaga>
    # Ex:  python send_whatsapp.py "FARMACEUTICO I"
    if len(sys.argv) == 2:
        vaga = sys.argv[1]
    else:
        print("Uso: python send_whatsapp.py <vaga>")
        print('Ex:  python send_whatsapp.py "FARMACEUTICO I"')
        sys.exit(1)

    print(f"[INFO] vaga={vaga!r}")
    send_whatsapp_message(PHONE_NUMBER, body_params=[vaga])
