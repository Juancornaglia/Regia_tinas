/**
 * js/funcionario.js - Lógica do Painel Operacional da Equipe
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificação de Acesso
    const userId = localStorage.getItem('usuario_id');
    const userRole = localStorage.getItem('usuario_role');

    if (!userId || (userRole !== 'funcionario' && userRole !== 'admin')) {
        alert("Acesso restrito à equipe.");
        window.location.href = 'login.html';
        return;
    }

    // 2. Personalização do Cabeçalho
    const nomeFunc = localStorage.getItem('usuario_nome');
    if (nomeFunc) {
        document.getElementById('nome-funcionario').innerText = nomeFunc.split(' ')[0];
    }
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 3. Inicialização dos Dados
    await carregarFilaAtendimento();
    await carregarResumoKPIs();
    await carregarAlertasVacinas();

    // 4. Logout
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if(confirm("Encerrar o turno e sair?")) {
            localStorage.clear();
            window.location.href = '../index.html';
        }
    });
});

async function carregarFilaAtendimento() {
    const tbody = document.getElementById('tabela-fila-trabalho');
    
    try {
        // Busca agendamentos gerais para a equipe trabalhar (focando em status não concluídos)
        const res = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        const agendamentos = await res.json();

        // Filtra para mostrar apenas o que interessa hoje (Pendente ou Em Andamento)
        const filaHoje = agendamentos.filter(a => a.status === 'pendente' || a.status === 'em_andamento');

        if (filaHoje.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhum pet na fila no momento. Trabalho concluído! 🎉</td></tr>';
            return;
        }

        tbody.innerHTML = filaHoje.map(ag => `
            <tr>
                <td><strong>${new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</strong></td>
                <td>
                    <span class="d-block fw-bold">${ag.nome_pet}</span>
                    <small class="text-muted">${ag.nome_cliente}</small>
                </td>
                <td>${ag.nome_servico}</td>
                <td><span class="badge ${ag.status === 'em_andamento' ? 'bg-info text-dark' : 'bg-warning text-dark'} text-uppercase">${ag.status}</span></td>
                <td class="text-end">
                    ${ag.status === 'pendente' 
                        ? `<button class="btn btn-sm btn-dark" onclick="window.atualizarStatusTarefa('${ag.id_agendamento}', 'em_andamento')">Iniciar</button>`
                        : `<button class="btn btn-sm btn-success" onclick="window.atualizarStatusTarefa('${ag.id_agendamento}', 'concluido')"><i class="bi bi-check2-all"></i> Concluir</button>`
                    }
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erro ao carregar a fila de trabalho.</td></tr>';
    }
}

// Atualização de Status que a equipe clica
window.atualizarStatusTarefa = async (idAgendamento, novoStatus) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/agendamentos/status`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_agendamento: idAgendamento, novo_status: novoStatus })
        });
        if(res.ok) {
            carregarFilaAtendimento();
            carregarResumoKPIs();
        } else {
            alert("Falha ao atualizar a tarefa.");
        }
    } catch(e) {
        alert("Erro de conexão.");
    }
};

async function carregarResumoKPIs() {
    try {
        // Aproveitamos a mesma rota para montar os contadores
        const res = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        const agendamentos = await res.json();
        
        const hoje = new Date().toLocaleDateString('pt-BR');
        
        // Filtra apenas os de hoje (opcional, dependendo de como sua API devolve as datas)
        const total = agendamentos.length;
        const andamento = agendamentos.filter(a => a.status === 'em_andamento').length;
        const pendentes = agendamentos.filter(a => a.status === 'pendente').length;

        document.getElementById('kpi-atendimentos').innerText = total;
        document.getElementById('kpi-em-andamento').innerText = andamento;
        document.getElementById('kpi-avisos').innerText = pendentes;
    } catch(e) {
        console.error("Erro KPIs", e);
    }
}

async function carregarAlertasVacinas() {
    const lista = document.getElementById('lista-alertas-vacinas');
    try {
        const res = await fetch(`${API_BASE_URL}/api/alertas-vacina`);
        const alertas = await res.json();
        
        if (alertas.length === 0) {
            lista.innerHTML = '<li class="list-group-item text-muted">Sem alertas médicos para hoje.</li>';
            return;
        }

        lista.innerHTML = alertas.map(al => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span><strong>${al.nome_pet}</strong> - ${al.vacina}</span>
                <span class="badge bg-danger rounded-pill">Vencendo</span>
            </li>
        `).join('');
    } catch (e) {
        lista.innerHTML = '<li class="list-group-item text-danger">Falha ao buscar alertas.</li>';
    }
}