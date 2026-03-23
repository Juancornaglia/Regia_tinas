import { supabase } from './supabaseClient.js';

// --- CONFIGURAÇÃO DE CORES E BADGES ---
function getStatusBadge(status) {
    const s = status ? status.toLowerCase() : 'pendente';
    const badges = {
        confirmado: '<span class="badge bg-success">Confirmado</span>',
        pendente: '<span class="badge bg-warning text-dark">Pendente</span>',
        cancelado: '<span class="badge bg-danger">Cancelado</span>',
        finalizado: '<span class="badge bg-secondary">Finalizado</span>'
    };
    return badges[s] || `<span class="badge bg-light text-dark">${s}</span>`;
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// --- GERAÇÃO DE HTML PARA A TABELA ---
function createAppointmentRowHtml(ag) {
    return `
        <tr id="appointment-row-${ag.id_agendamento}">
            <td><strong>${ag.perfis?.nome_completo || 'N/A'}</strong></td>
            <td>${ag.pets?.nome_pet || 'N/A'} <br><small class="text-muted">${ag.pets?.raca || ''}</small></td>
            <td>${ag.servicos?.nome_servico || 'Banho & Tosa'}</td>
            <td>${ag.lojas?.nome_loja || 'Matriz'}</td>
            <td>${formatDateTime(ag.data_hora_inicio)}</td>
            <td>${getStatusBadge(ag.status)}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info btn-view" data-id="${ag.id_agendamento}" data-bs-toggle="modal" data-bs-target="#appointmentDetailModal">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-warning btn-edit-status" data-id="${ag.id_agendamento}">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-cancel" data-id="${ag.id_agendamento}" 
                        ${['cancelado', 'finalizado'].includes(ag.status) ? 'disabled' : ''}>
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </td>
        </tr>`;
}

// --- CARREGAMENTO INICIAL ---
async function loadAndDisplayAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    const loadingRow = document.getElementById('loading-row-appointments');
    const noAppointmentsRow = document.getElementById('no-appointments-row');

    if (!tableBody) return;

    try {
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id_agendamento, data_hora_inicio, status, observacoes_cliente,
                perfis(nome_completo, telefone, email), 
                pets(nome_pet, raca, especie, observacoes), 
                servicos(nome_servico), 
                lojas(nome_loja)
            `)
            .order('data_hora_inicio', { ascending: false });

        if (error) throw error;

        loadingRow.style.display = 'none';
        
        // Limpa linhas antigas
        const existingRows = tableBody.querySelectorAll("tr:not(#loading-row-appointments):not(#no-appointments-row)");
        existingRows.forEach(row => row.remove());

        if (agendamentos && agendamentos.length > 0) {
            noAppointmentsRow.style.display = 'none';
            agendamentos.forEach(ag => {
                tableBody.insertAdjacentHTML('beforeend', createAppointmentRowHtml(ag));
            });
        } else {
            noAppointmentsRow.style.display = 'table-row';
        }
    } catch (error) {
        console.error('Erro:', error.message);
        loadingRow.style.display = 'none';
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados.</td></tr>`;
    }
}

// --- MODAL DE DETALHES ---
async function showAppointmentDetails(appointmentId) {
    const modalBody = document.getElementById('appointmentDetailModalBody');
    modalBody.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';

    const { data: ag } = await supabase
        .from('agendamentos')
        .select('*, perfis(*), pets(*), servicos(*)')
        .eq('id_agendamento', appointmentId)
        .single();

    if (ag) {
        modalBody.innerHTML = `
            <h6><strong>Dono:</strong> ${ag.perfis.nome_completo}</h6>
            <p>📞 Tel: ${ag.perfis.telefone || 'Não informado'}</p>
            <hr>
            <h6><strong>Pet:</strong> ${ag.pets.nome_pet}</h6>
            <p>🧬 Raça: ${ag.pets.raca} | Porte: ${ag.pets.porte || 'N/A'}</p>
            <p>📝 Obs Pet: ${ag.pets.observacoes || 'Nenhuma'}</p>
            <hr>
            <p><strong>🕒 Horário:</strong> ${formatDateTime(ag.data_hora_inicio)}</p>
            <p><strong>💬 Obs Cliente:</strong> ${ag.observacoes_cliente || 'Sem observações'}</p>
        `;
    }
}

// --- ATUALIZAÇÃO DE STATUS ---
async function changeStatus(id, novoStatus) {
    const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id_agendamento', id);

    if (error) alert("Erro: " + error.message);
    else loadAndDisplayAppointments();
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayAppointments();

    document.addEventListener('click', (e) => {
        const btnView = e.target.closest('.btn-view');
        const btnEdit = e.target.closest('.btn-edit-status');
        const btnCancel = e.target.closest('.btn-cancel');

        if (btnView) showAppointmentDetails(btnView.dataset.id);
        if (btnEdit) {
            const s = prompt("Novo status (pendente, confirmado, finalizado, cancelado):");
            if (s) changeStatus(btnEdit.dataset.id, s.toLowerCase());
        }
        if (btnCancel && confirm("Deseja cancelar?")) {
            changeStatus(btnCancel.dataset.id, 'cancelado');
        }
    });
});