// --- CONFIGURAÇÃO DO BACKEND ---
// 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}

// --- ELEMENTOS DO DOM ---
const blockDayForm = document.getElementById('blockDayForm');
const blockedDaysList = document.getElementById('blockedDaysList');
const loadingBlockedDays = document.getElementById('loadingBlockedDays');
const lojaSelectHorarios = document.getElementById('loja-select-horarios');
const storesSelectBlockDay = document.getElementById('block-store');

const diasDaSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// --- 1. CARREGAMENTO INICIAL (LOJAS) ---
async function carregarLojas() {
    try {
        const response = await fetch(`${API_URL}/lojas`);
        const lojas = await response.json();

        // Preenche os dois selects de lojas da página
        const optionsHtml = lojas.map(l => `<option value="${l.id_loja}">${l.nome_loja}</option>`).join('');
        
        if (lojaSelectHorarios) {
            lojaSelectHorarios.innerHTML = '<option value="" selected disabled>Selecione uma loja...</option>' + optionsHtml;
        }
        if (storesSelectBlockDay) {
            storesSelectBlockDay.innerHTML = '<option value="ALL">Todas as Lojas</option>' + optionsHtml;
        }
    } catch (error) {
        console.error("Erro ao buscar lojas:", error);
    }
}

// --- 2. GESTÃO DE BLOQUEIOS (Feriados/Manutenção) ---
async function carregarBloqueios() {
    if (!blockedDaysList) return;
    loadingBlockedDays.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/dias-bloqueados`);
        const bloqueios = await response.json();

        loadingBlockedDays.style.display = 'none';
        blockedDaysList.innerHTML = bloqueios.map(b => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${new Date(b.data_bloqueada).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong> 
                    <span class="badge bg-secondary ms-2">${b.nome_loja || 'Todas as Lojas'}</span>
                    <br><small class="text-muted">${b.motivo || 'Sem motivo'}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="removerBloqueio(${b.id_bloqueio})">
                    <i class="bi bi-trash"></i>
                </button>
            </li>
        `).join('');
    } catch (error) {
        loadingBlockedDays.style.display = 'none';
        blockedDaysList.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar lista.</li>';
    }
}

// --- 3. BLOQUEAR UM NOVO DIA ---
if (blockDayForm) {
    blockDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = blockDayForm.querySelector('button[type="submit"]');
        btn.disabled = true;

        const dados = {
            data: document.getElementById('block-date').value,
            id_loja: document.getElementById('block-store').value,
            motivo: document.getElementById('block-reason').value
        };

        try {
            const response = await fetch(`${API_URL}/bloquear-dia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert("Dia bloqueado com sucesso!");
                blockDayForm.reset();
                carregarBloqueios();
            }
        } catch (error) {
            alert("Erro ao conectar com o servidor.");
        } finally {
            btn.disabled = false;
        }
    });
}

// --- 4. FUNÇÃO GLOBAL PARA REMOVER BLOQUEIO ---
window.removerBloqueio = async (id) => {
    if (!confirm("Deseja desbloquear este dia?")) return;

    try {
        // Criar esta rota no Python
        const response = await fetch(`${API_URL}/remover-bloqueio/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert("Dia liberado!");
            carregarBloqueios();
        }
    } catch (error) {
        alert("Erro ao remover bloqueio.");
    }
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarLojas();
    carregarBloqueios();
});