// --- CONFIGURAÇÃO ---
// 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}
const favoritesListContainer = document.getElementById('favorites-list');
const noFavoritesMessage = document.getElementById('no-favorites-message');

// Funções de LocalStorage (Mantidas originais)
function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favorites) { localStorage.setItem('chateau_favorites', JSON.stringify(favorites)); }

function formatPrice(price) {
    return Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Renderiza o card do favorito
function createFavoriteCard(product) {
    return `
        <div class="card shadow-sm border-0 mb-3 p-2 rounded-4">
            <div class="row g-0 align-items-center">
                <div class="col-4">
                    <a href="produto.html?id=${product.id_produto}">
                        <img src="${product.url_imagem || 'img/placeholder.png'}" class="img-fluid rounded-3" alt="${product.nome_produto}">
                    </a>
                </div>
                <div class="col-8">
                    <div class="card-body py-2">
                        <h6 class="card-title mb-1 fw-bold">${product.nome_produto}</h6>
                        <p class="text-primary fw-bold mb-2">${formatPrice(product.preco)}</p>
                        <div class="d-flex gap-2">
                            <button class="btn btn-rosa btn-sm rounded-pill" onclick="adicionarAoCarrinho(${product.id_produto})">
                                <i class="bi bi-cart-plus"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm rounded-pill btn-remove-fav" data-product-id="${product.id_produto}">
                                <i class="bi bi-trash"></i> Remover
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Função principal que busca dados no Neon via Python
async function renderFavoritesPage() {
    if (!favoritesListContainer) return;
    const favoriteIds = getFavorites();
    
    if (favoriteIds.length === 0) {
        favoritesListContainer.style.display = 'none';
        if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
        return;
    }
    
    favoritesListContainer.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    favoritesListContainer.style.display = 'block';
    if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';

    try {
        // Buscamos todos os produtos do admin para filtrar (ou criamos uma rota específica no Python)
        const response = await fetch(`${API_URL}/admin/produtos`);
        const allProducts = await response.json();

        // Filtra apenas os produtos que o usuário favoritou
        const favoriteProducts = allProducts.filter(p => favoriteIds.includes(p.id_produto));

        if (favoriteProducts.length === 0) {
            favoritesListContainer.style.display = 'none';
            noFavoritesMessage.style.display = 'block';
            return;
        }

        favoritesListContainer.innerHTML = favoriteProducts.map(createFavoriteCard).join('');

    } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        favoritesListContainer.innerHTML = '<p class="text-danger text-center">Erro ao conectar com o servidor.</p>';
    }
}

// --- LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    renderFavoritesPage();

    favoritesListContainer?.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.btn-remove-fav');
        if (removeButton) {
            const productId = parseInt(removeButton.dataset.productId);
            if (confirm('Remover dos favoritos?')) {
                let favorites = getFavorites().filter(id => id !== productId);
                saveFavorites(favorites);
                renderFavoritesPage();
            }
        }
    });
});