const API_URL = 'http://localhost:5000/api';
const CHATEAU_SELECTED_STORE_KEY = 'chateau_selected_store';

const vitrine = document.getElementById('vitrine-produtos');
const buscaInput = document.getElementById('busca-loja');

/**
 * 1. ADICIONAR AO CARRINHO
 * Agora busca os dados do produto no seu servidor Python para garantir o preço real
 */
window.adicionarAoCarrinho = async (id_produto) => {
    try {
        // Busca a lista atualizada de produtos para pegar os detalhes
        const response = await fetch(`${API_URL}/admin/produtos`);
        const produtos = await response.json();
        const p = produtos.find(item => item.id_produto === id_produto);

        if (!p) throw new Error("Produto não encontrado");

        // Gerenciamento do localStorage do carrinho
        let carrinho = JSON.parse(localStorage.getItem('regia_cart')) || [];
        const index = carrinho.findIndex(item => item.id === id_produto);

        if (index !== -1) {
            carrinho[index].quantidade += 1;
        } else {
            carrinho.push({ 
                id: p.id_produto, 
                nome: p.nome_produto, 
                preco: p.preco, 
                img: p.url_imagem, 
                quantidade: 1 
            });
        }

        localStorage.setItem('regia_cart', JSON.stringify(carrinho));

        // Notificação Visual (Toast)
        if (window.notificar) {
            window.notificar(`${p.nome_produto} adicionado! 🛒`, "sucesso");
        }

        // Atualiza o contador na Navbar
        window.atualizarContadorGlobal();

    } catch (error) {
        console.error("Erro ao adicionar:", error);
        if (window.notificar) window.notificar("Erro ao adicionar o produto.", "erro");
    }
};

/**
 * 2. CARREGAR PRODUTOS DA UNIDADE SELECIONADA
 * Filtra automaticamente os produtos da loja que a geolocalização detectou
 */
async function carregarProdutos() {
    if (!vitrine) return;

    const savedStore = localStorage.getItem(CHATEAU_SELECTED_STORE_KEY);
    const storeInfo = savedStore ? JSON.parse(savedStore) : { id: 1, name: 'Mooca' };

    vitrine.innerHTML = `
        <div class="text-center p-5 w-100">
            <div class="spinner-border text-danger" role="status"></div>
            <p class="mt-2 text-muted">Buscando estoque na unidade ${storeInfo.name}...</p>
        </div>`;

    try {
        const response = await fetch(`${API_URL}/admin/produtos`);
        const allProducts = await response.json();

        // Filtra: só mostra se for da loja atual E se tiver estoque
        const produtosFiltrados = allProducts.filter(p => 
            p.id_loja == storeInfo.id && p.quantidade_estoque > 0
        );

        renderizarProdutos(produtosFiltrados);
        
    } catch (error) {
        console.error("Erro ao carregar vitrine:", error);
        vitrine.innerHTML = `<p class="text-danger text-center p-5">Erro ao conectar com o banco de dados.</p>`;
    }
}

/**
 * 3. RENDERIZAÇÃO DOS CARDS
 */
function renderizarProdutos(lista) {
    if (!lista || lista.length === 0) {
        vitrine.innerHTML = `
            <div class="text-center p-5 w-100">
                <i class="bi bi-box-seam display-1 text-muted"></i>
                <p class="mt-3">Nenhum produto disponível nesta unidade agora.</p>
            </div>`;
        return;
    }

    vitrine.innerHTML = lista.map(p => `
        <div class="col-6 col-md-4 col-lg-3 product-item mb-4">
            <div class="card h-100 border-0 shadow-sm rounded-4 product-card">
                <div class="position-relative">
                    <img src="${p.url_imagem || 'img/placeholder-pet.png'}" 
                         class="card-img-top" 
                         style="height: 180px; object-fit: cover;"
                         onerror="this.src='img/placeholder-pet.png'">
                    ${p.quantidade_estoque < 5 ? '<span class="badge bg-warning position-absolute top-0 start-0 m-2">Poucas unidades!</span>' : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h6 class="fw-bold mb-1">${p.nome_produto}</h6>
                    <p class="text-muted small">${p.marca || 'Regia & Tinas Care'}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="text-dark fw-bold">R$ ${Number(p.preco).toFixed(2)}</span>
                        <button class="btn btn-rosa btn-sm" onclick="adicionarAoCarrinho(${p.id_produto})">
                            <i class="bi bi-bag-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 4. CONTADOR GLOBAL DO CARRINHO (Navbar)
 */
window.atualizarContadorGlobal = () => {
    const carrinho = JSON.parse(localStorage.getItem('regia_cart')) || [];
    const total = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const badge = document.getElementById('carrinho-count');
    
    if (badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'block' : 'none';
    }
};

// Listeners e Inicialização
window.addEventListener('chateauStoreChanged', carregarProdutos);
document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    window.atualizarContadorGlobal();
});