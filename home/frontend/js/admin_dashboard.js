// js/admin_dashboard.js - Painel Gerencial Regia & Tinas Care

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando carregamento do Dashboard Admin...");
    
    const userId = localStorage.getItem('usuario_id'); 

    // 1. VERIFICAÇÃO DE SEGURANÇA BÁSICA
    if (!userId) {
        console.warn("Sem usuário logado. Redirecionando...");
        window.location.href = '../usuario/login.html';
        return;
    }

    // Usando a função global do utils.js para verificar se é admin
    const isAdmin = await window.verificarAdmin(userId);
    
    if (!isAdmin) {
        alert("Acesso restrito: Você não tem permissões de administrador.");
        window.location.href = '../usuario/login.html';
        return; 
    }

    console.log("Acesso Admin confirmado! Carregando dados...");
    carregarDashboardDados();
});

// --- 2. CARREGAR DADOS DO DASHBOARD ---
async function carregarDashboardDados() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/admin/dashboard-completo`);
        
        // BLINDAGEM: Verifica erro de servidor antes do JSON
        if (!response.ok) throw new Error("Falha ao buscar dados do servidor");
        
        const dados = await response.json();

        // A. Preencher KPIs com proteção contra valores nulos
        const stats = dados.stats || {};
        if (document.getElementById('kpi-vendas')) {
            const faturamento = parseFloat(stats.faturamento || 0);
            document.getElementById('kpi-vendas').innerText = faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (document.getElementById('kpi-agendamentos')) {
            document.getElementById('kpi-agendamentos').innerText = stats.total_agendamentos || 0;
        }
        if (document.getElementById('kpi-pets')) {
            document.getElementById('kpi-pets').innerText = stats.total_pets || 0;
        }
        if (document.getElementById('kpi-clientes')) {
            document.getElementById('kpi-clientes').innerText = stats.total_clientes || 0;
        }

        // B. Renderizar componentes
        renderizarTabelaAgendamentos(dados.agendamentos || []);
        renderizarEstoque(dados.estoque_critico || []);
        renderizarGraficos(dados.graficos || [0, 0, 0, 0]);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        window.notificar ? window.notificar("Erro ao carregar dados do painel", "erro") : alert("Erro no servidor");
    }
}

// --- 3. FUNÇÕES DE RENDERIZAÇÃO ---

function renderizarTabelaAgendamentos(lista) {
    const tabela = document.getElementById('tabela-agendamentos-admin');
    if (!tabela) return;

    if (lista.length === 0) {
        tabela.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Nenhum agendamento pendente.</td></tr>';
        return;
    }

    tabela.innerHTML = lista.map(ag => `
        <tr>
            <td class="align-middle small">${new Date(ag.data_hora_inicio).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</td>
            <td class="align-middle">
                <strong>${ag.cliente_nome}</strong><br>
                <small class="text-muted">${ag.cliente_tel || 'Sem telefone'}</small>
            </td>
            <td class="align-middle">
                <strong>${ag.pet_nome}</strong><br>
                <small class="text-muted">${ag.pet_raca || 'SRD'}</small>
            </td>
            <td class="align-middle small">${ag.servico_nome}</td>
            <td class="align-middle"><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : (ag.status === 'cancelado' ? 'bg-danger' : 'bg-warning text-dark')} text-capitalize">${ag.status}</span></td>
            <td class="align-middle">
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-success border-0" title="Confirmar" onclick="window.alterarStatus(${ag.id_agendamento || ag.id}, 'confirmado')"><i class="bi bi-check-circle-fill"></i></button>
                    <button class="btn btn-sm btn-outline-danger border-0" title="Cancelar" onclick="window.alterarStatus(${ag.id_agendamento || ag.id}, 'cancelado')"><i class="bi bi-x-circle-fill"></i></button>
                    <button class="btn btn-sm btn-success rounded-circle" title="Avisar no WhatsApp" onclick="window.avisarWhatsapp('${ag.cliente_tel}', '${ag.cliente_nome}', '${ag.pet_nome}', '${ag.servico_nome}', '${ag.data_hora_inicio}')">
                        <i class="bi bi-whatsapp"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderizarEstoque(produtos) {
    const container = document.getElementById('lista-estoque-critico');
    if (!container) return;

    if (produtos.length > 0) {
        container.innerHTML = produtos.map(p => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded shadow-sm border-start border-danger border-4">
                <span class="small fw-bold text-dark">${p.nome_produto}</span>
                <span class="badge bg-danger rounded-pill">${p.quantidade_estoque} un</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div class="alert alert-success small mt-2 border-0 py-2"><i class="bi bi-check-circle-fill me-2"></i>Estoque saudável!</div>';
    }
}

function renderizarGraficos(dadosGrafico) {
    const ctx = document.getElementById('graficoFaturamento');
    if (!ctx) return;

    if (window.meuGrafico) window.meuGrafico.destroy();

    window.meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Banho', 'Tosa', 'Hotel', 'Veterinária'],
            datasets: [{
                label: 'Receita (R$)',
                data: dadosGrafico,
                backgroundColor: '#FE8697',
                borderRadius: 8
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// --- 4. AÇÕES GLOBAIS ---

window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    if (!telefone || telefone === 'undefined' || telefone === 'null') {
        alert("Cliente não possui telefone cadastrado.");
        return;
    }
    const data = new Date(dataHora).toLocaleDateString('pt-BR');
    const hora = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = `Olá ${dono}! 🐾 Passando da Regia & Tinas Care para confirmar o horário do(a) ${pet} para o serviço de ${servico} no dia ${data} às ${hora}. Podemos confirmar?`;
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
};

window.alterarStatus = async (id, novoStatus) => {
    if(!confirm(`Deseja mudar o status deste agendamento para ${novoStatus.toUpperCase()}?`)) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/admin/agendamento/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });
        
        if (response.ok) {
            window.notificar && window.notificar(`Status alterado para ${novoStatus}!`, 'sucesso');
            carregarDashboardDados(); 
        } else {
            alert("Erro ao atualizar status.");
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão.");
    }
};