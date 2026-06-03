# Tutorial: VM AWS — Importação Automática de Editais (5h Brasília)

Este guia configura a VM AWS existente (IP `10.12.1.170`) para executar o script
`importar_editais_reachr.py` todos os dias às **05:00 BRT** (= 08:00 UTC).

> **Acesso:** PuTTY com a chave `AgirChave02 2.ppk` e IP `10.12.1.170`.

---

## 1. Conectar à VM pelo PuTTY

1. Abra o **PuTTY**.
2. Em **Host Name (or IP address)** digite:
   ```
   10.12.1.170
   ```
3. Em **Connection → SSH → Auth → Credentials**, no campo
   **Private key file for authentication**, clique em **Browse** e selecione:
   ```
   AgirChave02 2.ppk
   ```
4. Clique em **Open**.
5. Se aparecer uma janela de alerta de segurança (host key), clique em **Accept**.
6. No prompt de login, digite seu usuário (geralmente `ubuntu` ou `ec2-user` em VMs AWS).

> **Dica:** Para salvar essa configuração e não precisar repetir toda vez, antes de clicar em
> Open vá em **Session**, escreva um nome em **Saved Sessions** (ex: `VM-Reachr`) e clique em
> **Save**. Na próxima vez basta dar duplo clique.

---

## 2. Verificar o sistema operacional e atualizar

```bash
lsb_release -a   # confirma a versão do Ubuntu
sudo apt update && sudo apt upgrade -y
```

---

## 3. Instalar dependências do sistema

```bash
sudo apt install -y \
    python3 python3-pip python3-venv \
    firefox \
    wget curl unzip \
    xvfb \
    libgtk-3-0 libdbus-glib-1-2 libx11-xcb1
```

> **Por que Xvfb?** Mesmo com `--headless`, algumas versões do Firefox precisam de um
> display virtual para funcionar corretamente em servidor sem monitor.

---

## 4. Instalar o geckodriver

Verifique a versão mais recente em https://github.com/mozilla/geckodriver/releases
e substitua `v0.35.0` se necessário:

```bash
GECKO_VER="v0.35.0"
wget -q "https://github.com/mozilla/geckodriver/releases/download/${GECKO_VER}/geckodriver-${GECKO_VER}-linux64.tar.gz" \
     -O /tmp/geckodriver.tar.gz
tar -xzf /tmp/geckodriver.tar.gz -C /tmp
sudo mv /tmp/geckodriver /usr/local/bin/geckodriver
sudo chmod +x /usr/local/bin/geckodriver
geckodriver --version   # deve imprimir a versão instalada
```

---

## 5. Copiar o script para a VM

### Opção A — usando o PSCP (vem junto com o PuTTY)

Abra o **Prompt de Comando** (cmd) no seu Windows e execute:

```cmd
pscp -i "C:\Caminho\Para\AgirChave02 2.ppk" ^
     "C:\Users\16144-pedro\Documents\python_projects\controle-de-provimento\unit-talent-flow\importar_editais_reachr.py" ^
     ubuntu@10.12.1.170:/home/ubuntu/
```

> Substitua `ubuntu` pelo seu nome de usuário real na VM caso seja diferente.

### Opção B — copiar e colar pelo PuTTY

1. Abra o arquivo `importar_editais_reachr.py` no seu editor.
2. Selecione todo o conteúdo (**Ctrl+A**) e copie (**Ctrl+C**).
3. Na sessão PuTTY, crie o arquivo:
   ```bash
   cat > /home/admin/importar_editais_reachr.py
   ```
4. Clique com o botão direito na janela do PuTTY para colar o conteúdo.
5. Pressione **Enter**, depois **Ctrl+D** para finalizar.

---

## 6. Criar ambiente virtual Python e instalar bibliotecas

```bash
cd /home/ubuntu
python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install \
    selenium==4.21.0 \
    pandas \
    openpyxl \
    supabase
```

Guarde as dependências para reinstalação futura:

```bash
pip freeze > requirements.txt
```

---

## 7. Configurar variáveis de ambiente

Crie o arquivo `.env` com as credenciais:

```bash
nano /home/admin/.env
```

Cole o conteúdo abaixo (ajuste os valores):

```
SUPABASE_URL=https://npmqwwxhqwejgdodinba.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbXF3d3hocXdlamdkb2RpbmJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0MjI5MiwiZXhwIjoyMDkyNjE4MjkyfQ.UYFvkTtjEfEn9mr9I7UftvBnWsd4g2nCsfy1IMld9fw
REACHR_EMAIL=luanna.sousa@agirsaude.org.br
REACHR_PASSWORD=reachr@2025
GECKODRIVER_PATH=/usr/local/bin/geckodriver
DOWNLOAD_DIR=/tmp/reachr_downloads
```

Salve: **Ctrl+O → Enter → Ctrl+X**.

Proteja o arquivo (só o seu usuário pode ler):

```bash
chmod 600 /home/admin/.env
```

---

## 8. Testar o script manualmente

```bash
cd /home/admin
source venv/bin/activate
export $(grep -v '^#' .env | xargs)

# Suba o display virtual em background
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99

# Execute o script
python importar_editais_reachr.py
```

Acompanhe os logs em tempo real (abra uma segunda aba do PuTTY):

```bash
tail -f /home/admin/importar_editais.log
```

Resultado esperado no final:

```
... Reachr Edital Import Automation — finished
```

---

## 9. Criar o script wrapper (necessário para o cron)

O cron não carrega `.bashrc` nem variáveis de sessão. O wrapper garante que tudo
esteja configurado antes de executar o Python:

```bash
nano /home/admin/run_importar.sh
```

Cole o conteúdo:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Diretório home ───────────────────────────────────────────────────────────
HOME_DIR="/home/admin"
LOG_FILE="$HOME_DIR/importar_editais.log"

# ── Carregar variáveis de ambiente ───────────────────────────────────────────
set -a
source "$HOME_DIR/.env"
set +a

# ── Subir display virtual ────────────────────────────────────────────────────
export DISPLAY=:99
Xvfb :99 -screen 0 1280x720x24 -ac &
XVFB_PID=$!
sleep 3

# ── Executar script ──────────────────────────────────────────────────────────
cd "$HOME_DIR"
source "$HOME_DIR/venv/bin/activate"
python importar_editais_reachr.py >> "$LOG_FILE" 2>&1

# ── Encerrar display virtual ─────────────────────────────────────────────────
kill "$XVFB_PID" 2>/dev/null || true
```

Salve (**Ctrl+O → Enter → Ctrl+X**) e torne executável:

```bash
chmod +x /home/admin/run_importar.sh
```

Teste o wrapper antes de agendar:

```bash
/bin/bash /home/admin/run_importar.sh
tail -20 /home/admin/importar_editais.log
```

---

## 10. Agendar para 05:00 BRT (08:00 UTC) todo dia

Brasília é UTC-3 o ano todo (Brasil aboliu o horário de verão em 2019).
Logo, **05:00 BRT = 08:00 UTC**.

Verifique o fuso horário configurado na VM:

```bash
timedatectl
# A linha "Time zone" deve mostrar UTC ou America/Sao_Paulo.
```

Se mostrar `America/Sao_Paulo`, use `0 5 * * *`.
Se mostrar `UTC` (mais comum em VMs AWS), use `0 8 * * *`.

Abra o crontab do usuário atual:

```bash
crontab -e
```

Adicione a linha correspondente ao fuso da sua VM:

```
# Se a VM estiver em UTC (padrão AWS):
0 8 * * * /bin/bash /home/admin/run_importar.sh

# Se a VM estiver em America/Sao_Paulo:
0 5 * * * /bin/bash /home/admin/run_importar.sh
```

Salve e verifique:

```bash
crontab -l   # deve exibir a linha recém-adicionada
```

Certifique-se de que o serviço cron está ativo:

```bash
sudo systemctl status cron
sudo systemctl enable cron   # garante início automático após reboot
```

---

## 11. Rotação de logs (recomendado)

Evita que o arquivo de log cresça sem limite:

```bash
sudo nano /etc/logrotate.d/reachr
```

Conteúdo:

```
/home/admin/importar_editais.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    copytruncate
}
```

Salve (**Ctrl+O → Enter → Ctrl+X**).

---

## 12. Verificações rápidas do dia a dia

| O que verificar        | Comando na VM                                                |
| ---------------------- | ------------------------------------------------------------ |
| Cron agendado          | `crontab -l`                                                 |
| Log da última execução | `tail -50 /home/ubuntu/importar_editais.log`                 |
| Erros recentes         | `grep -i erro /home/ubuntu/importar_editais.log \| tail -20` |
| Editais pendentes      | SQL abaixo                                                   |
| Candidatos importados  | SQL abaixo                                                   |

```sql
-- Editais aguardando processamento
SELECT id, numero_edital, status, created_at
FROM importacoes
WHERE status = 'aguardando_processamento';

-- Status das últimas importações
SELECT numero_edital, status, created_at
FROM importacoes
ORDER BY created_at DESC
LIMIT 10;

-- Candidatos por edital
SELECT numero_edital, COUNT(*) AS total
FROM banco_candidatos
GROUP BY numero_edital
ORDER BY numero_edital;
```

---

## 13. Problemas comuns

### PuTTY: "Network error: Connection refused" ou "Connection timed out"

- Confirme que você está na **mesma rede/VPN** que a VM (IP `10.12.1.170` é privado).
- Verifique no console AWS que a instância está **Running** e que o Security Group permite SSH (porta 22) da sua origem.

### Firefox falha ao iniciar

```bash
ps aux | grep Xvfb          # verifica se o display virtual está no ar
DISPLAY=:99 firefox --headless --version   # testa o Firefox diretamente
```

### Geckodriver não encontrado

```bash
which geckodriver            # deve retornar /usr/local/bin/geckodriver
geckodriver --version        # confirma a instalação
```

### Timeout nas etapas do Selenium

Edite as constantes `DEFAULT_TIMEOUT` e `SHORT_TIMEOUT` no início de
`importar_editais_reachr.py` aumentando os valores (ex: 45 e 20).

### Download não acontece

```bash
ls -la /tmp/reachr_downloads   # verifica se o diretório existe e tem permissão
mkdir -p /tmp/reachr_downloads  # cria se não existir
```

### Cron não executa

```bash
grep CRON /var/log/syslog | tail -20   # mostra tentativas de execução do cron
```

---

## 14. Migrações SQL — executar no Supabase antes de usar

Acesse **Supabase → SQL Editor** e execute:

```sql
-- 1. Coluna numero_edital na tabela importacoes
ALTER TABLE public.importacoes
  ADD COLUMN IF NOT EXISTS numero_edital TEXT;

-- 2. Novas colunas em banco_candidatos
ALTER TABLE public.banco_candidatos
  ADD COLUMN IF NOT EXISTS cpf             TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_nascimento TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nota_avaliacao  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nota_entrevista TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_publicacao TEXT DEFAULT '';
```
