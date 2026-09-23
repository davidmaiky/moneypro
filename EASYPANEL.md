# 🚀 Guia de Implantação no EasyPanel - FinanFlow (MoneyPro)

Este repositório está 100% preparado e otimizado para ser instalado no **EasyPanel** através do `Dockerfile` multi-stage ou via `docker-compose.yml`.

---

## 📌 Requisitos Principais

- **Porta interna da aplicação:** `3000`
- **Banco de Dados:** SQLite (`better-sqlite3`), gravado no diretório `/app/data`
- **Volume Persistente:** O volume montado em `/app/data` é **indispensável** para que seus dados financeiros não sejam perdidos ao reiniciar ou atualizar a aplicação.
- **Healthcheck:** Rota `/health` (HTTP 200)

---

## 🛠️ Passo a Passo para Instalação no EasyPanel

### 1. Criar um Novo Serviço no EasyPanel
1. Acesse o seu painel do **EasyPanel**.
2. Abra ou crie um **Projeto** (ex: `financeiro`).
3. Clique em **+ Service** e selecione **App**.
4. Dê um nome ao serviço (ex: `finanflow` ou `moneypro`).

---

### 2. Configurar a Origem (Source)
1. Na aba **Source**:
   - Selecione **GitHub** (se o repositório estiver vinculado) ou **Git**.
   - Insira a URL do seu repositório: `https://github.com/SEU_USUARIO/SEU_REPOSITORIO`.
   - Defina a branch (normalmente `main` ou `master`).
2. Em **Build Method**:
   - Selecione **Dockerfile**.
   - O campo Dockerfile Path pode ficar como `Dockerfile` (na raiz).

---

### 3. Configurar o Volume Persistente (CRUCIAL ⚠️)
Como a aplicação utiliza SQLite nativo de alta performance, precisamos de um volume persistente para manter os dados salvos:
1. Vá até a aba **Mounts / Volumes**.
2. Clique em **Add Mount**.
3. Configure:
   - **Type:** `Volume`
   - **Name:** `finanflow-data` (ou o nome que desejar)
   - **Mount Path:** `/app/data`
4. Salve as alterações.

---

### 4. Configurar as Variáveis de Ambiente (Environment)
Na aba **Environment**, adicione as seguintes variáveis:

| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo de execução otimizado |
| `PORT` | `3000` | Porta onde o servidor Node.js escutará |
| `DATA_DIR` | `/app/data` | Diretório onde o SQLite `finanflow.sqlite` será salvo |
| `GEMINI_API_KEY` | *(opcional)* | Chave de API do Google Gemini para recursos de IA |
| `APP_URL` | `https://seu-dominio.com` | URL pública da sua aplicação |

---

### 5. Configurar Domínio e Portas
1. Na aba **Domains**:
   - Adicione o seu domínio ou subdomínio (ex: `financeiro.seudominio.com`).
   - Defina a porta do container como `3000`.
   - O EasyPanel gerará automaticamente o certificado SSL (HTTPS) via Let's Encrypt.

---

### 6. Configurar Verificação de Integridade (Health Check - Opcional)
Na aba **Advanced / Healthcheck**:
- **Path:** `/health`
- **Port:** `3000`
- O container responderá `{"status":"ok","service":"finanflow"}` com status HTTP 200.

---

### 7. Realizar o Deploy
1. Clique no botão **Deploy**.
2. O EasyPanel irá:
   - Clonar o repositório;
   - Compilar o frontend com Vite + TailwindCSS + PWA;
   - Empacotar o backend com esbuild;
   - Instalar apenas os módulos de produção;
   - Iniciar o servidor Express servindo a API e os arquivos estáticos.
3. Acesse a URL configurada e pronto! 🎉

---

## 🐳 Alternativa: Deploy via Docker Compose

Se preferir utilizar a opção de Docker Compose no EasyPanel:
1. No EasyPanel, adicione um serviço do tipo **Compose**.
2. Cole o conteúdo do arquivo [`docker-compose.yml`](./docker-compose.yml):

```yaml
services:
  moneypro:
    build:
      context: .
      dockerfile: Dockerfile
    image: moneypro:latest
    container_name: moneypro
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/app/data
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
      - APP_URL=${APP_URL:-}
    volumes:
      - moneypro-data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  moneypro-data:
    driver: local
```

---

## 💾 Backup dos Dados

Os dados ficam salvos em um banco de dados SQLite único:
- Localização no container: `/app/data/finanflow.sqlite`
- Para fazer backup rápido:
  1. No EasyPanel, você pode baixar o volume ou acessar o terminal do container.
  2. A própria interface web do FinanFlow conta com opção de exportação/backup completo em JSON nas configurações.
