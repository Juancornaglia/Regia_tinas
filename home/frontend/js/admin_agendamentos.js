// js/admin_agendamentos.js - COM FILTROS DE FUNCIONÁRIOS E SERVIÇOS

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    carregarFiltrosIniciais();
    loadAndDisplayAppointments();
});

// --- 1. CARREGAR FILTROS (SERVIÇOS E FUNCIONÁRIOS) ---
async function carregarFiltrosIniciais() {
    try {
        const token = localStorage.getItem('token');
        
        // Busca os Serviços
        const resServicos = await fetch(`${API_BASE_URL}/api/servicos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resServicos.ok) {
            const servicos = await resServicos.json();
            const selectServico = document.getElementById('filtro-servico');
            if (selectServico) {
                servicos.forEach(s => {
                    selectServico.insertAdjacentHTML('beforeend', `<option value="${s.id_servico}">${s.nome_servico}</option>`);
                });
            }
        }

        // Busca os Funcionários (Admin)
        const resFuncionarios = await fetch(`${API_BASE_URL}/api/admin/funcionarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resFuncionarios.ok) {
            const funcionarios = await resFuncionarios.json();
            const selectFunc = document.getElementById('filtro-funcionario');
            if (selectFunc) {
                funcionarios.forEach(f => {
                    selectFunc.insertAdjacentHTML('beforeend', `<option value="${f.id}">${f.nome_completo} (${f.funcao_detalhada || 'Staff'})</option>`);
                });
            }
        }
    } catch (error) {
        console.error("Erro ao carregar os filtros:", error);
    }
}

// --- 2. GERAÇÃO DE HTML PARA A TABELA ---
function createAppointmentRowHtml(ag) {
    const dataFormatada = new Date(ag.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    
    let statusClass = 'bg-secondary';
    if (ag.status === 'confirmado') statusClass = 'bg-primary';
    if (ag.status === 'pendente') statusClass = 'bg-warning text-dark';
    if (ag.status === 'concluido') statusClass = 'bg-success';
    if (ag.status === 'cancelado') statusClass = 'bg-danger';

    return `
        <tr>
            <td><strong>${ag.cliente_nome || 'N/A'}</strong><br><small class="text-muted">${ag.cliente_tel || ''}</small></td>
            <td><strong>${ag.nome_pet || 'N/A'}</strong><br><small class="text-muted">${ag.raca || 'SRD'}</small></td>
            <td>
                <span class="badge bg-light text-dark border">${ag.nome_servico || 'Serviço'}</span><br>
                <small class="text-muted"><i class="bi bi-person-badge me-1"></i>${ag.nome_funcionario || 'Não atribuído'}</small>
            </td>
            <td>${dataFormatada}</td>
            <td><span class="badge ${statusClass} text-capitalize">${ag.status || 'pendente'}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary rounded-circle shadow-sm" title="Editar / Remarcar" onclick="window.editarAgendamento(${ag.id_agendamento})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-success rounded-circle shadow-sm ms-1" title="Marcar como Concluído" onclick="window.concluirAgendamento(${ag.id_agendamento})"><i class="bi bi-check2-all"></i></button>
                <button class="btn btn-sm btn-success rounded-circle shadow-sm ms-1" title="Avisar no WhatsApp" onclick="window.avisarWhatsapp('${ag.cliente_tel}', '${ag.cliente_nome}', '${ag.nome_pet}', '${ag.nome_servico}', '${ag.data_hora_inicio}')"><i class="bi bi-whatsapp"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm ms-1" title="Cancelar" onclick="window.cancelarAgendamento(${ag.id_agendamento})"><i class="bi bi-x-lg"></i></button>
            </td>
        </tr>`;
}

// --- 3. CARREGAMENTO INICIAL VIA API ---
async function loadAndDisplayAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    const loadingRow = document.getElementById('loading-row-appointments');
    const noAppointmentsRow = document.getElementById('no-appointments-row');

    if (!tableBody) return;

    // Pega os valores atuais dos filtros para mandar para a API
    const servicoId = document.getElementById('filtro-servico')?.value || '';
    const funcionarioId = document.getElementById('filtro-funcionario')?.value || '';

    try {
        const token = localStorage.getItem('token'); 
        
        // Passando os filtros pela URL
        let url = `${API_BASE_URL}/api/admin/agendamentos?servico=${servicoId}&funcionario=${funcionarioId}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Erro ao buscar agendamentos.");

        const agendamentos = await response.json();

        if (loadingRow) loadingRow.style.display = 'none';
        
        const existingRows = tableBody.querySelectorAll("tr:not(#loading-row-appointments):not(#no-appointments-row)");
        existingRows.forEach(row => row.remove());

        if (Array.isArray(agendamentos) && agendamentos.length > 0) {
            if (noAppointmentsRow) noAppointmentsRow.style.display = 'none';
            agendamentos.forEach(ag => {
                tableBody.insertAdjacentHTML('beforeend', createAppointmentRowHtml(ag));
            });
        } else {
            if (noAppointmentsRow) noAppointmentsRow.style.display = 'table-row';
        }
    } catch (error) {
        if (loadingRow) loadingRow.style.display = 'none';
        tableBody.insertAdjacentHTML('beforeend', `<tr><td colspan="6" class="text-center text-danger p-4">Erro de conexão: Ligue a API Python.</td></tr>`);
    }
}

// Eventos para recarregar a tabela quando mudar os filtros
document.getElementById('filtro-servico')?.addEventListener('change', loadAndDisplayAppointments);
document.getElementById('filtro-funcionario')?.addEventListener('change', loadAndDisplayAppointments);

// Funções dos botões (Mantidas iguais)
window.cancelarAgendamento = async (id) => { /* Código mantido */ };
window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => { /* Código mantido */ };
window.editarAgendamento = (id) => { alert('Em breve: Editar agendamento ' + id); };
window.concluirAgendamento = (id) => { alert('Em breve: Concluir agendamento ' + id); };