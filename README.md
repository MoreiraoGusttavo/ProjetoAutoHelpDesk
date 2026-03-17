# Auto HelpDesk (HTML/CSS/JS + Node.js + SQLite)

Projeto de HelpDesk com interface web (HTML/CSS/JS) e backend em Node.js que expõe uma API REST e persiste dados em um banco SQLite.

## Visão geral

- **Frontend**: `public/Pagina_Principal.html` + `public/style.css` (servidos pelo próprio Node/Express)
- **Backend**: `src/server.js` (Express)
- **Banco de dados**: SQLite (`data/helpdesk.sqlite`)
- **Dados carregados do banco**:
  - Categorias
  - Artigos (com filtro por categoria e busca por texto)
  - FAQ
- **Dados gravados no banco**:
  - Tickets enviados pelo formulário (“Enviar Ticket”)

## Requisitos

- **Node.js 18+** (recomendado: 20+)
- npm (vem junto com o Node)

## Como rodar

No diretório do projeto:

```bash
npm install
npm run dev
```

Abra no navegador:

- `http://localhost:3000`

## Estrutura do projeto

```
.
├─ public/
│  ├─ Pagina_Principal.html     # Frontend (consome a API via fetch)
│  └─ style.css                 # Estilos
├─ src/
│  ├─ server.js                 # API + servidor de arquivos estáticos
│  └─ db.js                     # SQLite: conexão, migrations e seed
├─ package.json                 # Dependências e scripts
└─ data/
   └─ helpdesk.sqlite           # Banco (criado automaticamente ao rodar)
```

## Banco de dados (SQLite)

O arquivo é criado automaticamente em `data/helpdesk.sqlite` na primeira execução. Também é feito um **seed** inicial com:

- Categorias (ex.: Início Rápido, Conta e Perfil…)
- Artigos em destaque (3 exemplos)
- FAQ (perguntas iniciais)

### Tabelas

- **`categories`**
  - `id` (PK)
  - `name` (unique)
  - `icon`
  - `featured` (0/1)
- **`articles`**
  - `id` (PK)
  - `title`
  - `excerpt`
  - `icon`
  - `featured` (0/1)
  - `category_id` (FK → `categories.id`)
- **`faqs`**
  - `id` (PK)
  - `question`
  - `answer`
- **`tickets`**
  - `id` (PK)
  - `name`
  - `email`
  - `subject`
  - `message`
  - `created_at` (datetime UTC, default `now`)

## API (REST)

Base URL (local): `http://localhost:3000`

### Healthcheck

- **GET** `/api/health`
  - Resposta: `{ "ok": true }`

### Categorias

- **GET** `/api/categories`
  - Retorna categorias com `articleCount` (quantidade de artigos por categoria)

Exemplo de resposta:

```json
[
  { "id": 1, "name": "Início Rápido", "icon": "🚀", "featured": 0, "articleCount": 1 }
]
```

### Artigos

- **GET** `/api/articles`
  - Query params:
    - `featured=1` → apenas artigos em destaque
    - `category=<nome>` → filtra por nome da categoria
    - `q=<texto>` → busca por texto (título, excerpt e categoria)

Exemplos:

```bash
curl "http://localhost:3000/api/articles?featured=1"
curl "http://localhost:3000/api/articles?category=Conta%20e%20Perfil"
curl "http://localhost:3000/api/articles?q=senha"
```

### FAQ

- **GET** `/api/faqs`

### Tickets

- **POST** `/api/tickets`
  - Body JSON:
    - `name` (string, obrigatório)
    - `email` (string, obrigatório)
    - `subject` (string, obrigatório)
    - `message` (string, obrigatório)

Exemplo:

```bash
curl -X POST "http://localhost:3000/api/tickets" \
  -H "Content-Type: application/json" \
  -d '{"name":"Gusttavo","email":"g@exemplo.com","subject":"account","message":"Preciso de ajuda"}'
```

Resposta:

```json
{ "id": 1 }
```

## Notas de desenvolvimento

- O frontend chama a API usando `fetch()` diretamente (mesma origem), então basta rodar o Node.
- Se quiser adicionar mais dados (artigos/FAQ/categorias), edite o seed em `src/db.js` ou crie novos endpoints para CRUD.

