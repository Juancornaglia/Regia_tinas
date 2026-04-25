// js/admin_dashboard.js - Painel Gerencial Regia & Tinas Care (VERSÃO DE TESTE DE LAYOUT)

// ATENÇÃO: O arquivo utils.js e o Chart.js devem estar importados no HTML antes deste script!

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando carregamento do Dashboard Admin em MODO TESTE VISUAL...");
    
    // --- VERIFICAÇÃO DE SEGURANÇA DESATIVADA TEMPORARIAMENTE ---
    /*
    const userId = localStorage.getItem('usuario_id'); 
    if (!userId) {
        window.location.href = '../usuario/login.html';
        return;
    }
    const isAdmin = await window.verificarAdmin(userId);
    if (!isAdmin) {
        alert("Acesso restrito: Você não tem permissões de administrador.");
        window.location.href = '../usuario/login.html';
        return; 
    }
    */

    console.log("Acesso Admin ignorado para teste! Carregando dados falsos...");
    carregarDashboardDados();
});

// --- 2. CARREGAR DADOS DO DASHBOARD (MOCKADOS PARA TESTE DE CSS) ---
async function carregarDashboardDados() {
    try {
        // --- FETCH ORIGINAL DESATIVADO TEMPORARIAMENTE ---
        // const response = await fetch(`${window.API_BASE_URL}/api/admin/dashboard-completo`);
        // if (!response.ok) throw new Error("Falha ao buscar dados do servidor");
        // const dados = await response.json();

        // CRIANDO DADOS FALSOS PARA PREENCHER A TELA DURANTE O DESENVOLVIMENTO VISUAL
        const dados = {
            stats: {
                faturamento: 4580.50,
                total_agendamentos: 14,
                total_pets: 18,
                total_clientes: 12
            },
            agendamentos: [
                { id: 1, data_hora_inicio: '2026-04-25T10:00:00', cliente_nome: 'Alan Silva', cliente_tel: '11999999999', pet_nome: 'Rex', pet_raca: 'Labrador', servico_nome: 'Banho Simples Cão', status: 'confirmado' },
                { id: 2, data_hora_inicio: '2026-04-25T14:30:00', cliente_nome: 'Ester Souza', cliente_tel: '11888888888', pet_nome: 'Mimi', pet_raca: 'Siamês', servico_nome: 'Consulta de Rotina', status: 'pendente' },
                { id: 3, data_hora_inicio: '2026-04-25T16:00:00', cliente_nome: 'Gisele Zapata', cliente_tel: '11777777777', pet_nome: 'Thor', pet_raca: 'Buldogue', servico_nome: 'Vacina V8/V10', status: 'cancelado' }
            ],
            estoque_critico: [
                { nome_produto: 'Shampoo Pelos Claros 5L', quantidade_estoque: 2 },
                { nome_produto: 'Ração Super Premium 15kg', quantidade_estoque: 1 }
            ],
            graficos: [1800, 950, 430, 1400.50]
        };

        // A. Preencher KPIs (As caixinhas do topo)
        if (document.getElementById('kpi-vendas')) {
            document.getElementById('kpi-vendas').innerText = dados.stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (document.getElementById('kpi-agendamentos')) {
            document.getElementById('kpi-agendamentos').innerText = dados.stats.total_agendamentos;
        }
        if (document.getElementById('kpi-pets')) {
            document.getElementById('kpi-pets').innerText = dados.stats.total_pets;
        }
        if (document.getElementById('kpi-clientes')) {
            document.getElementById('kpi-clientes').innerText = dados.stats.total_clientes;
        }

        // B. Renderizar Tabela de Agendamentos
        renderizarTabelaAgendamentos(dados.agendamentos);

        // C. Renderizar Estoque Crítico
        renderizarEstoque(dados.estoque_critico);

        // D. Renderizar Gráficos (Chart.js)
        renderizarGraficos(dados.graficos);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

// --- 3. FUNÇÕES DE RENDERIZAÇÃO (DOM) ---

function renderizarTabelaAgendamentos(lista) {
    const tabela = document.getElementById('tabela-agendamentos-admin');
    if (!tabela) return;

    if (!lista || lista.length === 0) {
        tabela.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Nenhum agendamento para hoje.</td></tr>';
        return;
    }

    tabela.innerHTML = lista.map(ag => `
        <tr>
            <td class="align-middle">${new Date(ag.data_hora_inicio).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</td>
            <td class="align-middle">
                <strong>${ag.cliente_nome}</strong><br>
                <small class="text-muted">${ag.cliente_tel || 'Sem telefone'}</small>
            </td>
            <td class="align-middle">
                <strong>${ag.pet_nome}</strong><br>
                <small class="text-muted">${ag.pet_raca || 'SRD'}</small>
            </td>
            <td class="align-middle">${ag.servico_nome}</td>
            <td class="align-middle"><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : (ag.status === 'cancelado' ? 'bg-danger' : 'bg-warning text-dark')} text-capitalize">${ag.status}</span></td>
            <td class="align-middle">
                <button class="btn btn-sm btn-outline-success border-0" title="Confirmar" onclick="window.alterarStatus(${ag.id_agendamento || ag.id}, 'confirmado')"><i class="bi bi-check-circle-fill fs-5"></i></button>
                <button class="btn btn-sm btn-outline-danger border-0" title="Cancelar" onclick="window.alterarStatus(${ag.id_agendamento || ag.id}, 'cancelado')"><i class="bi bi-x-circle-fill fs-5"></i></button>
                <button class="btn btn-sm btn-success rounded-circle ms-2" title="Avisar no WhatsApp" onclick="window.avisarWhatsapp('${ag.cliente_tel}', '${ag.cliente_nome}', '${ag.pet_nome}', '${ag.servico_nome}', '${ag.data_hora_inicio}')">
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
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded shadow-sm border-start border-danger border-4">
                <span class="small fw-bold text-dark">${p.nome_produto}</span>
                <span class="badge bg-danger rounded-pill">${p.quantidade_estoque} un</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div class="alert alert-success small mt-2 border-0"><i class="bi bi-check-circle-fill me-2"></i>Estoque em dia!</div>';
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
                data: dadosGrafico || [0, 0, 0, 0],
                backgroundColor: '#FE8697',
                borderRadius: 8
            }]
        },
        options: { 
            responsive: true, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// --- 4. AÇÕES GLOBAIS (Ativadas por botões no HTML) ---
window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    if (!telefone || telefone === 'undefined') {
        alert("Cliente não possui telefone cadastrado.");
        return;
    }
    const data = new Date(dataHora).toLocaleDateString('pt-BR');
    const hora = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = `Olá ${dono}! 🐾 Passando da Regia & Tinas Care para confirmar o horário do(a) ${pet} para o serviço de ${servico} no dia ${data} às ${hora}. Podemos confirmar?`;
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
};

window.alterarStatus = async (id, novoStatus) => {
    alert(`Modo Teste: O status do agendamento ${id} mudaria para ${novoStatus}. Lembre-se de religar a API depois!`);
};