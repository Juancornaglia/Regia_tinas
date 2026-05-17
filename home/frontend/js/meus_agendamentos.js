/**
 * js/meus_agendamentos.js - Histórico de Agendamentos do Cliente
 * Totalmente sincronizado com as chaves da tabela do Neon e rotas do app.py
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    const clienteId = localStorage.getItem('usuario_id');
    
    // Proteção de rota do lado do cliente
    if (!clienteId) {
        window.location.href = 'login.html';
        return;
    }

    await carregarAgendamentos(clienteId);
});

// ==========================================
// 1. CARREGAR E RENDERIZAR CARDS DE AGENDAMENTOS
// ==========================================
async function carregarAgendamentos(id) {
    const container = document.getElementById('lista-agendamentos-cliente');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border brand-pink" role="status"></div><p class="mt-2 text-muted small">Buscando seus agendamentos no Neon...</p></div>';
    
    try {
        // Busca os agendamentos usando a nossa rota aliada unificada
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${id}`);
        if (!response.ok) throw new Error("Falha na requisição");
        
        const agendamentos = await response.json();

        if (!agendamentos || agendamentos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Você ainda não tem nenhum agendamento registrado.<br>Que tal marcar um dia de mimos para o seu pet hoje?</p>
                    <a href="agendamento.html" class="btn bg-brand-pink text-white rounded-pill px-4 mt-2 fw-bold shadow-sm">Agendar Agora</a>
                </div>`;
            return;
        }

        container.innerHTML = agendamentos.map(ag => {
            // CORREÇÃO 1: Mapeamento de chaves corrigido para bater com o SELECT do Python (nome_servico / nome_pet)
            const idAgendamento = ag.id_agendamento;
            const servico = ag.nome_servico || 'Serviço';
            const pet = ag.nome_pet || 'Meu Pet';
            const loja = ag.nome_loja || 'Unidade Matriz';
            const status = ag.status || 'pendente';
            const valor = parseFloat(ag.valor_cobrado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            return `
                <div class="col-md-6 mb-4">
                    <div class="card card-agendamento shadow-sm border-0 rounded-4 bg-white status-${status.toLowerCase()}" style="overflow: hidden;">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h5 class="fw-bold text-dark mb-1">${servico}</h5>
                                    <span class="badge bg-light text-secondary border mt-1">
                                        <i class="bi bi-paw-fill me-1" style="color: #FE8697;"></i> ${pet}
                                    </span>
                                </div>
                                <span class="badge ${getStatusBadgeClass(status)} text-uppercase px-3 py-2 rounded-pill small fw-bold">
                                    ${status}
                                </span>
                            </div>
                            
                            <hr class="text-black-50 my-3 opacity-10">

                            <div class="row text-muted small g-2">
                                <div class="col-6">
                                    <i class="bi bi-calendar3 me-2 brand-pink"></i>${new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')}
                                </div>
                                <div class="col-6">
                                    <i class="bi bi-clock me-2 brand-pink"></i>${new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div class="col-6">
                                    <i class="bi bi-geo-alt me-2 brand-pink"></i>Unidade ${loja}
                                </div>
                                <div class="col-6">
                                    <i class="bi bi-cash-coin me-2 brand-pink"></i>Valor: <strong class="text-dark">${valor}</strong>
                                </div>
                            </div>

                            ${status.toLowerCase() === 'pendente' ? `
                                <div class="mt-4 text-end">
                                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold border-1 small" onclick="cancelarAgendamento('${idAgendamento}')">
                                        <i class="bi bi-x-circle me-1"></i> Cancelar Agendamento
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro na renderização da agenda:", error);
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-danger">Erro de comunicação ao carregar a sua lista de agendamentos.</p></div>';
    }
}

// ==========================================
// 2. COMPORTAMENTO: CANCELAMENTO LOGÍSICO VIA API
// ==========================================
// CORREÇÃO 2: Criada a função de cancelamento e injetada no escopo global (window) para o clique do map funcionar
window.cancelarAgendamento = async (idAgendamento) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento do seu pet?")) return;

    try {
        // Envia a requisição PUT ou POST de cancelamento para o backend Python
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cancelar/${idAgendamento}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert("✅ Agendamento cancelado com sucesso!");
            // Recarrega a listagem dinamicamente para mudar o status na tela na hora
            const clienteId = localStorage.getItem('usuario_id');
            await carregarAgendamentos(clienteId);
        } else {
            const data = await response.json().catch(() => null);
            alert(`Ops: ${data?.error || "Não foi possível cancelar este horário no momento."}`);
        }
    } catch (e) {
        console.error("Erro ao cancelar:", e);
        alert("Erro de conexão ao tentar se comunicar com o servidor.");
    }
};

// ==========================================
// 3. ESTILIZAÇÃO DINÂMICA DE BADGES
// ==========================================
function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmado': return 'bg-success text-white';
        case 'pendente': return 'bg-warning text-dark';
        case 'concluido': return 'bg-info text-white';
        case 'em_andamento': return 'bg-primary text-white';
        case 'cancelado': return 'bg-danger text-white';
        default: return 'bg-secondary text-white';
    }
}