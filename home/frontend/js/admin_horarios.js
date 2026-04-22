// 1. DEFINIÇÃO DA URL DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. SEGURANÇA: VERIFICAR SE É ADMIN
async function verificarAdmin(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${token}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
        return false;
    }
}

// --- ELEMENTOS DO DOM ---
const blockDayForm = document.getElementById('blockDayForm');
const blockedDaysList = document.getElementById('blockedDaysList');
const loadingBlockedDays = document.getElementById('loadingBlockedDays');
const lojaSelectHorarios = document.getElementById('loja-select-horarios');
const storesSelectBlockDay = document.getElementById('block-store');

// --- 3. CARREGAMENTO INICIAL (LOJAS) ---
async function carregarLojas() {
    try {
        const token = localStorage.getItem('token');
        // Rota corrigida para usar o API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/api/admin/lojas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const lojas = await response.json();

        if (Array.isArray(lojas)) {
            const optionsHtml = lojas.map(l => `<option value="${l.id_loja || l.id}">${l.nome_loja}</option>`).join('');
            
            if (lojaSelectHorarios) {
                lojaSelectHorarios.innerHTML = '<option value="" selected disabled>Selecione uma loja...</option>' + optionsHtml;
            }
            if (storesSelectBlockDay) {
                storesSelectBlockDay.innerHTML = '<option value="ALL">Todas as Lojas</option>' + optionsHtml;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar lojas:", error);
    }
}

// --- 4. GESTÃO DE BLOQUEIOS (Feriados/Manutenção) ---
async function carregarBloqueios() {
    if (!blockedDaysList) return;
    loadingBlockedDays.style.display = 'block';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/dias-bloqueados`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const bloqueios = await response.json();

        loadingBlockedDays.style.display = 'none';

        if (Array.isArray(bloqueios) && bloqueios.length > 0) {
            blockedDaysList.innerHTML = bloqueios.map(b => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${new Date(b.data_bloqueada).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong> 
                        <span class="badge bg-secondary ms-2">${b.nome_loja || 'Todas as Lojas'}</span>
                        <br><small class="text-muted">${b.motivo || 'Sem motivo'}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.removerBloqueio(${b.id_bloqueio || b.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `).join('');
        } else {
            blockedDaysList.innerHTML = '<li class="list-group-item text-muted text-center">Nenhum dia bloqueado.</li>';
        }
    } catch (error) {
        loadingBlockedDays.style.display = 'none';
        blockedDaysList.innerHTML = '<li class="list-group-item text-danger text-center">Erro ao carregar lista do banco.</li>';
    }
}

// --- 5. BLOQUEAR UM NOVO DIA ---
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/bloquear-dia`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert("Dia bloqueado com sucesso!");
                blockDayForm.reset();
                carregarBloqueios();
            } else {
                const erro = await response.json();
                alert(`Erro: ${erro.mensagem || 'Falha ao bloquear o dia.'}`);
            }
        } catch (error) {
            alert("Erro ao conectar com o servidor Python.");
        } finally {
            btn.disabled = false;
        }
    });
}

// --- 6. FUNÇÃO GLOBAL PARA REMOVER BLOQUEIO ---
window.removerBloqueio = async (id) => {
    if (!confirm("Deseja desbloquear este dia?")) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/remover-bloqueio/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert("Dia liberado com sucesso!");
            carregarBloqueios();
        } else {
            alert("Erro ao tentar desbloquear no servidor.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
};

   // --- 7. INICIALIZAÇÃO DA PÁGINA ---
   document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('usuario_id'); // Pegamos o ID, não o token
    
    if (!userId) {
        window.location.href = '../usuario/login.html';
        return;
    }

    // Passamos o ID para a rota de verificação
    const isAdmin = await verificarAdmin(userId); 
    if (!isAdmin) {
        alert("Acesso restrito!");
        window.location.href = '../usuario/login.html';
        return; 
    }

    carregarLojas();
    carregarBloqueios();
});
