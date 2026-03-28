// 1. CONFIGURAÇÃO DA URL (Sempre no topo do arquivo)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. FUNÇÃO PARA VERIFICAR ADMIN
async function verificarAdmin(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const formPet = document.getElementById('formCadastroPet');
    const listaPets = document.getElementById('lista-pets');
    const tutorId = localStorage.getItem('usuario_id'); // ID que salvamos no Login

    // 3. VERIFICAÇÃO DE LOGIN
    if (!tutorId) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        window.location.href = '../login.html';
        return;
    }

    // --- 4. FUNÇÃO PARA LISTAR OS PETS NA TELA ---
    async function carregarPets() {
        try {
            // Usando a API_BASE_URL dinâmica
            const response = await fetch(`${API_BASE_URL}/api/meus-pets/${tutorId}`);
            const pets = await response.json();

            if (!response.ok) throw new Error("Erro ao buscar pets.");

            if (listaPets) {
                if (!pets || pets.length === 0) {
                    listaPets.innerHTML = '<p class="text-muted">Nenhum pet cadastrado ainda.</p>';
                    return;
                }

                listaPets.innerHTML = pets.map(pet => `
                    <div class="card mb-2 shadow-sm">
                        <div class="card-body">
                            <i class="bi bi-paw-fill text-primary"></i> 
                            <strong>${pet.nome_pet}</strong> - <small>${pet.raca || 'SRD'}</small>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error("Erro ao carregar lista:", error);
            if (listaPets) listaPets.innerHTML = '<p class="text-danger">Erro ao carregar pets.</p>';
        }
    }

    // --- 5. FUNÇÃO PARA CADASTRAR O PET ---
    if (formPet) {
        formPet.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = formPet.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = "Salvando...";

            const petDados = {
                id_tutor: tutorId,
                nome_pet: document.getElementById('nome_pet').value.trim(),
                especie: document.getElementById('especie').value,
                raca: document.getElementById('raca').value.trim(),
                porte: document.getElementById('porte').value,
                observacoes: document.getElementById('observacoes').value.trim()
            };

            try {
                // Usando a API_BASE_URL dinâmica
                const response = await fetch(`${API_BASE_URL}/api/cadastrar-pet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(petDados)
                });

                if (response.ok) {
                    alert("Pet cadastrado com sucesso!");
                    formPet.reset();
                    carregarPets(); // Atualiza a lista na hora
                } else {
                    const erro = await response.json();
                    alert("Erro ao cadastrar: " + (erro.error || erro.mensagem));
                }
            } catch (error) {
                console.error("Erro no cadastro de pet:", error);
                alert("Erro de conexão com o servidor.");
            } finally {
                btn.disabled = false;
                btn.textContent = "CADASTRAR PET";
            }
        });
    }

    // Inicia carregando os pets existentes
    carregarPets();
});