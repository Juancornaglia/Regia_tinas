/**
 * js/perfil.js - Gestão Unificada do Cliente (Regia & Tinas Care)
 */

// 1. CONFIGURAÇÃO DA URL DINÂMICA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('usuario_id');
    
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // --- INICIALIZAÇÃO ---
    carregarDadosUsuario(userId);
    carregarPontosFidelidade(userId);
    carregarPets(userId);
    carregarAgendamentos(userId);
    
    // Greeting (Nome no topo)
    const nomeSalvo = localStorage.getItem('usuario_nome');
    if (nomeSalvo) {
        const greetingElement = document.getElementById('user-greeting');
        if (greetingElement) greetingElement.innerText = nomeSalvo.split(' ')[0];
    }

    // --- EVENT LISTENERS ---
    document.getElementById('btnSalvarPerfil')?.addEventListener('click', () => salvarPerfil(userId));
    
    document.getElementById('form-cadastro-pet')?.addEventListener('submit', (e) => cadastrarPet(e, userId));
    
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Deseja realmente sair da sua conta?')) {
            localStorage.clear();
            window.location.href = '../index.html';
        }
    });
});

// --- 2. GESTÃO DE PERFIL E FIDELIDADE ---

async function carregarDadosUsuario(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/usuario/dados/${id}`);
        const data = await response.json();
        
        if (document.getElementById('nome_completo')) document.getElementById('nome_completo').value = data.nome_completo || '';
        if (document.getElementById('telefone')) document.getElementById('telefone').value = data.telefone || '';
        if (document.getElementById('email_display')) document.getElementById('email_display').value = data.email || '';
        
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
    }
}

async function carregarPontosFidelidade(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/fidelidade/${id}`);
        const data = await response.json();
        const el = document.getElementById('saldo-fidelidade');
        if (el) el.innerText = `${data.total || 0} Pontos`;
    } catch (e) {
        console.error("Erro fidelidade");
    }
}

async function salvarPerfil(id) {
    const btn = document.getElementById('btnSalvarPerfil');
    const originalText = btn.innerText;
    const payload = {
        nome_completo: document.getElementById('nome_completo').value,
        telefone: document.getElementById('telefone').value
    };

    try {
        btn.disabled = true;
        btn.innerText = "Salvando...";
        const response = await fetch(`${API_BASE_URL}/api/perfil/atualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, ...payload })
        });

        if (response.ok) {
            alert("Perfil atualizado!");
            localStorage.setItem('usuario_nome', payload.nome_completo);
        }
    } catch (error) {
        alert("Erro ao salvar.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// --- 3. GESTÃO DE PETS ---

async function carregarPets(id) {
    const container = document.getElementById('lista-pets');
    if (!container) return;

    try {
        // Rota unificada: /api/pets/usuario/
        const response = await fetch(`${API_BASE_URL}/api/pets/usuario/${id}`);
        const pets = await response.json();

        if (pets.length === 0) {
            container.innerHTML = '<p class="text-muted p-3">Nenhum pet cadastrado.</p>';
            return;
        }

        container.innerHTML = pets.map(pet => `
            <div class="col-md-6 mb-3">
                <div class="pet-mini-card d-flex align-items-center p-3 border rounded shadow-sm bg-white" style="border-left: 5px solid #FE8697 !important;">
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-0">${pet.nome_pet}</h6>
                        <small class="text-muted">${pet.especie} | ${pet.raca || 'SRD'}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-light text-secondary border d-block mb-2">${pet.porte}</span>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="confirmarExclusaoPet('${pet.id_pet}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Erro ao carregar pets.</p>';
    }
}

async function cadastrarPet(e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const payload = {
        id_tutor: id,
        nome_pet: document.getElementById('input_nome_pet').value,
        especie: document.getElementById('input_especie').value,
        raca: document.getElementById('input_raca').value,
        porte: document.getElementById('input_porte').value,
        observacoes: document.getElementById('input_obs').value
    };

    try {
        btn.disabled = true;
        const response = await fetch(`${API_BASE_URL}/api/pets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Pet cadastrado!");
            e.target.reset();
            if (typeof toggleFormPet === 'function') toggleFormPet(); 
            carregarPets(id);
        }
    } catch (error) {
        alert("Erro na conexão.");
    } finally {
        btn.disabled = false;
    }
}

window.confirmarExclusaoPet = async (idPet) => {
    if (!confirm("Excluir este pet?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/pets/${idPet}`, { method: 'DELETE' });
        if (response.ok) {
            alert("Pet removido.");
            carregarPets(localStorage.getItem('usuario_id'));
        }
    } catch (error) {
        alert("Erro ao excluir.");
    }
};

// --- 4. HISTÓRICO DE AGENDAMENTOS ---

async function carregarAgendamentos(id) {
    const tbody = document.getElementById('tabela-meus-agendamentos');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${id}`);
        const agendamentos = await response.json();

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Sem agendamentos.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => `
            <tr>
                <td>${new Date(ag.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td><strong>${ag.nome_pet}</strong></td>
                <td>${ag.servico_nome}</td>
                <td>
                    <span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning text-dark'} text-uppercase">
                        ${ag.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Erro ao carregar histórico.</td></tr>';
    }
}