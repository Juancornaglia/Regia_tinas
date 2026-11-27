window.renderizarNotificacoesAgendamento = function(agendamentos, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const notificacoes = (Array.isArray(agendamentos) ? agendamentos : []).flatMap(agendamento => {
        const notas = String(agendamento.observacoes_cliente || '').split(/\r?\n/);
        const marcadores = notas.filter(nota => nota.includes('[Solicitação cliente:'));
        if (marcadores.length === 0) return [];
        return [{ agendamento, mensagem: marcadores[marcadores.length - 1] }];
    });

    if (notificacoes.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <section class="alert alert-warning border-0 rounded-4 shadow-sm mb-4" aria-live="polite">
            <h5 class="fw-bold mb-3"><i class="bi bi-bell me-2"></i>Atualizações de agendamentos</h5>
            <div class="d-flex flex-column gap-2">
                ${notificacoes.map(({ agendamento, mensagem }) => {
                    const match = mensagem.match(/\[Solicitação cliente:\s*([^\]]+)\]\s*(.*)/);
                    const tipo = match ? match[1] : 'Atualização';
                    const detalhe = match ? match[2] : mensagem;
                    const pet = escaparTextoNotificacao(agendamento.nome_pet || 'Pet');
                    const cliente = escaparTextoNotificacao(agendamento.cliente_nome || agendamento.nome_cliente || 'Cliente');
                    const servico = escaparTextoNotificacao(agendamento.nome_servico || 'Atendimento');
                    return `<article class="bg-white rounded-3 p-3">
                        <div class="d-flex flex-wrap justify-content-between gap-2">
                            <strong>${escaparTextoNotificacao(tipo)}</strong>
                            <span class="badge ${agendamento.status === 'cancelado' ? 'bg-danger' : 'bg-secondary'}">${escaparTextoNotificacao(String(agendamento.status || '').replace(/_/g, ' '))}</span>
                        </div>
                        <div class="small text-muted mt-1">${cliente} · ${pet} · ${servico}</div>
                        <div class="small mt-2">${escaparTextoNotificacao(detalhe)}</div>
                    </article>`;
                }).join('')}
            </div>
        </section>`;
};

function escaparTextoNotificacao(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caracter]);
}
