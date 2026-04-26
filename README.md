# Auto HelpDesk (HTML/CSS/JS + Node.js + SQLite)

Projeto de HelpDesk com interface web (HTML/CSS/JS) e backend em Node.js que expõe uma API REST e persiste dados em um banco SQLite.

## Visão geral

- **Página Inicial**: `public/Pagina_Login.html` + `public/Style_Login.css` (login/cadastro, primeira tela em /)
- **HelpDesk**: `public/Pagina_Principal.html` + `public/style.css` (servido em /principal)
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

- `http://localhost:3000` (página de login)

## Estrutura do projeto

```
.
├─ public/
│  ├─ Pagina_Principal.html     # Frontend (consome a API via fetch)
│  └─ style.css                 # Estilos
│  ├─ Pagina_Login.html         # Tela de login/cadastro
│  └─ Style_Login.css          # Estilos do login/cadastro
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
- **`users`**
  - `id` (PK)
  - `username` (unique)
  - `email` (opcional)
  - `password_salt`
  - `password_hash`
  - `created_at`

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

### Auth (Login / Cadastro)

Para autenticação, o backend usa um token assinado (HMAC) e o frontend salva esse token em `localStorage`.

#### Base URL

- **POST** `/api/auth/signup`
- **POST** `/api/auth/login`
- **GET** `/api/auth/me` (retorna o usuário logado via token)

#### Cadastro

- Body JSON:
  - `username` (string, obrigatório)
  - `email` (string, opcional)
  - `password` (string, obrigatório, mínimo 6 caracteres)

Exemplo:

```bash
curl -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"gusttavo","email":"g@exemplo.com","password":"minhSenha123"}'
```

Resposta (exemplo):

```json
{ "token": "....", "username": "gusttavo" }
```

#### Entrar

- Body JSON:
  - `username` (string, obrigatório)
  - `password` (string, obrigatório)

Resposta:

```json
{ "token": "....", "username": "gusttavo" }
```

#### Quem sou eu

Requer header:
- `Authorization: Bearer <token>`

Resposta:

```json
{ "userId": 1, "username": "gusttavo" }
```

### Recuperação de Senha

- Em `Pagina_Login.html`, há agora um botão vermelho com visual consistente (`class="forgot-btn"`) chamado "Esqueceu sua senha?" abaixo do botão "Entrar".
- Ao clicar, é exibido um prompt para inserir o email.
- A implementação atual é de demonstração; o retorno é uma mensagem de confirmação simulada. Para um fluxo completo, crie no backend um endpoint como `POST /api/auth/forgot-password` para enviar link de reset por email.

## Ajustes recentes aplicados

- Rota `/` agora serve `Pagina_Login.html`; rota `/principal` serve `Pagina_Principal.html`.
- `src/server.js` alterado para:
  - `app.get("/", ...)` → `Pagina_Login.html`
  - `app.get("/principal", ...)` → `Pagina_Principal.html`
- Em `Pagina_Login.html`:
  - `brand` foi alterada para `GSM Auto HelpDesk`.
  - Bloco `loggedGreeting` movido para dentro de `header-section` abaixo do cabeçalho.
  - Adicionado botão "Esqueceu sua senha?" (`class="forgot-btn"`) embaixo de "Entrar".
  - `forgotPassword()` adicionada com prompt e alerta de sucesso simulado.
  - Redirecionamento pós-login atualizado para `/principal`.
- Em `Pagina_Principal.html`:
  - Removido link "Entrar" no topo (navegação principal).
  - Nota `protocolWarning` atualizada para apontar para `/principal`.
  - **Adicionada nova seção "Planos"** com 4 planos de preço em um grid responsivo.
- Em `Style_Login.css`:
  - `.forgot-btn` definido com estilo vermelho, borda e hover.
- Em `style.css`:
  - `.logged-greeting-actions .link-btn` e `.ghost-btn` agora são preto sólido com texto branco.
  - Estilos de `.plans-section` adicionados com `.plans-grid`, `.plan-card`, e variações de `.plan-btn-*`.

## Seção de Planos (Plans)

A página principal (`Pagina_Principal.html`) agora inclui uma seção de planos de precificação após a seção de FAQ. São 4 planos diferentes com características personalizadas:

1. **Plano Gratuito**
   - Preço: Grátis
   - Até 5 tickets por mês
   - Suporte por email
   - Prioridade padrão

2. **Plano Plus**
   - Preço: R$ 100/mês
   - Até 50 tickets por mês
   - Suporte por email e chat
   - Prioridade média

3. **Plano Pro** (Mais Popular)
   - Preço: R$ 250/mês
   - Tickets ilimitados
   - Suporte por email, chat e telefone
   - Prioridade alta
   - Relatórios básicos
   - *Este plano tem destaque visual especial com escala ampliada e badge "Mais Popular"*

4. **Plano Premium**
   - Preço: R$ 500/mês
   - Gestor de conta dedicado
   - Relatórios avançados
   - Prioridade máxima
   - Integração com APIs

### Design e Responsividade

- O grid de planos usa `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` para adaptação responsiva.
- O Plano Pro é destacado visualmente com `transform: scale(1.04)`, background roxo levemente mais intenso e badge "Mais Popular".
- Cada card possui:
  - Efeito hover com `transform: translateY(-4px)` para elevação
  - Bordas e fundos semi-transparentes consistentes com a landing page
  - Botões com cores variadas:
    - `.plan-btn-free`: Cinza transparente
    - `.plan-btn-plus`: Roxo suave
    - `.plan-btn-pro`: Gradiente roxo (destaque)
    - `.plan-btn-premium`: Roxo avançado
    - `.plan-btn-ultra`: Roxo intenso com sombra

### Ajustes finais implementados

- **Remoção do Plano Ultra**: O plano de R$ 1000/mês foi removido, deixando 4 planos principais (Gratuito, Plus, Pro, Premium).
- **Restauração da seção Artigos**: A seção "Artigos em Destaque" foi restaurada entre "Categorias" e "Perguntas Frequentes".
- **Remoção de ícones dos artigos**: Os ícones que aparecem antes do título de cada artigo foram removidos na função `renderArticles()`. Agora os artigos exibem apenas: título, resumo e categoria.
- Link "Planos" adicionado à navegação principal para fácil acesso à seção de preços.

## Conexão da API entre as Páginas

O sistema utiliza autenticação baseada em tokens JWT-like para conectar as páginas `Pagina_Login.html` e `Pagina_Principal.html` via a API REST.

### Fluxo de Autenticação

1. **Página de Login (`Pagina_Login.html`)**:
   - O usuário preenche o formulário de login ou cadastro.
   - O JavaScript envia uma requisição POST para `/api/auth/login` ou `/api/auth/signup` com as credenciais.
   - Em caso de sucesso, o token e o username são salvos no `localStorage` do navegador.
   - A página exibe uma mensagem de boas-vindas e um link para "Continuar para o HelpDesk", que redireciona para a página principal (/principal).

2. **Página Principal (`Pagina_Principal.html`)**:
   - Ao carregar, a função `loadUserGreeting()` verifica se existe um token no `localStorage`.
   - Se o token existe, faz uma requisição GET para `/api/auth/me` com o header `Authorization: Bearer <token>` para validar e obter os dados do usuário.
   - Se válido, exibe "Olá: <username>" na barra de navegação.
   - Se inválido ou ausente, o usuário deve acessar a página de login diretamente via URL (/).

### Tratamento de Erros e CORS

- Para evitar erros de CORS ou quando as páginas são abertas diretamente via `file://`, o JavaScript define `API_BASE` como `http://localhost:3000` se o protocolo for `file://`, garantindo que as requisições sempre apontem para o servidor backend.
- Avisos são exibidos nas páginas se detectado abertura via `file://`, orientando o usuário a rodar o servidor.
- Erros de autenticação (token inválido) removem o token do `localStorage` e redirecionam para o estado não logado.

### Segurança

- Tokens são assinados com HMAC usando um segredo configurável via `AUTH_SECRET`.
- O frontend armazena o token no `localStorage`, que persiste entre sessões do navegador.
- Não há exposição de senhas no frontend; apenas hashes são armazenados no banco.

### Variáveis de ambiente (Auth)

- `AUTH_SECRET`: segredo usado para assinar os tokens de autenticação.
  - Se não definido, o projeto usa um valor `dev-secret-change-me` (ideal ajustar antes de produção).

Desenvolvido por Gusttavo Sacco Moreirão
