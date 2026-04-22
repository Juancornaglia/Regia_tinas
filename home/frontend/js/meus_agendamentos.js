// 1. CONFIGURAÇÃO DA URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', async () => {
    const idUsuario = localStorage.getItem('usuario_id');
    const container = document.getElementById('lista-agendamentos-cliente');

    if (!idUsuario) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // 2. BUSCA AGENDAMENTOS DO CLIENTE LOGADO
        const response = await fetch(`${API_BASE_URL}/api/usuario/agendamentos/${idUsuario}`);
        const agendamentos = await response.json();

        if (!container) return;

        if (!response.ok) throw new Error("Erro ao buscar dados");

        if (agendamentos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5 bg-white rounded-4 shadow-sm">
                    <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
                    <h5 class="mt-3 text-muted">Você ainda não possui agendamentos.</h5>
                    <a href="../servicos/agendamento-fluxo.html" class="btn btn-outline-primary mt-3 rounded-pill">Agendar agora</a>
                </div>`;
            return;
        }

        // 3. RENDERIZAÇÃO EM FORMATO DE CARDS LINDOS
        container.innerHTML = agendamentos.map(ag => {
            const dataHora = new Date(ag.data_hora_inicio);
            const statusClass = ag.status === 'confirmado' ? 'confirmado' : (ag.status === 'pendente' ? 'pendente' : '');
            const badgeClass = ag.status === 'confirmado' ? 'bg-success' : (ag.status === 'cancelado' ? 'bg-danger' : 'bg-warning text-dark');

            return `
            <div class="col-md-6 col-lg-4">
                <div class="card card-agendamento ${statusClass} shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="badge ${badgeClass} text-capitalize">${ag.status}</span>
                            <small class="text-muted fw-bold">#${ag.id_agendamento || '---'}</small>
                        </div>
                        <h5 class="card-title fw-bold mb-1">${ag.nome_servico}</h5>
                        <p class="text-brand fw-bold mb-3"><i class="bi bi-dog me-2"></i>${ag.nome_pet}</p>
                        
                        <div class="border-top pt-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-calendar3 me-2 text-muted"></i>
                                <span>${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-geo-alt me-2 text-muted"></i>
                                <small>${ag.nome_loja || 'Unidade Principal'}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro:", error);
        container.innerHTML = `<div class="alert alert-danger text-center">Ocorreu um erro ao carregar seus dados. Verifique a conexão com o servidor.</div>`;
    }
});