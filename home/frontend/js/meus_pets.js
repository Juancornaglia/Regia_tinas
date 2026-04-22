// 1. CONFIGURAÇÃO DA URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', async () => {
    const formPet = document.getElementById('formCadastroPet');
    const listaPets = document.getElementById('lista-pets');
    const tutorId = localStorage.getItem('usuario_id');

    // 2. VERIFICAÇÃO DE LOGIN
    if (!tutorId) {
        window.location.href = 'login.html';
        return;
    }

    // --- 3. CARREGAR PETS DO BANCO NEON ---
    async function carregarPets() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/meus-pets/${tutorId}`);
            const pets = await response.json();

            if (!listaPets) return;

            if (pets.length === 0) {
                listaPets.innerHTML = `
                    <div class="col-12 text-center py-5 bg-white rounded-4 shadow-sm">
                        <i class="bi bi-patch-question text-muted" style="font-size: 3rem;"></i>
                        <h5 class="mt-3 text-muted">Você ainda não cadastrou nenhum pet.</h5>
                    </div>`;
                return;
            }

            listaPets.innerHTML = pets.map(pet => `
                <div class="col-md-6 col-lg-4">
                    <div class="card pet-card h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="rounded-circle bg-light p-3 me-3">
                                <i class="bi bi-paw-fill fs-3 text-brand"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h5 class="card-title fw-bold mb-0">${pet.nome_pet}</h5>
                                <small class="text-muted text-capitalize">${pet.especie} • ${pet.raca || 'SRD'}</small>
                                <div class="mt-2">
                                    <span class="badge bg-light text-secondary border">${pet.porte}</span>
                                </div>
                            </div>
                            <button class="btn btn-sm text-danger border-0" onclick="window.excluirPet(${pet.id_pet})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error(error);
            listaPets.innerHTML = '<p class="text-danger text-center">Erro ao conectar com o servidor.</p>';
        }
    }

    // --- 4. CADASTRAR PET VIA MODAL ---
    if (formPet) {
        formPet.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = formPet.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = "Salvando...";

            const petDados = {
                id_tutor: tutorId,
                nome_pet: document.getElementById('nome_pet').value.trim(),
                especie: document.getElementById('especie').value.trim(),
                raca: document.getElementById('raca').value.trim(),
                porte: document.getElementById('porte').value,
                observacoes: document.getElementById('observacoes').value.trim()
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/cadastrar-pet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(petDados)
                });

                if (response.ok) {
                    alert("Pet cadastrado com sucesso!");
                    
                    // Fecha o modal do Bootstrap
                    const modalEl = document.getElementById('petModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();

                    formPet.reset();
                    carregarPets(); // Recarrega a lista
                } else {
                    alert("Erro ao salvar pet no servidor.");
                }
            } catch (error) {
                alert("Erro de conexão.");
            } finally {
                btn.disabled = false;
                btn.innerText = "Salvar Pet";
            }
        });
    }

    // --- 5. EXCLUIR PET ---
    window.excluirPet = async (id) => {
        if(confirm("Deseja remover este pet da sua lista?")) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/pet/excluir/${id}`, { method: 'DELETE' });
                if(response.ok) carregarPets();
            } catch (e) { alert("Erro ao excluir."); }
        }
    }

    carregarPets();
});