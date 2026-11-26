# Projeto: Regia & Tinas Care — Plataforma Integrada Pet Shop, Estética & Veterinária

## 1. Arquitetura e Estrutura de Pastas
- **Raiz:** `regia_tinas_care/`
- **Back-end (`home/backend/`):**
  - `app.py`: API RESTful em Python + Flask + CORS, servindo endpoints `/api/...` e arquivos estáticos.
  - `db/neon_db.py`: Conexão com PostgreSQL Serverless no Neon (`executar_query`).
  - `.env`: Variáveis de ambiente (`DATABASE_URL`, `SECRET_KEY`, `PORT`).
- **Front-end (`home/frontend/`):**
  - HTML5, CSS3 modular (`css/`), JavaScript Vanilla ES6+ (`js/`), Bootstrap 5.3 e Bootstrap Icons.
  - `index.html` e `busca.html`: Home e catálogo digital inteligente (consulta de estoque físico por unidade via `geolocator.js`, sem checkout online direto).
  - `usuario/`: `login.html`, `criar_conta.html`, `redefinir_senha.html`, `perfil.html`, `meus_pets.html`, `meus_agendamentos.html`.
  - `servicos/`: `agendamento-fluxo.html`, `servicos.html`, `veterinaria.html`, `hotel.html`, `day_care.html`.
  - `funcionario/`: `dash_funcionario.html`, `operacional_funcionario.html` (Kanban), `prontu_funcionario.html` (Linha do tempo médica).
  - `admin/`: `dashboard.html`, `gestao_agendamentos.html`, `gestao_produtos.html`, `gestao_usuarios.html`.

## 2. Regras Técnicas e Banco de Dados (Neon PostgreSQL)
- **Execução Local:** Back-end Flask na porta `5000` (`http://localhost:5000`) e Live Server na porta `5501`. Produção no Render (`https://regia-tinas.onrender.com`).
- **Banco de Dados:** Tabelas principais em `public`: `perfis`, `funcionarios_detalhes`, `lojas`, `pets`, `produtos`, `estoque_lojas`, `servicos`, `agendamentos`, `horarios_funcionarios`, `prontuarios`.
- **Regras de Query (`neon_db.py`):** `executar_query()` retorna lista de dicionários apenas em `SELECT`. Após `INSERT`/`UPDATE`, realizar um `SELECT` se precisar retornar os dados atualizados.
- **Autenticação & RBAC:**
  - Todo novo cadastro entra como `cliente`. Apenas o Admin promove usuários para `funcionario` ou `admin`.
  - Redirecionamento no `login.js`: `admin` -> `../admin/dashboard.html`; `funcionario` -> `../funcionario/dash_funcionario.html`; `cliente` -> `perfil.html` (ou `url_retorno_agendamento`).
  - Operações críticas do funcionário (fila, baixa de estoque, prontuário) exigem validação de **Assinatura Digital via CPF** (`/api/auth/validar-cpf`).

## 3. Identidade Visual Obrigatória (Proibido layout genérico)
- **Paleta de Cores:**
  - Rosa Principal da Marca: `#FE8697` (hover: `#e57585`)
  - Fundo Suave Rosa: `#fff0f2`
  - Escuro Operacional (Sidebars Funcionário/Admin): `#1e272e`
  - Fundo Geral Claro: `#f4f6f9` / `#f8f9fa`
- **Tipografia:** `'Inknut Antiqua'` (títulos de autenticação), `'Pacifico'` (títulos decorativos da Home) e `'Poppins'` (interface geral, tabelas, formulários e painéis).
- **Componentes e Layout:**
  - Cards arredondados (`border-radius: 15px` a `25px`), botões em pílula (`rounded-pill`), Kanban operacional e modais com cabeçalho escuro (`bg-dark`).
  - Catálogo (`busca.html`): Grade responsiva com **5 colunas no desktop (`row-cols-xl-5`)** e **2 a 3 colunas no mobile (`row-cols-2 row-cols-sm-3`)**.
- **Conflitos de Script:** Nunca redeclarar `const API_BASE_URL` em arquivos `.js` que são importados juntos na mesma página HTML.