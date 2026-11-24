/**
 * js/operacional_funcionario.js - Lógica da Fila de Trabalho
 * Gerencia o Kanban, o Formulário de Ações e a Validação por CPF
 */

const FILA_API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

// Estado Global da Tela
let atendimentosHoje = [];
let acaoSelecionada = 'adicionar'; 

document.addEventListener('DOMContentLoaded', () => {
    console.log("🛠️ Sistema de Fila Operacional iniciado...");
    
    // 1. Inicializa os Listeners do Formulário
    configurarListenersFormulario();
    
    // 2. Busca os dados reais do Banco Neon
    carregarFilaDoBanco();
});

// ==========================================
// 1. GERENCIAMENTO DO FORMULÁRIO (MODAL)
// ==========================================

function configurarListenersFormulario() {
    const radioButtons = document.querySelectorAll('input[name="tipo_acao"]');
    const formCampos = document.getElementById('campos-form');
    const campoIdAgendamento = document.getElementById('campo-id-agendamento');
    const selectAlvo = document.getElementById('select-agendamento-alvo');
    const btnAvancar = document.getElementById('btn-avancar-fila');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            acaoSelecionada = e.target.value;
            atualizarInterfaceForm(acaoSelecionada, formCampos, campoIdAgendamento, btnAvancar);
        });
    });

    // Preenche os campos automaticamente ao escolher um agendamento para alterar
    if (selectAlvo) {
        selectAlvo.addEventListener('change', (e) => {
            const ag = atendimentosHoje.find(item => String(item.id_agendamento || item.id) === String(e.target.value));
            if (ag) {
                document.getElementById('form-pet').value = ag.nome_pet || '';
                document.getElementById('form-tutor').value = ag.cliente_nome || ag.nome_cliente || '';
                if (ag.data_hora_inicio) {
                    const dt = new Date(ag.data_hora_inicio);
                    const localISO = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    document.getElementById('form-data').value = localISO;
                }
            }
        });
    }
}

function atualizarInterfaceForm(acao, container, campoId, botao) {
    if (!container || !botao) return;

    if (acao === 'cancelar') {
        if (campoId) campoId.style.display = 'block';
        container.style.opacity = '0.5';
        container.style.pointerEvents = 'none';
        botao.className = "btn btn-danger rounded-pill px-4 fw-bold shadow";
        botao.innerText = "CONFIRMAR CANCELAMENTO E VALIDAR CPF";
    } else if (acao === 'alterar') {
        if (campoId) campoId.style.display = 'block';
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        botao.className = "btn btn-warning text-dark rounded-pill px-4 fw-bold shadow";
        botao.innerText = "SALVAR ALTERAÇÕES E VALIDAR CPF";
    } else {
        if (campoId) campoId.style.display = 'none';
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        botao.className = "btn bg-brand-pink text-white rounded-pill px-4 fw-bold shadow";
        botao.innerText = "AVANÇAR E VALIDAR CPF";
    }
}

// ==========================================
// 2. COMUNICAÇÃO COM O BANCO (API)
// ==========================================

window.carregarFilaDoBanco = async function() {
    try {
        const response = await fetch(`${FILA_API_URL}/api/admin/agendamentos`);
        if (!response.ok) throw new Error("Erro ao buscar agendamentos.");

        const dados = await response.json();
        if (!Array.isArray(dados)) return;

        // Filtra apenas os atendimentos ativos (não finalizados e não cancelados)
        atendimentosHoje = dados.filter(a => !['concluido', 'cancelado'].includes(a.status));
        
        atualizarSelectAgendamentos();
        renderizarKanban();
    } catch (error) {
        console.error("Erro ao carregar fila:", error);
    }
};

function atualizarSelectAgendamentos() {
    const selectAlvo = document.getElementById('select-agendamento-alvo');
    if (!selectAlvo) return;

    selectAlvo.innerHTML = '<option value="">Selecione um atendimento ativo...</option>' +
        atendimentosHoje.map(a => {
            const id = a.id_agendamento || a.id;
            const tutor = a.cliente_nome || a.nome_cliente || 'Tutor';
            return `<option value="${id}">${a.nome_pet || 'Pet'} (${tutor}) - ${extrairHora(a.data_hora_inicio)}</option>`;
        }).join('');
}

// ==========================================
// 3. RENDERIZAÇÃO DO KANBAN (DINÂMICO)
// ==========================================

function renderizarKanban() {
    const colAguardando = document.getElementById('col-aguardando');
    const colAndamento = document.getElementById('col-andamento');
    const colSaida = document.getElementById('col-concluido');

    if (!colAguardando || !colAndamento || !colSaida) return;

    colAguardando.innerHTML = '';
    colAndamento.innerHTML = '';
    colSaida.innerHTML = '';

    atendimentosHoje.forEach(atend => {
        const card = criarCardHTML(atend);
        
        if (['aguardando', 'pendente', 'confirmado'].includes(atend.status)) {
            colAguardando.appendChild(card);
        } else if (['em_andamento', 'em_curso'].includes(atend.status)) {
            colAndamento.appendChild(card);
        } else if (atend.status === 'pronto') {
            colSaida.appendChild(card);
        }
    });

    if (!colAguardando.hasChildNodes()) {
        colAguardando.innerHTML = '<p class="text-muted small text-center py-4">Nenhum pet aguardando.</p>';
    }
    if (!colAndamento.hasChildNodes()) {
        colAndamento.innerHTML = '<p class="text-muted small text-center py-4">Nenhum atendimento em curso.</p>';
    }
    if (!colSaida.hasChildNodes()) {
        colSaida.innerHTML = '<p class="text-muted small text-center py-4">Nenhum pet pronto para saída.</p>';
    }
}

function criarCardHTML(a) {
    const div = document.createElement('div');
    div.className = 'task-card';
    
    if (['em_andamento', 'em_curso'].includes(a.status)) div.style.borderLeftColor = '#0d6efd';
    if (a.status === 'pronto') div.style.borderLeftColor = '#198754';

    const tutor = a.cliente_nome || a.nome_cliente || 'Tutor não informado';
    const servico = a.nome_servico || 'Atendimento';

    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <span class="pet-name">${a.nome_pet || 'Pet'}</span>
            <span class="service-badge">${servico}</span>
        </div>
        <small class="tutor-name">${tutor}</small>
        <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="small fw-bold text-muted">
                <i class="bi bi-clock me-1"></i>${extrairHora(a.data_hora_inicio)}
            </span>
            ${renderizarBotaoAcao(a)}
        </div>
    `;
    return div;
}

function renderizarBotaoAcao(a) {
    const id = a.id_agendamento || a.id;
    if (['aguardando', 'pendente', 'confirmado'].includes(a.status)) {
        return `<button class="btn btn-dark btn-sm rounded-pill px-3 fw-bold" onclick="solicitarAssinatura((funcId) => mudarStatus('${id}', 'em_andamento', funcId))">INICIAR</button>`;
    }
    if (['em_andamento', 'em_curso'].includes(a.status)) {
        return `<button class="btn btn-success btn-sm rounded-pill px-3 fw-bold" onclick="solicitarAssinatura((funcId) => mudarStatus('${id}', 'pronto', funcId))">CONCLUIR</button>`;
    }
    const tel = (a.cliente_tel || '').replace(/\D/g, '');
    const tutor = a.cliente_nome || a.nome_cliente || 'Tutor';
    return `<button class="btn btn-outline-success btn-sm rounded-pill fw-bold" onclick="notificarTutorWhatsapp('${tel}', '${tutor}', '${a.nome_pet || 'seu pet'}')"><i class="bi bi-whatsapp me-1"></i>Notificar</button>`;
}

// ==========================================
// 4. MOVIMENTAÇÃO DE STATUS E AÇÕES DO MODAL
// ==========================================

window.mudarStatus = async function(id, novoStatus, idFuncionario) {
    try {
        const res = await fetch(`${FILA_API_URL}/api/admin/agendamentos/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_agendamento: id,
                novo_status: novoStatus,
                id_funcionario_acao: idFuncionario
            })
        });

        if (res.ok) {
            carregarFilaDoBanco();
        } else {
            alert("Erro ao atualizar status no servidor.");
        }
    } catch (e) { 
        console.error("Erro ao mover card:", e); 
    }
};

window.prepararAssinaturaFila = function() {
    const idAlvo = document.getElementById('select-agendamento-alvo')?.value;

    if ((acaoSelecionada === 'alterar' || acaoSelecionada === 'cancelar') && !idAlvo) {
        alert("Selecione qual agendamento deseja alterar ou cancelar.");
        return;
    }

    // Fecha o modal de formulário antes de abrir o modal de CPF
    const modalEl = document.getElementById('modalAcaoRapida');
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();

    solicitarAssinatura(processarAcaoFila);
};

async function processarAcaoFila(idFuncionario) {
    const idAlvo = document.getElementById('select-agendamento-alvo')?.value;
    const pet = document.getElementById('form-pet')?.value.trim();
    const tutor = document.getElementById('form-tutor')?.value.trim();
    const dataHora = document.getElementById('form-data')?.value;
    const servico = document.getElementById('form-servico')?.value;

    try {
        if (acaoSelecionada === 'cancelar') {
            await mudarStatus(idAlvo, 'cancelado', idFuncionario);
            alert("✅ Atendimento cancelado com sucesso!");
            return;
        }

        const endpoint = acaoSelecionada === 'alterar'
            ? `${FILA_API_URL}/api/admin/agendamentos/${idAlvo}`
            : `${FILA_API_URL}/api/admin/agendamentos/rapido`;

        const method = acaoSelecionada === 'alterar' ? 'PUT' : 'POST';

        const res = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome_pet: pet,
                nome_cliente: tutor,
                data_hora_inicio: dataHora,
                nome_servico: servico,
                id_funcionario_acao: idFuncionario
            })
        });

        if (res.ok) {
            alert(`✅ Ação de "${acaoSelecionada}" registrada com sucesso!`);
            document.getElementById('form-fila')?.reset();
            carregarFilaDoBanco();
        } else {
            const err = await res.json();
            alert(err.error || "Não foi possível salvar a ação.");
        }
    } catch (error) {
        console.error("Erro na ação da fila:", error);
        alert("Erro de comunicação com o servidor.");
    }
}

window.notificarTutorWhatsapp = function(telefone, tutor, pet) {
    if (!telefone) {
        alert("Este tutor não possui telefone cadastrado.");
        return;
    }
    const msg = `Olá ${tutor}! 🐾 O atendimento do(a) ${pet} na Regia & Tinas Care foi concluído e já está pronto para saída!`;
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
};

function extrairHora(dataISO) {
    if (!dataISO) return "--:--";
    const d = new Date(dataISO);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}