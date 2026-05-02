// js/funcionario_atividades.js
const API_BASE_URL = "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Preenche a data atual no topo
    const dataDisplay = document.getElementById('data-atual');
    if(dataDisplay) dataDisplay.innerText = new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' });

    // 2. Carregar produtos para o modal de estoque
    carregarProdutosParaConsumo();

    // 3. Lógica de busca de prontuário
    document.getElementById('btn-buscar-prontuario')?.addEventListener('click', buscarProntuarioPet);
});

async function carregarProdutosParaConsumo() {
    const select = document.getElementById('select-produto-estoque');
    if(!select) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/produtos`);
        const produtos = await res.json();
        produtos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_produto;
            opt.textContent = `${p.nome_produto} (${p.quantidade_estoque} un)`;
            select.appendChild(opt);
        });
    } catch (e) { console.error("Erro estoque:", e); }
}

async function buscarProntuarioPet() {
    const termo = document.getElementById('busca-pet-prontuario').value;
    const resDiv = document.getElementById('resultado-prontuario');
    
    resDiv.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';
    
    try {
        // Rota fictícia, você precisará criar no app.py para buscar observações dos pets
        const res = await fetch(`${API_BASE_URL}/api/admin/prontuario?pet=${termo}`);
        const data = await res.json();
        
        if(data.length > 0) {
            resDiv.innerHTML = data.map(p => `
                <div class="mb-3 border-bottom pb-2">
                    <h6 class="fw-bold">${p.nome_pet} - ${p.especie}</h6>
                    <p class="mb-1"><strong>Observações:</strong> ${p.observacoes || 'Sem notas.'}</p>
                    <small class="text-muted">Última atualização: ${new Date(p.data_atualizacao).toLocaleDateString()}</small>
                </div>
            `).join('');
        } else {
            resDiv.innerHTML = '<p class="text-center text-danger">Nenhum registro encontrado.</p>';
        }
    } catch (e) { resDiv.innerHTML = 'Erro na busca.'; }
}