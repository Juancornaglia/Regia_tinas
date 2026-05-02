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
    const displayData = document.getElementById('data-atual');
    
    if (displayNome) displayNome.textContent = userNome || "Equipe";
    if (displayData) displayData.innerText = new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' });

    if (displayCargo && userRole === 'admin') {
        displayCargo.textContent = "Visualização de Equipe (Admin)";
        displayCargo.style.color = "#FE8697"; 
    }

    // 4. CARGA INICIAL DE DADOS REAIS
    carregarKpisOperacionais();
    carregarFilaDeTrabalho();
    carregarAlertasDeVacina();
    
    // 5. LÓGICA DE SAÍDA (LOGOUT)
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Deseja encerrar seu turno e sair do sistema?')) {
            localStorage.clear(); 
            window.location.href = '../usuario/login.html';
        }
    });
});

// --- FUNÇÕES OPERACIONAIS ---

async function carregarKpisOperacionais() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/estatisticas-dia`);
        const kpis = await response.json();

        if (response.ok) {
            document.getElementById('kpi-atendimentos').textContent = kpis.total_agendamentos || "0";
            document.getElementById('kpi-em-andamento').textContent = kpis.em_servico || "0";
            document.getElementById('kpi-avisos').textContent = kpis.alertas_saude || "0";
        }
    } catch (e) {
        console.warn("Usando valores padrão para KPIs");
    }
}

async function carregarFilaDeTrabalho() {
    const tbody = document.getElementById('tabela-fila-trabalho');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        if (!response.ok) throw new Error("Erro ao buscar fila.");

        const agendamentos = await response.json();

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhum serviço agendado para hoje.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => {
            const hora = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Lógica de Status: 'confirmado' (ou 'pago') vs 'em_andamento'
            const isAguardando = (ag.status === 'confirmado' || ag.status === 'pago');
            
            return `
                <tr>
                    <td class="fw-bold text-dark">${hora}</td>
                    <td>
                        <div class="fw-bold">${ag.nome_pet} <small class="text-muted">(${ag.raca || 'SRD'})</small></div>
                        <small class="text-muted">Tutor: ${ag.cliente_nome}</small>
                    </td>
                    <td><span class="badge bg-light text-dark border">${ag.nome_servico}</span></td>
                    <td>
                        <span class="badge ${isAguardando ? 'bg-warning text-dark' : 'bg-info'} badge-status">
                            ${isAguardando ? 'Aguardando Pet' : 'Em Serviço'}
                        </span>
                    </td>
                    <td class="text-end">
                        ${isAguardando ? 
                            `<button class="btn btn-sm btn-success fw-bold" onclick="iniciarServico('${ag.id_agendamento}')">
                                <i class="bi bi-play-fill"></i> Iniciar
                            </button>` : 
                            `<button class="btn btn-sm btn-dark fw-bold" onclick="concluirServico('${ag.id_agendamento}')">
                                <i class="bi bi-check2-all"></i> Concluir
                            </button>`
                        }
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
            listaAlertas.innerHTML = '<li class="list-group-item small text-muted border-0">Nenhum alerta para esta semana.</li>';
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
        listaAlertas.innerHTML = '<li class="list-group-item small text-danger border-0">Erro ao carregar alertas.</li>';
    }
}

// --- FUNÇÕES DE AÇÃO (EXPOSTAS AO WINDOW) ---

window.iniciarServico = async function(idAgendamento) {
    if (confirm("Deseja iniciar este atendimento agora?")) {
        await atualizarStatus(idAgendamento, 'em_andamento');
    }
};

window.concluirServico = async function(idAgendamento) {
    if (confirm("Marcar atendimento como concluído?")) {
        await atualizarStatus(idAgendamento, 'concluido');
    }
};

async function atualizarStatus(id, novoStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/atualizar-status-pedido/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });

        if (response.ok) {
            carregarFilaDeTrabalho();
            carregarKpisOperacionais();
        } else {
            alert("Erro ao atualizar o status no servidor.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    }
}