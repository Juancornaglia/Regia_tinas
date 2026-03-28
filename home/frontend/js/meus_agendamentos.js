// 1. CONFIGURAÇÃO DA URL (Sempre no topo do arquivo)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE SEU LINK DO RENDER AQUI

// 2. FUNÇÃO PARA VERIFICAR ADMIN
async function verificarAdmin(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const idUsuario = localStorage.getItem('usuario_id');
    const lista = document.getElementById('lista-agendamentos-cliente');

    // Verificação de segurança: se não houver ID, manda pro login
    if (!idUsuario) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // 3. CHAMADA PARA O BACKEND USANDO A URL DINÂMICA
        const response = await fetch(`${API_BASE_URL}/api/usuario/agendamentos/${idUsuario}`);
        
        if (!response.ok) throw new Error("Erro ao buscar agendamentos");
        
        const agendamentos = await response.json();

        if (!lista) return;

        if (!agendamentos || agendamentos.length === 0) {
            lista.innerHTML = '<p class="text-muted">Você não tem agendamentos marcados.</p>';
            return;
        }

        // 4. RENDERIZAÇÃO DA LISTA
        lista.innerHTML = agendamentos.map(ag => `
            <div class="list-group-item mb-3 shadow-sm border-0 rounded-3">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <h5 class="mb-1 fw-bold">${ag.nome_servico} para ${ag.nome_pet}</h5>
                    <span class="badge ${
                        ag.status === 'confirmado' ? 'bg-success' : 
                        ag.status === 'cancelado' ? 'bg-danger' : 'bg-warning'
                    } text-capitalize">${ag.status}</span>
                </div>
                <p class="mb-1">📅 ${new Date(ag.data_hora_inicio).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
                <small class="text-secondary">📍 Unidade: ${ag.nome_loja || 'Regia & Tinas Care'}</small>
            </div>
        `).join('');

    } catch (error) {
        console.error("Erro na requisição:", error);
        if (lista) lista.innerHTML = '<p class="text-danger">Não foi possível carregar seus agendamentos.</p>';
    }
});