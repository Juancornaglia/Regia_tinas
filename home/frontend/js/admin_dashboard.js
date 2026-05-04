/**
 * js/admin_dashboard.js - Sistema Central do Administrador (Regia & Tinas Care)
 * Responsável por: Segurança, KPIs, Gráficos, Agenda e Gestão de Cargos.
 */

import { checkAdminAuth } from './admin_auth.js';

// 1. CONFIGURAÇÃO DA URL DINÂMICA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener("DOMContentLoaded", async () => {
    
    // --- 2. BARREIRA DE SEGURANÇA ---
    const usuarioLogado = await checkAdminAuth();
    if (!usuarioLogado) return; // Se não for admin, o checkAdminAuth já redireciona

    console.log("Painel Admin carregado para:", usuarioLogado.nome);

    // --- 3. INICIALIZAÇÃO DE COMPONENTES ---
    configurarLogout();
    configurarBuscaUsuarios();
    carregarDadosDashboard(); // Carrega KPIs, Tabela e Gráficos
});

// --- 4. FUNÇÕES DE INFRAESTRUTURA ---

function configurarLogout() {
    const btnSair = document.getElementById('logout-button');
    if (btnSair) {
        // Removemos listeners antigos para evitar duplicação
        btnSair.replaceWith(btnSair.cloneNode(true)); 
        const novoBtnSair = document.getElementById('logout-button');
        
        novoBtnSair.addEventListener('click', () => {
            if (confirm('Deseja realmente encerrar sua sessão administrativa?')) {
                localStorage.clear();
                window.location.href = '../usuario/login.html';
            }
        });
    }
}

async function carregarDadosDashboard() {
    try {
        // Tenta buscar dados reais. Se falhar, usa os dados de teste (MOCK).
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-completo`);
        let dados;

        if (response.ok) {
            dados = await response.json();
        } else {
            console.warn("API indisponível. Carregando dados de teste visual...");
            dados = gerarDadosTeste();
        }

        // A. Preencher KPIs
        preencherKPIs(dados.stats);
        // B. Renderizar Tabela
        renderizarTabelaAgendamentos(dados.agendamentos);
        // C. Estoque
        renderizarEstoque(dados.estoque_critico);
        // D. Gráficos
        renderizarGraficos(dados.graficos);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

// --- 5. GESTÃO DE USUÁRIOS (A NOVA FUNCIONALIDADE) ---

function configurarBuscaUsuarios() {
    const btnBuscar = document.getElementById('btn-buscar-usuario');
    const inputBusca = document.getElementById('input-busca-usuario');
    const tabelaUsuarios = document.getElementById('tabela-gestao-usuarios');

    if (!btnBuscar) return;

    btnBuscar.addEventListener('click', async () => {
        const termo = inputBusca.value.trim();
        if (termo.length < 3) {
            alert("Digite ao menos 3 letras para pesquisar.");
            return;
        }

        tabelaUsuarios.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm text-pink"></div></td></tr>';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/busca?q=${termo}`);
            const usuarios = await response.json();

            if (usuarios.length === 0) {
                tabelaUsuarios.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>';
                return;
            }

            tabelaUsuarios.innerHTML = usuarios.map(user => `
                <tr>
                    <td><strong>${user.nome_completo}</strong></td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : (user.role === 'funcionario' ? 'bg-info text-dark' : 'bg-secondary')}">
                            ${user.role.toUpperCase()}
                        </span>
                    </td>
                    <td class="text-end">
                        <select class="form-select form-select-sm d-inline-block w-auto me-2" id="role-select-${user.id}">
                            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-sm btn-dark" onclick="window.atualizarCargo('${user.id}')">Atualizar</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tabelaUsuarios.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao conectar com o servidor.</td></tr>';
        }
    });
}

// --- 6. FUNÇÕES DE RENDERIZAÇÃO ---

function preencherKPIs(stats) {
    if (!stats) return;
    const ids = { 'kpi-vendas': 'faturamento', 'kpi-agendamentos': 'total_agendamentos', 'kpi-pets': 'total_pets', 'kpi-clientes': 'total_clientes' };
    
    for (let id in ids) {
        const el = document.getElementById(id);
        if (el) {
            let valor = stats[ids[id]];
            el.innerText = id === 'kpi-vendas' ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : valor;
        }
    }
}

function renderizarTabelaAgendamentos(lista) {
    const tabela = document.getElementById('tabela-agendamentos-admin');
    if (!tabela) return;

    tabela.innerHTML = lista.map(ag => `
        <tr>
            <td>${new Date(ag.data_hora_inicio).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</td>
            <td><strong>${ag.cliente_nome}</strong></td>
            <td><strong>${ag.pet_nome}</strong> <small>(${ag.pet_raca})</small></td>
            <td>${ag.servico_nome}</td>
            <td><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-success rounded-circle" onclick="window.avisarWhatsapp('${ag.cliente_tel}', '${ag.cliente_nome}', '${ag.pet_nome}', '${ag.servico_nome}', '${ag.data_hora_inicio}')">
                    <i class="bi bi-whatsapp"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderizarGraficos(dadosGrafico) {
    const ctx = document.getElementById('graficoFaturamento');
    if (!ctx) return;
    if (window.meuGrafico) window.meuGrafico.destroy();

    window.meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Banho', 'Tosa', 'Hotel', 'Vet'],
            datasets: [{ label: 'R$', data: dadosGrafico || [0,0,0,0], backgroundColor: '#FE8697', borderRadius: 8 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderizarEstoque(produtos) {
    const container = document.getElementById('lista-estoque-critico');
    if (container) {
        container.innerHTML = produtos.map(p => `
            <div class="d-flex justify-content-between mb-2 p-2 bg-white rounded border-start border-danger border-4">
                <span class="small fw-bold">${p.nome_produto}</span>
                <span class="badge bg-danger">${p.quantidade_estoque} un</span>
            </div>
        `).join('');
    }
}

// --- 7. AÇÕES GLOBAIS (window) ---

window.atualizarCargo = async (idUsuario) => {
    const select = document.getElementById(`role-select-${idUsuario}`);
    const novoRole = select.value;

    if (!confirm(`Alterar cargo para ${novoRole.toUpperCase()}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: idUsuario, novo_role: novoRole })
        });

        if (response.ok) {
            alert("Cargo atualizado!");
            document.getElementById('btn-buscar-usuario').click();
        }
    } catch (e) { alert("Erro de conexão."); }
};

window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    const msg = `Olá ${dono}! Confirmamos ${pet} para ${servico} em ${new Date(dataHora).toLocaleString()}.`;
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
};

// --- MOCK DATA (Para quando o servidor estiver offline) ---
function gerarDadosTeste() {
    return {
        stats: { faturamento: 4580.5, total_agendamentos: 14, total_pets: 18, total_clientes: 12 },
        agendamentos: [
            { data_hora_inicio: new Date(), cliente_nome: 'Alan Silva', pet_nome: 'Rex', pet_raca: 'Labrador', servico_nome: 'Banho', status: 'confirmado', cliente_tel: '11999999999' }
        ],
        estoque_critico: [{ nome_produto: 'Shampoo 5L', quantidade_estoque: 2 }],
        graficos: [1800, 950, 430, 1400]
    };
}