/**
 * js/meus_agendamentos.js - Histórico e gerenciamento de agendamentos do cliente
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

let agendamentosCliente = [];
let agendamentoEmEdicao = null;
let modalAcaoAgendamento = null;
let sequenciaBuscaHorarios = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const clienteId = localStorage.getItem('usuario_id');
    if (!clienteId) {
        window.location.href = '../usuario/login.html';
        return;
    }

    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair da sua conta?')) {
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }

    const modalElement = document.getElementById('appointmentActionModal');
    if (modalElement) modalAcaoAgendamento = bootstrap.Modal.getOrCreateInstance(modalElement);

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-appointment-action]');
        if (button) abrirModalAcaoAgendamento(button.dataset.appointmentId, button.dataset.appointmentAction);
    });

    document.getElementById('appointmentNewDate')?.addEventListener('change', carregarHorariosDisponiveis);
    document.getElementById('appointmentActionForm')?.addEventListener('submit', salvarAcaoAgendamento);
    window.cancelarAgendamento = id => abrirModalAcaoAgendamento(id, 'cancelar');

    await carregarAgendamentos(clienteId);

    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('agendamento_id');
    const requestedAction = params.get('acao');
    if (requestedId && requestedAction) {
        abrirModalAcaoAgendamento(requestedId, requestedAction);
    }
});

async function carregarAgendamentos(id) {
    const container = document.getElementById('lista-agendamentos-cliente');
    const mobileContainer = document.getElementById('lista-agendamentos-mobile');
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border" style="color: var(--brand-pink)" role="status"></div><p class="mt-2 text-muted small">Sincronizando agendamentos...</p></div>';
    if (mobileContainer) mobileContainer.innerHTML = '<p class="text-center py-4 text-muted">Carregando agendamentos...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error('Falha ao carregar agendamentos.');
        const agendamentos = await response.json();
        agendamentosCliente = Array.isArray(agendamentos) ? agendamentos : [];
        renderizarAgendamentos(agendamentosCliente, container, mobileContainer);
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        container.innerHTML = '<p class="text-danger text-center">Erro ao carregar dados.</p>';
        if (mobileContainer) mobileContainer.innerHTML = '<p class="text-danger text-center py-3 mb-0">Erro ao carregar dados.</p>';
    }
}

function renderizarAgendamentos(agendamentos, container, mobileContainer) {
    if (agendamentos.length === 0) {
        const emptyState = `
            <div class="text-center py-5">
                <i class="bi bi-calendar-x fs-1 text-muted"></i>
                <p class="text-muted mt-3">Nenhum agendamento encontrado.</p>
                <a href="../servicos/agendamento-fluxo.html" class="btn btn-brand rounded-pill px-4">Agendar Agora</a>
            </div>`;
        container.innerHTML = `<div class="col-12">${emptyState}</div>`;
        if (mobileContainer) mobileContainer.innerHTML = emptyState;
        return;
    }

    const disclosures = agendamentos.map(renderizarCardAgendamento);
    container.innerHTML = disclosures.map(card => `<div class="col-md-6 mb-4">${card}</div>`).join('');
    if (mobileContainer) mobileContainer.innerHTML = disclosures.join('');
}

function renderizarCardAgendamento(ag) {
    const id = escapeHtml(ag.id_agendamento);
    const servico = escapeHtml(ag.nome_servico || 'Serviço');
    const pet = escapeHtml(ag.nome_pet || 'Meu Pet');
    const unidade = escapeHtml(ag.nome_loja || 'Unidade não informada');
    const status = String(ag.status || 'pendente').toLowerCase();
    const data = formatarDataAgendamento(ag.data_hora_inicio);
    const valor = Number(ag.valor_cobrado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const actionButtons = renderizarBotoesAcao(ag, id);

    return `<details class="mobile-disclosure card-agendamento status-${escapeHtml(status)}">
            <summary>
            <span class="text-break">${servico}</span>
            <i class="bi bi-chevron-down mobile-disclosure-chevron" aria-hidden="true"></i>
            </summary>
            <div class="mobile-disclosure-body">
                <dl class="row small mb-3">
                    <dt class="col-5 text-muted">Serviço</dt><dd class="col-7">${servico}</dd>
                    <dt class="col-5 text-muted">Data</dt><dd class="col-7">${escapeHtml(data.data)}</dd>
                    <dt class="col-5 text-muted">Horário</dt><dd class="col-7">${escapeHtml(data.hora)}</dd>
                    <dt class="col-5 text-muted">Valor (R$)</dt><dd class="col-7">${escapeHtml(valor)}</dd>
                    <dt class="col-5 text-muted">Pet</dt><dd class="col-7">${pet}</dd>
                    <dt class="col-5 text-muted">Unidade</dt><dd class="col-7">${unidade}</dd>
                    <dt class="col-5 text-muted">Status</dt><dd class="col-7"><span class="badge ${getStatusBadgeClass(status)}">${escapeHtml(status.replace(/_/g, ' '))}</span></dd>
                </dl>
                ${actionButtons ? `<div class="d-flex flex-wrap gap-2">${actionButtons}</div>` : ''}
            </div>
        </details>`;
}

function renderizarBotoesAcao(agendamento, id) {
    if (!['pendente', 'confirmado'].includes(String(agendamento.status || '').toLowerCase())) return '';
    return `
        <button type="button" class="btn btn-outline-dark btn-sm rounded-pill" data-appointment-action="remarcar" data-appointment-id="${id}">Remarcar</button>
        <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill" data-appointment-action="alterar_horario" data-appointment-id="${id}">Alterar Horário</button>
        <button type="button" class="btn btn-outline-danger btn-sm rounded-pill" data-appointment-action="cancelar" data-appointment-id="${id}"><i class="bi bi-x-circle me-1"></i>Cancelar</button>`;
}

function abrirModalAcaoAgendamento(id, acao) {
    const agendamento = agendamentosCliente.find(item => String(item.id_agendamento) === String(id));
    if (!agendamento || !modalAcaoAgendamento) {
        if (!agendamento) alert('Não foi possível localizar esse agendamento.');
        return;
    }
    if (!['cancelar', 'remarcar', 'alterar_horario'].includes(acao)) return;

    agendamentoEmEdicao = agendamento;
    document.getElementById('appointmentActionId').value = agendamento.id_agendamento;
    document.getElementById('appointmentActionType').value = acao;
    document.getElementById('appointmentActionReason').value = '';

    const agendarHorario = acao !== 'cancelar';
    const camposHorario = document.getElementById('appointmentTimeFields');
    const campoData = document.getElementById('appointmentNewDate');
    const campoHora = document.getElementById('appointmentNewTime');
    camposHorario.classList.toggle('d-none', !agendarHorario);
    campoData.required = agendarHorario;
    campoHora.required = agendarHorario;
    document.getElementById('appointmentActionModalTitle').textContent =
        acao === 'cancelar' ? 'Cancelar agendamento' : acao === 'remarcar' ? 'Remarcar agendamento' : 'Alterar horário';
    document.getElementById('appointmentActionDescription').textContent =
        acao === 'cancelar'
            ? 'O cancelamento será registrado para a equipe acompanhar.'
            : 'Escolha uma data e um horário disponíveis para atualizar sua reserva.';
    document.getElementById('appointmentActionSubmit').textContent =
        acao === 'cancelar' ? 'Confirmar cancelamento' : 'Salvar novo horário';

    if (agendarHorario) {
        const hoje = new Date();
        campoData.min = dataLocalISO(hoje);
        campoData.value = dataLocalISO(new Date(agendamento.data_hora_inicio));
        campoHora.innerHTML = '<option value="">Carregando horários...</option>';
        carregarHorariosDisponiveis();
    }
    modalAcaoAgendamento.show();
}

async function carregarHorariosDisponiveis() {
    const campoHora = document.getElementById('appointmentNewTime');
    const data = document.getElementById('appointmentNewDate').value;
    if (!campoHora || !data || !agendamentoEmEdicao) return;
    const sequenciaAtual = ++sequenciaBuscaHorarios;
    if (!agendamentoEmEdicao.id_loja || !agendamentoEmEdicao.id_servico) {
        campoHora.innerHTML = '<option value="">Dados da unidade/serviço indisponíveis</option>';
        return;
    }

    campoHora.innerHTML = '<option value="">Carregando horários...</option>';
    try {
        const params = new URLSearchParams({
            loja_id: agendamentoEmEdicao.id_loja,
            servico_id: agendamentoEmEdicao.id_servico,
            data
        });
        const response = await fetch(`${API_BASE_URL}/api/horarios-disponiveis?${params}`);
        if (!response.ok) throw new Error('Não foi possível consultar os horários.');
        const slots = await response.json();
        if (sequenciaAtual !== sequenciaBuscaHorarios) return;
        campoHora.innerHTML = '<option value="">Selecione um horário</option>';
        if (!Array.isArray(slots) || slots.length === 0) {
            campoHora.innerHTML = '<option value="">Nenhum horário disponível nessa data</option>';
            return;
        }
        slots.forEach(horario => campoHora.add(new Option(horario, horario)));
    } catch (error) {
        if (sequenciaAtual !== sequenciaBuscaHorarios) return;
        console.error('Erro ao consultar horários:', error);
        campoHora.innerHTML = '<option value="">Erro ao carregar horários</option>';
    }
}

async function salvarAcaoAgendamento(event) {
    event.preventDefault();
    const clienteId = localStorage.getItem('usuario_id');
    const id = document.getElementById('appointmentActionId').value;
    const acao = document.getElementById('appointmentActionType').value;
    const submit = document.getElementById('appointmentActionSubmit');
    const payload = {
        id_cliente: clienteId,
        acao,
        motivo: document.getElementById('appointmentActionReason').value.trim()
    };

    if (acao !== 'cancelar') {
        const data = document.getElementById('appointmentNewDate').value;
        const horario = document.getElementById('appointmentNewTime').value;
        if (!data || !horario) {
            alert('Selecione uma data e um horário disponíveis.');
            return;
        }
        payload.data_hora_inicio = `${data}T${horario}:00`;
    } else if (!confirm('Confirma o cancelamento deste agendamento?')) {
        return;
    }

    submit.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${encodeURIComponent(id)}/solicitar-alteracao`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o agendamento.');

        modalAcaoAgendamento.hide();
        window.history.replaceState({}, document.title, window.location.pathname);
        alert(result.mensagem || 'Agendamento atualizado. A equipe foi notificada.');
        await carregarAgendamentos(clienteId);
    } catch (error) {
        alert(error.message || 'Erro de comunicação ao atualizar o agendamento.');
    } finally {
        submit.disabled = false;
    }
}

function formatarDataAgendamento(valor) {
    if (!valor) return { data: 'Data a confirmar', hora: 'Horário a confirmar' };
    const date = new Date(valor);
    if (Number.isNaN(date.getTime())) return { data: 'Data a confirmar', hora: 'Horário a confirmar' };
    return {
        data: date.toLocaleDateString('pt-BR'),
        hora: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
}

function dataLocalISO(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function getStatusBadgeClass(status) {
    switch (String(status).toLowerCase()) {
        case 'confirmado': return 'bg-success text-white';
        case 'pendente': return 'bg-warning text-dark';
        case 'concluido': return 'bg-info text-white';
        case 'cancelado': return 'bg-danger text-white';
        case 'em_andamento': return 'bg-primary text-white';
        default: return 'bg-secondary text-white';
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}
