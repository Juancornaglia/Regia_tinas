/**
 * js/funcionario.js - Painel Operacional Profissional
 * Responsável por: Fila de Atendimento, Baixa de Estoque e Consulta de Prontuário.
 */

// 1. CONFIGURAÇÃO DA URL DINÂMICA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener("DOMContentLoaded", async () => {
    
    // 2. SEGURANÇA E IDENTIFICAÇÃO
    const userId = localStorage.getItem('usuario_id');
    const userRole = localStorage.getItem('usuario_role');
    const userNome = localStorage.getItem('usuario_nome');

    if (!userId || (userRole !== 'funcionario' && userRole !== 'admin')) {
        alert("Área restrita à equipe operacional.");
        window.location.href = '../usuario/login.html';
        return;
    }

    // 3. ATUALIZA INTERFACE (TEXTOS E DATAS)
    const displayNome = document.getElementById('nome-funcionario');
    const displayData = document.getElementById('data-atual');
    
    if (displayNome) displayNome.textContent = userNome?.split(' ')[0] || "Equipe";
    if (displayData) displayData.innerText = new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' });

    // 4. CARGA INICIAL DE DADOS
    carregarKpisOperacionais();
    carregarFilaDeTrabalho();
    carregarAlertasDeVacina();
    popularSelectEstoque(); // Carrega produtos para o modal de materiais

    // 5. EVENTOS DE FORMULÁRIO (ESTOQUE E PRONTUÁRIO)
    configurarEventosOperacionais();
    
    // 6. LOGOUT
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Deseja encerrar seu turno?')) {
            localStorage.clear(); 
            window.location.href = '../usuario/login.html';
        }
    });
});

// --- FUNÇÃO 1: FILA DE ATENDIMENTO (O CORAÇÃO) ---

async function carregarFilaDeTrabalho() {
    const tbody = document.getElementById('tabela-fila-trabalho');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        const agendamentos = await response.json();

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-5 opacity-50">Nenhum atendimento na fila.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => {
            const hora = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Mapeamento de Status para o novo visual
            let statusHTML = '';
            if (ag.status === 'pendente' || ag.status === 'confirmado') {
                statusHTML = `<span class="status-pill bg-status-waiting">Aguardando Pet</span>`;
            } else if (ag.status === 'em_andamento') {
                statusHTML = `<span class="status-pill bg-status-active">Em Serviço</span>`;
            } else {
                statusHTML = `<span class="status-pill bg-status-done">Concluído</span>`;
            }

            return `
                <tr>
                    <td class="fw-bold">${hora}</td>
                    <td>
                        <div class="fw-bold text-dark">${ag.nome_pet}</div>
                        <small class="text-muted">Tutor: ${ag.cliente_nome}</small>
                    </td>
                    <td><span class="badge bg-light text-dark border-0 shadow-sm">${ag.nome_servico}</span></td>
                    <td>${statusHTML}</td>
                    <td class="text-end">
                        ${ag.status !== 'em_andamento' && ag.status !== 'concluido' ? 
                            `<button class="btn btn-sm btn-success rounded-pill px-3 fw-bold" onclick="iniciarServico('${ag.id_agendamento}')">
                                <i class="bi bi-play-fill"></i> Iniciar
                            </button>` : 
                          ag.status === 'em_andamento' ?
                            `<button class="btn btn-sm btn-dark rounded-pill px-3 fw-bold" onclick="concluirServico('${ag.id_agendamento}')">
                                <i class="bi bi-check2-all"></i> Concluir
                            </button>` : 
                            `<i class="bi bi-check-circle-fill text-success fs-5"></i>`
                        }
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erro ao sincronizar com o Neon.</td></tr>';
    }
}

// --- FUNÇÃO 2: ESTOQUE (BAIXA DE MATERIAIS) ---

async function popularSelectEstoque() {
    const select = document.getElementById('select-produto-estoque');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/produtos`);
        const produtos = await res.json();
        // Filtra apenas produtos que podem ser consumidos (Ex: Shampoo, Vacina)
        produtos.forEach(p => {
            const opt = new Option(`${p.nome_produto} (${p.quantidade_estoque} un)`, p.id_produto);
            select.add(opt);
        });
    } catch (e) { console.error("Erro estoque:", e); }
}

// --- FUNÇÃO 3: PRONTUÁRIOS (CONSULTA RÁPIDA) ---

async function buscarHistoricoPet() {
    const termo = document.getElementById('busca-pet-prontuario').value;
    const resultado = document.getElementById('resultado-prontuario');
    
    if (!termo) return;

    resultado.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-brand"></div></div>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/prontuario?pet=${termo}`);
        const dados = await res.json();

        if (!dados.length) {
            resultado.innerHTML = '<p class="text-center py-5">Nenhum histórico encontrado para este pet.</p>';
            return;
        }

        resultado.innerHTML = dados.map(h => `
            <div class="border-bottom pb-3 mb-3">
                <div class="d-flex justify-content-between">
                    <span class="badge bg-brand-pink">${new Date(h.data).toLocaleDateString()}</span>
                    <small class="fw-bold text-muted">${h.veterinario}</small>
                </div>
                <p class="mt-2 mb-1 fw-bold">${h.diagnostico}</p>
                <small class="text-muted">${h.tratamento}</small>
            </div>
        `).join('');

    } catch (e) { resultado.innerHTML = '<p class="text-danger">Erro na busca.</p>'; }
}

// --- FUNÇÃO 4: KPIS E ALERTAS ---

async function carregarKpisOperacionais() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/estatisticas-dia`);
        const kpis = await response.json();
        if (response.ok) {
            document.getElementById('kpi-atendimentos').textContent = String(kpis.total_agendamentos).padStart(2, '0');
            document.getElementById('kpi-em-andamento').textContent = String(kpis.em_servico).padStart(2, '0');
            document.getElementById('kpi-avisos').textContent = String(kpis.alertas_saude).padStart(2, '0');
        }
    } catch (e) { console.warn("KPIs offline"); }
}

async function carregarAlertasDeVacina() {
    const lista = document.getElementById('lista-alertas-vacinas');
    if (!lista) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/alertas-vacina`);
        const alertas = await response.json();

        lista.innerHTML = alertas.length ? alertas.map(al => `
            <li class="list-group-item px-0 bg-transparent border-bottom py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold">${al.nome_pet}</h6>
                    <span class="badge bg-danger rounded-pill">${al.prazo}</span>
                </div>
                <small class="text-muted d-block mt-1">${al.vacina} • Tutor: ${al.tutor}</small>
            </li>
        `).join('') : '<li class="list-group-item small text-muted border-0 py-4 text-center">Nenhum alerta crítico.</li>';
    } catch (e) { console.warn("Erro alertas"); }
}

// --- FUNÇÕES DE AÇÃO E EVENTOS ---

function configurarEventosOperacionais() {
    // Form de Consumo de Estoque
    document.getElementById('form-consumo')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idProd = document.getElementById('select-produto-estoque').value;
        const qtd = document.getElementById('qtd-consumo').value;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/baixar-estoque`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_produto: idProd, quantidade: qtd })
            });

            if (res.ok) {
                alert("Baixa realizada com sucesso!");
                location.reload();
            }
        } catch (e) { alert("Erro ao baixar estoque."); }
    });

    // Botão de Busca de Prontuário
    document.getElementById('btn-buscar-prontuario')?.addEventListener('click', buscarHistoricoPet);
}

window.iniciarServico = async function(id) {
    if (confirm("Iniciar este atendimento?")) {
        await atualizarStatus(id, 'em_andamento');
    }
};

window.concluirServico = async function(id) {
    if (confirm("Finalizar atendimento?")) {
        await atualizarStatus(id, 'concluido');
    }
};

async function atualizarStatus(id, novoStatus) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/atualizar-status-pedido/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });
        if (res.ok) carregarFilaDeTrabalho();
    } catch (e) { alert("Falha na rede."); }
}