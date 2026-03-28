// 1. DEFINIÇÃO DA URL (Sempre no topo do arquivo)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE SEU LINK DO RENDER AQUI

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
            <td><strong>${ag.nome_cliente || 'N/A'}</strong></td>
            <td>${ag.nome_pet || 'N/A'} <br><small class="text-muted">${ag.raca_pet || ''}</small></td>
            <td>${ag.nome_servico || 'Banho & Tosa'}</td>
            <td>${ag.nome_loja || 'Matriz'}</td>
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

// --- CARREGAMENTO INICIAL VIA API ---
async function loadAndDisplayAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    const loadingRow = document.getElementById('loading-row-appointments');
    const noAppointmentsRow = document.getElementById('no-appointments-row');

    if (!tableBody) return;

    try {
        // CHAMADA PARA O SEU BACKEND NO RENDER
        const response = await fetch(`${API_BASE_URL}/api/agendamentos`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.mensagem || "Erro ao buscar agendamentos");

        const agendamentos = result.data; // Ajuste conforme o formato que seu Flask retorna

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
        if (loadingRow) loadingRow.style.display = 'none';
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados do servidor.</td></tr>`;
    }
}

// --- MODAL DE DETALHES VIA API ---
async function showAppointmentDetails(appointmentId) {
    const modalBody = document.getElementById('appointmentDetailModalBody');
    modalBody.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/${appointmentId}`);
        const result = await response.json();
        const ag = result.data;

        if (ag) {
            modalBody.innerHTML = `
                <h6><strong>Dono:</strong> ${ag.nome_cliente}</h6>
                <p>📞 Tel: ${ag.telefone_cliente || 'Não informado'}</p>
                <hr>
                <h6><strong>Pet:</strong> ${ag.nome_pet}</h6>
                <p>🧬 Raça: ${ag.raca_pet} | Porte: ${ag.porte_pet || 'N/A'}</p>
                <p>📝 Obs Pet: ${ag.observacoes_pet || 'Nenhuma'}</p>
                <hr>
                <p><strong>🕒 Horário:</strong> ${formatDateTime(ag.data_hora_inicio)}</p>
                <p><strong>💬 Obs Cliente:</strong> ${ag.observacoes_cliente || 'Sem observações'}</p>
            `;
        }
    } catch (error) {
        modalBody.innerHTML = `<p class="text-danger text-center">Erro ao carregar detalhes.</p>`;
    }
}

// --- ATUALIZAÇÃO DE STATUS VIA API ---
async function changeStatus(id, novoStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/status`, {
            method: 'PUT', // Ou PATCH, dependendo da sua rota Flask
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_agendamento: id, status: novoStatus })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.mensagem);
        
        loadAndDisplayAppointments();
    } catch (error) {
        alert("Erro ao atualizar status: " + error.message);
    }
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
        
        if (btnCancel && confirm("Deseja realmente cancelar este agendamento?")) {
            changeStatus(btnCancel.dataset.id, 'cancelado');
        }
    });
});