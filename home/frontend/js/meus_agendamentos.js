const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    const clienteId = localStorage.getItem('usuario_id');
    
    if (!clienteId) {
        window.location.href = 'login.html';
        return;
    }

    await carregarAgendamentos(clienteId);
});

async function carregarAgendamentos(id) {
    const container = document.getElementById('lista-agendamentos-cliente');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${id}`);
        const agendamentos = await response.json();

        if (!agendamentos || agendamentos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Você ainda não tem nenhum agendamento.<br>Que tal marcar um banho hoje?</p>
                    <a href="agendamento.html" class="btn btn-outline-secondary btn-sm rounded-pill px-4 mt-2">Agendar Agora</a>
                </div>`;
            return;
        }

        container.innerHTML = agendamentos.map(ag => `
            <div class="col-md-6">
                <div class="card card-agendamento shadow-sm status-${ag.status.toLowerCase()}">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="fw-bold mb-0">${ag.servico_nome}</h5>
                                <span class="badge bg-light text-dark border mt-1">
                                    <i class="bi bi-paw-fill text-brand me-1"></i> ${ag.pet_nome}
                                </span>
                            </div>
                            <span class="badge ${getStatusBadgeClass(ag.status)} text-uppercase p-2">
                                ${ag.status}
                            </span>
                        </div>
                        
                        <div class="row text-muted small">
                            <div class="col-6 mb-2">
                                <i class="bi bi-calendar3 me-2"></i>${new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')}
                            </div>
                            <div class="col-6 mb-2">
                                <i class="bi bi-clock me-2"></i>${new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div class="col-12">
                                <i class="bi bi-geo-alt me-2"></i>${ag.loja_nome}
                            </div>
                        </div>

                        ${ag.status === 'pendente' ? `
                            <div class="mt-4 text-end">
                                <button class="btn btn-sm btn-outline-danger border-0 fw-bold" onclick="cancelar('${ag.id_agendamento}')">
                                    Cancelar Agendamento
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Erro ao carregar seus horários. Tente novamente mais tarde.</p>';
    }
}

function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmado': return 'bg-success';
        case 'pendente': return 'bg-warning text-dark';
        case 'concluido': return 'bg-info text-white';
        case 'cancelado': return 'bg-danger';
        default: return 'bg-secondary';
    }
}