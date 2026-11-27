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
├── CLAUDE.md                               # Convenções de arquitetura, UI e contratos da API
└── README.md                               # Documentação técnica completa do projeto