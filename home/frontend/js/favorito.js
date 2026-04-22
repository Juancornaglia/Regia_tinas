// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

const favoritesListContainer = document.getElementById('favorites-list');
const noFavoritesMessage = document.getElementById('no-favorites-message');

// 2. FUNÇÕES DO LOCALSTORAGE
function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favorites) { localStorage.setItem('chateau_favorites', JSON.stringify(favorites)); }

function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) { return 'Consulte o valor'; }
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 3. RENDERIZA O CARD DO PRODUTO FAVORITO
function createFavoriteCard(product) {
    const idProduto = product.id_produto || product.id;
    
    // Tratamento de imagem com proteção contra erro
    let imageUrl = product.url_imagem;
    if (imageUrl && !imageUrl.startsWith('http')) { imageUrl = `../img/${product.url_imagem}`; }
    if (!imageUrl || imageUrl.trim() === "") { imageUrl = '../img/logo_pequena4.png'; }

    // Tratamento de Preço Promocional
    const originalPrice = parseFloat(product.preco) || 0;
    const promoPrice = parseFloat(product.preco_promocional);
    const isPromo = promoPrice && promoPrice < originalPrice;
    const displayPrice = isPromo ? promoPrice : originalPrice;

    return `
        <div class="card-favorite shadow-sm">
            <div class="card-img-container">
                <a href="../produto_detalhe.html?id=${idProduto}">
                    <img src="${imageUrl}" alt="${product.nome_produto}" onerror="this.onerror=null; this.src='../img/logo_pequena4.png'">
                </a>
            </div>
            <div class="card-favorite-body bg-light border-top">
                <a href="../produto_detalhe.html?id=${idProduto}" class="card-title">${product.nome_produto}</a>
                
                <div class="mt-auto pt-3">
                    ${isPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(originalPrice)}</small>` : '<small class="text-muted">&nbsp;</small>'}
                    <p class="fs-5 fw-bold mb-3" style="color: #FE8697;">${formatPrice(displayPrice)}</p>
                    
                    <button class="btn btn-brand w-100 mb-2 btn-comprar" onclick="window.adicionarAoCarrinho(${idProduto})">
                        <i class="bi bi-cart-plus me-1"></i> Comprar
                    </button>
                    <button class="btn remove-btn w-100 btn-sm" data-product-id="${idProduto}">
                        <i class="bi bi-trash"></i> Remover 
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 4. FUNÇÃO PRINCIPAL (BUSCA E RENDERIZA)
async function renderFavoritesPage() {
    if (!favoritesListContainer) return;
    
    const favoriteIds = getFavorites();
    
    if (favoriteIds.length === 0) {
        favoritesListContainer.style.display = 'none';
        if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
        return;
    }

    try {
        // CORREÇÃO: Usando API_BASE_URL e a rota PÚBLICA /api/produtos
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const allProducts = await response.json();

        if (!response.ok) throw new Error("Erro na API");

        // Filtra apenas os produtos que têm o ID salvo no LocalStorage
        const favoriteProducts = allProducts.filter(p => favoriteIds.includes(parseInt(p.id_produto || p.id)));

        if (favoriteProducts.length === 0) {
            // Se o usuário favoritou itens que foram apagados do banco de dados
            saveFavorites([]); // Limpa o "lixo"
            favoritesListContainer.style.display = 'none';
            if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
            return;
        }

        // Esconde a mensagem vazia e mostra o grid
        if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';
        favoritesListContainer.style.display = 'grid';
        favoritesListContainer.innerHTML = favoriteProducts.map(createFavoriteCard).join('');

    } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        favoritesListContainer.innerHTML = `
            <div class="col-12 text-center py-5" style="grid-column: 1 / -1;">
                <i class="bi bi-exclamation-triangle fs-1 text-warning mb-3"></i>
                <h4 class="text-danger fw-bold">Não conseguimos carregar seus favoritos.</h4>
                <p class="text-muted">Verifique se o servidor está rodando.</p>
            </div>`;
    }
}

// Função Fantasma para evitar erro no console
window.adicionarAoCarrinho = (id) => {
    alert(`Produto #${id} adicionado ao carrinho! (Simulação TCC)`);
};

// 5. LISTENERS E EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    renderFavoritesPage();

    // Ouvinte de clique para remover itens
    favoritesListContainer?.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-btn');
        
        if (removeButton) {
            const productId = parseInt(removeButton.dataset.productId);
            
            if (confirm('Deseja realmente remover este produto dos favoritos?')) {
                // Atualiza o LocalStorage
                let favorites = getFavorites().filter(id => id !== productId);
                saveFavorites(favorites);
                
                // Recarrega a tela
                renderFavoritesPage();
                
                // Exibe o balão de aviso do Bootstrap (Opcional)
                alert("Produto removido dos favoritos.");
            }
        }
    });
});