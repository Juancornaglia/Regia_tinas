/**
 * js/perfil.js - Gestão do Perfil do Cliente (Regia & Tinas Care)
 * Responsável por: Dados Pessoais, Meus Pets e Histórico de Agendamentos
 */

// 1. CONFIGURAÇÃO DA URL DINÂMICA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('usuario_id');
    
    // Proteção de Rota: Se não estiver logado, tchau!
    if (!userId) {
        console.warn("Acesso negado: ID de usuário não encontrado.");
        window.location.href = 'login.html';
        return;
    }

    // --- INICIALIZAÇÃO DE DADOS ---
    carregarDadosUsuario(userId);
    carregarPets(userId);
    carregarAgendamentos(userId);
    
    // Personalização do Greeting (Nome no topo)
    const nomeSalvo = localStorage.getItem('usuario_nome');
    if (nomeSalvo) {
        const greetingElement = document.getElementById('user-greeting');
        if (greetingElement) greetingElement.innerText = nomeSalvo.split(' ')[0];
    }

    // --- EVENT LISTENERS (BOTÕES E FORMULÁRIOS) ---
    
    // Salvar alterações do Perfil
    document.getElementById('btnSalvarPerfil')?.addEventListener('click', () => salvarPerfil(userId));

    // Abrir/Fechar formulário de novo pet
    const btnNovoPet = document.getElementById('btn-abrir-cadastro-pet');
    const sessaoCadastro = document.getElementById('sessao-cadastro-pet');
    btnNovoPet?.addEventListener('click', () => {
        sessaoCadastro.style.display = sessaoCadastro.style.display === 'none' ? 'block' : 'none';
    });

    // Enviar formulário de Cadastro de Pet
    document.getElementById('form-cadastro-pet')?.addEventListener('submit', (e) => cadastrarPet(e, userId));
    
    // Botão de Logout
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Deseja realmente sair da sua conta?')) {
            localStorage.clear();
            window.location.href = '../index.html';
        }
    });
});

// --- 2. FUNÇÕES DE GESTÃO DE PERFIL ---

async function carregarDadosUsuario(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/usuario/dados/${id}`);
        if (!response.ok) throw new Error("Falha ao obter dados.");

        const data = await response.json();
        
        // Preenche os campos do formulário
        if (document.getElementById('nome_completo')) document.getElementById('nome_completo').value = data.nome_completo || '';
        if (document.getElementById('telefone')) document.getElementById('telefone').value = data.telefone || '';
        if (document.getElementById('email_display')) document.getElementById('email_display').value = data.email || '';
        
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
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

        const response = await fetch(`${API_BASE_URL}/api/usuario/atualizar-perfil/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Perfil atualizado com sucesso!");
            localStorage.setItem('usuario_nome', payload.nome_completo);
        } else {
            throw new Error("Erro na atualização.");
        }
    } catch (error) {
        alert("Não foi possível salvar as alterações.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// --- 3. GESTÃO DE PETS (CARREGAR, CADASTRAR E EXCLUIR) ---

async function carregarPets(id) {
    const container = document.getElementById('lista-pets');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/meus-pets/${id}`);
        if (!response.ok) throw new Error("Erro ao carregar lista de pets");

        const pets = await response.json();

        if (pets.length === 0) {
            container.innerHTML = '<p class="text-muted p-3">Você ainda não cadastrou nenhum pet.</p>';
            return;
        }

        container.innerHTML = pets.map(pet => `
            <div class="col-md-6 mb-3">
                <div class="pet-mini-card d-flex align-items-center p-3 border rounded shadow-sm bg-white">
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
        container.innerHTML = '<p class="text-danger">Erro ao carregar seus pets.</p>';
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
        const response = await fetch(`${API_BASE_URL}/api/cadastrar-pet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Pet cadastrado com sucesso!");
            e.target.reset();
            document.getElementById('sessao-cadastro-pet').style.display = 'none';
            carregarPets(id);
        } else {
            alert("Erro ao cadastrar pet. Verifique os campos.");
        }
    } catch (error) {
        alert("Erro de conexão com o servidor.");
    } finally {
        btn.disabled = false;
    }
}

async function confirmarExclusaoPet(idPet) {
    if (confirm("Deseja realmente excluir este pet? Esta ação não pode ser desfeita.")) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pet/excluir/${idPet}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Pet removido.");
                carregarPets(localStorage.getItem('usuario_id'));
            } else {
                const data = await response.json();
                alert(data.error || "Erro ao excluir o pet.");
            }
        } catch (error) {
            alert("Erro ao conectar com o servidor.");
        }
    }
}

// --- 4. HISTÓRICO DE AGENDAMENTOS ---

async function carregarAgendamentos(id) {
    const tbody = document.getElementById('tabela-meus-agendamentos');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/usuario/agendamentos/${id}`);
        if (!response.ok) throw new Error("Erro ao carregar agendamentos");

        const agendamentos = await response.json();

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Você ainda não possui agendamentos.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => {
            const dataFormatada = new Date(ag.data_hora_inicio).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr>
                    <td>${dataFormatada}</td>
                    <td><i class="bi bi-paw me-2 text-pink"></i>${ag.nome_pet}</td>
                    <td>${ag.nome_servico}</td>
                    <td>
                        <span class="badge ${ag.status === 'confirmado' ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-warning border border-warning'}">
                            ${ag.status.toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Erro ao carregar histórico.</td></tr>';
    }
}