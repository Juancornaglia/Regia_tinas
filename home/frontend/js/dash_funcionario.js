/**
 * js/dash_funcionario.js - Cérebro do Painel Operacional
 * Gerencia KPIs, Fila de Hoje, Estoque e Segurança por CPF
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

// Estados Globais
let acaoPendente = null; 
let modalAssinatura = null;

document.addEventListener('DOMContentLoaded', () => {
    // 0. Proteção de Rota (Apenas Funcionário ou Admin)
    const userRole = (localStorage.getItem('usuario_role') || '').toLowerCase().trim();
    if (userRole !== 'funcionario' && userRole !== 'admin') {
        window.location.href = '../usuario/login.html';
        return;
    }

    console.log("🛠️ Inicializando Painel do Funcionário...");
    
    // 1. Configurações Iniciais de Interface
    inicializarInterface();
    
    // 2. Carrega os Dados do Banco Neon
    carregarResumoDoDia();
    carregarListaEstoque();

    // 3. Configura o Logout
    const btnSair = document.getElementById('logout-button');
    if (btnSair) btnSair.onclick = encerrarTurno;
});

// ==========================================
// 1. INTERFACE E IDENTIDADE
// ==========================================

function inicializarInterface() {
    // Nome do Funcionário (Vem do Login)
    const nome = localStorage.getItem('usuario_nome') || "Equipe";
    const nomeDisplay = document.getElementById('nome-funcionario');
    if (nomeDisplay) nomeDisplay.innerText = nome.split(' ')[0];

    // Data Atual formatada
    const dataSpan = document.getElementById('data-atual');
    if (dataSpan) {
        const hoje = new Date();
        dataSpan.textContent = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Máscara de CPF no Modal de Segurança
    const inputCpf = document.getElementById('input-cpf-funcionario');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); 
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    // Listener do Botão de Confirmação do CPF
    const btnConfirmar = document.getElementById('btn-confirmar-acao');
    if (btnConfirmar) btnConfirmar.onclick = validarCpfESalvar;
}

// ==========================================
// 2. FILA E KPIs (BANCO NEON)
// ==========================================

async function carregarResumoDoDia() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        if (!response.ok) throw new Error("Erro ao buscar agendamentos.");
        
        const agendamentos = await response.json();
        if (!Array.isArray(agendamentos)) return;

        // Filtra os status do dia
        const pendentes = agendamentos.filter(a => ['pendente', 'aguardando', 'confirmado'].includes(a.status));
        const emAndamento = agendamentos.filter(a => ['em_andamento', 'em_curso'].includes(a.status));
        const concluidos = agendamentos.filter(a => ['concluido', 'pronto'].includes(a.status));

        // Atualiza os números (KPIs)
        document.getElementById('kpi-atendimentos').innerText = pendentes.length;
        document.getElementById('kpi-em-andamento').innerText = emAndamento.length;
        document.getElementById('kpi-concluidos').innerText = concluidos.length;

        // Renderiza a Tabela de Próximos
        renderizarTabelaFila([...pendentes, ...emAndamento].slice(0, 5));

    } catch (error) {
        console.error("Erro ao carregar resumo:", error);
        document.getElementById('kpi-atendimentos').innerText = '0';
        document.getElementById('kpi-em-andamento').innerText = '0';
        document.getElementById('kpi-concluidos').innerText = '0';
        renderizarTabelaFila([]);
    }
}

function renderizarTabelaFila(lista) {
    const tbody = document.getElementById('tabela-fila-trabalho');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Nenhum atendimento pendente para agora.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const isAndamento = ['em_andamento', 'em_curso'].includes(a.status);
        return `
        <tr>
            <td class="fw-bold text-secondary">${extrairHora(a.data_hora_inicio)}</td>
            <td>
                <div class="fw-bold text-dark">${a.nome_pet || 'Pet'}</div>
                <small class="text-muted">${a.cliente_nome || a.nome_cliente || 'Tutor'}</small>
            </td>
            <td>
                <span class="status-pill ${isAndamento ? 'bg-status-active' : 'bg-status-waiting'}">
                    ${isAndamento ? 'Em Curso' : 'Aguardando'}
                </span>
            </td>
        </tr>
    `}).join('');
}

// ==========================================
// 3. ESTOQUE E CONSUMO
// ==========================================

async function carregarListaEstoque() {
    const select = document.getElementById('select-produto-estoque');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Falha ao buscar produtos.");
        
        const produtos = await response.json();
        if (!Array.isArray(produtos) || produtos.length === 0) {
            select.innerHTML = '<option value="">Nenhum produto cadastrado no estoque</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecione o material...</option>' + 
            produtos.map(p => `<option value="${p.id_produto || p.id}">${p.nome_produto} (${p.quantidade_estoque ?? 0} un)</option>`).join('');
    } catch (e) {
        console.error("Erro ao carregar estoque:", e);
        select.innerHTML = '<option value="">Erro ao carregar estoque</option>';
    }
}

// ==========================================
// 4. O ESCUDO DE CPF (SEGURANÇA)
// ==========================================

window.solicitarAssinatura = (callback) => {
    const selectProd = document.getElementById('select-produto-estoque');
    if (selectProd && document.getElementById('modalEstoque')?.classList.contains('show')) {
        if (!selectProd.value) {
            alert("Selecione um produto antes de avançar!");
            return;
        }
    }

    acaoPendente = callback;
    
    // Limpa o modal
    document.getElementById('input-cpf-funcionario').value = '';
    document.getElementById('erro-validacao').style.display = 'none';

    // Fecha modal de estoque se estiver aberto
    const mEstoqueEl = document.getElementById('modalEstoque');
    if (mEstoqueEl) {
        const mEstoque = bootstrap.Modal.getInstance(mEstoqueEl);
        if (mEstoque) mEstoque.hide();
    }

    modalAssinatura = new bootstrap.Modal(document.getElementById('modalAssinaturaFuncionario'));
    modalAssinatura.show();
};

async function validarCpfESalvar() {
    const cpf = document.getElementById('input-cpf-funcionario').value;
    const btn = document.getElementById('btn-confirmar-acao');
    const erro = document.getElementById('erro-validacao');

    if (cpf.length < 14) {
        erro.innerText = "Digite o CPF completo!";
        erro.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> VALIDANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/validar-cpf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
        });

        const data = await res.json();

        if (res.ok && data.autorizado) {
            modalAssinatura.hide();
            if (acaoPendente) acaoPendente(data.id_funcionario);
        } else {
            throw new Error("CPF não autorizado.");
        }

    } catch (e) {
        erro.style.display = 'block';
        erro.innerText = "Acesso Negado: CPF não reconhecido.";
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'CONFIRMAR AÇÃO';
    }
}

// ==========================================
// 5. PROCESSAMENTO DE BAIXA
// ==========================================

window.processarBaixaEstoque = async (idFuncionario) => {
    const prodId = document.getElementById('select-produto-estoque').value;
    const qtd = document.getElementById('qtd-consumo').value;

    const dados = {
        id_produto: prodId,
        quantidade: parseInt(qtd, 10) || 1,
        id_funcionario: idFuncionario
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/estoque/consumo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            alert("✅ Sucesso! Baixa no estoque realizada e assinada digitalmente.");
            carregarResumoDoDia();
            carregarListaEstoque();
        } else {
            const err = await res.json();
            alert(err.error || "Não foi possível registrar a baixa.");
        }
    } catch (e) {
        alert("Erro ao salvar no Neon.");
    }
};

// ==========================================
// UTILITÁRIOS
// ==========================================

function extrairHora(dataISO) {
    if (!dataISO) return "--:--";
    const d = new Date(dataISO);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function encerrarTurno() {
    if (confirm("Deseja realmente encerrar o turno e sair?")) {
        localStorage.clear();
        window.location.href = '../usuario/login.html';
    }
}