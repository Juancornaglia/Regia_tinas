const API_URL = 'http://localhost:5000/api/admin';

async function carregarPedidos() {
    const tbody = document.getElementById('pedidos-table-body');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/pedidos`);
        const pedidos = await response.json();

        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td>#${p.id_pedido}</td>
                <td>${p.nome_completo || 'Cliente'}</td>
                <td><strong>R$ ${Number(p.total_pedido).toFixed(2)}</strong></td>
                <td>${new Date(p.data_pedido).toLocaleDateString('pt-BR')}</td>
                <td>
                    <select class="form-select form-select-sm" onchange="atualizarStatus(${p.id_pedido}, this.value)">
                        <option value="processando" ${p.status_pedido === 'processando' ? 'selected' : ''}>Processando</option>
                        <option value="pago" ${p.status_pedido === 'pago' ? 'selected' : ''}>Pago</option>
                        <option value="finalizado" ${p.status_pedido === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                        <option value="cancelado" ${p.status_pedido === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verDetalhes(${p.id_pedido})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
    }
}

window.atualizarStatus = async (id, novoStatus) => {
    try {
        const response = await fetch(`${API_URL}/atualizar-status-pedido/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });

        if (response.ok) {
            alert("Status do pedido atualizado!");
        } else {
            alert("Erro ao atualizar status.");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
};

// Detalhes do pedido (Simulado para o TCC)
window.verDetalhes = (id) => {
    alert("Funcionalidade de detalhes do pedido #" + id + " carregando...");
    // Aqui você poderia abrir um modal com os itens do pedido
};

document.addEventListener('DOMContentLoaded', carregarPedidos);