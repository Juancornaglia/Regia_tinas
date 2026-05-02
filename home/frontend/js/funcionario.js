/**
 * js/funcionario.js - Painel Operacional da Equipe (Regia & Tinas Care)
 * Responsável por: Fila de trabalho, KPIs diários e Alertas de Saúde.
 */

// 1. CONFIGURAÇÃO DA URL DINÂMICA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener("DOMContentLoaded", async () => {
    
    // 2. A BARREIRA DE SEGURANÇA (A CATRACA)
    // Se você estiver usando módulos ES6, o import no topo está correto.
    // Caso contrário, usamos a verificação direta do localStorage.
    const userId = localStorage.getItem('usuario_id');
    const userRole = localStorage.getItem('usuario_role');
    const userNome = localStorage.getItem('usuario_nome');

    if (!userId || (userRole !== 'funcionario' && userRole !== 'admin')) {
        console.error("Acesso negado: Credenciais insuficientes.");
        alert("Área restrita à equipe operacional.");
        window.location.href = '../usuario/login.html';
        return;
    }

    // 3. INTERFACE INICIAL
    const displayNome = document.getElementById('nome-funcionario');
    const displayCargo = document.getElementById('cargo-display');
    
    if (displayNome) displayNome.textContent = userNome || "Equipe";
    if (displayCargo && userRole === 'admin') {
        displayCargo.textContent = "Visualização de Equipe (Admin)";
        displayCargo.style.color = "#FE8697"; // Tom de rosa da marca
    }

    // 4. CARGA INICIAL DE DADOS REAIS
    carregarKpisOperacionais();
    carregarFilaDeTrabalho();
    carregarAlertasDeVacina();
    
    // 5. LÓGICA DE SAÍDA (LOGOUT)
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Deseja encerrar seu turno e sair do sistema?')) {
            localStorage.clear(); // Limpa TUDO: id, role, nome e tokens
            window.location.href = '../usuario/login.html';
        }
    });
});

// --- FUNÇÕES OPERACIONAIS (CONEXÃO COM BACKEND) ---

async function carregarKpisOperacionais() {
    try {
        // Rota que criamos no app.py para estatísticas rápidas
        const response = await fetch(`${API_BASE_URL}/api/admin/estatisticas-dia`);
        const kpis = await response.json();

        if (response.ok) {
            document.getElementById('kpi-atendimentos').textContent = kpis.total_agendamentos || "0";
            document.getElementById('kpi-daycare').textContent = kpis.pets_no_pátio || "0";
            document.getElementById('kpi-avisos').textContent = kpis.alertas_saude || "0";
        }
    } catch (e) {
        console.warn("Usando valores padrão para KPIs (Servidor offline)");
    }
}

async function carregarFilaDeTrabalho() {
    const tbody = document.getElementById('tabela-fila-trabalho');
    if (!tbody) return;

    try {
        // Busca os agendamentos do dia atual
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        if (!response.ok) throw new Error("Erro ao buscar fila.");

        const agendamentos = await response.json();

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhum serviço agendado para hoje.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => {
            const hora = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <tr>
                    <td class="fw-bold text-dark">${hora}</td>
                    <td>
                        <div class="fw-bold">${ag.nome_pet} (${ag.raca || 'SRD'})</div>
                        <small class="text-muted">Tutor: ${ag.cliente_nome}</small>
                    </td>
                    <td>${ag.nome_servico}</td>
                    <td>
                        <span class="badge ${ag.status === 'confirmado' ? 'bg-warning text-dark' : 'bg-success'} badge-status">
                            ${ag.status === 'confirmado' ? 'Aguardando Pet' : 'Em Andamento'}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-success fw-bold" onclick="iniciarServico('${ag.id_agendamento}')">
                            <i class="bi bi-play-fill me-1"></i>Iniciar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Falha ao carregar fila de trabalho.</td></tr>';
    }
}

async function carregarAlertasDeVacina() {
    const listaAlertas = document.getElementById('lista-alertas-vacinas');
    if (!listaAlertas) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/alertas-vacina`);
        const alertas = await response.json();

        if (alertas.length === 0) {
            listaAlertas.innerHTML = '<li class="list-group-item small text-muted">Nenhum alerta de vacina para esta semana.</li>';
            return;
        }

        listaAlertas.innerHTML = alertas.map(alerta => `
            <li class="list-group-item px-0 bg-transparent border-bottom">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1 fw-bold text-dark">${alerta.nome_pet}</h6>
                    <small class="text-danger fw-bold">${alerta.prazo}</small>
                </div>
                <p class="mb-1 small text-muted">${alerta.vacina} • Tutor: ${alerta.tutor}</p>
            </li>
        `).join('');
    } catch (e) {
        listaAlertas.innerHTML = '<li class="list-group-item small text-danger">Erro ao carregar alertas.</li>';
    }
}

// 6. FUNÇÃO DE AÇÃO: INICIAR SERVIÇO
async function iniciarServico(idAgendamento) {
    if (confirm("Deseja iniciar este atendimento agora?")) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/atualizar-status-pedido/${idAgendamento}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'em_andamento' })
            });

            if (response.ok) {
                carregarFilaDeTrabalho(); // Atualiza a lista na hora
            }
        } catch (e) {
            alert("Erro ao atualizar status.");
        }
    }
}