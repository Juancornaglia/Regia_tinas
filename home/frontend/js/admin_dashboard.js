/**
 * js/admin_dashboard.js - O Coração do Painel Regia & Tinas Care
 */

import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. CATRACA DE SEGURANÇA
    const usuarioLogado = await checkAdminAuth();
    if (!usuarioLogado) return;

    // 2. INICIALIZAÇÃO
    configurarLogout();
    configurarGestaoUsuarios(); // <--- A parte nova que você pediu
    carregarDadosDashboard();
    
    console.log("Painel Admin pronto. Logado como:", usuarioLogado.nome);
});

// --- FUNÇÃO: LOGOUT (Consertado) ---
function configurarLogout() {
    const btnSair = document.getElementById('logout-button');
    if (btnSair) {
        btnSair.addEventListener('click', () => {
            if (confirm('Zapata, deseja realmente encerrar a sessão?')) {
                localStorage.clear();
                window.location.href = '../usuario/login.html';
            }
        });
    }
}

// --- FUNÇÃO: GESTÃO DE USUÁRIOS (BUSCA INTELIGENTE) ---
function configurarGestaoUsuarios() {
    const btnBuscar = document.getElementById('btn-buscar-usuario');
    const inputBusca = document.getElementById('input-busca-usuario');
    const tabela = document.getElementById('tabela-gestao-usuarios');

    if (!btnBuscar) return;

    btnBuscar.addEventListener('click', async () => {
        const termo = inputBusca.value.trim();
        if (termo.length < 3) {
            alert("Por favor, digite pelo menos 3 caracteres para a busca.");
            return;
        }

        tabela.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-pink"></div></td></tr>';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/busca?q=${termo}`);
            const usuarios = await response.json();

            if (usuarios.length === 0) {
                tabela.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado com esse termo.</td></tr>';
                return;
            }

            tabela.innerHTML = usuarios.map(user => `
                <tr>
                    <td><strong>${user.nome_completo}</strong></td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : (user.role === 'funcionario' ? 'bg-info text-dark' : 'bg-brand-pink')}">
                            ${user.role.toUpperCase()}
                        </span>
                    </td>
                    <td class="text-end">
                        <select class="form-select form-select-sm d-inline-block w-auto me-2" id="role-select-${user.id}">
                            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-sm btn-dark fw-bold" onclick="window.atualizarCargo('${user.id}', '${user.nome_completo}')">
                            Atualizar
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tabela.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro de conexão com o servidor.</td></tr>';
        }
    });
}

// --- FUNÇÃO: ATUALIZAR CARGO (A PROMOÇÃO) ---
window.atualizarCargo = async (idUsuario, nomeUsuario) => {
    const select = document.getElementById(`role-select-${idUsuario}`);
    const novoRole = select.value;

    if (!confirm(`Confirmar alteração de ${nomeUsuario} para ${novoRole.toUpperCase()}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: idUsuario, novo_role: novoRole })
        });

        if (response.ok) {
            alert("Cargo atualizado com sucesso! O usuário sentirá a mudança no próximo login.");
            document.getElementById('btn-buscar-usuario').click(); // Atualiza a tabela
        }
    } catch (e) {
        alert("Erro ao salvar alteração.");
    }
};

// --- CARGA DE DADOS (KPIs, AGENDA, GRÁFICOS) ---
async function carregarDadosDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-completo`);
        const dados = response.ok ? await response.json() : gerarDadosMock();

        // KPIs
        document.getElementById('kpi-vendas').innerText = dados.stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('kpi-agendamentos').innerText = dados.stats.total_agendamentos;
        document.getElementById('kpi-pets').innerText = dados.stats.total_pets;
        document.getElementById('kpi-clientes').innerText = dados.stats.total_clientes;

        // Tabela de Agenda
        renderizarAgenda(dados.agendamentos);
        // Estoque
        renderizarEstoque(dados.estoque_critico);
        // Gráfico
        renderizarGrafico(dados.graficos);

    } catch (err) {
        console.error("Erro no dashboard:", err);
    }
}

function renderizarAgenda(lista) {
    const tbody = document.getElementById('tabela-agendamentos-admin');
    if (!tbody) return;
    tbody.innerHTML = lista.map(ag => `
        <tr>
            <td>${new Date(ag.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td><strong>${ag.cliente_nome}</strong></td>
            <td>${ag.pet_nome} <small>(${ag.pet_raca})</small></td>
            <td>${ag.servico_nome}</td>
            <td><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-success rounded-circle" onclick="window.open('https://wa.me/55${ag.cliente_tel}')"><i class="bi bi-whatsapp"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoFaturamento');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Banho', 'Tosa', 'Daycare', 'Outros'],
            datasets: [{ label: 'Receita', data: dados, backgroundColor: '#FE8697', borderRadius: 10 }]
        },
        options: { plugins: { legend: { display: false } } }
    });
}

function renderizarEstoque(produtos) {
    const container = document.getElementById('lista-estoque-critico');
    if (!container) return;
    container.innerHTML = produtos.map(p => `
        <div class="d-flex justify-content-between p-2 mb-2 bg-light rounded border-start border-danger border-4">
            <span class="small fw-bold">${p.nome_produto}</span>
            <span class="badge bg-danger">${p.quantidade_estoque} un</span>
        </div>
    `).join('');
}

function gerarDadosMock() {
    return {
        stats: { faturamento: 0, total_agendamentos: 0, total_pets: 0, total_clientes: 0 },
        agendamentos: [],
        estoque_critico: [],
        graficos: [0, 0, 0, 0]
    };
}