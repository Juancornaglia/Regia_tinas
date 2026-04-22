// 1. DEFINIÇÃO DA URL DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. SEGURANÇA: VERIFICAR ADMIN
async function verificarAdmin(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${token}`);
        
        // CORREÇÃO: Verifica se o servidor está OK antes de ler o JSON
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        return false;
    }
}

// 3. CARREGAR PEDIDOS
async function carregarPedidos() {
    const tbody = document.getElementById('pedidos-table-body');
    if (!tbody) return;

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/pedidos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // BLINDAGEM: Verifica erro de servidor/rota antes de processar
        if (!response.ok) {
            throw new Error("Não foi possível carregar a lista de pedidos.");
        }

        const pedidos = await response.json();

        if (pedidos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-muted">Nenhum pedido encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = pedidos.map(p => {
            // Estilos para o status
            let corStatus = '';
            if(p.status_pedido === 'processando') corStatus = 'text-warning';
            if(p.status_pedido === 'pago') corStatus = 'text-success';
            if(p.status_pedido === 'cancelado') corStatus = 'text-danger';
            if(p.status_pedido === 'finalizado') corStatus = 'text-primary';

            return `
            <tr>
                <td class="ps-4 fw-bold text-secondary">#${p.id_pedido}</td>
                <td>${p.nome_completo || 'Cliente'}</td>
                <td><strong>R$ ${Number(p.total_pedido).toFixed(2).replace('.', ',')}</strong></td>
                <td>${new Date(p.data_pedido).toLocaleDateString('pt-BR')}</td>
                <td>
                    <select class="form-select form-select-sm fw-bold ${corStatus}" style="width: 130px;" onchange="window.atualizarStatus(${p.id_pedido}, this.value)">
                        <option value="processando" ${p.status_pedido === 'processando' ? 'selected' : ''}>Processando</option>
                        <option value="pago" ${p.status_pedido === 'pago' ? 'selected' : ''}>Pago</option>
                        <option value="finalizado" ${p.status_pedido === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                        <option value="cancelado" ${p.status_pedido === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-brand" onclick="window.verDetalhes(${p.id_pedido})" data-bs-toggle="modal" data-bs-target="#pedidoModal">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-danger">Erro ao carregar dados do banco.</td></tr>`;
    }
}

// 4. ATUALIZAR STATUS
window.atualizarStatus = async (id, novoStatus) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/atualizar-status-pedido/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ status: novoStatus })
        });

        // BLINDAGEM HÍBRIDA: Lê a mensagem de erro do JSON ou trata erro HTML
        if (!response.ok) {
            let errorMsg = "Erro ao atualizar status.";
            try {
                const result = await response.json();
                errorMsg = result.mensagem || result.error || errorMsg;
            } catch (err) {
                if (response.status === 403) errorMsg = "Acesso negado.";
            }
            throw new Error(errorMsg);
        }

        alert("Status do pedido atualizado com sucesso!");
        carregarPedidos(); 

    } catch (error) {
        console.error("Erro na requisição:", error.message);
        alert("Erro: " + error.message);
    }
};

// 5. VER DETALHES NO MODAL
window.verDetalhes = (id) => {
    const detalheId = document.getElementById('detalhe-id');
    const detalhesCorpo = document.getElementById('detalhes-corpo');
    
    if (detalheId) detalheId.innerText = id;
    if (detalhesCorpo) {
        detalhesCorpo.innerHTML = `
            <div class="spinner-border text-brand my-3" role="status"></div>
            <p>Buscando itens do pedido...</p>
            <p class="small text-muted">(Para o TCC, você pode retornar uma lista de produtos comprados aqui através de uma nova rota no app.py)</p>
        `;
    }
};

// 6. INICIALIZAÇÃO E LOGOUT
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token'); 
    
    if (!token) {
        window.location.href = '../usuario/login.html';
        return;
    }

    const isAdmin = await verificarAdmin(token);
    if (!isAdmin) {
        alert("Acesso restrito!");
        window.location.href = '../usuario/login.html';
        return; 
    }

    carregarPedidos();

    document.getElementById('logout-button')?.addEventListener('click', () => {
        if(confirm('Deseja sair?')) {
            localStorage.clear();
            window.location.href = '../usuario/login.html';
        }
    });
});