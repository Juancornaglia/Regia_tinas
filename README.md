# 🐾 Regia & Tinas Care — Plataforma Integrada de Gestão & Agendamentos Pet

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap_5-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_(Neon)-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![brModelo](https://img.shields.io/badge/brModelo_Web-00599C?style=for-the-badge&logo=databricks&logoColor=white)
![Cypress](https://img.shields.io/badge/Cypress-17202C?style=for-the-badge&logo=cypress&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)

**Plataforma web full-stack desenvolvida ao longo de 2 anos e meio como Trabalho de Conclusão de Curso (TCC) para a empresa real Regia & Tinas Care Banho e Tosa (São Caetano do Sul - SP), integrando agendamentos especializados por categoria, prontuário clínico/estético digital, agenda operacional, catálogo inteligente com geolocalização, arquitetura multi-esquema no PostgreSQL Neon e automação de testes E2E.**

🌐 **Aplicação em Produção:** [regia-tinas.onrender.com](https://regia-tinas.onrender.com/)  
🗄️ **Repositório SQL:** [BANCO_DE_DADOS_FACUL](https://github.com/Juancornaglia/BANCO_DE_DADOS_FACUL)  
📐 **Modelagem de Dados:** [Modelo Conceitual (brModelo)](https://app.brmodeloweb.com/publicview/6afba7cd59bb1e9d0a7dbd46) • [Modelo Lógico (brModelo)](https://app.brmodeloweb.com/publicview/6afba80859bb1e9d0a7dbd5e)

</div>

---

## 📖 Sobre o Projeto & Trajetória de Desenvolvimento (TCC)

O **Regia & Tinas Care** nasceu da necessidade real de digitalizar, organizar e integrar a operação diária de uma empresa verdadeira do setor pet: a **Regia & Tinas Care Banho e Tosa**, com filial ativa em **São Caetano do Sul (SP)**.

O sistema foi concebido, modelado e evoluído de maneira **incremental ao longo de 2 anos e meio** durante a graduação em **Análise e Desenvolvimento de Sistemas (Centro Universitário FAM)**, acompanhando cada semestre letivo:
1. **Levantamento de Requisitos & Modelagem (Semestres Iniciais):** Imersão na rotina real do pet shop, definição das regras de negócio, Diagramas de Casos de Uso e modelagem **Conceitual (MER)** e **Lógica** no **brModelo Web**.
2. **Arquitetura de Banco de Dados em Nuvem:** Implantação relacional no **PostgreSQL (Neon Serverless)** com integridade referencial (`PK` / `FK`), restrições `CHECK`, índices de desempenho, migrações versionadas e divisão entre os esquemas `public` e `neon_auth`.
3. **Back-end & Regras Operacionais:** Desenvolvimento da API RESTful em **Python (Flask)** para controle dinâmico de disponibilidade de agenda, validação de conflitos, prontuário digital, assinatura técnica por CPF e sincronização de solicitações entre tutores e equipe.
4. **Front-end Responsivo (Desktop & App/Mobile):** Construção completa das interfaces em **HTML5, CSS3, Bootstrap 5 e JavaScript (ES6+)** com design system modular, geolocalização de lojas e painéis exclusivos por perfil.
5. **Garantia de Qualidade (QA):** Automação de testes ponta a ponta com **Cypress**, testes híbridos integrados ao PostgreSQL Neon e validação sob critérios da norma **ISO/IEC 25010**.

---

## 🏢 Sobre a Empresa Real — Regia & Tinas Care Banho e Tosa

A **Regia & Tinas Care Banho e Tosa** é uma empresa real referência em estética animal, saúde preventiva e bem-estar pet em **São Caetano do Sul (SP)**, reconhecida com avaliação máxima (**5,0 estrelas**) pelos clientes.

- **Unidade Real (São Caetano do Sul):** R. Luiz Fiorotti, 394 - Olímpico, São Caetano do Sul - SP, 09570-030
- **Contato / WhatsApp:** (11) 97106-1329
- **Serviços Oferecidos:** Banho Simples, Banho Completo, Banho de Ozônio, Tosa (Bebê, Higiênica, Máquina, Tesoura e Trimming), Hidratação, Corte de Unhas, Escovação Dentária, Clínica Veterinária (Consultas, Vacinas e Exames), Hotel Pet, Day Care e Táxi Dog.

---

## 🛠️ Tecnologias & Ferramentas Utilizadas

| Camada | Tecnologias / Ferramentas | Responsabilidade |
| :--- | :--- | :--- |
| **Front-end** | **HTML5, CSS3, Bootstrap 5, JavaScript (ES6+)** | Interfaces responsivas, design system unificado (`site-ui.css` e `internal-mobile.css`), geolocalização no navegador, filtros dinâmicos e proteção de rotas. |
| **Back-end** | **Python 3 + Flask** | API RESTful para regras de negócio, cálculo de slots disponíveis, prevenção de choques de horário, notificações operacionais e servidor estático. |
| **Modelagem de Dados** | **brModelo Web** | Elaboração dos diagramas **Conceitual (MER)** e **Lógico** que guiaram a normalização do banco relacional. |
| **Banco de Dados** | **PostgreSQL (Neon Serverless)** | Persistência multi-esquema (`public` + `neon_auth`), constraints `CHECK`, `UNIQUE`, índices e migrações SQL em `backend/migrations/`. |
| **Autenticação** | **Neon Auth (Better Auth) + Werkzeug** | Login tradicional, **Google OAuth2**, envio e validação de **código OTP de 6 dígitos** para redefinição de senha e assinatura via **CPF**. |
| **Qualidade (QA)** | **Cypress + Node.js v22 + `pg`** | Testes E2E automatizados, limpeza de massa de dados via banco (`cy.task`), simulação de falhas (`cy.intercept`) e *Smoke Tests*. |
| **Versionamento & Deploy** | **GitHub + Render** | Controle de versão e publicação contínua (*Continuous Deployment*) em nuvem. |

---

## 📜 Regras de Negócio do Sistema (20 Regras Fundamentais)

O comportamento da aplicação é governado por **20 regras de negócio** aplicadas entre front-end, API Flask e banco PostgreSQL:

### 🔐 Autenticação, Cadastro & Hierarquia de Funções (RBAC)
1. **RN01 — Perfil Padrão de Auto-Cadastro:** Todo usuário que cria conta publicamente pela interface recebe obrigatoriamente `role = 'cliente'` na tabela `public.perfis`, impedindo escalonamento indevido de privilégios.
2. **RN02 — Promoção Exclusiva pelo Administrador Master:** Somente usuários autenticados com `role = 'admin'` podem promover um `cliente` para `funcionario` ou `admin` na tela de Gestão de Pessoas/RH, exigindo o preenchimento dos dados profissionais em `public.funcionarios_detalhes` / `public.funcionario`.
3. **RN03 — Unicidade de Identificadores Pessoais:** Cada conta exige `email` e `cpf` únicos (`UNIQUE`) na tabela `public.perfis`, bloqueando cadastros duplicados.
4. **RN04 — Sincronização Multi-Esquema (OAuth2 Google):** Ao realizar login via **Google OAuth2** (`neon_auth.user` / `neon_auth.account`), o sistema sincroniza automaticamente o perfil com `public.perfis` via `/api/auth/sync-perfil`, mantendo a mesma governança de papéis.
5. **RN05 — Recuperação de Senha via Código OTP de 6 Dígitos:** A redefinição de senha gera um código numérico de 6 dígitos (`codigo_recuperacao` / `neon_auth.verification`), validado antes da gravação da nova senha criptografada.
6. **RN06 — Segregação de Rotas por Perfil:** O `auth_guard.js` e o `admin_auth.js` bloqueiam o acesso direto por URL: clientes acessam apenas `usuario/*`, funcionários acessam `funcionario/*` e apenas administradores acessam `admin/*`.

### 📅 Serviços, Agendamentos & Disponibilidade
7. **RN07 — Segmentação de Agendamento por Categoria de Serviço:** Cada página especializada (**Banho & Tosa**, **Veterinária**, **Hotel Pet** e **Day Care**) direciona o tutor ao fluxo de agendamento filtrado exclusivamente pela sua categoria (`?categoria=...`), evitando mistura entre serviços clínicos, estéticos e de hospedagem.
8. **RN08 — Vínculo Obrigatório com Tutor, Pet e Unidade:** Nenhum agendamento pode ser concluído sem um tutor autenticado (`id_cliente`), um animal previamente cadastrado (`id_pet`) e uma unidade física ativa (`id_loja`).
9. **RN09 — Prevenção de Conflitos e Cálculo Dinâmico de Horários:** Antes de confirmar uma reserva, o back-end cruza `duracao_media_minutos` do serviço (`public.servicos`), horários de funcionamento da loja (`horario_abertura` / `horario_fechamento`), bloqueios cadastrados (`public.dias_bloqueados`) e reservas ativas em `public.agendamentos` para impedir choques de horário.
10. **RN10 — Máquina de Estados do Atendimento:** Todo agendamento segue o ciclo controlado pela constraint `check_status_agendamento`: `pendente` → `aguardando` → `confirmado` → `em_andamento` → `pronto` → `concluido` (ou `cancelado`).
11. **RN11 — Autoatendimento de Remarcação e Cancelamento pelo Tutor:** Na área *Meus Agendamentos*, o cliente pode visualizar os detalhes completos da reserva (serviço, data, horário, valor, pet e unidade) e solicitar **remarcação**, **alteração de horário** ou **cancelamento**, revalidando disponibilidade no servidor.
12. **RN12 — Notificação Imediata à Equipe Operacional:** Toda solicitação de alteração ou cancelamento feita pelo cliente grava o histórico em `observacoes_cliente` / `motivo_cancelamento` e dispara alertas visuais em tempo real no painel e na fila do funcionário (`appointment_notifications.js`).

### 🩺 Operação, Prontuário Digital & Agenda Interna
13. **RN13 — Assinatura Digital Obrigatória via CPF:** Toda movimentação crítica na fila Kanban, baixa de insumos ou inclusão/edição no prontuário exige a confirmação do **CPF válido do funcionário** responsável, garantindo rastreabilidade e auditoria técnica.
14. **RN14 — Prontuário Histórico Imutável por Registro:** Cada atendimento clínico ou estético registrado em `public.prontuarios` fica vinculado ao animal (`id_pet`), ao profissional (`id_funcionario`), à categoria (`Consulta`, `Vacina`, `Exame`, `Estética`) e ao timestamp (`data_registro`).
15. **RN15 — Agenda Operacional de Lembretes da Equipe:** Funcionários mantêm anotações operacionais próprias em `public.lembretes_funcionario` categorizadas em `cliente_fixo`, `retorno` e `tarefa_interna` (pacientes, hóspedes do Hotel Pet e tarefas do turno).
16. **RN16 — Comunicação Ágil via WhatsApp:** Tanto o painel operacional do funcionário quanto a gestão central do administrador geram links diretos para envio de confirmação e aviso de retirada ao tutor via WhatsApp.

### 🛍️ Catálogo Inteligente, Geolocalização & Estoque por Unidade
17. **RN17 — Vitrine Presencial sem Checkout Online:** O catálogo digital não realiza cobrança online; sua finalidade é informar preços, promoções (`preco_promocional`) e indicar **em qual unidade física** o produto está disponível para retirada ou visita.
18. **RN18 — Ordenação por Proximidade Geográfica:** Quando o tutor autoriza a geolocalização no navegador (`geolocator.js`), o sistema calcula a distância entre o usuário e as coordenadas (`latitude`, `longitude`) das unidades em `public.lojas`, priorizando a loja mais próxima.
19. **RN19 — Controle de Estoque por Loja & Integridade Não-Negativa:** O saldo físico é controlado por unidade na tabela `public.estoque_lojas` (`UNIQUE(id_produto, id_loja)`), protegido pela constraint `quantidade_estoque >= 0` em `public.produtos`.
20. **RN20 — Alerta Preventivo de Estoque Crítico:** Sempre que o saldo de um item atinge ou fica abaixo de `estoque_minimo` (padrão `5` unidades), o Dashboard Executivo do Administrador destaca o item para reposição imediata.

---

## 🗄️ Esquema Completo do Banco de Dados (PostgreSQL Neon)

Toda a base de dados foi projetada no **brModelo Web** e implantada no **PostgreSQL Serverless (Neon)** utilizando separação entre o esquema **`public`** (domínio de negócio) e o esquema **`neon_auth`** (identidade, OAuth2 e sessões):

- 📐 **[Visualizar Modelo Conceitual (MER)](https://app.brmodeloweb.com/publicview/6afba7cd59bb1e9d0a7dbd46)**
- 📐 **[Visualizar Modelo Lógico](https://app.brmodeloweb.com/publicview/6afba80859bb1e9d0a7dbd5e)**
- 💾 **[Scripts SQL & Inserts no GitHub](https://github.com/Juancornaglia/BANCO_DE_DADOS_FACUL)**

```sql
CREATE SCHEMA "public";
CREATE SCHEMA "neon_auth";

-- ============================================================================
-- ESQUEMA PUBLIC — DOMÍNIO DE NEGÓCIO, OPERAÇÃO, ESTOQUE E PRONTUÁRIO
-- ============================================================================

CREATE TABLE "lojas" (
	"id_loja" serial PRIMARY KEY,
	"nome_loja" varchar NOT NULL CONSTRAINT "lojas_nome_loja_key" UNIQUE,
	"cnpj_loja" varchar CONSTRAINT "lojas_cnpj_loja_key" UNIQUE,
	"endereco" text,
	"telefone" varchar,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"ativo" boolean DEFAULT true,
	"horario_abertura" time DEFAULT '09:00:00',
	"horario_fechamento" time DEFAULT '18:00:00'
);

CREATE TABLE "perfis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nome_completo" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "perfis_email_key" UNIQUE,
	"senha" varchar(255) NOT NULL,
	"role" varchar DEFAULT 'cliente' NOT NULL,
	"cpf" varchar CONSTRAINT "perfis_cpf_key" UNIQUE,
	"data_nascimento" date,
	"telefone" varchar,
	"endereco" text,
	"nome_pet" text,
	"especie" varchar,
	"raca" varchar,
	"porte" varchar,
	"data_nascimento_pet" date,
	"observacoes_pet" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"codigo_recuperacao" varchar(6),
	"data_criacao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"pontos_fidelidade" integer DEFAULT 0
);

CREATE TABLE "funcionario" (
	"id_funcionario" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"id_perfil" uuid NOT NULL REFERENCES "perfis"("id"),
	"id_loja" integer REFERENCES "lojas"("id_loja"),
	"nome" varchar NOT NULL,
	"especialidade" varchar,
	"crmv" varchar,
	"salario" numeric(10, 2),
	"data_contratacao" date DEFAULT CURRENT_DATE
);

CREATE TABLE "funcionarios_detalhes" (
	"id_detalhe" serial PRIMARY KEY,
	"id_perfil" uuid CONSTRAINT "funcionarios_detalhes_id_perfil_key" UNIQUE REFERENCES "perfis"("id") ON DELETE CASCADE,
	"funcao_detalhada" varchar(100),
	"data_contratacao" date,
	"salario" numeric(10, 2),
	"especialidade" varchar(100),
	"crmv" varchar(50)
);

CREATE TABLE "horarios_funcionarios" (
	"id_horario" serial PRIMARY KEY,
	"id_funcionario" uuid REFERENCES "perfis"("id") ON DELETE CASCADE,
	"dia_semana" integer NOT NULL,
	"hora_inicio" time DEFAULT '09:00:00' NOT NULL,
	"hora_fim" time DEFAULT '18:00:00' NOT NULL,
	"ativo" boolean DEFAULT true
);

CREATE TABLE "dias_bloqueados" (
	"id_bloqueio" serial PRIMARY KEY,
	"id_loja" integer REFERENCES "lojas"("id_loja"),
	"id_funcionario" uuid REFERENCES "perfis"("id"),
	"data_bloqueada" date NOT NULL,
	"motivo" text
);

CREATE TABLE "lembretes_funcionario" (
	"id_lembrete" bigserial PRIMARY KEY,
	"id_funcionario" uuid NOT NULL REFERENCES "perfis"("id") ON DELETE CASCADE,
	"titulo" varchar(180) NOT NULL,
	"tipo" varchar(30) DEFAULT 'tarefa_interna' NOT NULL,
	"cliente_nome" varchar(160),
	"nome_pet" varchar(120),
	"data_lembrete" date NOT NULL,
	"hora_lembrete" time,
	"descricao" text,
	"concluido" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lembretes_funcionario_tipo_check" CHECK (((tipo)::text = ANY ((ARRAY['cliente_fixo'::character varying, 'retorno'::character varying, 'tarefa_interna'::character varying])::text[])))
);

CREATE TABLE "pets" (
	"id_pet" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"id_tutor" uuid NOT NULL REFERENCES "perfis"("id"),
	"nome_pet" text NOT NULL,
	"especie" varchar,
	"raca" varchar,
	"porte" varchar,
	"data_nascimento" date,
	"observacoes" text,
	"sexo" char(1),
	"peso" numeric(5, 2),
	"castrado" boolean DEFAULT false,
	"temperamento" varchar(50),
	"url_foto" text
);
ALTER TABLE "pets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "servicos" (
	"id_servico" serial PRIMARY KEY,
	"nome_servico" varchar NOT NULL CONSTRAINT "servicos_nome_servico_key" UNIQUE,
	"descricao" text,
	"duracao_media_minutos" integer,
	"preco_servico" numeric NOT NULL,
	"ativo" boolean DEFAULT true,
	"categoria" varchar(50) DEFAULT 'Geral',
	"url_imagem" text
);

CREATE TABLE "agendamentos" (
	"id_agendamento" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"id_cliente" uuid NOT NULL REFERENCES "perfis"("id"),
	"id_pet" bigint NOT NULL,
	"id_loja" integer NOT NULL,
	"id_servico" integer NOT NULL,
	"data_hora_inicio" timestamp with time zone NOT NULL,
	"data_hora_fim" timestamp with time zone,
	"status" varchar DEFAULT 'pendente' NOT NULL,
	"observacoes_cliente" text,
	"data_criacao" timestamp DEFAULT now(),
	"id_funcionario" uuid,
	"ativo" boolean DEFAULT true NOT NULL,
	"valor_cobrado" numeric DEFAULT '0.00' NOT NULL,
	"nota_avaliacao" integer,
	"comentario_avaliacao" text,
	"motivo_cancelamento" text,
	CONSTRAINT "agendamentos_nota_avaliacao_check" CHECK (((nota_avaliacao >= 1) AND (nota_avaliacao <= 5))),
	CONSTRAINT "check_status_agendamento" CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'aguardando'::character varying, 'confirmado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying, 'pronto'::character varying, 'cancelado'::character varying])::text[])))
);

CREATE TABLE "prontuarios" (
	"id_prontuario" serial PRIMARY KEY,
	"id_pet" bigint REFERENCES "pets"("id_pet") ON DELETE CASCADE,
	"id_funcionario" uuid REFERENCES "perfis"("id"),
	"categoria" varchar(50) DEFAULT 'Consulta',
	"titulo" varchar(150),
	"descricao" text,
	"data_registro" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "fornecedores" (
	"id_fornecedor" serial PRIMARY KEY,
	"nome_empresa" varchar(255) NOT NULL,
	"cnpj" varchar(20) CONSTRAINT "fornecedores_cnpj_key" UNIQUE,
	"contato_fornecedor" varchar(255),
	"telefone" varchar(20),
	"email" varchar(255),
	"data_cadastro" timestamp DEFAULT now()
);

CREATE TABLE "produtos" (
	"id_produto" integer PRIMARY KEY,
	"nome_produto" varchar NOT NULL,
	"url_imagem" text,
	"tipo_produto" varchar,
	"subcategoria" varchar,
	"marca" varchar,
	"fabricante" varchar,
	"descricao" text,
	"cor" varchar,
	"tamanho_medida" varchar,
	"preco" numeric DEFAULT '0.00' NOT NULL,
	"preco_promocional" numeric,
	"data_fabricacao" date,
	"data_validade" date,
	"quantidade_estoque" integer DEFAULT 0 NOT NULL,
	"status_produto" varchar,
	"data_cadastro" timestamp with time zone DEFAULT now(),
	"data_atualizacao" timestamp with time zone,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"id_modificado_por" uuid,
	"estoque_minimo" integer DEFAULT 5,
	"nome_fornecedor" varchar,
	"contato_fornecedor" varchar,
	"sku" varchar(50) CONSTRAINT "produtos_sku_key" UNIQUE,
	"id_fornecedor" integer REFERENCES "fornecedores"("id_fornecedor"),
	CONSTRAINT "produtos_quantidade_estoque_check" CHECK ((quantidade_estoque >= 0))
);

CREATE TABLE "estoque_lojas" (
	"id_estoque" serial PRIMARY KEY,
	"id_produto" integer REFERENCES "produtos"("id_produto") ON DELETE CASCADE,
	"id_loja" integer REFERENCES "lojas"("id_loja") ON DELETE CASCADE,
	"quantidade" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "estoque_lojas_id_produto_id_loja_key" UNIQUE("id_produto","id_loja")
);

-- ============================================================================
-- ESQUEMA NEON_AUTH — IDENTIDADE, OAUTH2 GOOGLE, SESSÕES E VERIFICAÇÃO OTP
-- ============================================================================

CREATE TABLE "neon_auth"."user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "user_email_key" UNIQUE,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"role" text,
	"banned" boolean,
	"banReason" text,
	"banExpires" timestamp with time zone
);

CREATE TABLE "neon_auth"."account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" uuid NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE "neon_auth"."session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL CONSTRAINT "session_token_key" UNIQUE,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" uuid NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
	"impersonatedBy" text,
	"activeOrganizationId" text
);

CREATE TABLE "neon_auth"."verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "neon_auth"."jwks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"publicKey" text NOT NULL,
	"privateKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"expiresAt" timestamp with time zone,
	"alg" text,
	"crv" text
);

CREATE TABLE "neon_auth"."organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL CONSTRAINT "organization_slug_key" UNIQUE,
	"logo" text,
	"createdAt" timestamp with time zone NOT NULL,
	"metadata" text
);

CREATE TABLE "neon_auth"."member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" uuid NOT NULL REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE,
	"userId" uuid NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
	"role" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);

CREATE TABLE "neon_auth"."invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" uuid NOT NULL REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"inviterId" uuid NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE
);

CREATE TABLE "neon_auth"."project_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"endpoint_id" text NOT NULL CONSTRAINT "project_config_endpoint_id_key" UNIQUE,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"trusted_origins" jsonb NOT NULL,
	"social_providers" jsonb NOT NULL,
	"email_provider" jsonb,
	"email_and_password" jsonb,
	"allow_localhost" boolean NOT NULL,
	"plugin_configs" jsonb,
	"webhook_config" jsonb,
	"auth_logs_export_enabled" boolean
);
regia_tinas_care/
├── home/
│   ├── backend/                            # Camada de Servidor & Persistência (Python + Flask)
│   │   ├── db/
│   │   │   └── neon_db.py                  # Pool de conexões e queries parametrizadas (PostgreSQL Neon)
│   │   ├── migrations/                     # Scripts SQL de migração e evolução do esquema Neon
│   │   ├── app.py                          # API RESTful Flask, regras de negócio e servidor estático
│   │   └── requirements.txt                # Dependências Python (Flask, psycopg2, Werkzeug, CORS)
│   └── frontend/                           # Camada de Apresentação & Experiência do Usuário
│       ├── admin/                          # Categoria: Painel Executivo (Admin Master)
│       │   ├── dashboard.html              # KPIs financeiros, gráficos e alertas de estoque crítico
│       │   ├── gestao_agendamentos.html    # Gestão central de todas as reservas da rede
│       │   ├── gestao_horarios.html        # Configuração de grade e disponibilidade de atendimento
│       │   ├── gestao_produtos.html        # Cadastro, edição e reposição de estoque No-Code
│       │   ├── gestao_usuarios.html        # Gestão de Pessoas / RH e promoção de cargos (RBAC)
│       │   ├── operacional_atendimento.html# Monitoramento administrativo da fila de atendimento
│       │   └── prontuarios.html            # Consulta consolidada dos prontuários da clínica
│       ├── funcionario/                    # Categoria: Painel Operacional da Equipe
│       │   ├── dash_funcionario.html       # Resumo do turno, alertas de clientes e calendário visual
│       │   ├── escala_funcionario.html     # Calendário operacional e lembretes de pacientes/hotel
│       │   ├── operacional_funcionario.html# Quadro Kanban em tempo real e validação por CPF
│       │   └── prontu_funcionario.html     # Prontuário digital expansível e timeline clínica
│       ├── usuario/                        # Categoria: Jornada do Cliente (Tutor)
│       │   ├── criar_conta.html            # Cadastro de novo tutor (perfil padrão: cliente)
│       │   ├── login.html                  # Login tradicional e Google OAuth2 (Neon Auth)
│       │   ├── meus_agendamentos.html      # Cards expansíveis de reservas, remarcação e cancelamento
│       │   ├── meus_pets.html              # Cadastro e ficha de saúde/alergias dos pets
│       │   ├── perfil.html                 # Dados cadastrais do tutor
│       │   └── redefinir_senha.html        # Recuperação de senha com código OTP de 6 dígitos
│       ├── servicos/                       # Categoria: Serviços Especializados & Reserva
│       │   ├── agendamento-fluxo.html      # Fluxo de agendamento em etapas filtrado por categoria
│       │   ├── day_care.html               # Página de Day Care com valores e reserva direta
│       │   ├── hotel.html                  # Página de Hotel Pet com valores e reserva direta
│       │   ├── servicos.html               # Página de Banho & Tosa com tabela de serviços
│       │   └── veterinaria.html            # Página de Clínica Veterinária (Consultas, Vacinas, Exames)
│       ├── paginas_institucionais/         # Categoria: Institucional & Unidades
│       │   ├── contatos.html               # Canais de atendimento, WhatsApp e localização
│       │   ├── lojas.html                  # Unidades da franquia (Filial São Caetano do Sul)
│       │   └── sobre.html                  # História, valores e identidade Regia & Tinas Care
│       ├── css/                            # Design System & Responsividade Modular
│       │   ├── agendamento.css             # Layout das etapas e seletor de horários
│       │   ├── auth.css                    # Telas de login, cadastro e recuperação de senha
│       │   ├── home.css                    # Vitrines, carrossel, menu gaveta e mapa
│       │   ├── internal-mobile.css         # Responsividade dedicada para painéis internos
│       │   └── site-ui.css                 # Padrões globais de cabeçalhos, botões e cards
│       ├── js/                             # Lógica Front-end, Regras & Integração API
│       │   ├── admin_*.js                  # Módulos do painel Master (agendamentos, dashboard, horários, produtos)
│       │   ├── agendamento.js              # Motor de agendamento por categoria e disponibilidade
│       │   ├── appointment_notifications.js# Alertas em tempo real de alterações do cliente para equipe
│       │   ├── auth_guard.js               # Controle de acesso baseado em papéis (RBAC)
│       │   ├── busca.js                    # Pesquisa, ordenação e filtros responsivos do catálogo
│       │   ├── dash_funcionario.js         # Métricas do turno, assinatura CPF e calendário visual
│       │   ├── escala_funcionario.js       # CRUD de lembretes e agenda operacional do funcionário
│       │   ├── geolocator.js               # Geolocalização HTML5 e seleção da unidade mais próxima
│       │   ├── gestao_usuarios.js          # Listagem de perfis e promoção de funcionários/admins
│       │   ├── home.js                     # Carregamento dinâmico da Home e menu lateral
│       │   ├── internal_mobile_menu.js     # Navegação mobile dos painéis interno e administrativo
│       │   ├── login.js / criar_conta.js   # Autenticação Neon Auth, Google OAuth2 e sync-perfil
│       │   ├── loja.js                     # Consulta de disponibilidade presencial por unidade
│       │   ├── meus_agendamentos.js        # Expansão de cards, remarcação e cancelamento pelo tutor
│       │   ├── meus_pets.js / perfil.js    # Gestão de animais e dados cadastrais do tutor
│       │   ├── operacional_funcionario.js  # Quadro Kanban em tempo real e notificações WhatsApp
│       │   ├── prontu_funcionario.js       # Busca de pets, timeline médica e assinatura via CPF
│       │   ├── redefinir_senha.js          # Envio e validação do código OTP de 6 dígitos
│       │   ├── service-pricing.js          # Sincronização de preços dos serviços com a API ativa
│       │   ├── site_navigation.js          # Navegação sequencial e controle inteligente de retorno
│       │   └── utils.js                    # Formatadores (CPF, moeda, datas) e utilitários globais
│       ├── img/                            # Logotipos, banners e ativos visuais da marca
│       ├── videos/                         # Vídeos institucionais e demonstrações de cuidados
│       ├── busca.html                      # Catálogo digital com consulta de estoque nas lojas
│       └── index.html                      # Página inicial da plataforma
└── README.md                               # Documentação técnica completa do projeto