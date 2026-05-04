const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    const clienteId = localStorage.getItem('usuario_id');
    
    if (!clienteId) {
        window.location.href = 'login.html';
        return;
    }

    await carregarPets(clienteId);

    // Lógica de Cadastro de Novo Pet
    const form = document.getElementById('formCadastroPet');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = form.querySelector('button[type="submit"]');
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        const novoPet = {
            id_tutor: clienteId,
            nome_pet: document.getElementById('nome_pet').value,
            especie: document.getElementById('especie').value,
            raca: document.getElementById('raca').value,
            porte: document.getElementById('porte').value,
            observacoes: document.getElementById('observacoes').value
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/pets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoPet)
            });

            if (res.ok) {
                // Fecha o modal e limpa o formulário
                const modal = bootstrap.Modal.getInstance(document.getElementById('petModal'));
                modal.hide();
                form.reset();
                await carregarPets(clienteId); // Recarrega a lista
            } else {
                alert("Erro ao cadastrar pet. Verifique os dados.");
            }
        } catch (error) {
            console.error("Erro na conexão:", error);
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerText = 'Salvar Pet';
        }
    });
});

async function carregarPets(id) {
    const container = document.getElementById('lista-pets');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pets/usuario/${id}`);
        const pets = await response.json();

        if (!pets || pets.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-patch-question fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Você ainda não cadastrou nenhum pet.<br>Adicione seu primeiro amiguinho no botão acima!</p>
                </div>`;
            return;
        }

        container.innerHTML = pets.map(pet => `
            <div class="col-md-6 col-lg-4">
                <div class="card pet-card h-100">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-brand text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                                <i class="bi bi-paw-fill fs-4"></i>
                            </div>
                            <div class="ms-3">
                                <h5 class="fw-bold mb-0 text-dark">${pet.nome_pet}</h5>
                                <span class="badge bg-light text-brand border">${pet.especie}</span>
                            </div>
                        </div>
                        
                        <div class="small text-muted mb-3">
                            <div class="mb-1"><strong>Raça:</strong> ${pet.raca || 'SDR'}</div>
                            <div class="mb-1"><strong>Porte:</strong> ${pet.porte}</div>
                            <div class="mb-1"><strong>Observações:</strong> ${pet.observacoes || 'Nenhuma'}</div>
                        </div>

                        <div class="d-flex gap-2 mt-auto border-top pt-3">
                            <button class="btn btn-sm btn-outline-secondary rounded-pill w-100" onclick="alert('Funcionalidade de edição em breve!')">
                                <i class="bi bi-pencil me-1"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="removerPet('${pet.id_pet}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Erro ao carregar seus pets. Tente novamente.</p>';
    }
}

window.removerPet = async (idPet) => {
    if(!confirm("Deseja realmente remover este pet?")) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/${idPet}`, { method: 'DELETE' });
        if(res.ok) {
            location.reload();
        }
    } catch (e) { alert("Erro ao deletar."); }
};