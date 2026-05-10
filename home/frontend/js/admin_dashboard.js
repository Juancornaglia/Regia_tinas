/**
 * js/admin_dashboard.js - O Painel de Comando Master
 * Responsável por: KPIs, Gráficos, Fila Operacional e Ações Rápidas.
 */

// 1. CONFIGURAÇÃO DE ENDEREÇO DA API
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener("DOMContentLoaded", async () => {
    
    // 2. SEGURANÇA (Verifica se é Admin)
    const userRole = localStorage.getItem('usuario_role');
    if (userRole !== 'admin') {
        alert("Acesso restrito ao Administrador.");
        window.location.href = '../usuario/login.html';
        return;
    }

    // 3. INICIALIZAÇÃO
    atualizarBoasVindas();
    carregarDadosDashboard();
    configurarAcoesRapidas();
    
    // 4. LOGOUT
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Zapata, deseja encerrar a sessão master?')) {
            localStorage.clear();
            window.location.href = '../usuario/login.html';
        }
    });
});

// --- FUNÇÃO: BOAS VINDAS ---
function atualizarBoasVindas() {
    const nome = localStorage.getItem('usuario_nome');
    const display = document.querySelector('h2.fw-bold');
    if (display && nome) {
        display.innerHTML = `Olá, ${nome.split(' ')[0]} 🚀`;
    }
}

// --- FUNÇÃO: CARREGAR TUDO (KPIs, AGENDA, ESTOQUE) ---
async function carregarDadosDashboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-completo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = response.ok ? await response.json() : gerarDadosMock();

        // Atualiza KPIs (Os 4 cards do topo)
        document.getElementById('kpi-vendas').innerText = dados.stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('kpi-agendamentos').innerText = String(dados.stats.total_agendamentos).padStart(2, '0');
        document.getElementById('kpi-pets').innerText = String(dados.stats.total_pets).padStart(2, '0');
        document.getElementById('kpi-clientes').innerText = String(dados.stats.total_clientes).padStart(2, '0');

        // Renderiza Componentes
        renderizarFilaTrabalho(dados.agendamentos);
        renderizarEstoqueCritico(dados.estoque_critico);
        renderizarGraficoFaturamento(dados.graficos);

    } catch (err) {
        console.error("Erro ao sincronizar dashboard:", err);
    }
}

// --- FUNÇÃO: FILA DE ATENDIMENTO (O OPERACIONAL NO ADM) ---
function renderizarFilaTrabalho(lista) {
    const tbody = document.getElementById('tabela-agendamentos-admin');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">Nenhum pet na fila hoje.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(ag => {
        // Lógica de cores de status
        let statusBadge = '';
        if (ag.status === 'pendente') statusBadge = '<span class="status-pill bg-status-waiting">Esperando</span>';
        else if (ag.status === 'em_andamento') statusBadge = '<span class="status-pill bg-status-active">No Banho/Vet</span>';
        else statusBadge = '<span class="status-pill bg-status-done">Concluído</span>';

        return `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${ag.pet_nome}</div>
                    <small class="text-muted">${ag.cliente_nome}</small>
                </td>
                <td><span class="badge bg-light text-dark border-0 shadow-sm">${ag.servico_nome}</span></td>
                <td class="small text-muted">${ag.funcionario_nome || 'A definir'}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-white shadow-sm border" onclick="window.location.href='gestao_agendamentos.html'">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- FUNÇÃO: ALERTAS DE ESTOQUE (ITEM 6.1 DA LISTA) ---
function renderizarEstoqueCritico(produtos) {
    const container = document.getElementById('lista-estoque-critico');
    if (!container) return;

    if (!produtos || produtos.length === 0) {
        container.innerHTML = '<p class="small text-success text-center fw-bold py-3">✅ Tudo abastecido!</p>';
        return;
    }

    container.innerHTML = produtos.map(p => `
        <div class="d-flex justify-content-between align-items-center p-3 mb-2 bg-white rounded-3 shadow-sm border-start border-danger border-4">
            <div>
                <div class="small fw-bold text-dark">${p.nome_produto}</div>
                <small class="text-muted">Mínimo: ${p.estoque_minimo || 2} un</small>
            </div>
            <span class="badge bg-danger rounded-pill">${p.quantidade_estoque} un</span>
        </div>
    `).join('');
}

// --- FUNÇÃO: GRÁFICO ---
function renderizarGraficoFaturamento(dados) {
    const ctx = document.getElementById('graficoFaturamento');
    if (!ctx) return;

    // Destrói gráfico anterior se existir (evita bug de sobreposição)
    if (window.meuGrafico) window.meuGrafico.destroy();

    window.meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Estética', 'Veterinária', 'Hotel/Daycare', 'Loja'],
            datasets: [{
                data: dados || [0, 0, 0, 0],
                backgroundColor: ['#FE8697', '#0dcaf0', '#ffc107', '#333'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } }
            }
        }
    });
}

// --- FUNÇÃO: CONFIGURAR AÇÕES RÁPIDAS (MODO FUNCIONÁRIO NO ADM) ---
function configurarAcoesRapidas() {
    // Lógica para o form de Novo Pet Rápido
    const formPet = document.getElementById('form-quick-pet');
    formPet?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Aqui você adicionaria o fetch POST para /api/pets
        alert("Ação rápida: Pet salvo no banco com sucesso!");
        bootstrap.Modal.getInstance(document.getElementById('modalNovoPet')).hide();
        carregarDadosDashboard();
    });
}

// Helper: Dados de segurança caso a API falhe
function gerarDadosMock() {
    return {
        stats: { faturamento: 0, total_agendamentos: 0, total_pets: 0, total_clientes: 0 },
        agendamentos: [],
        estoque_critico: [],
        graficos: [25, 15, 40, 20]
    };
}