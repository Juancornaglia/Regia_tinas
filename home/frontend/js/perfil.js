// 1. CONFIGURAÇÃO GERAL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // Inicialização
    carregarDadosUsuario(userId);
    carregarPets(userId);
    carregarAgendamentos(userId);
    
    // Nome no greeting
    const nomeSalvo = localStorage.getItem('usuario_nome');
    if(nomeSalvo) document.getElementById('user-greeting').innerText = nomeSalvo.split(' ')[0];

    // Listeners
    document.getElementById('btnSalvarPerfil')?.addEventListener('click', () => salvarPerfil(userId));
    document.getElementById('form-cadastro-pet')?.addEventListener('submit', (e) => cadastrarPet(e, userId));
    
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if(confirm('Deseja sair da sua conta?')) {
            localStorage.clear();
            window.location.href = '../index.html';
        }
    });
});

// 2. FUNÇÃO: CARREGAR DADOS DO PERFIL
async function carregarDadosUsuario(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/usuario/dados/${id}`);
        
        // CORREÇÃO: Verifica se a resposta está OK antes de ler o JSON
        if (!response.ok) throw new Error("Erro ao buscar dados do usuário");
        
        const data = await response.json();
        
        document.getElementById('nome_completo').value = data.nome_completo || '';
        document.getElementById('telefone').value = data.telefone || '';
        document.getElementById('email_display').value = data.email || '';
        
    } catch (e) { console.error("Erro perfil:", e); }
}

async function salvarPerfil(id) {
    const btn = document.getElementById('btnSalvarPerfil');
    btn.disabled = true; btn.innerText = "Salvando...";

    const payload = {
        nome_completo: document.getElementById('nome_completo').value,
        telefone: document.getElementById('telefone').value
    };

    try {
        // CORREÇÃO: Rota ajustada para bater com o app.py (atualizar-perfil)
        const response = await fetch(`${API_BASE_URL}/api/usuario/atualizar-perfil/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Perfil atualizado!");
            localStorage.setItem('usuario_nome', payload.nome_completo);
        } else {
            alert("Erro ao atualizar o perfil. Tente novamente.");
        }
    } catch (e) { alert("Erro ao conectar."); }
    finally { btn.disabled = false; btn.innerText = "Salvar Alterações"; }
}

// 3. FUNÇÃO: CARREGAR E CADASTRAR PETS
async function carregarPets(id) {
    const container = document.getElementById('lista-pets');
    try {
        const response = await fetch(`${API_BASE_URL}/api/meus-pets/${id}`);
        
        // CORREÇÃO: Verifica erro antes do JSON
        if (!response.ok) throw new Error("Erro ao carregar pets");
        
        const pets = await response.json();

        if (pets.length === 0) {
            container.innerHTML = '<p class="text-muted p-3">Nenhum pet cadastrado.</p>';
            return;
        }

        container.innerHTML = pets.map(pet => `
            <div class="col-md-6">
                <div class="pet-mini-card d-flex align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-0">${pet.nome_pet}</h6>
                        <small class="text-muted">${pet.especie} | ${pet.raca || 'SRD'}</small>
                    </div>
                    <span class="badge bg-light text-secondary border">${pet.porte}</span>
                </div>
            </div>
        `).join('');
    } catch (e) { container.innerHTML = 'Erro ao carregar pets.'; }
}

async function cadastrarPet(e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const payload = {
        id_tutor: id,
        nome_pet: document.getElementById('input_nome_pet').value,
        especie: document.getElementById('input_especie').value,
        raca: document.getElementById('input_raca').value,
        porte: document.getElementById('input_porte').value,
        observacoes: document.getElementById('input_obs').value
    };

    try {
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
            alert("Erro ao cadastrar pet.");
        }
    } catch (e) { alert("Erro de conexão."); }
    finally { btn.disabled = false; }
}

// 4. FUNÇÃO: CARREGAR AGENDAMENTOS
async function carregarAgendamentos(id) {
    const tbody = document.getElementById('tabela-meus-agendamentos');
    try {
        const response = await fetch(`${API_BASE_URL}/api/usuario/agendamentos/${id}`);
        
        // CORREÇÃO: Verifica erro antes do JSON
        if (!response.ok) throw new Error("Erro ao carregar agendamentos");

        const agendamentos = await response.json();

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Sem agendamentos futuros.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => `
            <tr>
                <td>${new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</td>
                <td><i class="bi bi-paw me-1"></i>${ag.nome_pet}</td>
                <td>${ag.nome_servico}</td>
                <td><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span></td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar.</td></tr>'; }
}