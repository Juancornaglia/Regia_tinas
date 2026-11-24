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

**Plataforma web full-stack desenvolvida para a franquia Regia & Tinas Care Banho e Tosa, integrando agendamentos online, prontuário clínico/estético digital, gestão de estoque por unidade, modelagem relacional e automação de testes E2E.**

🌐 **Aplicação em Produção:** [regia-tinas.onrender.com](https://regia-tinas.onrender.com/)  
🗄️ **Repositório SQL:** [BANCO_DE_DADOS_FACUL](https://github.com/Juancornaglia/BANCO_DE_DADOS_FACUL)  
📐 **Modelagem de Dados:** [Modelo Conceitual (brModelo)](https://app.brmodeloweb.com/publicview/6afba7cd59bb1e9d0a7dbd46) • [Modelo Lógico (brModelo)](https://app.brmodeloweb.com/publicview/6afba80859bb1e9d0a7dbd5e)

</div>

---

## 🏢 Sobre a Empresa — Regia & Tinas Care Banho e Tosa

A **Regia & Tinas Care Banho e Tosa** é referência em cuidados e bem-estar animal em São Caetano do Sul (SP), reconhecida com avaliação máxima (**5,0 estrelas**) pelos tutores. A empresa oferece atendimento personalizado para cada raça e temperamento, unindo estética pet, saúde clínica e recreação em um ambiente limpo, seguro e acolhedor.

- **Unidade Matriz:** R. Luiz Fiorotti, 394 - Olímpico, São Caetano do Sul - SP, 09570-030
- **Contato / WhatsApp:** (11) 97106-1329
- **Serviços:** Banho Simples, Banho Completo, Banho de Ozônio, Tosa (Bebê, Máquina, Tesoura e Trimming), Hidratação, Corte de Unhas, Escovação Dentária, Clínica Veterinária, Hotel Pet, Day Care e Táxi Dog.

---

## 🛠️ Tecnologias & Ferramentas Utilizadas

| Camada | Tecnologias / Ferramentas | Responsabilidade |
| :--- | :--- | :--- |
| **Front-end** | **HTML5, CSS3, Bootstrap 5, JavaScript (ES6+)** | Interfaces responsivas, vitrines dinâmicas, geolocalização no navegador, filtros em tempo real e proteção de rotas. |
| **Back-end** | **Python 3 + Flask** | API RESTful para regras de negócio, cálculo dinâmico de horários disponíveis, sanitização de dados e servidor estático. |
| **Modelagem de Dados** | **brModelo Web** | Construção dos diagramas **Conceitual (MER)** e **Lógico** que guiaram a normalização e os relacionamentos do sistema. |
| **Banco de Dados** | **PostgreSQL (Neon Serverless)** | Persistência relacional com integridade referencial (`foreign keys`), controle de perfis, estoque por polo e prontuário. |
| **Autenticação** | **Neon Auth + Werkzeug Security** | Login tradicional, login social via **Google OAuth2**, tokens temporários de redefinição de senha e assinatura via **CPF**. |
| **Qualidade (QA)** | **Cypress + Node.js v22 + `pg`** | Automação de testes E2E, testes híbridos UI + API + Banco, simulação de falhas (`cy.intercept`) e *Smoke Tests*. |
| **Versionamento & Deploy** | **GitHub + Render** | Controle de versão e publicação contínua (*Continuous Deployment*) em nuvem[cite: 9]. |

---

## 📍 Geolocalização & Catálogo Inteligente (Consulta Presencial)

Diferente de um e-commerce convencional com carrinho e pagamento online, o catálogo digital do **Regia & Tinas Care** atua como uma **vitrine conectada ao estoque físico das lojas da rede**:

1. **Identificação da Unidade Mais Próxima (`geolocator.js`):** Ao ativar a geolocalização no navegador (ou selecionar manualmente na barra superior), o sistema identifica qual unidade da franquia está mais próxima do tutor.
2. **Busca e Filtros em Tempo Real (`busca.html`):** Pesquisa instantânea por nome do item e filtros combinados por **Categoria**, **Marca** e **Faixa de Preço**.
3. **Disponibilidade por Loja Física:** Ao abrir os detalhes de um produto, em vez de concluir uma compra online, o cliente visualiza **qual unidade mais próxima possui o item em estoque**, incentivando a visita ou retirada presencial.

---

## 👥 Perfis de Acesso & Fluxos do Sistema

Por regra de segurança, **todo novo cadastro realizado no site recebe automaticamente o perfil de `cliente`**[cite: 9]. A promoção de clientes para `funcionario` ou `admin` é controlada exclusivamente pelo Painel Administrativo[cite: 9].

### 1. 🐶 Fluxo do Cliente (Tutor)
- **Cadastro & Perfil (`usuario/criar_conta.html` / `perfil.html`):** Criação de conta via formulário ou Google OAuth2, com gestão dos dados do tutor[cite: 9].
- **Gestão de Pets (`usuario/meus_pets.html`):** Cadastro completo dos animais contendo nome, espécie, raça, porte/tamanho, cor, idade, peso e observações de saúde/alergias[cite: 9].
- **Exploração da Franquia:** Consulta às unidades da rede (`paginas_institucionais/lojas.html`), tabela de serviços (*Nosso Menu*), galeria de *Antes e Depois* e canais de contato[cite: 9].
- **Agendamento Online (`servicos/agendamento-fluxo.html`):** Marcação integrada cruzando horários livres da equipe para[cite: 9]:
  - 🛁 **Banho & Tosa** | 🩺 **Veterinária (Consultas e Vacinas)** | 🏨 **Hotel Pet** | 🎉 **Day Care**[cite: 9]
- **Meus Agendamentos (`usuario/meus_agendamentos.html`):** Acompanhamento de reservas futuras, histórico de serviços e opção de cancelamento[cite: 9].

### 2. ✂️ Fluxo do Funcionário (Painel Operacional)
Usuários com cargo `funcionario` são redirecionados após o login para `funcionario/dash_funcionario.html`[cite: 9]:
- **Dashboard do Turno (`dash_funcionario.html`):** Resumo consolidado dos atendimentos do dia (*Aguardando*, *Em Curso* e *Finalizados*) e atalhos operacionais[cite: 9].
- **Fila de Atendimento Kanban (`operacional_funcionario.html`):** Quadro visual em tempo real (*Aguardando* → *Em Atendimento* → *Pronto para Saída*), com movimentação de cards, edição/cancelamento rápido e notificação ao tutor via **WhatsApp**[cite: 9].
- **Prontuário Digital (`prontu_funcionario.html`):** Busca por nome do pet ou CPF do tutor exibindo a ficha completa do animal (porte, cor, raça, alergias) e linha do tempo clínica/estética para registro de consultas, vacinas, exames e cirurgias[cite: 9].
- **Uso de Materiais & Baixa de Estoque:** Registro de insumos consumidos no atendimento com abatimento automático no estoque da unidade[cite: 9].
- **Assinatura Digital via CPF:** Toda alteração crítica na fila, baixa de estoque ou inclusão no prontuário exige a validação do **CPF do funcionário**, garantindo auditoria e rastreabilidade[cite: 9].

### 3. 🛡️ Fluxo do Administrador Master (Gestão Executiva)
Usuários com cargo `admin` acessam o painel `admin/dashboard.html`[cite: 9]:
- **Dashboard Executivo (`dashboard.html`):** Indicadores financeiros (receita do dia, agendamentos, pets no hotel, clientes novos), gráficos mensais de receitas/despesas e alertas de **estoque crítico**[cite: 9].
- **Gestão Central de Agendamentos (`gestao_agendamentos.html`):** Visão global de todas as reservas com filtros por status, serviço e profissional, conclusão/cancelamento e disparo de confirmação via WhatsApp[cite: 9].
- **Escalas e Bloqueio de Folgas (`admin_horarios.js`):** Configuração da jornada semanal por profissional e bloqueio de datas/ausências que refletem imediatamente na agenda pública[cite: 9].
- **Gestão de Produtos & Estoque *No-Code* (`gestao_produtos.html`):** Cadastro, edição (*update*), exclusão e reposição de estoque diretamente pela interface (link da imagem, nome, categoria, marca, descrição, preço e quantidade), sem necessidade de alterar código[cite: 9].
- **Gestão de Pessoas / RH (`gestao_usuarios.html`):** Listagem de todos os usuários do sistema, permitindo **promover clientes a funcionários ou administradores** e registrar cargo detalhado, especialidade, CRMV, data de contratação e salário[cite: 9].

---

## 🗄️ Modelagem & Estrutura do Banco de Dados (brModelo + PostgreSQL)

Toda a arquitetura de dados foi projetada previamente utilizando o **brModelo Web** antes da implementação física no **PostgreSQL (Neon)**[cite: 9]:

- 📐 **[Visualizar Modelo Conceitual (MER)](https://app.brmodeloweb.com/publicview/6afba7cd59bb1e9d0a7dbd46)** — Entidades, atributos e cardinalidades do domínio pet.
- 📐 **[Visualizar Modelo Lógico](https://app.brmodeloweb.com/publicview/6afba80859bb1e9d0a7dbd5e)** — Tabelas normalizadas, chaves primárias (`PK`) e chaves estrangeiras (`FK`).
- 💾 **[Scripts SQL & Inserts no GitHub](https://github.com/Juancornaglia/BANCO_DE_DADOS_FACUL)**

### Principais Tabelas Relacionais
- `public.perfis`: Armazena todos os usuários (`id`, `nome_completo`, `email`, `cpf`, `endereco`, `telefone`, `role` — `cliente`, `funcionario` ou `admin`).
- `public.funcionarios_detalhes`: Estende os perfis promovidos a funcionários (`id_perfil`, `funcao_detalhada`, `data_contratacao`, `salario`, `especialidade`, `crmv`).
- `public.lojas`: Cadastro das unidades da franquia (`id_loja`, `nome_loja`, `cnpj_loja`, `endereco`, `telefone`, coordenadas).
- `public.pets`: Ficha completa dos animais vinculados aos tutores (nome, espécie, raça, porte, cor, idade, peso, alergias)[cite: 9].
- `public.produtos` & `public.estoque_lojas`: Catálogo de produtos (imagem, nome, descrição, preço) e saldo disponível por unidade[cite: 9].
- `public.servicos`, `public.agendamentos` & `public.horarios_funcionarios`: Regras de disponibilidade, bloqueios de agenda e reservas confirmadas[cite: 9].
- `public.prontuarios` / `public.historico_pet`: Linha do tempo clínica e estética assinada pelos profissionais[cite: 9].

---

## 🧪 Garantia de Qualidade (QA) & Automação E2E com Cypress

O projeto conta com uma suíte de testes automatizados desenvolvida em **Cypress (Node.js v22)** estruturada para validar fluxos críticos, resiliência de infraestrutura e integridade de banco de dados[cite: 9]:

### Estratégias e Suítes Implementadas
- **Resiliência & *Cold Start* (Render):** Como a hospedagem gratuita entra em hibernação após inatividade, foi implementado o comando customizado `cy.acordarServidor()` via `cy.request()` com *timeout* estendido, evitando falhas falsas e eliminando esperas fixas (`cy.wait`)[cite: 9].
- **Testes Híbridos (UI + API + PostgreSQL Neon):** Uso de `cy.task()` conectado ao banco Neon via driver `pg` para preparação e limpeza automática de massa de dados antes dos testes, garantindo **idempotência** nas execuções[cite: 9].
- **Testes de Contrato e Simulação de Falhas (`cy.intercept`):** Interceptação de rotas REST (`/api/produtos`, `/api/horarios-disponiveis`, `/api/auth/sync-perfil`) para validar status HTTP (`200`, `400`, `500`), comportamento de *spinners* e mensagens amigáveis em caso de queda do servidor[cite: 9].
- **Cobertura de Fluxos Críticos (E2E):**
  - **Autenticação & RBAC:** Validação de login multi-perfil (Cliente, Funcionário e Admin) e bloqueio de acesso não autorizado às rotas administrativas[cite: 9].
  - **Catálogo & Geolocalização:** Troca de unidade/loja e filtragem de produtos em estoque[cite: 9].
  - **Ciclo Completo de Atendimento:** Agendamento pelo cliente → promoção/gestão pelo Admin → movimentação na fila Kanban e assinatura por CPF no prontuário pelo Funcionário[cite: 9].

### Ambiente Isolado de Testes (Porta `5001`)
Para executar testes locais sem interferir no ambiente principal (`5000`) ou em produção, o back-end suporta inicialização isolada via variável de ambiente[cite: 9]:
```powershell
# Terminal 1 — Sobe o Flask + Front-end na porta 5001
cd home/backend
.\venv\Scripts\Activate.ps1
$env:PORT=5001; python app.py

# Terminal 2 — Executa o Cypress apontando para http://localhost:5001
npx cypress open