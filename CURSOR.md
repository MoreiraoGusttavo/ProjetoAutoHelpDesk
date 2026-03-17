# CURSOR.md

Este arquivo registra **todas as alterações feitas neste projeto usando Cursor** durante esta sessão.

## 1) Ajustes de layout e componentes (frontend)

### 1.1 Espaçamento entre borda e conteúdo do card de artigo
- **Motivo**: criar “respiro” entre a borda do card e o conteúdo.
- **Alteração**: aumentei o `padding` do card.
- **Arquivo**: `style.css`
  - `.article-card`: `padding` de `30px` → `40px`

### 1.2 “Artigos em Destaque” padronizado para ficar igual às outras seções
- **Motivo**: a seção estava com classes/estrutura diferentes, não casava com o CSS existente.
- **Alterações (HTML)**:
  - **Arquivo**: `Pagina_Principal.html`
  - Troquei wrapper antigo por:
    - `div.articles-section`
    - `div.articles-grid`
  - Cada artigo passou a ser **um único** `div.article-card` contendo:
    - `div.article-icon`
    - `div.article-title`
    - `div.article-excerpt`
    - `div.article-category`
- **Alterações (CSS)**:
  - **Arquivo**: `style.css`
  - `.articles-section` padding ajustado para padronizar com outras seções: `50px 40px`
  - `.article-card`: removi regras conflitantes (havia `border` definido e depois `border: none`)
  - `.article-category`: removi margens laterais e adicionei `margin-top: 12px` para espaçar do texto.

## 2) Integração com banco de dados (SQLite) + API (Node/Express)

### 2.1 Inicialização do projeto Node
- **Arquivo criado**: `package.json`
  - Dependências:
    - `express`
    - `cors`
    - `better-sqlite3`
  - Scripts:
    - `npm run dev` (inicia `node server.js`)

### 2.2 Banco SQLite (migrations + seed)
- **Arquivo criado**: `db.js`
- **Banco criado automaticamente** em: `data/helpdesk.sqlite`
- **Tabelas**:
  - `categories`
  - `articles`
  - `faqs`
  - `tickets`
- **Seed inicial**:
  - Categorias base (com ícones e flag featured)
  - 3 artigos em destaque
  - FAQs iniciais

### 2.3 Servidor e endpoints da API
- **Arquivo criado**: `server.js`
- **Servidor**:
  - Serve arquivos estáticos do diretório do projeto
  - Rota `/` retorna `Pagina_Principal.html`
- **Endpoints**:
  - `GET /api/health`
  - `GET /api/categories`
  - `GET /api/articles` (suporta `featured=1`, `category=<nome>`, `q=<texto>`)
  - `GET /api/faqs`
  - `POST /api/tickets` (salva ticket no SQLite)

## 3) Frontend consumindo API e gravando tickets

### 3.1 Renderização dinâmica (DB → HTML)
- **Arquivo alterado**: `Pagina_Principal.html`
- Substituí conteúdo “hardcoded” por containers:
  - `#categoriesGrid` (`.categories-grid`)
  - `#articlesGrid` (`.articles-grid`)
  - `#faqList` (`.faq-list`)
- Adicionei funções no JS:
  - `apiGet`, `apiPost`
  - `renderCategories`, `renderArticles`, `renderFaqs`
  - `loadInitialData` (carrega categorias, artigos em destaque e FAQs)

### 3.2 Formulário “Enviar Ticket” gravando no banco
- **Arquivo alterado**: `Pagina_Principal.html`
- O submit do formulário agora faz:
  - `POST /api/tickets` com `{ name, email, subject, message }`
  - Mostra alert de sucesso/erro

### 3.3 Busca integrada (frontend + API)
- **Arquivo alterado**: `Pagina_Principal.html`
- `performSearch()` passou a:
  - Consultar `GET /api/articles?q=...` (busca no backend para artigos)
  - Filtrar categorias/FAQ no front (rápido e simples)
  - Mostrar/ocultar seções conforme resultado

### 3.4 Filtro por categoria via API
- **Arquivo alterado**: `Pagina_Principal.html`
- `filterByCategory(category)` passou a:
  - Consultar `GET /api/articles?category=...`
  - Re-renderizar a grid de artigos e rolar até a seção

## 4) Correções para Chrome (itens “sumindo”) e erro 404 na busca

### 4.1 Layout responsivo para evitar corte por padding fixo
- **Motivo**: `padding` fixo grande no `body` pode causar sensação de “não mostra tudo” em telas menores.
- **Arquivo alterado**: `style.css`
  - `min-height: 130vh` → `100vh`
  - `padding: 120px` → `padding: clamp(16px, 5vw, 120px)`
  - `body` passou a centralizar o conteúdo:
    - `display: flex; justify-content: center;`
  - `.container` recebeu `margin: 0 auto`

### 4.2 Aviso quando abrir via `file://`
- **Motivo**: abrindo como arquivo, o frontend não consegue acessar corretamente a API (e/ou o usuário não está rodando o backend).
- **Arquivo alterado**: `Pagina_Principal.html`
  - Adicionei um banner `#protocolWarning` (exibe se `window.location.protocol === 'file:'`)

### 4.3 Fix do erro: `Erro na busca: GET /api/categories falhou: 404`
- **Causa típica**: abrir via Live Server/porta diferente de `3000`, então `/api/...` aponta para o servidor errado.
- **Arquivo alterado**: `Pagina_Principal.html`
  - `API_BASE` agora é automático:
    - Se `file://` **ou** `port !== 3000` → usa `http://localhost:3000`
    - Se estiver em `http://localhost:3000` → usa `''` (mesma origem)

## 5) Documentação do projeto

### README padrão
- **Arquivo criado**: `README.md`
- Conteúdo:
  - como instalar (`npm install`) e rodar (`npm run dev`)
  - estrutura de pastas
  - schema do banco
  - endpoints da API com exemplos de `curl`

## 6) Como testar rápido

1. Instalar dependências:

```bash
npm install
```

2. Rodar o servidor:

```bash
npm run dev
```

3. Abrir no navegador:
- `http://localhost:3000`

4. Validar:
- Categorias/Artigos/FAQ carregando automaticamente
- Busca funcionando
- Envio de ticket funcionando (gera `id` via API e grava no SQLite)

