/**
 * js/operacional_funcionario.js - Lógica da Fila de Trabalho
 * Gerencia o Kanban e valida as mudanças de status por CPF
 */

const FILA_API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

// Estado Global da Tela
let atendimentosHoje = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema de Fila Operacional iniciado.");
    configurarDragAndDropFila();
    carregarFilaDoBanco();
    window.setInterval(carregarFilaDoBanco, 15000);
});

// Carrega os atendimentos ativos e atualiza os cards do Kanban.

window.carregarFilaDoBanco = async function() {
    try {
        const response = await fetch(`${FILA_API_URL}/api/admin/agendamentos`);
        if (!response.ok) throw new Error("Erro ao buscar agendamentos.");

        const dados = await response.json();
        if (!Array.isArray(dados)) return;

        window.renderizarNotificacoesAgendamento?.(dados, 'employee-appointment-notifications');
        atendimentosHoje = dados.filter(a => a.status !== 'cancelado');
        
        renderizarKanban();
    } catch (error) {
        console.error("Erro ao carregar fila:", error);
    }
};

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
        } else if (['concluido', 'pronto'].includes(atend.status)) {
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

    atualizarContadoresFila();
}

function criarCardHTML(a) {
    const div = document.createElement('div');
    div.className = 'task-card';
    div.draggable = true;
    div.dataset.agendamentoId = a.id_agendamento || a.id;
    
    if (['em_andamento', 'em_curso'].includes(a.status)) div.style.borderLeftColor = '#0d6efd';
    if (['concluido', 'pronto'].includes(a.status)) div.style.borderLeftColor = '#198754';

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

    const actionButton = div.querySelector('[data-fila-status]');
    if (actionButton) {
        actionButton.addEventListener('click', () => {
            solicitarAcaoFila(idFuncionario => mudarStatus(
                div.dataset.agendamentoId,
                actionButton.dataset.filaStatus,
                idFuncionario
            ));
        });
    }

    const notifyButton = div.querySelector('[data-fila-notify]');
    if (notifyButton) notifyButton.addEventListener('click', () => notificarTutorWhatsapp(a));

    div.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', div.dataset.agendamentoId);
        event.dataTransfer.effectAllowed = 'move';
        div.classList.add('is-dragging');
    });
    div.addEventListener('dragend', () => div.classList.remove('is-dragging'));

    return div;
}

function renderizarBotaoAcao(a) {
    if (['aguardando', 'pendente', 'confirmado'].includes(a.status)) {
        return '<button type="button" class="btn btn-dark btn-sm rounded-pill px-3 fw-bold" data-fila-status="em_andamento">INICIAR</button>';
    }
    if (['em_andamento', 'em_curso'].includes(a.status)) {
        return '<button type="button" class="btn btn-success btn-sm rounded-pill px-3 fw-bold" data-fila-status="concluido">CONCLUIR</button>';
    }
    return '<button type="button" class="btn btn-outline-success btn-sm rounded-pill fw-bold" data-fila-notify><i class="bi bi-whatsapp me-1"></i>Avisar Tutor</button>';
}

function configurarDragAndDropFila() {
    const destinos = {
        'col-aguardando': 'pendente',
        'col-andamento': 'em_andamento',
        'col-concluido': 'concluido'
    };

    Object.entries(destinos).forEach(([idColuna, status]) => {
        const coluna = document.getElementById(idColuna);
        if (!coluna) return;

        coluna.addEventListener('dragover', event => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            coluna.closest('.kanban-column')?.classList.add('drop-target-active');
        });

        coluna.addEventListener('dragleave', event => {
            if (!coluna.contains(event.relatedTarget)) {
                coluna.closest('.kanban-column')?.classList.remove('drop-target-active');
            }
        });

        coluna.addEventListener('drop', event => {
            event.preventDefault();
            coluna.closest('.kanban-column')?.classList.remove('drop-target-active');

            const id = event.dataTransfer.getData('text/plain');
            const atendimento = atendimentosHoje.find(item =>
                String(item.id_agendamento || item.id) === String(id)
            );
            if (!atendimento || atendimento.status === status) return;

            solicitarAcaoFila(idFuncionario => mudarStatus(id, status, idFuncionario));
        });
    });
}

function solicitarAcaoFila(callback) {
    const userRole = (localStorage.getItem('usuario_role') || '').toLowerCase().trim();
    if (userRole === 'admin') {
        callback(null);
        return;
    }
    if (typeof window.solicitarAssinatura === 'function') {
        window.solicitarAssinatura(callback);
        return;
    }
    alert('Não foi possível abrir a validação por CPF.');
}

function atualizarContadoresFila() {
    const contagens = {
        'count-aguardando': atendimentosHoje.filter(a => ['aguardando', 'pendente', 'confirmado'].includes(a.status)).length,
        'count-andamento': atendimentosHoje.filter(a => ['em_andamento', 'em_curso'].includes(a.status)).length,
        'count-concluido': atendimentosHoje.filter(a => ['concluido', 'pronto'].includes(a.status)).length
    };

    Object.entries(contagens).forEach(([id, quantidade]) => {
        const contador = document.getElementById(id);
        if (contador) contador.textContent = quantidade;
    });
}

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
            await carregarFilaDoBanco();
            return true;
        } else {
            alert("Erro ao atualizar status no servidor.");
            return false;
        }
    } catch (e) {
        console.error("Erro ao mover card:", e);
        return false;
    }
};

window.notificarTutorWhatsapp = function(atendimento) {
    const telefone = (atendimento.cliente_tel || atendimento.telefone || '').replace(/\D/g, '');
    if (!telefone) {
        alert('O cadastro deste tutor está sem número de WhatsApp.');
        return;
    }
    const numero = telefone.startsWith('55') ? telefone.slice(2) : telefone;
    const tutor = atendimento.cliente_nome || atendimento.nome_cliente || 'Tutor';
    const pet = atendimento.nome_pet || 'seu pet';
    const servico = atendimento.nome_servico || 'atendimento';
    const mensagem = `Olá ${tutor}! Aqui é da Regia & Tinas Care. O atendimento do(a) ${pet} (${servico}) já foi finalizado e ele(a) está cheiroso(a) e pronto(a) esperando por você.`;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer');
};

function extrairHora(dataISO) {
    if (!dataISO) return "--:--";
    const d = new Date(dataISO);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}