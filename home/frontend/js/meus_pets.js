document.addEventListener('DOMContentLoaded', async () => {
    const formPet = document.getElementById('formCadastroPet');
    const listaPets = document.getElementById('lista-pets');
    const tutorId = localStorage.getItem('usuario_id'); // ID que salvamos no Login

    // 1. VERIFICAÇÃO DE LOGIN
    if (!tutorId) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        window.location.href = '../login.html';
        return;
    }

    // --- 2. FUNÇÃO PARA LISTAR OS PETS NA TELA ---
    async function carregarPets() {
        try {
            // Chama a rota que criamos no seu app.py
            const response = await fetch(`http://localhost:5000/api/meus-pets/${tutorId}`);
            const pets = await response.json();

            if (!response.ok) throw new Error("Erro ao buscar pets.");

            if (listaPets) {
                if (pets.length === 0) {
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
        }
    }

    // --- 3. FUNÇÃO PARA CADASTRAR O PET ---
    if (formPet) {
        formPet.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = formPet.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = "Salvando...";

            const petDados = {
                id_tutor: tutorId,
                nome_pet: document.getElementById('nome_pet').value,
                especie: document.getElementById('especie').value,
                raca: document.getElementById('raca').value,
                porte: document.getElementById('porte').value,
                observacoes: document.getElementById('observacoes').value
            };

            try {
                // Envia para uma nova rota no Python que salvará no Neon
                const response = await fetch('http://localhost:5000/api/cadastrar-pet', {
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
                    alert("Erro ao cadastrar: " + erro.error);
                }
            } catch (error) {
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