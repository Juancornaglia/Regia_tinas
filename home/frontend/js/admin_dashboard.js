// --- 1. CONFIGURAÇÃO DE ROTAS E SEGURANÇA ---
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com";

// Função para verificar se o usuário é Admin via Backend (Neon)
async function verificarAdmin(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return false;
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro na verificação Neon/Python:", error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando verificação de segurança (Neon)...");
    
    // No Neon, o token deve ser recuperado do localStorage após o login
    const token = localStorage.getItem('token'); 

    if (!token) {
        console.warn("Sem token de acesso. Redirecionando...");
        window.location.href = '../login.html';
        return;
    }

    const isAdmin = await verificarAdmin(token);
    
    if (!isAdmin) {
        alert("Acesso restrito: Você não tem permissões de administrador.");
        window.location.href = '../login.html';
        return; 
    }

    console.log("Acesso Admin confirmado!");
    // Carrega os dados centralizados via API Python + Neon
    carregarDashboardDados();
});

// --- 2. CARREGAR DADOS DO DASHBOARD (KPIs, Tabela, Gráficos) ---
async function carregarDashboardDados() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-completo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Falha ao buscar dados do servidor");
        
        const dados = await response.json();

        // A. Preencher KPIs
        document.getElementById('kpi-vendas').innerText = dados.stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('kpi-agendamentos').innerText = dados.stats.total_agendamentos;
        document.getElementById('kpi-pets').innerText = dados.stats.total_pets;
        document.getElementById('kpi-clientes').innerText = dados.stats.total_clientes;

        // B. Renderizar Tabela de Agendamentos
        renderizarTabelaAgendamentos(dados.agendamentos);

        // C. Renderizar Estoque Crítico
        renderizarEstoque(dados.estoque_critico);

        // D. Renderizar Gráficos
        renderizarGraficos(dados.graficos);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

// --- 3. FUNÇÕES DE RENDERIZAÇÃO (DOM) ---

function renderizarTabelaAgendamentos(lista) {
    const tabela = document.getElementById('tabela-agendamentos-admin');
    if (!tabela) return;

    tabela.innerHTML = lista.map(ag => `
        <tr>
            <td>${new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</td>
            <td>
                <strong>${ag.cliente_nome}</strong><br>
                <small class="text-muted">${ag.cliente_tel}</small>
            </td>
            <td>
                <strong>${ag.pet_nome}</strong><br>
                <small class="text-muted">${ag.pet_raca}</small>
            </td>
            <td>${ag.servico_nome}</td>
            <td><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-success" onclick="alterarStatus(${ag.id}, 'confirmado')">✅</button>
                <button class="btn btn-sm btn-outline-danger" onclick="alterarStatus(${ag.id}, 'cancelado')">❌</button>
                <button class="btn btn-sm btn-success" onclick="avisarWhatsapp('${ag.cliente_tel}', '${ag.cliente_nome}', '${ag.pet_nome}', '${ag.servico_nome}', '${ag.data_hora_inicio}')">
                    <i class="bi bi-whatsapp"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderizarEstoque(produtos) {
    const container = document.getElementById('lista-estoque-critico');
    if (!container) return;

    if (produtos && produtos.length > 0) {
        container.innerHTML = produtos.map(p => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded border-start border-danger border-4">
                <span class="small fw-bold">${p.nome_produto}</span>
                <span class="badge bg-danger">${p.quantidade_estoque} un</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-success small mt-2">✅ Estoque em dia!</p>';
    }
}

function renderizarGraficos(dadosGrafico) {
    const ctx = document.getElementById('graficoFaturamento');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Banho', 'Tosa', 'Hotel', 'Veterinário'],
            datasets: [{
                label: 'Receita (R$)',
                data: dadosGrafico || [0, 0, 0, 0],
                backgroundColor: '#FE8697',
                borderRadius: 8
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// --- 4. AÇÕES GLOBAIS ---

window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    const data = new Date(dataHora).toLocaleDateString('pt-BR');
    const hora = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = `Olá ${dono}! 🐾 Passando para confirmar o horário do(a) ${pet} para ${servico} no dia ${data} às ${hora}. Podemos confirmar?`;
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
};

window.alterarStatus = async (id, novoStatus) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamento/${id}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: novoStatus })
        });
        if (response.ok) location.reload();
        else alert("Erro ao atualizar status");
    } catch (err) {
        console.error(err);
    }
};