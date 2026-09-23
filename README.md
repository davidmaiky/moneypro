# 💰 FinanFlow (MoneyPro)

Sistema completo de controle financeiro pessoal, gestão de cartões de crédito com faturas dinâmicas, lançamentos recorrentes, PWA com suporte offline e persistência local via SQLite.

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js 20+ ou 22+
- npm ou bun

### 2. Instalação e Execução
```bash
# Instalar dependências
npm install

# Iniciar ambiente de desenvolvimento (frontend com HMR)
npm run dev

# Ou construir e rodar a versão de produção
npm run build
npm start
```

---

## 🐳 Deploy no EasyPanel / Docker

O projeto já está 100% configurado para instalação direta no **EasyPanel** ou em qualquer servidor com **Docker**.

### Configurações Rápidas:
- **Build:** `Dockerfile` (multi-stage otimizado com `node:22-bookworm-slim`)
- **Porta:** `3000`
- **Volume Persistente:** Montar um volume em `/app/data` para persistir o banco SQLite (`finanflow.sqlite`)
- **Healthcheck:** Rota `/health` (retorna HTTP 200 OK)

Consulte o guia detalhado em [EASYPANEL.md](./EASYPANEL.md).

---

## 📦 Scripts Disponíveis

- `npm run dev`: Inicia o Vite na porta 3000 com HMR
- `npm run build`: Compila o frontend (`dist/`) e o backend (`dist-server/`)
- `npm start`: Inicia o servidor Express de produção
- `npm run lint`: Validação estática de tipos com TypeScript
