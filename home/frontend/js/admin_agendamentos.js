// 1. DEFINIÇÃO DA URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

// --- GERAÇÃO DE HTML PARA A TABELA ---
function createAppointmentRowHtml(ag) {
    const dataFormatada = new Date(ag.data_hora_inicio).toLocaleString('pt-BR');
    const statusClass = ag.status === 'confirmado' ? 'bg-success' : (ag.status === 'cancelado' ? 'bg-danger' : 'bg-warning text-dark');

    // Ajuste nos nomes das chaves para bater com o padrão do banco Neon
    const nomeDono = ag.dono_nome || ag.cliente_nome || 'N/A';
    const telDono = ag.dono_tel || ag.cliente_tel || '';

    return `
        <tr>
            <td><strong>${nomeDono}</strong><br><small class="text-muted">${telDono}</small></td>
            <td>${ag.nome_pet || 'N/A'}</td>
            <td><span class="badge bg-info text-dark">${ag.nome_servico || 'Serviço'}</span></td>
            <td>${dataFormatada}</td>
            <td><span class="badge ${statusClass} text-capitalize">${ag.status || 'pendente'}</span></td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-success" onclick="window.avisarWhatsapp('${telDono}', '${nomeDono}', '${ag.nome_pet}', '${ag.nome_servico}', '${ag.data_hora_inicio}')">
                        <i class="bi bi-whatsapp"></i> Avisar
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.cancelarAgendamento(${ag.id_agendamento || ag.id})">
                        <i class="bi bi-x-circle"></i>
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
        const token = localStorage.getItem('token'); 
        
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // CORREÇÃO: Blindagem Híbrida contra erro HTML
        if (!response.ok) {
            let errorMsg = "Erro ao buscar agendamentos.";
            try {
                const errorData = await response.json();
                errorMsg = errorData.mensagem || errorData.error || errorMsg;
            } catch (err) {
                if (response.status === 403) errorMsg = "Acesso negado: você não é um administrador.";
            }
            throw new Error(errorMsg);
        }

        const agendamentos = await response.json();

        if (loadingRow) loadingRow.style.display = 'none';
        
        // Limpa a tabela (remove apenas as linhas de dados)
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
        console.error('Erro:', error.message);
        if (loadingRow) loadingRow.style.display = 'none';
        tableBody.insertAdjacentHTML('beforeend', `<tr><td colspan="6" class="text-center text-danger p-4">Erro: ${error.message}</td></tr>`);
    }
}

// --- FUNÇÕES GLOBAIS (Botões) ---
window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    if (!telefone || telefone === 'undefined' || telefone === 'null' || telefone === '') {
        alert("Telefone do cliente não encontrado!");
        return;
    }
    const data = new Date(dataHora).toLocaleDateString('pt-BR');
    const hora = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = encodeURIComponent(`Olá ${dono}! 🐾 Confirmamos o horário do(a) ${pet} para ${servico} no dia ${data} às ${hora}. Podemos confirmar?`);
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${msg}`, '_blank');
};

window.cancelarAgendamento = async (id) => {
    if(!confirm('Deseja realmente cancelar este agendamento?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/cancelar-agendamento/${id}`, { 
            method: 'POST', // Certifique-se que no app.py esta rota aceita POST ou DELETE
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(response.ok) {
            alert('Agendamento cancelado!');
            loadAndDisplayAppointments();
        } else {
            alert("Erro ao cancelar no servidor.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
};

// --- INICIALIZAÇÃO E LOGOUT ---
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayAppointments();

    document.getElementById('logout-button')?.addEventListener('click', () => {
        if(confirm('Deseja sair?')) {
            localStorage.clear();
            window.location.href = '../usuario/login.html';
        }
    });
});