// 1. DEFINIÇÃO DA URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

// --- GERAÇÃO DE HTML PARA A TABELA ---
function createAppointmentRowHtml(ag) {
    const dataFormatada = new Date(ag.data_hora_inicio).toLocaleString('pt-BR');
    const statusClass = ag.status === 'confirmado' ? 'bg-success' : 'bg-warning';

    return `
        <tr>
            <td><strong>${ag.dono_nome || 'N/A'}</strong><br><small class="text-muted">${ag.dono_tel || ''}</small></td>
            <td>${ag.nome_pet || 'N/A'}</td>
            <td><span class="badge bg-info text-dark">${ag.nome_servico || 'Serviço'}</span></td>
            <td>${dataFormatada}</td>
            <td><span class="badge ${statusClass}">${ag.status || 'pendente'}</span></td>
            <td>
                <button class="btn btn-sm btn-success mb-1" onclick="window.avisarWhatsapp('${ag.dono_tel}', '${ag.dono_nome}', '${ag.nome_pet}', '${ag.nome_servico}', '${ag.data_hora_inicio}')">
                    <i class="bi bi-whatsapp"></i> Avisar
                </button>
                <button class="btn btn-sm btn-outline-danger mb-1" onclick="window.cancelarAgendamento(${ag.id_agendamento || ag.id})">
                    <i class="bi bi-x-circle"></i>
                </button>
            </td>
        </tr>`;
}

// --- CARREGAMENTO INICIAL VIA API ---
async function loadAndDisplayAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    const loadingRow = document.getElementById('loading-row-appointments');
    const noAppointmentsRow = document.getElementById('no-appointments-row');

    try {
        const token = localStorage.getItem('token'); // Pega o token do login
        
        // Bate na rota de admin do seu app.py
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const agendamentos = await response.json();

        loadingRow.style.display = 'none';
        
        // Se a resposta for um erro (ex: não autorizado)
        if (!response.ok) throw new Error(agendamentos.mensagem || "Erro na API");

        // Limpa a tabela
        const existingRows = tableBody.querySelectorAll("tr:not(#loading-row-appointments):not(#no-appointments-row)");
        existingRows.forEach(row => row.remove());

        // Se o Python retornar uma lista válida
        if (Array.isArray(agendamentos) && agendamentos.length > 0) {
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
        tableBody.insertAdjacentHTML('beforeend', `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados do banco: ${error.message}</td></tr>`);
    }
}

// --- FUNÇÕES GLOBAIS (Botões) ---
window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    if (!telefone || telefone === 'undefined') {
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
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(response.ok) {
            alert('Agendamento cancelado!');
            loadAndDisplayAppointments(); // Recarrega a tabela
        } else {
            alert("Erro ao cancelar no servidor.");
        }
    } catch (error) {
        console.error(error);
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